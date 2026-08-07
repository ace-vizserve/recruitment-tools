/** Shapes shared by the report API route, the aggregator and the dashboard UI. */

import type { PeriodType } from "@/lib/reports/period";

/**
 * Every way the upstream payload can be less than complete. The rule is that a
 * degradation is always surfaced to the reader and never blocks the rest of the
 * report — the spec is explicit that not every field will be available.
 */
export type DegradationCode =
  | "MISSING_CANDIDATE_NAMES"
  | "REASONS_UNAVAILABLE"
  | "UNRECOGNISED_DROP_REASON"
  | "DERIVED_STAGE_LIST"
  | "UNMAPPED_STAGES"
  | "MISSING_FURTHEST_STAGE"
  | "MISSING_DROP_STAGE"
  | "DUPLICATE_RECORDS"
  | "INVALID_RECORDS"
  | "TRUNCATED_UPSTREAM";

export interface Degradation {
  code: DegradationCode;
  message: string;
  affectedCount: number;
}

export interface DropReasonCount {
  reason: string;
  count: number;
}

export interface StageReport {
  name: string;
  index: number;
  /** Candidates who reached this stage at any point. */
  entered: number;
  /** Reached a later stage. */
  passed: number;
  /** Dropped while at this stage. */
  dropped: number;
  /** Still sitting in this stage. */
  inProgress: number;
  /** Percentages of `entered`, rounded so they sum to exactly 100. */
  passedPct: number | null;
  droppedPct: number | null;
  inProgressPct: number | null;
  /** Share of `entered` that moved into the next stage. Null on the last stage. */
  conversionPct: number | null;
  dropReasons: DropReasonCount[];
  /** True when `entered` is too small for percentages to mean anything. */
  suppressPct: boolean;
}

export interface ReportJob {
  id: string;
  title: string;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string | null;
  status: string | null;
}

export interface ReportPeriod {
  type: PeriodType;
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface ReportTotals {
  /** Headline figure: one per application, so a re-applicant counts twice. */
  applications: number;
  uniqueCandidates: number;
  dropped: number;
  /** Reached the final stage in the pipeline. */
  completed: number;
  /** Share of applications that got past the first stage. */
  passThroughPct: number | null;
}

export interface ReportMeta {
  generatedAt: string;
  /** entered === passed + dropped + inProgress for every stage. */
  integrityOk: boolean;
  degradations: Degradation[];
  unmappedStages: { name: string; count: number }[];
  invalidRecords: number;
  duplicateRecords: number;
  truncated: boolean;
  sourceRecordCount: number | null;
}

export interface ReportAggregate {
  job: ReportJob;
  period: ReportPeriod;
  /** The full ordered pipeline, used for the funnel. */
  stages: string[];
  /** The subset rendered as detail cards. */
  reportedStages: string[];
  totals: ReportTotals;
  stageReports: StageReport[];
  overallDropReasons: DropReasonCount[];
  /** Total reason mentions; ≥ total drops, since one drop can cite several. */
  dropReasonMentions: number;
  /** Null when no record carried a `source`. */
  sources: { name: string; count: number }[] | null;
  /** Drops recorded in the window for candidates who applied outside it. */
  outOfCohortDrops: number | null;
  /** True when REPORTS_USE_FIXTURE served this instead of the live webhook. */
  isSampleData?: boolean;
  meta: ReportMeta;
}
