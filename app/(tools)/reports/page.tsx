import type { Metadata } from "next";
import { Suspense } from "react";

import ReportsDashboard from "@/components/reports/reports-dashboard";
import { ReportSkeleton } from "@/components/reports/report-states";

export const metadata: Metadata = {
  title: "Recruitment Reports",
};

export default function ReportsPage() {
  // ReportsDashboard reads the job/period selection from search params, so it
  // needs a Suspense boundary or the build warns about useSearchParams.
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportsDashboard />
    </Suspense>
  );
}
