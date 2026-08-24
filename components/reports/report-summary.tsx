import { AlertTriangle } from "lucide-react";
import Image from "next/image";

import StatTile from "@/components/reports/stat-tile";
import { ENTITY_LOGOS } from "@/lib/constants";
import { formatCount, formatDate, formatPct, pluralize } from "@/lib/reports/format";
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
  /** Picks the logo. Falls back to the payload's own organization id. */
  organizationId?: string | null;
  /**
   * The job's creation date, as chosen in the filter row. Falls back to the
   * payload's own value, matching how jobTitle/organizationName resolve.
   */
  jobCreatedAt?: string | null;
}

export default function ReportSummary({
  report,
  inProgress,
  partialForJob,
  asOfLabel,
  jobTitle,
  organizationName,
  organizationId,
  jobCreatedAt,
}: ReportSummaryProps) {
  const { totals, job, period } = report;
  const displayTitle = jobTitle || job.title;
  const displayOrg = organizationName || job.organizationName;
  const logo = ENTITY_LOGOS[Number(organizationId ?? job.organizationId)] ?? null;

  // The label names the window; the parenthetical gives the two real dates
  // that bound it — job creation on the left, today on the right — so an
  // exported sheet dates itself without the filter row to consult. Manatal
  // does not always return a creation date, and "(— – 24 Aug 2026)" reads as
  // broken rather than unknown, so the whole parenthetical drops instead.
  const createdLabel = formatDate(jobCreatedAt ?? job.createdAt);
  const rangeLabel = createdLabel === "—" ? null : `(${createdLabel} – ${asOfLabel})`;

  return (
    <section className="pill-card p-8">
      {/* Title block left, org mark right — the masthead arrangement, so a
          printed sheet says whose report it is at a glance. items-start, not
          centred: the logo hangs off the top line however tall the title runs. */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-bold uppercase tracking-widest text-blue-600">
              {period.label}
              {rangeLabel && ` ${rangeLabel}`}
            </p>
            {report.isSampleData && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800">
                Sample data
              </span>
            )}
          </div>
          {/* The job title is the one line that says what the whole sheet is
              about, and it is read off paper as often as off screen — so it is
              set at heading size in full-strength ink, not as a muted subtitle. */}
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{displayTitle}</h2>
          {displayOrg && <p className="mt-1 text-base font-semibold text-slate-700">{displayOrg}</p>}
        </div>

        {/* unoptimized keeps the src a plain same-origin file path. The export
            re-fetches every image while rasterising, and /_next/image's
            srcset gives it more than one candidate to resolve — the raw path
            has exactly one and always comes back. */}
        {logo && (
          <Image
            src={logo}
            alt={displayOrg ? `${displayOrg} logo` : "Organization logo"}
            width={200}
            height={80}
            unoptimized
            priority
            className="h-16 w-auto max-w-[200px] shrink-0 object-contain"
          />
        )}
      </div>

      {/* Exactly one hero figure. No tabular-nums at display size — it makes
          proportional digits look mechanically spaced. */}
      <div className="mt-8">
        <p className="text-5xl font-extrabold leading-none text-slate-900">{formatCount(totals.applications)}</p>
        <p className="mt-2 text-base font-medium text-slate-700">
          {pluralize(totals.applications, "candidate")} worked on in this period
        </p>
      </div>

      {(inProgress || partialForJob) && (
        <p className="mt-4 flex items-center gap-2 text-base font-bold text-amber-700">
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
        {/* passThroughPct counts candidates whose furthest stage is past index
            0 — i.e. they got out of the first stage and into the second — so
            the tile names those two stages rather than saying "first stage". */}
        <StatTile
          label={`Pass-Through ${report.stages[1] ?? "Paper Screening"}`}
          value={formatPct(totals.passThroughPct)}
          hint={`Got passed the ${report.stages[0] ?? "New Candidates"} stage`}
        />
      </div>

      {/* Spell out what "this period" means, since the same candidate can
          legitimately appear on more than one period's report. */}
      {period.type !== "all" && (
        <p className="mt-4 text-sm font-medium text-slate-600">
          Covers every candidate the team acted on during {period.label} — applications received, interviews held,
          offers made and drops decided. A candidate who applied earlier and was dropped in this period is counted
          here.
        </p>
      )}
    </section>
  );
}
