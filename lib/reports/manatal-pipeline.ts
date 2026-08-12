/**
 * Recovers a job's ordered stage list straight from Manatal.
 *
 * The n8n workflow is supposed to relay `/open/v3/job-pipelines/` alongside the
 * matches, but when it does not, the stage order falls back to being derived
 * from the candidates present — which silently drops any stage nobody has
 * reached (routinely rank 3, "RC/BC"). Fetching it here fixes the funnel
 * without waiting on a workflow change.
 *
 * Manatal exposes no pipeline reference on the job resource itself, so the id
 * comes from a match's `job_pipeline_stage.job_pipeline.id`.
 */

const API_BASE = "https://api.manatal.com/open/v3";
const TIMEOUT_MS = 10_000;
/** Pipelines are edited about never, so a long TTL costs nothing. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Shaped to slot straight into ManatalPayloadSchema's `pipeline`, which is a
 * loose object — hence the index signature.
 */
export interface PipelineStage {
  id?: number | string | null;
  name: string;
  rank: number;
  [key: string]: unknown;
}

const cache = new Map<string, { stages: PipelineStage[]; at: number }>();

function isStageList(value: unknown): value is PipelineStage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) =>
        entry && typeof entry === "object" && typeof entry.name === "string" && typeof entry.rank === "number",
    )
  );
}

async function getJson(url: string, apiKey: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: { Authorization: `Token ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    console.error("[manatal-pipeline] GET", url, "failed:", response.status);
    return null;
  }
  return response.json();
}

/**
 * @param pipelineId Taken from any match. Null when the job has no matches at
 *   all, in which case the single-pipeline fallback below is the only option.
 * @returns The ordered stages, or null — never throws. A null result leaves the
 *   existing derived-stage path and its DERIVED_STAGE_LIST banner in charge.
 */
export async function fetchPipelineStages(
  pipelineId: string | number | null,
  apiKey: string | undefined,
): Promise<PipelineStage[] | null> {
  if (!apiKey) return null;

  const cacheKey = pipelineId != null ? String(pipelineId) : "__sole__";
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.stages;

  try {
    let stages: unknown;

    if (pipelineId != null) {
      const pipeline = (await getJson(`${API_BASE}/job-pipelines/${pipelineId}/`, apiKey)) as {
        job_pipeline_stages?: unknown;
      } | null;
      stages = pipeline?.job_pipeline_stages;
    } else {
      // No match to read an id off. Safe only when the account has exactly one
      // pipeline — with several there is nothing to attribute the job by, and
      // guessing would mislabel the whole funnel.
      const list = (await getJson(`${API_BASE}/job-pipelines/`, apiKey)) as {
        count?: number;
        results?: { job_pipeline_stages?: unknown }[];
      } | null;
      if (list?.count !== 1) return null;
      stages = list.results?.[0]?.job_pipeline_stages;
    }

    if (!isStageList(stages)) return null;

    cache.set(cacheKey, { stages, at: Date.now() });
    return stages;
  } catch (error) {
    console.error("[manatal-pipeline] Could not fetch the pipeline:", error);
    return null;
  }
}
