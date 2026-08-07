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
  suppressPct,
  color,
}: {
  label: string;
  count: number;
  pct: number | null;
  suppressPct: boolean;
  color?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        {color && <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />}
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-slate-900">
        {formatCount(count)}
        {!suppressPct && (
          <span className="ml-2 text-base font-bold text-slate-400">{formatPct(pct)}</span>
        )}
      </p>
    </div>
  );
}

export default function StageSection({ stage, actor }: StageSectionProps) {
  const topReasons = stage.dropReasons.slice(0, 5);

  return (
    <section className="pill-card p-8">
      {/* Stacked rather than a wrapping row, so the three stage cards line up
          with each other regardless of how long the stage name is. */}
      <div>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-800">{stage.name}</h3>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-blue-500">
          {formatCount(stage.entered)} {pluralize(stage.entered, "candidate")}
        </p>
        {actor && <p className="mt-1 text-sm font-medium text-slate-500">{actor}</p>}
      </div>

      {stage.entered === 0 ? (
        <p className="mt-6 text-sm font-medium text-slate-400">No candidates reached this stage in this period.</p>
      ) : (
        <>
          <Meter stage={stage} />

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Figure
              label="Passed"
              count={stage.passed}
              pct={stage.passedPct}
              suppressPct={stage.suppressPct}
              color={OUTCOME_COLORS.passed}
            />
            <Figure
              label="In stage"
              count={stage.inProgress}
              pct={stage.inProgressPct}
              suppressPct={stage.suppressPct}
              color={OUTCOME_COLORS.inProgress}
            />
            <Figure
              label="Dropped"
              count={stage.dropped}
              pct={stage.droppedPct}
              suppressPct={stage.suppressPct}
              color={OUTCOME_COLORS.dropped}
            />
          </div>

          {/* Below ~5 candidates a percentage is noise, so it is withheld
              rather than presented as if it meant something. */}
          {stage.suppressPct && (
            <p className="mt-4 text-xs font-medium text-slate-400">
              Too few candidates for percentages to be meaningful — counts shown instead.
            </p>
          )}

          {topReasons.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Drop reasons</p>
              <ul className="mt-3 space-y-1.5">
                {topReasons.map((reason) => (
                  <li key={reason.reason} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-600">{reason.reason}</span>
                    <span className="font-bold tabular-nums text-slate-900">{reason.count}</span>
                  </li>
                ))}
              </ul>
              {stage.dropReasons.length > topReasons.length && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  +{stage.dropReasons.length - topReasons.length} more, shown in the drop reasons chart.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
