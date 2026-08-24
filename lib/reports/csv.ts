/**
 * CSV export for the reporting dashboard.
 *
 * The PDF is a picture of the report — right for reading and forwarding, no
 * use to anyone who wants to pivot the numbers or paste a quarter's worth of
 * them into one sheet. This is the other half: every figure on the dashboard
 * as data, in one file.
 *
 * One file with labelled sections rather than a zip of four, because that is
 * what actually gets opened. Percentages are emitted as bare numbers, not
 * "50%", so a spreadsheet can average a column instead of seeing text; the
 * column headers carry the unit.
 */

import type { ReportAggregate } from "@/lib/reports/types";

/** RFC 4180 line ending. Excel accepts a bare newline; older parsers do not. */
const EOL = "\r\n";

/**
 * A leading =, +, - or @ makes Excel and Sheets read a cell as a formula. Drop
 * reason names are free text typed by recruiters upstream, so this is reachable
 * in practice rather than theoretical. A leading apostrophe is the standard
 * defusal: the sheet shows the text and evaluates nothing.
 */
function defuse(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string | number | null | undefined): string {
  // Null becomes an empty cell, never an em dash: a spreadsheet should see a
  // blank it can skip, not text it has to be told to ignore.
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  const text = defuse(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(values: (string | number | null | undefined)[]): string {
  return values.map(cell).join(",");
}

/**
 * Forces a cell to stay text. Excel guesses at anything that looks remotely
 * like a date — "August 2026" silently became the date value "Aug-26" — and no
 * amount of quoting stops it, because quoting is CSV syntax and the coercion
 * happens after parsing. A leading apostrophe is the one thing it honours, and
 * it is not displayed.
 *
 * The apostrophe is an Excel convention, not CSV: pandas and friends see it as
 * a literal character. So this is used only on the header block below — labels
 * a human reads, never a column a script parses — rather than on every string
 * in the file.
 */
function asText(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `'${value}`;
}

/** Percentages arrive as 0–100 already; rounding matches what is on screen. */
function pct(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : Math.round(value);
}

interface CsvContext {
  /** Names as chosen in the filter row, so the file matches what was on screen. */
  jobTitle?: string | null;
  organizationName?: string | null;
}

export function buildReportCsv(report: ReportAggregate, { jobTitle, organizationName }: CsvContext = {}): string {
  const { job, period, totals, stageReports, overallDropReasons, meta } = report;
  const lines: string[] = [];

  // ---- What this file is --------------------------------------------------
  // The same job the on-screen footnote names, for the same reason: a CSV gets
  // renamed, emailed and merged, and by then the filename is not evidence.
  lines.push(row(["Organization", organizationName ?? job.organizationName]));
  lines.push(row(["Job", jobTitle ?? job.title]));
  // Both are labels, not quantities: an id is an identifier Excel would render
  // as a number, and "August 2026" is what it silently turned into "Aug-26".
  lines.push(row(["Job ID", asText(job.id)]));
  lines.push(row(["Period", asText(period.label)]));
  lines.push(row(["Period from", period.from]));
  lines.push(row(["Period to", period.to]));
  lines.push(row(["Generated", meta.generatedAt]));
  if (report.isSampleData) lines.push(row(["Source", "SAMPLE DATA - not live figures"]));
  lines.push("");

  // ---- Summary ------------------------------------------------------------
  lines.push(row(["Summary"]));
  lines.push(row(["Metric", "Value", "Unit"]));
  lines.push(row(["Candidates active", totals.applications, "candidates"]));
  lines.push(row(["Unique candidates", totals.uniqueCandidates, "candidates"]));
  lines.push(row(["New applications", totals.appliedInPeriod, "candidates"]));
  lines.push(row(["Dropped", totals.dropped, "candidates"]));
  lines.push(
    row([
      "Dropped",
      pct(totals.applications ? (totals.dropped / totals.applications) * 100 : null),
      "% of active candidates",
    ]),
  );
  lines.push(row(["Reached final stage", totals.completed, "candidates"]));
  lines.push(row([`Pass-through to ${report.stages[1] ?? "second stage"}`, pct(totals.passThroughPct), "%"]));
  lines.push("");

  // ---- Stage detail -------------------------------------------------------
  // The whole pipeline, not the reported subset — same as the funnel, since a
  // stage nobody reached is a finding too.
  lines.push(row(["Stage detail"]));
  lines.push(
    row([
      "Stage",
      "Reached",
      "Passed",
      "Passed (%)",
      "In stage",
      "In stage (%)",
      "Dropped",
      "Dropped (%)",
      "Conversion to next (%)",
    ]),
  );
  for (const stage of stageReports) {
    lines.push(
      row([
        stage.name,
        stage.entered,
        stage.passed,
        pct(stage.passedPct),
        stage.inProgress,
        pct(stage.inProgressPct),
        stage.dropped,
        pct(stage.droppedPct),
        pct(stage.conversionPct),
      ]),
    );
  }
  lines.push("");

  // ---- Drop reasons -------------------------------------------------------
  // Long rather than wide — one row per reason per scope — so the sheet pivots
  // without unpicking a header row made of stage names.
  lines.push(row(["Drop reasons"]));
  lines.push(row([`${report.dropReasonMentions} mentions across ${totals.dropped} drops`]));
  lines.push(row(["Scope", "Reason", "Mentions"]));
  for (const reason of overallDropReasons) {
    lines.push(row(["All stages", reason.reason, reason.count]));
  }
  for (const stage of stageReports) {
    for (const reason of stage.dropReasons) {
      lines.push(row([stage.name, reason.reason, reason.count]));
    }
  }

  // ---- Caveats ------------------------------------------------------------
  // Degradations are surfaced on screen and must not be lost on the way out. A
  // CSV that silently omits "reason missing for 6 candidates" reads as a
  // complete count once it is away from the dashboard.
  if (meta.degradations.length > 0) {
    lines.push("");
    lines.push(row(["Data quality notes"]));
    lines.push(row(["Code", "Note", "Affected records"]));
    for (const degradation of meta.degradations) {
      lines.push(row([degradation.code, degradation.message, degradation.affectedCount]));
    }
  }

  // The BOM is what makes Excel read the file as UTF-8 rather than the local
  // codepage — without it, names with accents arrive mangled.
  return `\uFEFF${lines.join(EOL)}${EOL}`;
}

/** Hands the built CSV to the browser as a download. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking straight away can beat the download in some browsers; a frame is
  // enough for the click to have been consumed.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
