/**
 * Chart colours for the reporting dashboard.
 *
 * Literal hex, not the `--chart-1..5` CSS variables in globals.css: those are
 * untouched shadcn defaults whose light and dark values are unrelated hues
 * (light --chart-1 is orange, dark is violet-blue), and none of them carry the
 * pass/drop polarity this dashboard needs. They are left in place because a
 * future `shadcn add` may reference them.
 *
 * Hex rather than var() also means html-to-image has one less computed-style
 * indirection to resolve while rasterising the export.
 */

/**
 * Outcome is a polarity, not an identity, so this is a diverging blue↔red pair
 * with a neutral midpoint.
 *
 * Green-for-passed / red-for-dropped is the obvious choice and it fails: those
 * two measure ΔE 4.1 under deuteranopia, well below the ΔE 8 floor, so roughly
 * 1 in 12 men could not tell the bars apart. Blue↔red measures ΔE 23.8.
 */
export const OUTCOME_COLORS = {
  passed: "#2a78d6",
  inProgress: "#898781",
  dropped: "#d03b3b",
} as const;

/**
 * Chart chrome. Ink is slate-900, matching the app's text colour.
 *
 * MUTED_INK is slate-700, not a light warm grey: the export is a 1:1 raster of
 * the screen, so anything that reads as a soft de-emphasis on a backlit display
 * comes out of a printer as barely-there grey. Axis and value labels carry the
 * numbers, so they get a colour that survives toner.
 */
export const INK = "#0f172a";
export const MUTED_INK = "#334155";
export const GRID = "#e1e0d9";
export const AXIS = "#c3c2b7";
export const SURFACE = "#ffffff";

/** Single hue for nominal categories — see dropReasonColor below. */
export const PRIMARY = "#2a78d6";

const RAMP_3 = ["#2a78d6", "#5598e7", "#86b6ef"];
const RAMP_4 = ["#104281", "#256abf", "#3987e5", "#86b6ef"];

/**
 * Funnel stages are an ordered scale, so a lightness ramp is meaningful here
 * (unlike nominal categories). Beyond four steps every candidate ramp either
 * drops adjacent lightness below the 0.06 separation floor or pushes the light
 * end under 2:1 contrast against white — and since a funnel is already ordered
 * by position, hue is redundant. So five or more stages get one flat colour.
 */
export function funnelRamp(stageCount: number): string[] {
  if (stageCount <= 3) return RAMP_3.slice(0, Math.max(stageCount, 1));
  if (stageCount === 4) return RAMP_4;
  return Array.from({ length: stageCount }, () => PRIMARY);
}

/**
 * Drop reasons are nominal categories. A value-ramp would double-encode bar
 * length as hue and burn the only free channel, so every bar is the same.
 */
export const dropReasonColor = () => PRIMARY;

/**
 * Chart type sizes. Recharts takes numbers, not classes, so the print pass has
 * to live here rather than in Tailwind. The value labels are the numbers people
 * actually read off a printed sheet, so they are set a step above the axis
 * labels that frame them.
 */
export const AXIS_LABEL_SIZE = 15;
export const VALUE_LABEL_SIZE = 17;
