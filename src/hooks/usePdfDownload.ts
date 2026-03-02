"use client";

import { useState, useCallback } from "react";
import type { FullResults } from "../lib/types";

const PRINT_ID = "__pdf-report__";

export function usePdfDownload(results: FullResults) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    let container: HTMLDivElement | null = null;
    let styleEl: HTMLStyleElement | null = null;
    let root: ReturnType<typeof import("react-dom/client").createRoot> | null =
      null;

    function cleanup() {
      try {
        root?.unmount();
      } catch {}
      root = null;
      container?.remove();
      styleEl?.remove();
      container = null;
      styleEl = null;
      setIsGenerating(false);
    }

    try {
      const [{ createElement }, { createRoot }, { PdfReportLayout }] =
        await Promise.all([
          import("react"),
          import("react-dom/client"),
          import("../components/PdfReportLayout"),
        ]);

      // Off-screen container — needs layout dimensions for Recharts SVGs to render,
      // but invisible to the user. @media print overrides make it visible when printing.
      container = document.createElement("div");
      container.id = PRINT_ID;
      Object.assign(container.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "794px",
        background: "white",
        zIndex: "-1",
      });
      document.body.appendChild(container);

      // Inject print-only styles:
      // - Hide every sibling of the report container
      // - Make the report container visible and full-width
      // - Landscape A4 page with reasonable margins
      // - Avoid breaking inside chart sections
      styleEl = document.createElement("style");
      styleEl.textContent = `
        @media print {
          body > *:not(#${PRINT_ID}) {
            display: none !important;
          }
          #${PRINT_ID} {
            position: static !important;
            left: auto !important;
            width: 100% !important;
            z-index: auto !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          [data-pdf-section] {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          [data-pdf-section="methodology"] {
            break-inside: auto;
            page-break-inside: auto;
          }
        }
      `;
      document.head.appendChild(styleEl);

      // Render the report layout
      root = createRoot(container);
      root.render(createElement(PdfReportLayout, { results }));

      // Wait for Recharts SVGs to paint (they need a couple of animation frames)
      await new Promise((r) => setTimeout(r, 800));

      // Use afterprint event for cleanup (handles both sync and async browsers)
      window.addEventListener("afterprint", cleanup, { once: true });

      // Trigger the browser's native print dialog (Save as PDF option available)
      window.print();

      // Fallback: if afterprint doesn't fire within 2 seconds, clean up anyway
      setTimeout(() => {
        if (container) cleanup();
      }, 2000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      cleanup();
    }
  }, [results, isGenerating]);

  return { downloadPdf, isGenerating };
}
