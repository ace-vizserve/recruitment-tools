"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

import ChartDataTable from "@/components/reports/charts/chart-data-table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  AXIS_LABEL_SIZE,
  funnelRamp,
  GRID,
  INK,
  MUTED_INK,
  PRIMARY,
  VALUE_LABEL_SIZE,
} from "@/lib/reports/chart-theme";
import { formatCount, formatPct } from "@/lib/reports/format";
import type { StageReport } from "@/lib/reports/types";

const CHART_CONFIG = {
  entered: { label: "Reached stage", color: PRIMARY },
} satisfies ChartConfig;

/** Roughly what fits under one bar at AXIS_LABEL_SIZE before the labels touch. */
const TICK_LINE_CHARS = 10;

/** Two lines is what fits between the bars and the section below. */
const TICK_MAX_LINES = 2;

/**
 * Manatal stage names carry their own gloss — "RC/BC (Reference Check/
 * Background Check)". Under one bar that wraps to four lines and runs off the
 * bottom of the axis, so the axis shows the short name and the data table
 * below prints every stage in full.
 */
function shortenStageName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;
}

function wrapStageName(name: string): string[] {
  const lines: string[] = [];
  for (const word of shortenStageName(name).split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= TICK_LINE_CHARS) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }

  // A name that still doesn't fit is truncated rather than allowed to spill
  // over the section below it.
  if (lines.length > TICK_MAX_LINES) {
    return [...lines.slice(0, TICK_MAX_LINES - 1), `${lines[TICK_MAX_LINES - 1]}…`];
  }
  return lines;
}

/**
 * A stage nobody reached draws no bar, so its name on the axis is the only
 * thing marking it — and Recharts' default tick placement drops exactly the
 * labels that would collide, which is how "RC/BC" vanished from a ten-stage
 * pipeline while its empty slot stayed. interval={0} on the axis forces every
 * stage to be named; wrapping onto a second line is what keeps them apart
 * once forced.
 */
function StageTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string | number } }) {
  const lines = wrapStageName(String(payload?.value ?? ""));

  return (
    <text x={x} y={y} textAnchor="middle" fill={INK} fontSize={AXIS_LABEL_SIZE} fontWeight={600}>
      {lines.map((line, index) => (
        <tspan key={`${index}-${line}`} x={x} dy={17}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

interface BarLabelProps {
  value?: number | string;
  index?: number;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  conversions: (number | null)[];
}

/**
 * Each bar carries its count and, in lighter ink, the share of that count that
 * went on to the next stage — the step-to-step conversion, which is the number
 * people actually want off a funnel and the one thing bar heights cannot be
 * read for. It describes the transition *out* of the bar, so the last stage in
 * the pipeline has none and is labelled with the count alone.
 *
 * Positioned by hand: a custom `content` gets the bar's box from Recharts but
 * none of the placement that the built-in label would have applied.
 */
function BarValueLabel({ value, index, conversions, viewBox, ...rest }: BarLabelProps) {
  const box = viewBox ?? (rest as { x?: number; y?: number; width?: number; height?: number });
  const x = Number(box.x ?? 0) + Number(box.width ?? 0) / 2;
  const y = Number(box.y ?? 0) - 10;
  const conversion = index === undefined ? null : (conversions[index] ?? null);

  return (
    <text x={x} y={y} textAnchor="middle" fill={INK} fontSize={VALUE_LABEL_SIZE} fontWeight={800}>
      {formatCount(Number(value))}
      {conversion !== null && (
        <tspan dx={5} fill={MUTED_INK} fontSize={AXIS_LABEL_SIZE} fontWeight={600}>
          ({formatPct(conversion)})
        </tspan>
      )}
    </text>
  );
}

interface StageFunnelChartProps {
  /** The whole pipeline, not just the reported stages. */
  stages: StageReport[];
  isExporting?: boolean;
}

export default function StageFunnelChart({ stages, isExporting }: StageFunnelChartProps) {
  const ramp = funnelRamp(stages.length);

  // Null on the last stage, and on any stage nobody entered — both cases label
  // the bar with its count alone rather than an invented "0%".
  const conversions = stages.map((stage) => stage.conversionPct);

  const data = stages.map((stage, index) => ({
    stage: stage.name,
    entered: stage.entered,
    fill: ramp[index] ?? PRIMARY,
  }));

  return (
    <section className="pill-card p-8">
      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">Stage distribution</h3>
      <p className="mt-1 text-base font-medium text-slate-600">
        How many candidates reached each stage, and the share of them that moved on to the next.
      </p>

      <ChartContainer config={CHART_CONFIG} className="mt-6 aspect-auto h-80 w-full">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 36, bottom: 8 }} barCategoryGap="24%">
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray={undefined} />
          <XAxis
            dataKey="stage"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={64}
            tick={<StageTick />}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_INK, fontSize: AXIS_LABEL_SIZE, fontWeight: 600 }}
            width={52}
          />
          {!isExporting && <ChartTooltip content={<ChartTooltipContent hideLabel />} />}
          <Bar dataKey="entered" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.fill} />
            ))}
            <LabelList dataKey="entered" content={<BarValueLabel conversions={conversions} />} />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* The same conversion the bars are labelled with, in a form that can be
          read down a column and compared stage to stage. */}
      <ChartDataTable
        caption="— no next stage, or no candidates entered this one."
        columns={["Stage", "Reached", "Conversion to next"]}
        rows={stages.map((stage) => [
          stage.name,
          stage.entered,
          stage.conversionPct === null ? "—" : formatPct(stage.conversionPct),
        ])}
      />
    </section>
  );
}
