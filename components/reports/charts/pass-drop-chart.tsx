"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import ChartDataTable from "@/components/reports/charts/chart-data-table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPct } from "@/lib/reports/format";
import { GRID, MUTED_INK, OUTCOME_COLORS, SURFACE } from "@/lib/reports/chart-theme";
import type { StageReport } from "@/lib/reports/types";

// `color`, never `theme` — the theme form makes ChartContainer emit .dark
// selectors, and this app is light-only (next-themes has no provider mounted).
const CHART_CONFIG = {
  passed: { label: "Passed", color: OUTCOME_COLORS.passed },
  inProgress: { label: "In stage", color: OUTCOME_COLORS.inProgress },
  dropped: { label: "Dropped", color: OUTCOME_COLORS.dropped },
} satisfies ChartConfig;

/**
 * Hand-rolled rather than recharts' <Legend>, which reverses its items for a
 * vertical-layout stacked bar and so reads backwards against the segments.
 * Three static entries are not worth fighting that ordering for.
 */
const LEGEND_ITEMS = [
  { label: "Passed", color: OUTCOME_COLORS.passed },
  { label: "In stage", color: OUTCOME_COLORS.inProgress },
  { label: "Dropped", color: OUTCOME_COLORS.dropped },
];

interface PassDropChartProps {
  stages: StageReport[];
  isExporting?: boolean;
}

export default function PassDropChart({ stages, isExporting }: PassDropChartProps) {
  const data = stages.map((stage) => ({
    stage: stage.name,
    passed: stage.passed,
    inProgress: stage.inProgress,
    dropped: stage.dropped,
  }));

  const height = Math.max(180, stages.length * 56 + 60);

  return (
    <section className="pill-card p-8">
      <h3 className="text-xl font-extrabold tracking-tight text-slate-800">Pass vs drop by stage</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        Every candidate who reached each stage, and what happened to them.
      </p>

      <ChartContainer config={CHART_CONFIG} className="mt-6 aspect-auto w-full" style={{ height }}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          {/* Recharts defaults to strokeDasharray="3 3"; dashed gridlines are noise. */}
          <CartesianGrid stroke={GRID} horizontal={false} strokeDasharray={undefined} />
          {/* Candidates are whole people — never show a 0.5 tick. */}
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_INK, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="stage"
            width={140}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_INK, fontSize: 12 }}
          />
          {/* Rasterising a hovered tooltip into the PNG would be a bug. */}
          {!isExporting && <ChartTooltip content={<ChartTooltipContent />} />}
          {/* Recharts has no segment gap, so each bar wears a surface-coloured
              stroke. It reads as a 2px gap — do not "fix" it to a dark outline. */}
          <Bar
            dataKey="passed"
            stackId="outcome"
            fill="var(--color-passed)"
            stroke={SURFACE}
            strokeWidth={2}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Bar
            dataKey="inProgress"
            stackId="outcome"
            fill="var(--color-inProgress)"
            stroke={SURFACE}
            strokeWidth={2}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Bar
            dataKey="dropped"
            stackId="outcome"
            fill="var(--color-dropped)"
            stroke={SURFACE}
            strokeWidth={2}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <ChartDataTable
        columns={["Stage", "Entered", "Passed", "In stage", "Dropped", "Pass rate"]}
        rows={stages.map((stage) => [
          stage.name,
          stage.entered,
          stage.passed,
          stage.inProgress,
          stage.dropped,
          stage.suppressPct ? "n too small" : formatPct(stage.passedPct),
        ])}
      />
    </section>
  );
}
