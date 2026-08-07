"use client";

import { Download, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import DropReasonsChart from "@/components/reports/charts/drop-reasons-chart";
import PassDropChart from "@/components/reports/charts/pass-drop-chart";
import StageFunnelChart from "@/components/reports/charts/stage-funnel-chart";
import ReportFilters, { type ReportJobOption } from "@/components/reports/report-filters";
import ReportNotes from "@/components/reports/report-notes";
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
import { formatDate, pluralize } from "@/lib/reports/format";
import {
  currentPeriod,
  isPeriodInProgress,
  isPeriodPartialForJob,
  isValidPeriodKey,
  remapPeriodKey,
  resolvePeriod,
  type PeriodType,
} from "@/lib/reports/period";

/** Who acts at each stage — context the counts alone don't carry. */
const STAGE_ACTORS: Record<string, string> = {
  "new candidates": "Reviewed by recruiters",
  "paper screening": "Reviewed by department heads",
  "initial interview": "Evaluated by interviewers",
};

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
        // Empty status/is_published lifts the active-only default, because a
        // job being reported on in September may have closed in August.
        const response = await fetch(`/api/jobs?entity-id=${organizationId}&status=&is_published=`, {
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

  // A shared link can name a job that isn't in this org's list (wrong org in
  // the URL, or the job was archived out of the Manatal response). The report
  // still loads, so show the job rather than leaving the picker looking blank.
  const jobOptions = React.useMemo(() => {
    if (!jobId || selectedJob) return jobs;
    return [
      {
        id: Number(jobId),
        position_name: data?.job.title ?? `Job ${jobId}`,
        created_at: data?.job.createdAt,
        status: data?.job.status,
      },
      ...jobs,
    ];
  }, [jobs, jobId, selectedJob, data]);

  const jobCreatedAt = selectedJob?.created_at ?? data?.job.createdAt ?? null;

  const selectedOrgName = organizationId
    ? (entity_list.find((org) => String(org.id) === organizationId)?.name ?? null)
    : null;

  const captureRef = React.useRef<HTMLDivElement>(null);
  const orgSlug = organizationId ? (ENTITY_SLUGS[Number(organizationId)] ?? organizationId) : "hfse";
  const { exportPng, isExporting } = useReportExport(
    captureRef,
    `hfse-report_${orgSlug}_${jobId ?? "job"}_${periodKey}.png`,
  );

  const period = React.useMemo(() => resolvePeriod(periodType, periodKey), [periodType, periodKey]);
  const inProgress = isPeriodInProgress(period);
  const partialForJob = !inProgress && isPeriodPartialForJob(period, jobCreatedAt);

  const reportedStageReports = data?.stageReports.filter((stage) => data.reportedStages.includes(stage.name)) ?? [];

  // Opt-in via the URL so an "all stages" view survives a refresh and can be
  // handed to someone else as a link.
  const showAllStages = searchParams.get("stages") === "all";
  const visibleStageReports = showAllStages ? (data?.stageReports ?? []) : reportedStageReports;
  const extraStageCount = (data?.stageReports.length ?? 0) - reportedStageReports.length;

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
            <Button onClick={exportPng} disabled={isExporting} className="pill-btn-primary">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rendering…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download report image
                </>
              )}
            </Button>
          </div>

          {/* Everything inside this node ends up in the PNG. Keep the shell
              header, tab bar, filter row and this page's buttons outside it. */}
          <div
            ref={captureRef}
            className={`rounded-xl p-4 space-y-6 bg-white transition-opacity ${isRefetching ? "pointer-events-none opacity-60" : ""}`}
            style={{ backgroundColor: "#ffffff" }}>
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

            <div className="grid gap-6 lg:grid-cols-2">
              <PassDropChart stages={reportedStageReports} isExporting={isExporting} />
              <DropReasonsChart
                reasons={data.overallDropReasons}
                dropCount={data.totals.dropped}
                mentionCount={data.dropReasonMentions}
                isExporting={isExporting}
              />
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-800">Stage detail</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {showAllStages
                      ? `All ${data.stages.length} stages in the pipeline.`
                      : `The ${reportedStageReports.length} reported stages. ${extraStageCount} further ${pluralize(extraStageCount, "stage")} in this pipeline.`}
                  </p>
                </div>

                {/* Chrome, so it stays out of the exported image — whichever
                    set of cards is on screen is what gets captured. */}
                {extraStageCount > 0 && (
                  <div
                    role="radiogroup"
                    aria-label="Which stages to show"
                    data-export-ignore="true"
                    className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    {[
                      { value: false, label: "Reported stages" },
                      { value: true, label: "All stages" },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={showAllStages === option.value}
                        onClick={() => setParams({ stages: option.value ? "all" : null })}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                          showAllStages === option.value
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-500 hover:text-slate-800"
                        }`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {visibleStageReports.map((stage) => (
                  <StageSection key={stage.name} stage={stage} actor={STAGE_ACTORS[stage.name.toLowerCase()]} />
                ))}
              </div>
            </div>

            <ReportNotes jobId={jobId} periodKey={periodKey} />

            {/* Makes a pasted screenshot self-describing. */}
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">
              <span>
                {selectedOrgName ?? data.job.organizationName ?? "HFSE"} ·{" "}
                {selectedJob?.position_name ?? data.job.title} · {data.period.label}
              </span>
              <span>Generated {formatDate(data.meta.generatedAt)}</span>
            </footer>
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
