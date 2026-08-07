import * as z from "zod";

/**
 * Validation for the n8n reporting webhook payload, run at the trust boundary
 * inside app/api/reports/route.ts before anything is aggregated.
 *
 * Only the fields the derivation genuinely needs are required. Everything else
 * is optional and handled by a degradation in the aggregator, and match objects
 * allow unknown keys so a new field added in n8n cannot 502 the whole report.
 */

const isoDate = z.string().min(1);

export const MatchRecordSchema = z
  .object({
    match_pk: z.union([z.string(), z.number()]).transform(String),
    candidate_id: z.union([z.string(), z.number()]).transform(String),
    job_id: z.union([z.string(), z.number()]).transform(String),
    current_stage: z.string().min(1),
    applied_at: isoDate,
    is_dropped: z.boolean().optional(),

    furthest_stage: z.string().nullish(),
    candidate_name: z.string().nullish(),
    dropped_at: isoDate.nullish(),
    dropped_at_stage: z.string().nullish(),
    drop_reasons: z.array(z.string()).nullish(),
    drop_reason_html: z.string().nullish(),
    source: z.string().nullish(),
  })
  .loose();

export const DropEventSchema = z
  .object({
    match_pk: z.union([z.string(), z.number()]).transform(String),
    candidate_id: z.union([z.string(), z.number()]).transform(String).nullish(),
    job_id: z.union([z.string(), z.number()]).transform(String).nullish(),
    stage: z.string().nullish(),
    dropped_at: isoDate.nullish(),
    created_at: isoDate.nullish(),
    info: z.string().nullish(),
    outOfCohort: z.boolean().nullish(),
  })
  .loose();

export const ReportPayloadSchema = z
  .object({
    job: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String),
        title: z.string().nullish(),
        organizationId: z.union([z.string(), z.number()]).transform(String).nullish(),
        organizationName: z.string().nullish(),
        createdAt: isoDate.nullish(),
        status: z.string().nullish(),
      })
      .loose(),
    period: z
      .object({
        type: z.enum(["weekly", "monthly"]),
        key: z.string().min(1),
        from: isoDate,
        to: isoDate,
      })
      .loose()
      .optional(),
    stages: z.array(z.string().min(1)).min(1),
    matches: z.array(MatchRecordSchema).default([]),
    dropEvents: z.array(DropEventSchema).default([]),
    /**
     * Manatal's configured drop reasons, if the workflow can read them.
     * Accepts plain strings or `{ id, reason }` objects. Omit to use the list
     * built into lib/reports/drop-reasons.ts.
     */
    dropReasonVocabulary: z
      .array(z.union([z.string(), z.object({ reason: z.string() }).loose()]))
      .transform((list) => list.map((entry) => (typeof entry === "string" ? entry : entry.reason)))
      .nullish(),
    meta: z
      .object({
        generatedAt: z.string().nullish(),
        sourceRecordCount: z.number().nullish(),
        truncated: z.boolean().nullish(),
      })
      .loose()
      .optional(),
  })
  .loose();

export type MatchRecord = z.infer<typeof MatchRecordSchema>;
export type DropEvent = z.infer<typeof DropEventSchema>;
export type ReportPayload = z.infer<typeof ReportPayloadSchema>;

/* --------------------------------------------------------------------------
 * Raw Manatal Open API shapes.
 *
 * The alternative payload the n8n workflow can send: Manatal's own responses,
 * relayed untouched. lib/reports/manatal.ts maps these onto ReportPayload.
 * ----------------------------------------------------------------------- */

const ManatalStageRefSchema = z.object({ id: z.number().optional(), name: z.string() }).loose();

export const ManatalMatchSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    candidate: z.union([z.string(), z.number()]),
    job: z.union([z.string(), z.number()]).nullish(),
    stage: ManatalStageRefSchema.nullish(),
    job_pipeline_stage: ManatalStageRefSchema.extend({ rank: z.number() }).loose().nullish(),
    submitted_at: z.string().nullish(),
    created_at: z.string().nullish(),
    dropped_at: z.string().nullish(),
    // Milestone timestamps. These are the only per-stage dates Manatal
    // exposes, and they are what makes an activity-scoped period possible.
    interview_at: z.string().nullish(),
    offer_at: z.string().nullish(),
    hired_at: z.string().nullish(),
    is_active: z.boolean().nullish(),
    /** Not native to Manatal; present only if n8n enriches the record. */
    source: z.string().nullish(),
  })
  .loose();

/** One page of `/matches/`, as returned by Manatal (and relayed by n8n). */
const ManatalMatchPageSchema = z
  .object({
    count: z.number().nullish(),
    next: z.string().nullish(),
    results: z.array(ManatalMatchSchema),
  })
  .loose();

export const ManatalPayloadSchema = z
  .object({
    job: z
      .object({
        id: z.union([z.string(), z.number()]),
        position_name: z.string().nullish(),
        organization: z.union([z.string(), z.number()]).nullish(),
        status: z.string().nullish(),
        created_at: z.string().nullish(),
      })
      .loose()
      .nullish(),
    /**
     * From `/open/v3/job-pipelines/` — the authoritative ordered stage list.
     * Optional: when absent the order is derived from the matches' own
     * `job_pipeline_stage.rank`, which costs only the stages that currently
     * hold nobody.
     */
    pipeline: z
      .object({
        id: z.union([z.string(), z.number()]).nullish(),
        name: z.string().nullish(),
        job_pipeline_stages: z.array(
          z.object({ id: z.union([z.string(), z.number()]).nullish(), name: z.string(), rank: z.number() }).loose(),
        ),
      })
      .loose()
      .nullish(),
    /** Flat matches, or the raw page objects — both are accepted. */
    matches: z.array(z.union([ManatalMatchPageSchema, ManatalMatchSchema])).default([]),
    dropEvents: z.array(DropEventSchema).default([]),
    organizationName: z.string().nullish(),
    /** Same as on the report contract — see ReportPayloadSchema. */
    dropReasonVocabulary: z
      .array(z.union([z.string(), z.object({ reason: z.string() }).loose()]))
      .transform((list) => list.map((entry) => (typeof entry === "string" ? entry : entry.reason)))
      .nullish(),
  })
  .loose();

export type ManatalMatch = z.infer<typeof ManatalMatchSchema>;
export type ManatalPayload = z.infer<typeof ManatalPayloadSchema>;

/** Manatal payloads carry either a `matches` array or a pipeline definition. */
export function isManatalPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { pipeline?: unknown; matches?: unknown };

  if (Array.isArray(candidate.matches)) return true;

  const pipeline = candidate.pipeline;
  return (
    !!pipeline &&
    typeof pipeline === "object" &&
    Array.isArray((pipeline as { job_pipeline_stages?: unknown }).job_pipeline_stages)
  );
}

function looksLikeActivityRecord(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "match_pk" in value &&
    "info" in value &&
    !("matches" in value) &&
    !("pipeline" in value)
  );
}

/**
 * True for the bare activity/notes feed — records carrying `match_pk` and
 * `info` but no match data. This cannot support the report: every such record
 * is a drop, so nothing describes candidates who passed or are still in
 * progress.
 *
 * Matches both a full array of notes and a single record, because n8n's
 * "Respond With: First Incoming Item" returns one bare object rather than the
 * list.
 */
export function isNotesOnlyPayload(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0 && looksLikeActivityRecord(value[0]);
  return looksLikeActivityRecord(value);
}
