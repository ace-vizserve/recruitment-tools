"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

import ChartDataTable from "@/components/reports/charts/chart-data-table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { funnelRamp, GRID, MUTED_INK, PRIMARY } from "@/lib/reports/chart-theme";
import { formatPct } from "@/lib/reports/format";
import type { StageReport } from "@/lib/reports/types";

const CHART_CONFIG = {
  entered: { label: "Reached stage", color: PRIMARY },
} satisfies ChartConfig;

interface StageFunnelChartProps {
  /** The whole pipeline, not just the reported stages. */
  stages: StageReport[];
  isExporting?: boolean;
}

export default function StageFunnelChart({ stages, isExporting }: StageFunnelChartProps) {
  const ramp = funnelRamp(stages.length);
  const data = stages.map((stage, index) => ({
    stage: stage.name,
    entered: stage.entered,
    fill: ramp[index] ?? PRIMARY,
  }));

  return (
    <section className="pill-card p-8">
      <h3 className="text-xl font-extrabold tracking-tight text-slate-800">Stage distribution</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        How many candidates reached each stage of the pipeline.
      </p>

      <ChartContainer config={CHART_CONFIG} className="mt-6 aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 24, bottom: 8 }} barCategoryGap="24%">
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray={undefined} />
          {/* No interval={0}: forcing every label makes them collide on narrow
              screens. Recharts drops what doesn't fit, and the conversion
              captions plus the data table below name every stage anyway. */}
          <XAxis
            dataKey="stage"
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_INK, fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_INK, fontSize: 12 }}
            width={40}
          />
          {!isExporting && <ChartTooltip content={<ChartTooltipContent hideLabel />} />}
          <Bar dataKey="entered" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="entered"
              position="top"
              offset={8}
              className="fill-slate-700"
              fontSize={12}
              fontWeight={800}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Stage-to-stage conversion is the number people actually want from a
          funnel, and it is not readable off bar heights. It lives in the table
          rather than a caption strip, which duplicated it. */}
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
