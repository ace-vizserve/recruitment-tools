"use client";

import { CalendarDays, Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/reports/format";
import { availablePeriods, type Period, type PeriodType } from "@/lib/reports/period";

interface PeriodPickerProps {
  periodType: PeriodType;
  periodKey: string;
  jobCreatedAt: string | null;
  disabled?: boolean;
  onPeriodTypeChange: (type: PeriodType) => void;
  onPeriodKeyChange: (key: string) => void;
}

const FREQUENCIES: { value: PeriodType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all", label: "All time" },
];

export default function PeriodPicker({
  periodType,
  periodKey,
  jobCreatedAt,
  disabled,
  onPeriodTypeChange,
  onPeriodKeyChange,
}: PeriodPickerProps) {
  const [open, setOpen] = React.useState(false);

  // Bounded by the job's lifetime: the picker can never offer a period in
  // which the job did not yet exist.
  const periods = React.useMemo(
    () => availablePeriods(periodType, jobCreatedAt),
    [periodType, jobCreatedAt],
  );

  const selected: Period | undefined =
    periods.find((period) => period.key === periodKey) ?? periods[0];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Frequency</span>
        {/* Three options don't warrant a Select. */}
        <div
          role="radiogroup"
          aria-label="Report frequency"
          className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {FREQUENCIES.map(({ value, label }) => {
            const isActive = value === periodType;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={disabled}
                onClick={() => onPeriodTypeChange(value)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* "All time" is a single period, so a picker offering one option would
          be dead UI. Show the covered span instead. */}
      {periodType === "all" ? (
        <div className="space-y-2">
          <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Period</span>
          <div className="flex h-13 min-w-56 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-500">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {jobCreatedAt ? `Since ${formatDate(jobCreatedAt)}` : "Entire job history"}
          </div>
        </div>
      ) : (
      <div className="space-y-2">
        <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Period</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            className="flex h-13 min-w-56 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {selected?.label ?? "Select period"}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </PopoverTrigger>
          <PopoverContent align="start" className="custom-scrollbar max-h-80 w-72 overflow-y-auto p-2">
            {periods.map((period) => {
              const isActive = period.key === selected?.key;
              return (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => {
                    onPeriodKeyChange(period.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                  }`}>
                  <span>{period.label}</span>
                  {isActive && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
      )}
    </div>
  );
}
