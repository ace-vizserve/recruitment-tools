"use client";

import { AlertCircle, AlertTriangle, BarChart3, Inbox, RotateCw } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Degradation } from "@/lib/reports/types";

/**
 * The dashboard has a known, stable layout, so skeletons preserve geometry and
 * avoid the content jump a centred spinner causes. (The spinner idiom is still
 * right elsewhere in the app, where the shape of the result is unknown.)
 */
export function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <div className="pill-card p-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-12 w-32" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="pill-card p-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-52 w-full" />
        </div>
        <div className="pill-card p-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-52 w-full" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="pill-card p-8">
          <Skeleton className="h-4 w-44" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyShell({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="pill-card p-16 text-center">
      {icon}
      <p className="mt-3 text-sm font-medium text-slate-400">{title}</p>
      {hint && <p className="mt-1 text-xs font-medium text-slate-300">{hint}</p>}
    </div>
  );
}

export function ReportNoSelection() {
  return (
    <EmptyShell
      icon={<BarChart3 className="mx-auto h-10 w-10 text-slate-200" />}
      title="Select an organization and job opening to generate a report."
      hint="Reports cover one job at a time, by week or by month."
    />
  );
}

export function ReportEmpty({ jobTitle, periodLabel }: { jobTitle: string; periodLabel: string }) {
  return (
    <EmptyShell
      icon={<Inbox className="mx-auto h-10 w-10 text-slate-200" />}
      title={`No applications recorded for ${jobTitle} in ${periodLabel}.`}
      hint="Try another period."
    />
  );
}

export function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rose-100 bg-rose-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
        <span className="text-sm font-bold text-rose-600">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 sm:self-auto">
        <RotateCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

/**
 * Renders whatever the upstream payload could not supply. Always visible,
 * never blocking — the report is still worth reading with pieces missing, but
 * the reader has to know which pieces those are.
 */
export function ReportDegradations({ items }: { items: Degradation[] }) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 px-6 py-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
        <span className="text-sm font-bold text-amber-700">Some data was incomplete</span>
      </div>
      {/* Without this line the heading reads as "the report is wrong", and
          people stop trusting figures that are fine. */}
      <p className="mt-1 pl-8 text-xs font-medium text-amber-600">
        These notes describe gaps in the data Manatal returned. Everything below is still accurate for the records
        that were received.
      </p>
      <ul className="mt-2 space-y-1 pl-8">
        {items.map((item) => (
          // Messages are self-contained sentences; the count is already inside
          // them, phrased with the right singular/plural.
          <li key={item.code} className="text-xs font-medium text-amber-700">
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
