"use client";

import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChartDataTableProps {
  caption?: string;
  columns: string[];
  rows: (string | number)[][];
}

/**
 * The table twin every chart carries. It is not optional: it is where every
 * value stays reachable without hovering, and it is the only way the numbers
 * reach the exported PDF, where tooltips obviously cannot.
 *
 * Collapsed by default — the charts are what the page is for, and two open
 * tables pushed them apart. Expanding one sticks, and the export follows what
 * is on screen, so an expanded table is still what you download. State rather
 * than a bare `open` attribute: React re-applies a static prop on every
 * re-render, which would silently reset the table each time the report
 * refetches.
 */
export default function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  const [open, setOpen] = React.useState(false);

  if (!rows.length) return null;

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-4 group">
      {/* A control, not content — "View data" in a downloaded PDF is an
          instruction nobody can follow. */}
      <summary
        data-export-ignore="true"
        className="cursor-pointer list-none text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600">
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
