/**
 * Adapter for raw Manatal Open API payloads.
 *
 * The n8n workflow relays Manatal's responses verbatim rather than reshaping
 * them, so the mapping lives here in typed, testable code instead of in a Code
 * node. Two things force this split:
 *
 *  - `/open/v3/jobs/{id}/matches/` supports only `page` / `page_size`. There is
 *    no date filter, so the period cohort has to be selected on our side.
 *  - The ordered stage list must come from `/open/v3/job-pipelines/`. Deriving
 *    it from the matches would silently omit any stage that currently holds no
 *    candidates (in the live pipeline, rank 3 "RC/BC" is often empty).
 */

import type { ManatalPayload, ManatalMatch, ReportPayload } from "@/lib/reports/schema";

interface FlattenedPages {
  matches: ManatalMatch[];
  /**
   * True when Manatal said there were more matches than actually arrived.
   * Manatal caps `page_size` at 100 regardless of what is requested, so a
   * workflow that asks for one huge page silently receives only the first 100
   * — which under-reports every downstream number with no error anywhere.
   */
  truncated: boolean;
  /** Manatal's own total, when the page wrapper survived. */
  reportedCount: number | null;
}

/**
 * n8n's HTTP Request node returns either the raw page object or a list of
 * them, depending on how pagination is configured. Accept both, plus an
 * already-flattened array of matches.
 */
function flattenPages(input: ManatalPayload["matches"]): FlattenedPages {
  if (!Array.isArray(input)) return { matches: [], truncated: false, reportedCount: null };

  const matches: ManatalMatch[] = [];
  let reportedCount: number | null = null;
  let sawUnfollowedNext = false;

  for (const entry of input) {
    if (entry && typeof entry === "object" && "results" in entry && Array.isArray(entry.results)) {
      matches.push(...(entry.results as ManatalMatch[]));
      const page = entry as { count?: number | null; next?: string | null };
      if (typeof page.count === "number") reportedCount = page.count;
      if (page.next) sawUnfollowedNext = true;
      continue;
    }
    matches.push(entry as ManatalMatch);
  }

  // A trailing `next` is only meaningful if the pages we did receive fall
  // short of the reported total — following pagination correctly still leaves
  // a `next` on every page but the last.
  const short = reportedCount !== null && matches.length < reportedCount;

  return { matches, truncated: short || (sawUnfollowedNext && reportedCount === null), reportedCount };
}

function stageNameOf(match: ManatalMatch): string | null {
  return match.job_pipeline_stage?.name ?? match.stage?.name ?? null;
}

export interface NormalizeOptions {
  /** Inclusive period bounds as UTC instants, already resolved for Singapore. */
  from: string;
  to: string;
  jobId: string;
  organizationId: string | null;
}

export interface NormalizeResult {
  payload: ReportPayload;
  /** Candidates whose application arrived inside the window. */
  appliedInPeriod: number;
  /** True when the stage order came from the matches, not the pipeline. */
  stagesDerived: boolean;
}

/**
 * Fallback ordering when no pipeline definition is supplied: take every stage
 * the matches actually reference and sort by Manatal's own `rank`.
 *
 * The order is reliable; the completeness is not. Any stage that currently
 * holds no candidates is invisible here — in the live 10-stage pipeline that
 * is routinely rank 3 (RC/BC) — so the funnel will simply skip it.
 */
function deriveStages(matches: ManatalMatch[]): string[] {
  const byRank = new Map<number, string>();
  for (const match of matches) {
    const stage = match.job_pipeline_stage;
    if (stage && typeof stage.rank === "number") byRank.set(stage.rank, stage.name);
  }
  return [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, name]) => name);
}

export function normalizeManatalPayload(
  input: ManatalPayload,
  options: NormalizeOptions,
): NormalizeResult {
  const from = new Date(options.from).getTime();
  const to = new Date(options.to).getTime();

  const { matches: allMatches, truncated, reportedCount } = flattenPages(input.matches);

  // Ordered pipeline, by rank. Ranks can have gaps; only the order matters.
  const pipelineStages = [...(input.pipeline?.job_pipeline_stages ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map((stage) => stage.name);

  const stagesDerived = pipelineStages.length === 0;
  const stages = stagesDerived ? deriveStages(allMatches) : pipelineStages;

  const inWindow = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= from && t <= to;
  };

  let appliedInPeriod = 0;
  const matches: ReportPayload["matches"] = [];

  for (const match of allMatches) {
    const appliedAt = match.submitted_at ?? match.created_at ?? null;
    const stageName = stageNameOf(match);

    // A report covers the work done in the period, not the intake of the
    // period. So a candidate belongs to it if anything happened to them
    // inside the window — they applied, were interviewed, got an offer, were
    // hired, or were dropped. Anchoring on the application date instead made
    // a month with little new intake look empty while hiding the decisions
    // the team actually made that month.
    const appliedNow = inWindow(appliedAt);
    const droppedNow = inWindow(match.dropped_at);
    const active =
      appliedNow ||
      droppedNow ||
      inWindow(match.interview_at) ||
      inWindow(match.offer_at) ||
      inWindow(match.hired_at);

    if (!active) continue;
    if (appliedNow) appliedInPeriod++;

    // Scoped to the window too: a candidate dropped in September must not
    // count as a drop on August's report merely for being interviewed in
    // August. Over an all-time window this is every drop, unchanged.
    const isDropped = droppedNow;

    if (!stageName) continue;

    matches.push({
      match_pk: String(match.id),
      candidate_id: String(match.candidate),
      job_id: String(match.job ?? options.jobId),
      current_stage: stageName,
      // A Manatal match sits at exactly one stage, and that stage is where it
      // stopped — there is no backwards movement to guard against, so current
      // stage is also the furthest stage and the drop stage.
      furthest_stage: stageName,
      applied_at: appliedAt as string,
      is_dropped: isDropped,
      dropped_at: match.dropped_at ?? null,
      dropped_at_stage: isDropped ? stageName : null,
      source: match.source ?? null,
    });
  }

  const job = input.job;

  return {
    appliedInPeriod,
    stagesDerived,
    payload: {
      job: {
        id: String(job?.id ?? options.jobId),
        title: job?.position_name ?? null,
        organizationId: job?.organization != null ? String(job.organization) : options.organizationId,
        organizationName: input.organizationName ?? null,
        createdAt: job?.created_at ?? null,
        status: job?.status ?? null,
      },
      stages,
      matches,
      // Drop-reason activities keep their raw shape; the aggregator joins them
      // on match_pk and parses the `info` HTML.
      dropEvents: (input.dropEvents ?? []).map((event) => ({
        match_pk: String(event.match_pk),
        candidate_id: event.candidate_id != null ? String(event.candidate_id) : null,
        job_id: event.job_id != null ? String(event.job_id) : null,
        stage: event.stage ?? null,
        dropped_at: event.dropped_at ?? null,
        created_at: event.created_at ?? null,
        info: event.info ?? null,
        outOfCohort: null,
      })),
      dropReasonVocabulary: input.dropReasonVocabulary ?? null,
      meta: {
        generatedAt: null,
        sourceRecordCount: reportedCount ?? allMatches.length,
        truncated,
      },
    },
  };
}
