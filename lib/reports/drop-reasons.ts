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

export interface ParsedDropReasons {
  reasons: string[];
  /**
   * True when the labels came out of prose after the heading rather than out
   * of `<li>` items. Manatal writes a list, so free text means a recruiter
   * typed the note by hand or the shape changed upstream — and either way the
   * split between one reason and the next is a guess.
   */
  fromFreeText: boolean;
}

export function parseDropReasons(info?: string | null): ParsedDropReasons {
  const none: ParsedDropReasons = { reasons: [], fromFreeText: false };
  if (!info || !info.trim()) return none;

  // The heading is required. Without it this is a free-text comment, and
  // treating its prose as a reason would invent categories that were never
  // recorded — the failure mode is silent and pollutes the whole chart.
  const headingMatch = HEADING_RE.exec(info);
  if (!headingMatch) return none;

  const tail = info.slice(headingMatch.index + headingMatch[0].length);

  // 1. List items — the shape Manatal actually produces.
  const listItems: string[] = [];
  for (const match of tail.matchAll(LI_RE)) {
    const value = clean(match[1] ?? "");
    if (value) listItems.push(value);
  }
  if (listItems.length) return { reasons: finalize(listItems), fromFreeText: false };

  // 2. Otherwise take the text after the heading, split on common separators.
  const parts = clean(tail)
    .split(SPLIT_RE)
    .map((part) => part.trim())
    .filter((part) => part && part.length < MAX_RESIDUE_LENGTH);

  const reasons = finalize(parts);
  return { reasons, fromFreeText: reasons.length > 0 };
}

/** Collapses runs of whitespace so two labels differing only in spacing match. */
export function normalizeReasonLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Groups spellings of one reason. Punctuation- and case-insensitive, so
 * "with job / offer" and "With Job/Offer" share a key.
 */
function reasonKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Most frequent spelling wins. Ties go to a capitalised label, then to
 * alphabetical order, so the choice never depends on the order records arrived
 * in — two runs over the same report must not label the same bar differently.
 */
function pickSpelling(spellings: Map<string, number>): string {
  const capitalised = (value: string) => Number(/^[A-Z]/.test(value));
  return [...spellings.entries()].sort(
    (a, b) => b[1] - a[1] || capitalised(b[0]) - capitalised(a[0]) || a[0].localeCompare(b[0]),
  )[0][0];
}

/**
 * Resolves the parsed labels onto one spelling per reason.
 *
 * There is no vocabulary to check against and none is needed: every label was
 * read out of Manatal's own drop note, so the reasons in a report already ARE
 * the reasons Manatal recorded. What is left is a presentation problem — two
 * spellings of one reason would split a bar in two — and the labels themselves
 * settle it. Title-casing instead would invent "Background & Reference Check
 * Failed", a spelling nobody ever typed.
 *
 * `preferred` (the payload's `dropReasonVocabulary`) overrides the tally when
 * supplied, so a workflow that can read Manatal's configured list can pin the
 * official spelling even where recruiters mostly typed a variant.
 */
export function createReasonCanonicalizer(
  observed: readonly string[],
  preferred: readonly string[] = [],
): (raw: string) => string {
  const tally = new Map<string, Map<string, number>>();
  for (const raw of observed) {
    const label = normalizeReasonLabel(raw);
    const key = reasonKey(label);
    if (!key) continue;
    const spellings = tally.get(key) ?? new Map<string, number>();
    spellings.set(label, (spellings.get(label) ?? 0) + 1);
    tally.set(key, spellings);
  }

  const chosen = new Map<string, string>();
  for (const [key, spellings] of tally) chosen.set(key, pickSpelling(spellings));

  // Applied after the tally so a supplied spelling wins. Reasons absent from
  // this report are seeded too, which costs nothing and keeps the mapping
  // identical across two reports that happened to see different variants.
  for (const raw of preferred) {
    const label = normalizeReasonLabel(raw);
    const key = reasonKey(label);
    if (key) chosen.set(key, label);
  }

  return (raw: string) => {
    const label = normalizeReasonLabel(raw);
    // A label with no alphanumerics has no key to group on; keep it as typed.
    return chosen.get(reasonKey(label)) ?? label;
  };
}

export const UNRECORDED_REASON = "Not recorded";
