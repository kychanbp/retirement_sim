"use client";

import { useState, useCallback } from "react";
import type { FullResults } from "../lib/types";

export function usePdfDownload(results: FullResults) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    let container: HTMLDivElement | null = null;
    let root: ReturnType<typeof import("react-dom/client").createRoot> | null = null;

    try {
      // Dynamically import React rendering and report components
      const [{ createElement }, { createRoot }, { PdfReportLayout }, { generatePdfFromElement }] =
        await Promise.all([
          import("react"),
          import("react-dom/client"),
          import("../components/PdfReportLayout"),
          import("../lib/generatePdf"),
        ]);

      // Create off-screen container
      container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      // Create a wrapper div to capture the ref
      const refHolder: { current: HTMLDivElement | null } = { current: null };

      // Render PdfReportLayout into the container
      root = createRoot(container);
      root.render(
        createElement(PdfReportLayout, {
          results,
          ref: (el: HTMLDivElement | null) => {
            refHolder.current = el;
          },
        })
      );

      // Wait for Recharts SVGs to paint
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find the actual report div (the one with data-pdf-section children)
      const reportEl = refHolder.current ?? container.firstElementChild as HTMLElement;
      if (!reportEl) throw new Error("Report layout did not render");

      await generatePdfFromElement(reportEl as HTMLElement, "retirement-report.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      // Cleanup
      if (root) {
        root.unmount();
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsGenerating(false);
    }
  }, [results, isGenerating]);

  return { downloadPdf, isGenerating };
}
