import { OUTCOME_COLORS } from "@/lib/reports/chart-theme";
import { formatCount, formatPct, pluralize } from "@/lib/reports/format";
import type { StageReport } from "@/lib/reports/types";

interface StageSectionProps {
  stage: StageReport;
  /** Who acts at this stage — context the numbers alone don't carry. */
  actor?: string;
}

function Meter({ stage }: { stage: StageReport }) {
  if (!stage.entered) return null;

  const segments = [
    { key: "passed", value: stage.passed, color: OUTCOME_COLORS.passed },
    { key: "inProgress", value: stage.inProgress, color: OUTCOME_COLORS.inProgress },
    { key: "dropped", value: stage.dropped, color: OUTCOME_COLORS.dropped },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
      {segments.map((segment) => (
        <div
          key={segment.key}
          style={{ width: `${(segment.value / stage.entered) * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </div>
  );
}

function Figure({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number | null;
  color?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-600">
        {color && <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />}
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-900">
        {formatCount(count)}
        <span className="ml-2 text-lg font-bold text-slate-600">{formatPct(pct)}</span>
      </p>
    </div>
  );
}

export default function StageSection({ stage, actor }: StageSectionProps) {
  return (
    <section className="pill-card p-8">
      {/* Stacked rather than a wrapping row, so the three stage cards line up
          with each other regardless of how long the stage name is. */}
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">{stage.name}</h3>
        <p className="mt-1 text-base font-bold uppercase tracking-widest text-blue-600">
          {formatCount(stage.entered)} {pluralize(stage.entered, "candidate")}
        </p>
        {actor && <p className="mt-1 text-base font-medium text-slate-600">{actor}</p>}
      </div>

      {stage.entered === 0 ? (
        <p className="mt-6 text-base font-medium text-slate-600">No candidates reached this stage in this period.</p>
      ) : (
        <>
          <Meter stage={stage} />

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Figure label="Passed" count={stage.passed} pct={stage.passedPct} color={OUTCOME_COLORS.passed} />
            <Figure
              label="In stage"
              count={stage.inProgress}
              pct={stage.inProgressPct}
              color={OUTCOME_COLORS.inProgress}
            />
            <Figure label="Dropped" count={stage.dropped} pct={stage.droppedPct} color={OUTCOME_COLORS.dropped} />
          </div>

          {/* Every reason, not a top-N: the list is short (one entry per
              reason configured in Manatal), and a truncated card made the
              reader cross-reference the chart to find a reason worth one drop. */}
          {stage.dropReasons.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-sm font-black uppercase tracking-widest text-slate-700">Drop reasons</p>
              <ul className="mt-3 space-y-1.5">
                {stage.dropReasons.map((reason) => (
                  <li key={reason.reason} className="flex items-baseline justify-between gap-4 text-base">
                    <span className="font-semibold text-slate-900">{reason.reason}</span>
                    <span className="font-extrabold tabular-nums text-slate-900">{reason.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
