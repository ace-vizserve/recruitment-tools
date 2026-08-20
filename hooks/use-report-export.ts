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

/**
 * Floor for the capture width, fed to the .report-exporting rule in
 * globals.css. The dashboard exports at whatever width it is already showing —
 * clicking download must not visibly reflow the page — so this only ever
 * widens a narrow window, where the stage-detail grid would otherwise collapse
 * to a single tall column and drag the whole document's scale down with it.
 */
const MIN_EXPORT_WIDTH = 1200;
const EXPORT_WIDTH_VAR = "--report-export-width";

/** A4 landscape, in points. Landscape because the report is a wide layout. */
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const PAGE_MARGIN = 18;

/**
 * Each element carrying this attribute becomes one page of the PDF, in DOM
 * order. Without any, the whole node is exported as a single page.
 */
export const EXPORT_PAGE_ATTR = "data-export-page";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Rasterises the dashboard and wraps the result in a paginated PDF.
 *
 * html-to-image rather than html2canvas: globals.css applies an oklch()
 * border-color to `*`, and html2canvas' own CSS parser throws on oklch, so it
 * would fail on the very first node. html-to-image serialises into an SVG
 * foreignObject and lets the browser paint, so modern colour syntax just works.
 *
 * The PDF is a picture of the dashboard, not reflowed text — which is the
 * point: what you download is what you saw. jsPDF is imported lazily so its
 * ~350KB only lands in the bundle of someone who actually exports.
 */
export function useReportExport(nodeRef: React.RefObject<HTMLElement | null>, filename: string) {
  const [isExporting, setIsExporting] = React.useState(false);
  const fontCssRef = React.useRef<string | null>(null);

  const exportPdf = React.useCallback(async () => {
    const node = nodeRef.current;
    if (!node || isExporting) return;

    setIsExporting(true);

    try {
      // Let the isExporting flag reach the charts (which unmount their
      // tooltips) before we serialise anything.
      await nextFrame();
      await document.fonts.ready;

      // Widen only if the window is too narrow to lay the report out properly;
      // at any normal size this resolves to the width the node already has, so
      // nothing on screen moves while the capture runs. Recharts is the reason
      // it has to be pinned at all rather than left to float: ResponsiveContainer
      // re-measures on any width change and the charts would resize mid-capture.
      node.style.setProperty(EXPORT_WIDTH_VAR, `${Math.max(node.offsetWidth, MIN_EXPORT_WIDTH)}px`);
      node.classList.add("report-exporting");
      await nextFrame();

      const marked = Array.from(node.querySelectorAll<HTMLElement>(`[${EXPORT_PAGE_ATTR}]`));
      const pages = marked.length > 0 ? marked : [node];

      if (fontCssRef.current === null) {
        fontCssRef.current = await getFontEmbedCSS(node);
      }

      let reducedResolution = false;
      const rendered: { dataUrl: string; width: number; height: number }[] = [];

      for (const page of pages) {
        // offsetWidth, not getBoundingClientRect: the layout width is what
        // html-to-image serialises, and it is free of the sub-pixel fractions
        // that make a scroll container think it overflows.
        const width = page.offsetWidth || MIN_EXPORT_WIDTH;
        const height = page.scrollHeight;
        const pixelRatio = Math.min(3, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(width * height, 1)));
        if (pixelRatio < 3) reducedResolution = true;

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
        await toPng(page, options);
        rendered.push({ dataUrl: await toPng(page, options), width, height });
      }

      if (reducedResolution) {
        toast.info("Report is large — exported at reduced resolution");
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
      const maxHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;

      // One scale for the whole document, set by whichever section is worst off
      // — so every page lands at the same width and the report reads as one
      // document rather than a run of differently-zoomed screenshots. The
      // alternative, scaling each page to fill its own sheet, silently shrinks
      // a tall section sideways. Fit whole, never crop: a section stays intact
      // rather than spilling half of itself onto the next page.
      const scale = rendered.reduce(
        (smallest, page) => Math.min(smallest, maxWidth / page.width, maxHeight / page.height),
        Number.POSITIVE_INFINITY,
      );

      rendered.forEach((page, index) => {
        if (index > 0) doc.addPage();

        const width = page.width * scale;
        const height = page.height * scale;

        // Centred both ways. A page held back by the shared scale has spare
        // room on the sheet, and centred space reads as deliberate where a
        // block pinned to the top edge reads as a rendering accident.
        doc.addImage(
          page.dataUrl,
          "PNG",
          (PAGE_WIDTH - width) / 2,
          (PAGE_HEIGHT - height) / 2,
          width,
          height,
          undefined,
          "FAST",
        );
      });

      doc.save(filename);

      toast.success(`Report PDF downloaded (${rendered.length} ${rendered.length === 1 ? "page" : "pages"})`);
    } catch (error) {
      console.error("[useReportExport] Failed to render PDF:", error);
      toast.error("Couldn't generate the PDF", {
        description: "Try again, or reload the page if it keeps failing.",
      });
    } finally {
      nodeRef.current?.classList.remove("report-exporting");
      nodeRef.current?.style.removeProperty(EXPORT_WIDTH_VAR);
      setIsExporting(false);
    }
  }, [nodeRef, filename, isExporting]);

  return { exportPdf, isExporting };
}
