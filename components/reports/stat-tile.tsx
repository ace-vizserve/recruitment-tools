import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

/**
 * A KPI is a number to read, not a chart to decode — four tiles beat a grouped
 * bar chart of four values. tabular-nums keeps the digits aligned across the row.
 */
export default function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <div className={cn("rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-4", className)}>
      <p className="text-sm font-black uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-sm font-medium text-slate-600">{hint}</p>}
    </div>
  );
}
