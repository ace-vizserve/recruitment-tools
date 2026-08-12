"use client";

import { Briefcase, Loader2 } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import PeriodPicker from "@/components/reports/period-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveJobCounts } from "@/hooks/use-active-job-counts";
import { entity_list } from "@/lib/constants";
import type { PeriodType } from "@/lib/reports/period";

export interface ReportJobOption {
  id: number;
  position_name: string;
  created_at?: string | null;
  status?: string | null;
}

interface ReportFiltersProps {
  organizationId: string | null;
  jobId: string | null;
  jobs: ReportJobOption[];
  isLoadingJobs: boolean;
  jobsError: string | null;
  periodType: PeriodType;
  periodKey: string;
  jobCreatedAt: string | null;
  onOrganizationChange: (id: string) => void;
  onJobChange: (id: string) => void;
  onPeriodTypeChange: (type: PeriodType) => void;
  onPeriodKeyChange: (key: string) => void;
}

/**
 * One filter row above everything it scopes. Deliberately not per-chart —
 * every visualisation on the page reflects this single selection.
 */
export default function ReportFilters({
  organizationId,
  jobId,
  jobs,
  isLoadingJobs,
  jobsError,
  periodType,
  periodKey,
  jobCreatedAt,
  onOrganizationChange,
  onJobChange,
  onPeriodTypeChange,
  onPeriodKeyChange,
}: ReportFiltersProps) {
  const jobCounts = useActiveJobCounts();

  // Busiest organization first, so the one you are most likely to report on is
  // at the top. Alphabetical while the counts are still in flight, and for good
  // if the request failed — the list must never sit empty or reshuffle into
  // something arbitrary.
  const orgs = React.useMemo(() => {
    const byName = [...entity_list].sort((a, b) => a.name.localeCompare(b.name));
    if (!jobCounts) return byName;
    return byName.sort((a, b) => (jobCounts[String(b.id)] ?? 0) - (jobCounts[String(a.id)] ?? 0));
  }, [jobCounts]);

  return (
    <div className="pill-card mb-8 p-6" data-export-ignore="true">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1 space-y-2">
          <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Organization</span>
          <Select value={organizationId ?? undefined} onValueChange={onOrganizationChange}>
            <SelectTrigger className="pill-select-trigger w-full">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent className="pill-select-content">
              {orgs.map((org) => {
                const activeJobs = jobCounts?.[String(org.id)];
                return (
                  <SelectItem key={org.id} value={String(org.id)} className="pill-select-item">
                    <span className="flex items-center gap-3">
                      {org.logo && (
                        <Image src={org.logo} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
                      )}
                      <span className="font-semibold">{org.name}</span>
                      {/* Says why the list is in this order. Omitted rather than
                          shown as 0 when the count could not be fetched. */}
                      {activeJobs !== undefined && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            activeJobs > 0 ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                          }`}>
                          {activeJobs} active
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-64 flex-1 space-y-2">
          <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Job opening</span>
          <Select
            value={jobId ?? undefined}
            onValueChange={onJobChange}
            disabled={!organizationId || isLoadingJobs || jobs.length === 0}>
            <SelectTrigger className="pill-select-trigger w-full">
              {isLoadingJobs ? (
                <span className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Loading jobs…
                </span>
              ) : (
                <SelectValue
                  placeholder={
                    !organizationId
                      ? "Select organization first"
                      : jobs.length === 0
                        ? "No jobs found"
                        : "Select a job opening"
                  }
                />
              )}
            </SelectTrigger>
            <SelectContent className="pill-select-content">
              {jobs.map((job) => {
                // Reports routinely cover jobs that are no longer open, so the
                // list includes them all and shows Manatal's own status verbatim
                // — it uses values like "won" and "lost", not just open/closed,
                // and relabelling them here would lose that distinction.
                const isActive = job.status?.toLowerCase() === "active";
                return (
                  <SelectItem key={job.id} value={String(job.id)} className="pill-select-item">
                    <span className="flex items-center gap-3">
                      <span className="font-semibold">{job.position_name}</span>
                      {job.status && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isActive ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                          }`}>
                          {job.status}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <PeriodPicker
          periodType={periodType}
          periodKey={periodKey}
          jobCreatedAt={jobCreatedAt}
          disabled={!jobId}
          onPeriodTypeChange={onPeriodTypeChange}
          onPeriodKeyChange={onPeriodKeyChange}
        />
      </div>

      {jobsError && (
        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-600">
          <Briefcase className="h-3.5 w-3.5" />
          {jobsError}
        </p>
      )}
    </div>
  );
}
