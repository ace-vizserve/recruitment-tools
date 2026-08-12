"use client";

import { getFontEmbedCSS, toPng } from "html-to-image";
import * as React from "react";
import { toast } from "sonner";

/**
 * Canvas area ceiling. Tuned for desktop Chrome, which is what this internal
 * tool runs on — Safari blanks the canvas at roughly 16M pixels, so an iPad
 * export would need this lowered again.
 */
const MAX_CANVAS_PIXELS = 40_000_000;
/** Matches the .report-exporting rule in globals.css — keep the two in step. */
const EXPORT_WIDTH = 1600;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Rasterises the dashboard to a PNG download.
 *
 * html-to-image rather than html2canvas: globals.css applies an oklch()
 * border-color to `*`, and html2canvas' own CSS parser throws on oklch, so it
 * would fail on the very first node. html-to-image serialises into an SVG
 * foreignObject and lets the browser paint, so modern colour syntax just works.
 */
export function useReportExport(nodeRef: React.RefObject<HTMLElement | null>, filename: string) {
  const [isExporting, setIsExporting] = React.useState(false);
  const fontCssRef = React.useRef<string | null>(null);

  const exportPng = React.useCallback(async () => {
    const node = nodeRef.current;
    if (!node || isExporting) return;

    setIsExporting(true);

    try {
      // Let the isExporting flag reach the charts (which unmount their
      // tooltips) before we serialise anything.
      await nextFrame();
      await document.fonts.ready;

      // Pin the width so the PNG is identical from any window size —
      // ResponsiveContainer otherwise measures whatever the viewport gives it.
      node.classList.add("report-exporting");
      await nextFrame();

      const width = EXPORT_WIDTH;
      const height = node.scrollHeight;
      const pixelRatio = Math.min(3, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(width * height, 1)));

      if (pixelRatio < 3) {
        toast.info("Report is large — exported at reduced resolution");
      }

      if (fontCssRef.current === null) {
        fontCssRef.current = await getFontEmbedCSS(node);
      }

      const options = {
        pixelRatio,
        backgroundColor: "#ffffff",
        cacheBust: true,
        fontEmbedCSS: fontCssRef.current ?? undefined,
        filter: (domNode: HTMLElement) =>
          !(domNode instanceof HTMLElement && domNode.dataset.exportIgnore === "true"),
        style: { margin: "0" },
      };

      // The first pass routinely misses fonts and images that only resolve
      // partway through serialisation. Rendering twice and keeping the second
      // result is the accepted workaround.
      await toPng(node, options);
      const dataUrl = await toPng(node, options);

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast.success("Report image downloaded");
    } catch (error) {
      console.error("[useReportExport] Failed to render PNG:", error);
      toast.error("Couldn't generate the image", {
        description: "Try again, or reload the page if it keeps failing.",
      });
    } finally {
      nodeRef.current?.classList.remove("report-exporting");
      setIsExporting(false);
    }
  }, [nodeRef, filename, isExporting]);

  return { exportPng, isExporting };
}
