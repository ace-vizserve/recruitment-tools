/**
 * Recovers drop reasons straight from Manatal when the n8n workflow's activity
 * feed does not cover every drop.
 *
 * The workflow relays a `dropEvents` feed, but its coverage is partial: on the
 * older, larger jobs it reaches back only so far, and the drops it misses
 * appear on the dashboard as "Not recorded" even though the reason is sitting
 * in Manatal. `/matches/{id}/notes/` returns those notes per match, so the gap
 * can be closed here without waiting on a workflow change — the same treatment
 * `manatal-pipeline.ts` already gives the stage list.
 *
 * Notes are returned in the `dropEvents` shape rather than resolved to a
 * reason, so the aggregator's existing selection rules still apply: a note
 * carrying the "Drop Reasons" heading beats a plain recruiter comment, and
 * among those the latest one wins.
 */

import type { DropEvent } from "@/lib/reports/schema";

const API_BASE = "https://api.manatal.com/open/v3";
const TIMEOUT_MS = 10_000;
/** A dropped match's notes are effectively frozen, so this can be generous. */
const CACHE_TTL_MS = 30 * 60 * 1000;
/** Manatal tolerates this comfortably; the whole sweep still finishes in ~2s. */
const CONCURRENCY = 6;
/**
 * Total wall-clock this recovery may spend. The route also waits on n8n, which
 * is the slow half, so this stays well inside the function's 60s ceiling.
 */
const BUDGET_MS = 20_000;
/**
 * A job with more uncovered drops than this is a workflow problem, not
 * something to paper over one request at a time. The residual still shows up
 * as "Not recorded" and REASONS_UNAVAILABLE reports it, so nothing goes quiet.
 */
const MAX_LOOKUPS = 200;

interface ManatalNote {
  id?: number | string;
  info?: string | null;
  created_at?: string | null;
}

const cache = new Map<string, { notes: DropEvent[]; at: number }>();

async function fetchNotes(matchPk: string, apiKey: string): Promise<DropEvent[]> {
  const response = await fetch(`${API_BASE}/matches/${matchPk}/notes/`, {
    headers: { Authorization: `Token ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    console.error("[manatal-notes] GET notes for match", matchPk, "failed:", response.status);
    return [];
  }

  const body = (await response.json()) as unknown;
  // A bare array today. Tolerate a paginated wrapper in case that changes.
  const rows: ManatalNote[] = Array.isArray(body)
    ? (body as ManatalNote[])
    : ((body as { results?: ManatalNote[] })?.results ?? []);

  return rows
    .filter((note) => typeof note?.info === "string" && note.info.trim())
    .map((note) => ({
      match_pk: matchPk,
      candidate_id: null,
      job_id: null,
      stage: null,
      dropped_at: null,
      created_at: note.created_at ?? null,
      info: note.info as string,
      outOfCohort: null,
    }));
}

/**
 * @param matchPks Matches that are dropped and have no reason from any other
 *   source. Order matters: the budget is spent front to back.
 * @returns Notes in `dropEvents` shape, ready to append to the payload. Never
 *   throws — a failure just leaves those drops as "Not recorded", which is
 *   what they already were.
 */
export async function fetchDropReasonNotes(
  matchPks: readonly string[],
  apiKey: string | undefined,
): Promise<DropEvent[]> {
  if (!apiKey || !matchPks.length) return [];

  const deadline = Date.now() + BUDGET_MS;
  const wanted = matchPks.slice(0, MAX_LOOKUPS);
  if (matchPks.length > wanted.length) {
    console.error(
      `[manatal-notes] ${matchPks.length} drops without reasons; looking up the first ${wanted.length}`,
    );
  }

  const collected: DropEvent[] = [];
  const pending: string[] = [];

  for (const matchPk of wanted) {
    const hit = cache.get(matchPk);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) collected.push(...hit.notes);
    else pending.push(matchPk);
  }

  let cursor = 0;
  let ranOutOfTime = false;

  const worker = async () => {
    while (cursor < pending.length) {
      if (Date.now() > deadline) {
        ranOutOfTime = true;
        return;
      }
      const matchPk = pending[cursor++];
      try {
        const notes = await fetchNotes(matchPk, apiKey);
        cache.set(matchPk, { notes, at: Date.now() });
        collected.push(...notes);
      } catch (error) {
        console.error("[manatal-notes] Could not read notes for match", matchPk, error);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

  if (ranOutOfTime) {
    console.error("[manatal-notes] Ran out of budget before reading every match's notes");
  }
  return collected;
}
