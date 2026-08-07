/**
 * Drop reasons arrive from Manatal as an HTML blob on the activity record, e.g.
 *   "<strong>Drop Reasons:</strong><br><br><li>High Asking</li><br><p></p>"
 *
 * The webhook contract asks for a structured `drop_reasons` array; this parser
 * is the fallback for the shape that exists today. Regex rather than DOMParser
 * because this runs inside a route handler where there is no `document`.
 *
 * Everything here produces plain text. Nothing in the reporting feature renders
 * `info` as HTML — it is upstream-controlled content.
 */

const LI_RE = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const TAG_RE = /<[^>]*>/g;
const HEADING_RE = /drop\s*reasons?\s*:?/i;
const SPLIT_RE = /\s*[,;|•·]\s*|\r?\n/;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
  "&nbsp;": " ",
};

const MAX_REASONS = 10;
/** Longer than this and the residue is prose, not a reason label. */
const MAX_RESIDUE_LENGTH = 120;

function decodeEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|#0?39|nbsp);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function clean(input: string): string {
  return decodeEntities(input.replace(TAG_RE, " ")).replace(/\s+/g, " ").trim();
}

function finalize(reasons: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const reason of reasons) {
    if (!reason) continue;
    const fingerprint = reason.toLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    out.push(reason);
    if (out.length >= MAX_REASONS) break;
  }
  return out;
}

/**
 * True when this activity record is a drop record rather than an ordinary
 * comment. The same feed carries both — recruiter notes like "Hi Mr Raf, please
 * proceed with the initial interview" sit alongside the drop entries, and only
 * the drop entries carry the heading.
 */
export function hasDropReasons(info?: string | null): boolean {
  return !!info && HEADING_RE.test(info);
}

export function parseDropReasons(info?: string | null): string[] {
  if (!info || !info.trim()) return [];

  // The heading is required. Without it this is a free-text comment, and
  // treating its prose as a reason would invent categories that were never
  // recorded — the failure mode is silent and pollutes the whole chart.
  const headingMatch = HEADING_RE.exec(info);
  if (!headingMatch) return [];

  const tail = info.slice(headingMatch.index + headingMatch[0].length);

  // 1. List items — the shape Manatal actually produces.
  const listItems: string[] = [];
  for (const match of tail.matchAll(LI_RE)) {
    const value = clean(match[1] ?? "");
    if (value) listItems.push(value);
  }
  if (listItems.length) return finalize(listItems);

  // 2. Otherwise take the text after the heading, split on common separators.
  const parts = clean(tail)
    .split(SPLIT_RE)
    .map((part) => part.trim())
    .filter((part) => part && part.length < MAX_RESIDUE_LENGTH);

  return finalize(parts);
}

/**
 * The drop reasons configured in Manatal. This is a closed set, which is what
 * lets us both normalise spelling and detect parse failures: anything that
 * comes out of the HTML and is *not* in here is either a new reason added in
 * Manatal or a sign the parser picked up something it shouldn't have.
 *
 * Not fetchable from the Open API (no drop-reasons endpoint exists there), so
 * it is embedded here. A workflow that can read the internal API may override
 * it per request via `dropReasonVocabulary` on the payload.
 */
export const DEFAULT_DROP_REASONS = [
  "Background & Reference check failed",
  "Blacklisted",
  "Decline the Offer",
  "Failed Interview",
  "Failed Paperscreening",
  "Filled position",
  "Foreigner",
  "High Asking",
  "Keep in view",
  "Not Interested",
  "Overqualified",
  "Pooling",
  "Relief finished",
  "Resigned",
  "Withdraw",
  "With Job/Offer",
] as const;

/** Punctuation- and case-insensitive, so "with job / offer" still matches. */
function vocabularyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface CanonicalReason {
  reason: string;
  /** False when the label is not in the configured vocabulary. */
  recognised: boolean;
}

/**
 * Resolves a parsed label onto its official spelling. Title-casing the input
 * instead would produce "Background & Reference Check Failed", which is a
 * different string from the configured reason and would split one bar in two.
 */
export function createReasonCanonicalizer(
  vocabulary: readonly string[] = DEFAULT_DROP_REASONS,
): (raw: string) => CanonicalReason {
  const lookup = new Map(vocabulary.map((reason) => [vocabularyKey(reason), reason]));

  return (raw: string) => {
    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) return { reason: "", recognised: false };

    const match = lookup.get(vocabularyKey(trimmed));
    if (match) return { reason: match, recognised: true };

    return { reason: trimmed, recognised: false };
  };
}

export const UNRECORDED_REASON = "Not recorded";
