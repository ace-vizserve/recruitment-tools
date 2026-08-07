/**
 * Turns the raw n8n payload into the numbers the dashboard renders.
 *
 * Pure and isomorphic on purpose — no next/server, no process.env, no implicit
 * clock. Everything time-dependent is passed in. That keeps it unit-testable
 * and lets a debug path call it directly.
 */

import {
  createReasonCanonicalizer,
  hasDropReasons,
  parseDropReasons,
  UNRECORDED_REASON,
} from "@/lib/reports/drop-reasons";
import { pluralize } from "@/lib/reports/format";
import { formatPeriodLabel, resolvePeriod, type PeriodType } from "@/lib/reports/period";
import type { DropEvent, MatchRecord, ReportPayload } from "@/lib/reports/schema";
import type {
  Degradation,
  DegradationCode,
  DropReasonCount,
  ReportAggregate,
  StageReport,
} from "@/lib/reports/types";

/**
 * The stages that get their own detail card. Aggregation still runs across the
 * *whole* pipeline — otherwise a hired candidate would look like they never
 * passed Initial Interview. Add a stage name here to give it a card.
 */
export const REPORTED_STAGES = ["New Candidates", "Paper Screening", "Initial Interview"] as const;

/** Below this many candidates a percentage is noise, so we show counts only. */
export const MIN_N_FOR_PERCENT = 5;

/** Stage-shaped values that are really "left the pipeline", not a stage. */
const NON_STAGE_NAMES = new Set(["rejected", "dropped", "declined", "withdrawn", "archived"]);

const norm = (value: string) => value.trim().toLowerCase();

export interface AggregateOptions {
  /** Timestamp stamped onto the result; injected so the function stays pure. */
  generatedAt: string;
  periodType: PeriodType;
  periodKey: string;
}

/** Percentage that returns null rather than NaN when there is nothing to divide. */
export function safePct(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

/**
 * Round a set of parts so the displayed integers still add up to 100.
 * Naive per-value rounding turns three equal thirds into 33/33/33 = 99.
 */
export function largestRemainderRound(parts: number[], total: number): (number | null)[] {
  if (!total) return parts.map(() => null);

  const exact = parts.map((part) => (part / total) * 100);
  const floored = exact.map(Math.floor);
  let remainder = 100 - floored.reduce((sum, n) => sum + n, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let i = 0; remainder > 0 && i < order.length; i++, remainder--) {
    result[order[i].index] += 1;
  }
  return result;
}

function countReasons(reasonLists: string[][]): { counts: DropReasonCount[]; mentions: number } {
  const tally = new Map<string, number>();
  let mentions = 0;

  for (const reasons of reasonLists) {
    if (!reasons.length) {
      tally.set(UNRECORDED_REASON, (tally.get(UNRECORDED_REASON) ?? 0) + 1);
      continue;
    }
    for (const reason of reasons) {
      tally.set(reason, (tally.get(reason) ?? 0) + 1);
      mentions++;
    }
  }

  const counts = [...tally.entries()]
    .map(([reason, count]) => ({ reason, count }))
    // Ties broken alphabetically so the order is stable between renders.
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  return { counts, mentions };
}

export function aggregateReport(payload: ReportPayload, options: AggregateOptions): ReportAggregate {
  const degradations: Degradation[] = [];
  const addDegradation = (code: DegradationCode, message: string, affectedCount: number) => {
    if (affectedCount > 0) degradations.push({ code, message, affectedCount });
  };

  // ---- Stage index -------------------------------------------------------
  const stages = payload.stages.filter((stage) => !NON_STAGE_NAMES.has(norm(stage)));
  const stageIndex = new Map<string, number>();
  stages.forEach((stage, index) => stageIndex.set(norm(stage), index));

  const unmapped = new Map<string, number>();
  const idxOf = (name: string | null | undefined): number | null => {
    if (!name) return null;
    const found = stageIndex.get(norm(name));
    if (found !== undefined) return found;
    // A dropped match parked in a "Rejected" pseudo-stage is expected, not a
    // data problem — it is handled via dropped_at_stage instead.
    if (!NON_STAGE_NAMES.has(norm(name))) {
      unmapped.set(name, (unmapped.get(name) ?? 0) + 1);
    }
    return null;
  };

  // ---- Drop-event join ---------------------------------------------------
  // The activity feed mixes drop records with ordinary recruiter comments, and
  // every activity on a match is stamped with that match's `dropped_at` — so
  // ordering on `dropped_at` cannot separate them. Select on two keys instead:
  // a record carrying an actual "Drop Reasons" heading always beats a plain
  // comment, and among those the latest `created_at` wins (a candidate can be
  // pooled first and blacklisted later; the final reason is the real one).
  const dropEventByMatch = new Map<string, DropEvent>();
  for (const event of payload.dropEvents ?? []) {
    const existing = dropEventByMatch.get(event.match_pk);
    if (!existing) {
      dropEventByMatch.set(event.match_pk, event);
      continue;
    }

    const incomingIsReason = hasDropReasons(event.info);
    const existingIsReason = hasDropReasons(existing.info);

    if (incomingIsReason !== existingIsReason) {
      if (incomingIsReason) dropEventByMatch.set(event.match_pk, event);
      continue;
    }

    const existingAt = existing.created_at ?? existing.dropped_at ?? "";
    const incomingAt = event.created_at ?? event.dropped_at ?? "";
    if (incomingAt > existingAt) dropEventByMatch.set(event.match_pk, event);
  }

  // ---- Deduplicate matches ----------------------------------------------
  const byMatchPk = new Map<string, MatchRecord>();
  let duplicateRecords = 0;
  for (const match of payload.matches ?? []) {
    if (byMatchPk.has(match.match_pk)) duplicateRecords++;
    byMatchPk.set(match.match_pk, match);
  }
  const matches = [...byMatchPk.values()];

  // ---- Normalise each match ---------------------------------------------
  interface Resolved {
    furthest: number;
    isDropped: boolean;
    dropIndex: number | null;
    reasons: string[];
    candidateId: string;
    source: string | null;
  }

  // Manatal's configured drop reasons are a closed set; n8n may override the
  // list if it can read them from the internal API.
  const canonicalize = createReasonCanonicalizer(payload.dropReasonVocabulary ?? undefined);
  const unrecognisedReasons = new Set<string>();

  const resolved: Resolved[] = [];
  let invalidRecords = 0;
  let missingFurthest = 0;
  let missingDropStage = 0;
  let dropsWithoutReasons = 0;

  for (const match of matches) {
    const currentIdx = idxOf(match.current_stage);
    const isDropped = match.is_dropped === true;

    if (!match.furthest_stage) missingFurthest++;

    // E1: once dropped, current_stage is meaningless — dropped_at_stage wins.
    let dropIndex: number | null = null;
    if (isDropped) {
      dropIndex = idxOf(match.dropped_at_stage);
      if (dropIndex === null) {
        if (!match.dropped_at_stage) missingDropStage++;
        dropIndex = currentIdx;
      }
    }

    const candidates = [currentIdx, idxOf(match.furthest_stage), dropIndex].filter(
      (value): value is number => value !== null,
    );

    if (candidates.length === 0) {
      // E3: nothing about this record maps onto the pipeline.
      invalidRecords++;
      continue;
    }

    // A dropped candidate's furthest point IS where they were dropped. Taking
    // the max here instead would double-count anyone whose current_stage sits
    // later than their drop stage (messy data does produce this) as both
    // passed[i] and dropped[i], driving inProgress negative.
    // For live candidates, max() guards against a backwards stage move (E2).
    const furthest =
      isDropped && dropIndex !== null ? dropIndex : Math.max(...candidates);

    let reasons: string[] = [];
    if (isDropped) {
      if (match.drop_reasons?.length) {
        reasons = match.drop_reasons;
      } else {
        const html = match.drop_reason_html ?? dropEventByMatch.get(match.match_pk)?.info ?? null;
        if (html) {
          reasons = parseDropReasons(html);
        }
      }
      reasons = reasons
        .map((raw) => {
          const { reason, recognised } = canonicalize(raw);
          if (reason && !recognised) unrecognisedReasons.add(reason);
          return reason;
        })
        .filter(Boolean);
      if (!reasons.length) dropsWithoutReasons++;
    }

    resolved.push({
      furthest,
      isDropped,
      dropIndex,
      reasons,
      candidateId: match.candidate_id,
      source: match.source ?? null,
    });
  }

  // ---- Per-stage derivation ----------------------------------------------
  // entered[i] partitions exactly into passed[i] (reached further) and
  // {furthest === i}, which in turn partitions into dropped-here and still-here.
  const stageReports: StageReport[] = stages.map((name, index) => {
    const entered = resolved.filter((r) => r.furthest >= index).length;
    const dropped = resolved.filter((r) => r.isDropped && r.dropIndex === index).length;
    const passed = resolved.filter((r) => r.furthest > index).length;
    const inProgress = entered - dropped - passed;

    const [passedPct, inProgressPct, droppedPct] = largestRemainderRound(
      [passed, inProgress, dropped],
      entered,
    );

    const { counts } = countReasons(
      resolved.filter((r) => r.isDropped && r.dropIndex === index).map((r) => r.reasons),
    );

    return {
      name,
      index,
      entered,
      passed,
      dropped,
      inProgress,
      passedPct,
      inProgressPct,
      droppedPct,
      conversionPct: index < stages.length - 1 ? safePct(passed, entered) : null,
      dropReasons: counts,
      suppressPct: entered > 0 && entered < MIN_N_FOR_PERCENT,
    };
  });

  const integrityOk = stageReports.every((s) => s.entered === s.passed + s.dropped + s.inProgress);

  // ---- Which stages get detail cards -------------------------------------
  const reportedStages = stages.filter((stage) =>
    REPORTED_STAGES.some((wanted) => norm(wanted) === norm(stage)),
  );
  // A pipeline that does not use our canonical names still gets three cards.
  const effectiveReported = reportedStages.length ? reportedStages : stages.slice(0, 3);

  // ---- Totals ------------------------------------------------------------
  const droppedTotal = resolved.filter((r) => r.isDropped).length;
  const lastStageIndex = stages.length - 1;
  const { counts: overallDropReasons, mentions: dropReasonMentions } = countReasons(
    resolved.filter((r) => r.isDropped).map((r) => r.reasons),
  );

  const sourceTally = new Map<string, number>();
  for (const r of resolved) {
    if (r.source) sourceTally.set(r.source, (sourceTally.get(r.source) ?? 0) + 1);
  }

  // ---- Degradations ------------------------------------------------------
  const s = (n: number, one: string, many = `${one}s`) => `${n} ${pluralize(n, one, many)}`;

  addDegradation(
    "INVALID_RECORDS",
    `${s(invalidRecords, "record")} could not be mapped onto the pipeline and ${pluralize(invalidRecords, "was", "were")} excluded.`,
    invalidRecords,
  );
  addDegradation(
    "DUPLICATE_RECORDS",
    `${s(duplicateRecords, "duplicate match record")} merged.`,
    duplicateRecords,
  );
  // No MISSING_CANDIDATE_NAMES degradation: the dashboard reports counts, not
  // people, and never renders a candidate name. Flagging absent names would be
  // an alarming banner about data the report does not use.
  addDegradation(
    "MISSING_FURTHEST_STAGE",
    `${s(missingFurthest, "record")} had no furthest-stage field, so any candidate moved backwards may under-count as passed.`,
    missingFurthest,
  );
  addDegradation(
    "MISSING_DROP_STAGE",
    `${s(missingDropStage, "drop")} had no stage recorded and fell back to the candidate's current stage.`,
    missingDropStage,
  );
  // Deliberately no REASONS_PARSED_FROM_HTML: Manatal only ever records drop
  // reasons as an HTML note, so parsing them is the normal path, not a fault.
  // Reporting it would fire on every report forever and train people to
  // ignore this banner.
  addDegradation(
    "REASONS_UNAVAILABLE",
    `${dropsWithoutReasons} of ${droppedTotal} ${pluralize(droppedTotal, "drop")} had no reason recorded, so ${pluralize(dropsWithoutReasons, "it appears", "they appear")} as "${UNRECORDED_REASON}".`,
    dropsWithoutReasons,
  );
  // Either Manatal gained a reason this build doesn't know about, or the HTML
  // parser picked up something that isn't a reason at all. Both are worth
  // showing rather than quietly charting.
  addDegradation(
    "UNRECOGNISED_DROP_REASON",
    `${s(unrecognisedReasons.size, "drop reason")} not in the configured list: ${[...unrecognisedReasons].slice(0, 3).join(", ")}.`,
    unrecognisedReasons.size,
  );
  const unmappedTotal = [...unmapped.values()].reduce((sum, n) => sum + n, 0);
  addDegradation(
    "UNMAPPED_STAGES",
    `${s(unmappedTotal, "record")} reference a stage outside this job's pipeline: ${[...unmapped.keys()].slice(0, 3).join(", ")}.`,
    unmappedTotal,
  );
  // Manatal caps page_size at 100, so a workflow that does not follow `next`
  // silently loses everything past the first page. Every number on the page is
  // wrong when this fires, so say so loudly.
  const missingRecords = Math.max(
    (payload.meta?.sourceRecordCount ?? 0) - (payload.matches?.length ?? 0),
    1,
  );
  addDegradation(
    "TRUNCATED_UPSTREAM",
    payload.meta?.sourceRecordCount
      ? `Only ${payload.matches?.length ?? 0} of ${payload.meta.sourceRecordCount} candidates were returned — ${missingRecords} are missing and every figure below is under-counted. Enable pagination in the reporting workflow.`
      : "The data source capped its results, so every figure below is under-counted.",
    payload.meta?.truncated ? missingRecords : 0,
  );
  // Deliberately no NO_SOURCE_DATA warning: Manatal's matches endpoint has no
  // source field at all, so it could never be satisfied. The source tile just
  // hides itself instead.

  // ---- Period ------------------------------------------------------------
  const resolvedPeriod = resolvePeriod(options.periodType, options.periodKey);
  const period = {
    type: options.periodType,
    key: options.periodKey,
    label: formatPeriodLabel(resolvedPeriod),
    from: payload.period?.from ?? resolvedPeriod.from,
    to: payload.period?.to ?? resolvedPeriod.to,
  };

  return {
    job: {
      id: payload.job.id,
      title: payload.job.title ?? `Job ${payload.job.id}`,
      organizationId: payload.job.organizationId ?? null,
      organizationName: payload.job.organizationName ?? null,
      createdAt: payload.job.createdAt ?? null,
      status: payload.job.status ?? null,
    },
    period,
    stages,
    reportedStages: effectiveReported,
    totals: {
      applications: resolved.length,
      uniqueCandidates: new Set(resolved.map((r) => r.candidateId)).size,
      dropped: droppedTotal,
      completed: lastStageIndex >= 0 ? resolved.filter((r) => r.furthest >= lastStageIndex).length : 0,
      passThroughPct: safePct(resolved.filter((r) => r.furthest > 0).length, resolved.length),
      // Filled in by the caller, which knows the period window.
      appliedInPeriod: null,
    },
    stageReports,
    overallDropReasons,
    dropReasonMentions,
    sources: sourceTally.size
      ? [...sourceTally.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      : null,
    meta: {
      generatedAt: options.generatedAt,
      integrityOk,
      degradations,
      unmappedStages: [...unmapped.entries()].map(([name, count]) => ({ name, count })),
      invalidRecords,
      duplicateRecords,
      truncated: payload.meta?.truncated === true,
      sourceRecordCount: payload.meta?.sourceRecordCount ?? null,
    },
  };
}
