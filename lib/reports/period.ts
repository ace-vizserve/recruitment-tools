/**
 * Weekly / monthly period math for recruitment reports.
 *
 * Deliberately dependency-free. The hard part here is not calendar arithmetic,
 * it is that Manatal timestamps are UTC while "August" means August *in
 * Singapore*. date-fns would not solve that on its own (its startOfMonth is
 * local-timezone, so a UTC server needs @date-fns/tz too), whereas one explicit
 * offset constant is auditable. Keep every date operation in this file so
 * swapping to a real date library later stays a one-file change.
 */

/** Asia/Singapore is UTC+8 year round — no DST to model. */
export const REPORT_TZ_OFFSET_MINUTES = 480;

const OFFSET_MS = REPORT_TZ_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const WEEK_KEY_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * "all" is the whole life of the job rather than a calendar window. It is
 * modelled as one period spanning everything, so the job's own creation date
 * is what actually bounds the data — which keeps this module free of any
 * dependency on job metadata, and free of a clock.
 */
export type PeriodType = "weekly" | "monthly" | "all";

export const ALL_PERIOD_KEY = "all";
const ALL_FROM = "1970-01-01T00:00:00.000Z";
const ALL_TO = "2100-01-01T00:00:00.000Z";

export interface Period {
  type: PeriodType;
  /** `YYYY-MM` for monthly, `YYYY-Www` for weekly. */
  key: string;
  label: string;
  /** Inclusive start, as a UTC instant. */
  from: string;
  /** Inclusive end (…T23:59:59.999 local), as a UTC instant. */
  to: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Shift a UTC instant so the UTC getters read as Singapore wall-clock fields. */
function toZoned(d: Date): Date {
  return new Date(d.getTime() + OFFSET_MS);
}

/** Build a UTC instant from Singapore wall-clock calendar fields. */
function fromZonedParts(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0) - OFFSET_MS);
}

export function monthKey(d: Date): string {
  const z = toZoned(d);
  return `${z.getUTCFullYear()}-${pad2(z.getUTCMonth() + 1)}`;
}

/** ISO-8601 week number, computed on Singapore calendar days. */
export function isoWeekKey(d: Date): string {
  const z = toZoned(d);
  const midnight = new Date(Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate()));
  // Shift to the Thursday of this week — the ISO year is whichever year owns it.
  const dayNum = midnight.getUTCDay() || 7;
  midnight.setUTCDate(midnight.getUTCDate() + 4 - dayNum);
  const isoYear = midnight.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((midnight.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${isoYear}-W${pad2(week)}`;
}

export function periodKeyFor(type: PeriodType, d: Date): string {
  if (type === "all") return ALL_PERIOD_KEY;
  return type === "monthly" ? monthKey(d) : isoWeekKey(d);
}

export function isValidPeriodKey(type: PeriodType, key: string | null | undefined): boolean {
  if (!key) return false;
  if (type === "all") return key === ALL_PERIOD_KEY;
  return type === "monthly" ? MONTH_KEY_RE.test(key) : WEEK_KEY_RE.test(key);
}

/** Singapore-local calendar fields of the Monday starting a given ISO week. */
function isoWeekMondayParts(isoYear: number, week: number) {
  // 4 January is always in ISO week 1.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (dayNum - 1) * DAY_MS);
  const monday = new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
  return { year: monday.getUTCFullYear(), monthIndex: monday.getUTCMonth(), day: monday.getUTCDate() };
}

/**
 * Turn a period key into the absolute UTC instants that bound it in Singapore
 * time. `to` is inclusive (…:59.999) so downstream filters can use `<=`.
 */
export function resolvePeriod(type: PeriodType, key: string): Period {
  if (!isValidPeriodKey(type, key)) {
    throw new Error(`Invalid ${type} period key: ${key}`);
  }

  if (type === "all") {
    return { type, key: ALL_PERIOD_KEY, label: "All time", from: ALL_FROM, to: ALL_TO };
  }

  let from: Date;
  let to: Date;

  if (type === "monthly") {
    const year = Number(key.slice(0, 4));
    const monthIndex = Number(key.slice(5, 7)) - 1;
    from = fromZonedParts(year, monthIndex, 1);
    to = new Date(fromZonedParts(year, monthIndex + 1, 1).getTime() - 1);
  } else {
    const isoYear = Number(key.slice(0, 4));
    const week = Number(key.slice(6, 8));
    const { year, monthIndex, day } = isoWeekMondayParts(isoYear, week);
    from = fromZonedParts(year, monthIndex, day);
    to = new Date(from.getTime() + 7 * DAY_MS - 1);
  }

  const period: Period = { type, key, label: "", from: from.toISOString(), to: to.toISOString() };
  period.label = formatPeriodLabel(period);
  return period;
}

export function formatPeriodLabel(period: Pick<Period, "type" | "key" | "from" | "to">): string {
  if (period.type === "all") return "All time";

  if (period.type === "monthly") {
    const year = Number(period.key.slice(0, 4));
    const monthIndex = Number(period.key.slice(5, 7)) - 1;
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  }

  const start = toZoned(new Date(period.from));
  const end = toZoned(new Date(period.to));
  const week = Number(period.key.slice(6, 8));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const left = sameMonth
    ? `${start.getUTCDate()}`
    : `${start.getUTCDate()} ${SHORT_MONTHS[start.getUTCMonth()]}`;
  const right = `${end.getUTCDate()} ${SHORT_MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return `Week ${week} · ${left}–${right}`;
}

export function currentPeriod(type: PeriodType, now: Date = new Date()): Period {
  return resolvePeriod(type, periodKeyFor(type, now));
}

function previousPeriodKey(type: PeriodType, key: string): string {
  const { from } = resolvePeriod(type, key);
  // One millisecond before the start lands inside the previous period.
  return periodKeyFor(type, new Date(new Date(from).getTime() - 1));
}

/**
 * True when `now` falls inside the period — i.e. its data is still accruing.
 * Always false for "all time", which is complete by definition rather than an
 * unfinished window.
 */
export function isPeriodInProgress(period: Period, now: Date = new Date()): boolean {
  if (period.type === "all") return false;
  const t = now.getTime();
  return t >= new Date(period.from).getTime() && t <= new Date(period.to).getTime();
}

/** True when the job was created partway through the period, so it is clipped. */
export function isPeriodPartialForJob(period: Period, jobCreatedAt: string | null | undefined): boolean {
  if (period.type === "all" || !jobCreatedAt) return false;
  const created = new Date(jobCreatedAt);
  if (Number.isNaN(created.getTime())) return false;
  return created.getTime() > new Date(period.from).getTime() && created.getTime() <= new Date(period.to).getTime();
}

/** Hard ceilings so a very old job cannot render a thousand-row picker. */
const MAX_PERIODS: Record<PeriodType, number> = { weekly: 104, monthly: 60, all: 1 };
const FALLBACK_PERIODS = 12;

/**
 * Every period the job could have data for, newest first: from the period
 * containing `jobCreatedAt` through the period containing `now`.
 *
 * Without a creation date (Manatal did not return one) this falls back to the
 * last 12 periods rather than rendering an empty picker.
 */
export function availablePeriods(
  type: PeriodType,
  jobCreatedAt: string | null | undefined,
  now: Date = new Date(),
): Period[] {
  // "All time" is a single period, so there is nothing to enumerate.
  if (type === "all") return [resolvePeriod("all", ALL_PERIOD_KEY)];

  const parsedCreation = jobCreatedAt ? new Date(jobCreatedAt) : null;
  const createdAt = parsedCreation && !Number.isNaN(parsedCreation.getTime()) ? parsedCreation : null;

  const periods: Period[] = [];
  let key = periodKeyFor(type, now);

  for (let i = 0; i < MAX_PERIODS[type]; i++) {
    const period = resolvePeriod(type, key);
    periods.push(period);

    if (createdAt) {
      // Stop once we reach the period the job was created in.
      if (new Date(period.from).getTime() <= createdAt.getTime()) break;
    } else if (periods.length >= FALLBACK_PERIODS) {
      break;
    }

    key = previousPeriodKey(type, key);
  }

  return periods;
}

/**
 * Keep the user's place when they toggle weekly ↔ monthly: re-resolve using a
 * date inside the period they were already looking at, rather than resetting.
 */
export function remapPeriodKey(fromType: PeriodType, key: string, toType: PeriodType): string {
  if (fromType === toType) return key;
  if (toType === "all") return ALL_PERIOD_KEY;
  // Leaving "all time" has no calendar position to carry over, so land on the
  // period containing today.
  if (fromType === "all" || !isValidPeriodKey(fromType, key)) return periodKeyFor(toType, new Date());
  const { from } = resolvePeriod(fromType, key);
  return periodKeyFor(toType, new Date(from));
}
