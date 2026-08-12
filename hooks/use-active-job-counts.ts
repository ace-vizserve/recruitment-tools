"use client";

import * as React from "react";

/**
 * Active job count per organization id, for ordering the org picker.
 *
 * Fetched once per mount. Failure is not surfaced: the picker just falls back
 * to alphabetical order, which is what it did before counts existed.
 */
export function useActiveJobCounts() {
  const [counts, setCounts] = React.useState<Record<string, number> | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/jobs/counts", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.counts) setCounts(data.counts as Record<string, number>);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch active job counts:", error);
      }
    })();

    return () => controller.abort();
  }, []);

  return counts;
}
