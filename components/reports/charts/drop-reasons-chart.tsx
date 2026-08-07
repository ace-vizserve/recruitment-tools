"use client";

import { Inbox } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import ChartDataTable from "@/components/reports/charts/chart-data-table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { GRID, MAX_DROP_REASON_BARS, MUTED_INK, PRIMARY } from "@/lib/reports/chart-theme";
import { pluralize } from "@/lib/reports/format";
import type { DropReasonCount } from "@/lib/reports/types";

const CHART_CONFIG = {
  count: { label: "Mentions", color: PRIMARY },
} satisfies ChartConfig;

interface DropReasonsChartProps {
  reasons: DropReasonCount[];
  dropCount: number;
  mentionCount: number;
  isExporting?: boolean;
  title?: string;
}

export default function DropReasonsChart({
  reasons,
  dropCount,
  mentionCount,
  isExporting,
  title = "Drop reasons",
}: DropReasonsChartProps) {
  // Top N plus a rolled-up "Other", so a long tail cannot squash the chart.
  const top = reasons.slice(0, MAX_DROP_REASON_BARS);
  const rest = reasons.slice(MAX_DROP_REASON_BARS);
  const restTotal = rest.reduce((sum, reason) => sum + reason.count, 0);
  const data = restTotal ? [...top, { reason: `Other (${rest.length})`, count: restTotal }] : top;

  return (
    <section className="pill-card p-8">
      <h3 className="text-xl font-extrabold tracking-tight text-slate-800">{title}</h3>
      {/* One drop can cite several reasons, so mentions ≥ drops. Saying so
          stops the reader assuming the numbers are broken. */}
      <p className="mt-1 text-sm font-medium text-slate-500">
        {dropCount} {pluralize(dropCount, "drop")} · {mentionCount} {pluralize(mentionCount, "reason")} cited
      </p>

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-200" />
          <p className="mt-3 text-sm font-medium text-slate-400">No drop reasons recorded for this period.</p>
        </div>
      ) : (
        <>
          <ChartContainer
            config={CHART_CONFIG}
            className="mt-6 aspect-auto w-full"
            // Data-driven height. A fixed one clips the axis band as rows grow.
            style={{ height: Math.max(200, data.length * 36 + 48) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
              <CartesianGrid stroke={GRID} horizontal={false} strokeDasharray={undefined} />
              {/* Integer ticks only (mentions are counts), and end the axis at
                  the largest value so short bars still use the full width. */}
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, "dataMax"]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED_INK, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="reason"
                width={170}
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED_INK, fontSize: 12 }}
              />
              {!isExporting && <ChartTooltip content={<ChartTooltipContent hideLabel />} />}
              {/* Nominal categories: one hue for all bars. A value-ramp here
                  would double-encode length as colour for no extra meaning. */}
              <Bar dataKey="count" fill="var(--color-count)" maxBarSize={22} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  className="fill-slate-500"
                  fontSize={12}
                  fontWeight={700}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          <ChartDataTable
            columns={["Reason", "Mentions"]}
            rows={reasons.map((reason) => [reason.reason, reason.count])}
          />
        </>
      )}
    </section>
  );
}
