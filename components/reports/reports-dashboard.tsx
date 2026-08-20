"use client";

import { Download, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import DropReasonsChart from "@/components/reports/charts/drop-reasons-chart";
import StageFunnelChart from "@/components/reports/charts/stage-funnel-chart";
import ReportFilters, { type ReportJobOption } from "@/components/reports/report-filters";
import {
  ReportDegradations,
  ReportEmpty,
  ReportError,
  ReportNoSelection,
  ReportSkeleton,
} from "@/components/reports/report-states";
import ReportSummary from "@/components/reports/report-summary";
import StageSection from "@/components/reports/stage-section";
import { Button } from "@/components/ui/button";
import { useReportData } from "@/hooks/use-report-data";
import { useReportExport } from "@/hooks/use-report-export";
import { ENTITY_SLUGS, entity_list } from "@/lib/constants";
import { formatDate } from "@/lib/reports/format";
import {
  currentPeriod,
  isPeriodInProgress,
  isPeriodPartialForJob,
  isValidPeriodKey,
  remapPeriodKey,
  resolvePeriod,
  type PeriodType,
} from "@/lib/reports/period";
import type { ReportAggregate } from "@/lib/reports/types";

/** Who acts at each stage — context the counts alone don't carry. */
const STAGE_ACTORS: Record<string, string> = {
  "new candidates": "Reviewed by recruiters",
  "paper screening": "Reviewed by department heads",
  "initial interview": "Evaluated by interviewers",
};

/**
 * Names what you are looking at. Repeated on every export page, because a PDF
 * page gets read — and forwarded — on its own.
 */
function ReportFootnote({
  report,
  jobTitle,
  organizationName,
}: {
  report: ReportAggregate;
  jobTitle?: string | null;
  organizationName?: string | null;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">
      <span>
        {organizationName ?? report.job.organizationName ?? "HFSE"} · {jobTitle ?? report.job.title} ·{" "}
        {report.period.label}
      </span>
      <span>Generated {formatDate(report.meta.generatedAt)}</span>
    </footer>
  );
}

export default function ReportsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const organizationId = searchParams.get("org");
  const jobId = searchParams.get("job");
  const rawType = searchParams.get("type");
  const periodType: PeriodType = rawType === "weekly" || rawType === "all" ? rawType : "monthly";
  const rawPeriod = searchParams.get("period");

  // Default to the period we are currently in, per the agreed period model.
  const periodKey = isValidPeriodKey(periodType, rawPeriod) ? (rawPeriod as string) : currentPeriod(periodType).key;

  // Selection lives in the URL so a report is deep-linkable and survives a refresh.
  const setParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // ---- Job list -----------------------------------------------------------
  const [jobs, setJobs] = React.useState<ReportJobOption[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(false);
  const [jobsError, setJobsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!organizationId) {
      setJobs([]);
      setJobsError(null);
      return;
    }

    const controller = new AbortController();

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      setJobsError(null);
      try {
        // Active jobs only — the picker is for choosing what to report on next,
        // and the full list was too long to scan. A closed job stays reachable
        // by URL: jobOptions below synthesizes the option when it is missing.
        // is_published stays empty so an unpublished-but-active job still lists.
        const response = await fetch(`/api/jobs?entity-id=${organizationId}&status=active&is_published=`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setJobsError("Couldn't load job openings for this organization.");
          setJobs([]);
          return;
        }
        const data = await response.json();
        setJobs(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch jobs:", error);
        setJobsError("Couldn't load job openings for this organization.");
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) setIsLoadingJobs(false);
      }
    };

    fetchJobs();
    return () => controller.abort();
  }, [organizationId]);

  const selectedJob = jobs.find((job) => String(job.id) === jobId) ?? null;

  // ---- Report -------------------------------------------------------------
  const { data, error, isLoading, isRefetching, refetch } = useReportData({
    jobId,
    organizationId,
    periodType,
    periodKey,
  });

  // Active first, then newest. The list is fetched active-only, but a closed
  // job can still arrive via the deep-link fallback below, and Manatal's own
  // statuses ("won", "lost") are not a single closed value to sort against.
  const sortJobs = React.useCallback((list: ReportJobOption[]) => {
    return [...list].sort((a, b) => {
      const aActive = a.status?.toLowerCase() === "active" ? 0 : 1;
      const bActive = b.status?.toLowerCase() === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      const aDate = a.created_at ? Date.parse(a.created_at) : NaN;
      const bDate = b.created_at ? Date.parse(b.created_at) : NaN;
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate) && aDate !== bDate) return bDate - aDate;

      return a.position_name.localeCompare(b.position_name);
    });
  }, []);

  // A shared link can name a job that isn't in this org's list (wrong org in
  // the URL, or the job is closed and so no longer fetched). The report still
  // loads, so show the job rather than leaving the picker looking blank — and
  // pin it first, so the job you asked for is never buried under the sort.
  const jobOptions = React.useMemo(() => {
    if (!jobId || selectedJob) return sortJobs(jobs);
    return [
      {
        id: Number(jobId),
        position_name: data?.job.title ?? `Job ${jobId}`,
        created_at: data?.job.createdAt,
        status: data?.job.status,
      },
      ...sortJobs(jobs),
    ];
  }, [jobs, jobId, selectedJob, data, sortJobs]);

  const jobCreatedAt = selectedJob?.created_at ?? data?.job.createdAt ?? null;

  const selectedOrgName = organizationId
    ? (entity_list.find((org) => String(org.id) === organizationId)?.name ?? null)
    : null;

  const captureRef = React.useRef<HTMLDivElement>(null);
  const orgSlug = organizationId ? (ENTITY_SLUGS[Number(organizationId)] ?? organizationId) : "hfse";
  const { exportPdf, isExporting } = useReportExport(
    captureRef,
    `hfse-report_${orgSlug}_${jobId ?? "job"}_${periodKey}.pdf`,
  );

  const period = React.useMemo(() => resolvePeriod(periodType, periodKey), [periodType, periodKey]);
  const inProgress = isPeriodInProgress(period);
  const partialForJob = !inProgress && isPeriodPartialForJob(period, jobCreatedAt);

  return (
    <div>
      <ReportFilters
        organizationId={organizationId}
        jobId={jobId}
        jobs={jobOptions}
        isLoadingJobs={isLoadingJobs}
        jobsError={jobsError}
        periodType={periodType}
        periodKey={periodKey}
        jobCreatedAt={jobCreatedAt}
        onOrganizationChange={(id) => setParams({ org: id, job: null })}
        onJobChange={(id) => setParams({ job: id })}
        onPeriodTypeChange={(type) => setParams({ type, period: remapPeriodKey(periodType, periodKey, type) })}
        onPeriodKeyChange={(key) => setParams({ period: key })}
      />

      {!jobId ? (
        <ReportNoSelection />
      ) : error ? (
        <ReportError message={error} onRetry={refetch} />
      ) : isLoading ? (
        <ReportSkeleton />
      ) : !data ? (
        <ReportNoSelection />
      ) : data.totals.applications === 0 ? (
        <ReportEmpty jobTitle={data.job.title} periodLabel={data.period.label} />
      ) : (
        <>
          <div className="mb-6 flex justify-end" data-export-ignore="true">
            <Button onClick={exportPdf} disabled={isExporting} className="pill-btn-primary">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rendering…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download report PDF
                </>
              )}
            </Button>
          </div>

          {/* Everything inside this node ends up in the PDF. Keep the shell
              header, tab bar, filter row and this page's buttons outside it.
              Each [data-export-page] child becomes one page of the export —
              on screen they simply stack, so the split costs the reader
              nothing. */}
          <div
            ref={captureRef}
            className={`rounded-xl p-4 space-y-6 bg-white transition-opacity ${isRefetching ? "pointer-events-none opacity-60" : ""}`}
            style={{ backgroundColor: "#ffffff" }}>
            <div data-export-page="summary" className="space-y-6">
              <ReportDegradations items={data.meta.degradations} />

              <ReportSummary
                report={data}
                inProgress={inProgress}
                partialForJob={partialForJob}
                asOfLabel={formatDate(new Date().toISOString())}
                jobTitle={selectedJob?.position_name}
                organizationName={selectedOrgName}
              />

              <StageFunnelChart stages={data.stageReports} isExporting={isExporting} />

              <ReportFootnote report={data} jobTitle={selectedJob?.position_name} organizationName={selectedOrgName} />
            </div>

            <div data-export-page="detail" className="space-y-6">
              {/* Straight after the distribution it breaks down, and covering
                  the whole pipeline — the reported-stages subset hid the back
                  half of the funnel, which is where offers and starts live. */}
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-800">Stage detail</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    All {data.stages.length} stages in the pipeline.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {data.stageReports.map((stage) => (
                    <StageSection key={stage.name} stage={stage} actor={STAGE_ACTORS[stage.name.toLowerCase()]} />
                  ))}
                </div>
              </div>

              <DropReasonsChart
                reasons={data.overallDropReasons}
                dropCount={data.totals.dropped}
                mentionCount={data.dropReasonMentions}
                isExporting={isExporting}
              />

              <ReportFootnote report={data} jobTitle={selectedJob?.position_name} organizationName={selectedOrgName} />
            </div>
          </div>

          {process.env.NODE_ENV !== "production" && searchParams.get("debug") === "1" && (
            <pre
              data-export-ignore="true"
              className="mono-text mt-8 overflow-x-auto rounded-xl bg-slate-900 p-6 text-[11px] leading-relaxed text-slate-200">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
