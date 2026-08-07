"use client";

import * as React from "react";

import type { PeriodType } from "@/lib/reports/period";
import type { ReportAggregate } from "@/lib/reports/types";

interface UseReportDataArgs {
  jobId: string | null;
  organizationId: string | null;
  periodType: PeriodType;
  periodKey: string | null;
}

interface UseReportDataResult {
  data: ReportAggregate | null;
  error: string | null;
  /** First load for this selection — render skeletons. */
  isLoading: boolean;
  /** A later load with data already on screen — dim, don't flash. */
  isRefetching: boolean;
  refetch: () => void;
}

export function useReportData({
  jobId,
  organizationId,
  periodType,
  periodKey,
}: UseReportDataArgs): UseReportDataResult {
  const [data, setData] = React.useState<ReportAggregate | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefetching, setIsRefetching] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);

  // Read through a ref so the effect does not re-run when data arrives.
  const hasDataRef = React.useRef(false);
  hasDataRef.current = data !== null;

  React.useEffect(() => {
    if (!jobId || !periodKey) {
      setData(null);
      setError(null);
      setIsLoading(false);
      setIsRefetching(false);
      return;
    }

    // Without this, switching periods quickly can land an older response after
    // a newer one and show the wrong month's numbers.
    const controller = new AbortController();

    const load = async () => {
      if (hasDataRef.current) setIsRefetching(true);
      else setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ jobId, periodType, periodKey });
      if (organizationId) params.set("organizationId", organizationId);

      try {
        const response = await fetch(`/api/reports?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setError(payload?.error ?? `Report request failed (${response.status})`);
          setData(null);
          return;
        }

        setData(payload as ReportAggregate);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[useReportData] Failed to load report:", err);
        setError("Couldn't reach the reporting service. Check your connection and try again.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [jobId, organizationId, periodType, periodKey, reloadToken]);

  const refetch = React.useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, error, isLoading, isRefetching, refetch };
}
