/**
 * Download filenames for the reporting dashboard.
 *
 * A report leaves this app and is then identified by its filename alone —
 * sitting in a Downloads folder next to four others, or attached to an email
 * three weeks later. So the name carries the filters that produced it: which
 * organization, which job, which period. The numeric job id it used to carry
 * answered none of those questions for a human.
 */

import { ALL_PERIOD_KEY, type PeriodType } from "@/lib/reports/period";

/**
 * Long enough for a real job title, short enough that org and period are still
 * visible in a truncated file listing.
 */
const MAX_TITLE_CHARS = 48;

/** Lowercase ASCII and hyphens only — safe on Windows, macOS and email. */
export function slugifyForFilename(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TITLE_CHARS)
    .replace(/-+$/g, "");
}

/**
 * Spells the period filter out rather than leaving it as a bare key. "2026-08"
 * does not say it is a month, and "2026-W34" hides the week number behind a
 * one-letter code — but both are what someone is trying to read off a file
 * three weeks later.
 *
 * The number stays numeric ("2026-08", not "2026-aug") so a folder of these
 * still sorts chronologically, which an abbreviated month name would break at
 * the first April.
 */
function periodSegment(periodType: PeriodType, periodKey: string): string {
  if (periodType === "all" || periodKey === ALL_PERIOD_KEY) return "all-time";

  // Keys are generated filename-safe already; this only guards against
  // something unexpected arriving through the URL.
  const safe = periodKey.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  if (periodType === "weekly") {
    const week = /^(\d{4})-W(\d{2})$/.exec(periodKey);
    return week ? `weekly-${week[1]}-week-${week[2]}` : `weekly-${safe || "period"}`;
  }

  return `monthly-${safe || "period"}`;
}

interface ReportFilenameParts {
  /** From ENTITY_SLUGS — already a slug, but guarded in case an id falls through. */
  organizationSlug: string;
  jobTitle?: string | null;
  /** Only used when the title is missing, so the file still names *something*. */
  jobId?: string | null;
  /** The filter as chosen, not as inferred from the key. */
  periodType: PeriodType;
  /** `2026-08`, `2026-W34` or `all`. */
  periodKey: string;
  extension: "pdf" | "csv";
}

export function reportFilename({
  organizationSlug,
  jobTitle,
  jobId,
  periodType,
  periodKey,
  extension,
}: ReportFilenameParts): string {
  const parts = [
    "hfse-report",
    slugifyForFilename(organizationSlug) || "org",
    slugifyForFilename(jobTitle ?? "") || (jobId ? `job-${slugifyForFilename(jobId)}` : "job"),
    periodSegment(periodType, periodKey),
  ];

  return `${parts.join("_")}.${extension}`;
}
