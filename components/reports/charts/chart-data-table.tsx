"use client";

import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChartDataTableProps {
  caption?: string;
  columns: string[];
  rows: (string | number)[][];
}

/**
 * The table twin every chart carries. Two reasons it is not optional: every
 * value stays reachable without hovering, and an open table renders into the
 * downloaded PNG, where tooltips obviously cannot.
 *
 * Open by default, so the numbers are in the exported image without anyone
 * having to remember to expand it first. State rather than a bare `open`
 * attribute: React re-applies a static prop on every re-render, which would
 * silently reopen the table each time the report refetches.
 */
export default function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  const [open, setOpen] = React.useState(true);

  if (!rows.length) return null;

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-4 group">
      <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600">
        <span className="group-open:hidden">View data</span>
        <span className="hidden group-open:inline">Hide data</span>
      </summary>
      <div className="mt-3 overflow-x-auto">
        <Table>
          {caption && <caption className="mt-2 text-xs font-medium text-slate-400">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={column} className={index === 0 ? "" : "text-right"}>
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    className={cellIndex === 0 ? "font-semibold text-slate-700" : "text-right tabular-nums"}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
