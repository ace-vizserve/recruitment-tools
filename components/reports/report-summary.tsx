import { AlertTriangle } from "lucide-react";

import StatTile from "@/components/reports/stat-tile";
import { formatCount, formatPct, pluralize } from "@/lib/reports/format";
import type { ReportAggregate } from "@/lib/reports/types";

interface ReportSummaryProps {
  report: ReportAggregate;
  /** The selected period has not finished yet, so the numbers will move. */
  inProgress: boolean;
  /** The job was created partway through the period, so it is clipped. */
  partialForJob: boolean;
  asOfLabel: string;
  /**
   * Names as chosen in the filter row. These win over whatever the payload
   * says, so the heading can never contradict the dropdown the user is
   * looking at.
   */
  jobTitle?: string | null;
  organizationName?: string | null;
}

export default function ReportSummary({
  report,
  inProgress,
  partialForJob,
  asOfLabel,
  jobTitle,
  organizationName,
}: ReportSummaryProps) {
  const { totals, job, period } = report;
  const displayTitle = jobTitle || job.title;
  const displayOrg = organizationName || job.organizationName;

  return (
    <section className="pill-card p-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-500">{period.label}</p>
        {report.isSampleData && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Sample data
          </span>
        )}
      </div>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-800">{displayTitle}</h2>
      {displayOrg && <p className="mt-0.5 text-sm font-medium text-slate-500">{displayOrg}</p>}

      {/* Exactly one hero figure. No tabular-nums at display size — it makes
          proportional digits look mechanically spaced. */}
      <div className="mt-8">
        <p className="text-5xl font-extrabold leading-none text-slate-900">{formatCount(totals.applications)}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          {pluralize(totals.applications, "candidate")} worked on in this period
        </p>
      </div>

      {(inProgress || partialForJob) && (
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {inProgress
            ? `Period in progress — data incomplete as of ${asOfLabel}.`
            : "The job was created partway through this period, so it covers only part of it."}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Candidates active"
          value={formatCount(totals.applications)}
          hint="Applied, interviewed, offered, hired or dropped"
        />
        <StatTile
          label="New applications"
          value={totals.appliedInPeriod === null ? "—" : formatCount(totals.appliedInPeriod)}
          hint="First applied in this period"
        />
        <StatTile
          label="Dropped"
          value={formatCount(totals.dropped)}
          hint={`${formatPct(totals.applications ? (totals.dropped / totals.applications) * 100 : null)} of active candidates`}
        />
        <StatTile
          label="Pass-through"
          value={formatPct(totals.passThroughPct)}
          hint="Got past the first stage"
        />
      </div>

      {/* Spell out what "this period" means, since the same candidate can
          legitimately appear on more than one period's report. */}
      {period.type !== "all" && (
        <p className="mt-4 text-xs font-medium text-slate-400">
          Covers every candidate the team acted on during {period.label} — applications received, interviews held,
          offers made and drops decided. A candidate who applied earlier and was dropped in this period is counted
          here.
        </p>
      )}
    </section>
  );
}
