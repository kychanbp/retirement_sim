/**
 * Resolve any CSS color to an sRGB string that html2canvas can parse.
 * Canvas 2D fillStyle always round-trips through sRGB, returning "#rrggbb".
 */
let _colorCtx: CanvasRenderingContext2D | null = null;

function toSrgb(color: string): string {
  if (!color || color === "transparent") return color;
  // Already safe for html2canvas
  if (color.startsWith("#") || color.startsWith("rgb")) return color;
  if (!_colorCtx) {
    _colorCtx = document.createElement("canvas").getContext("2d");
  }
  if (!_colorCtx) return color;
  _colorCtx.fillStyle = "#000000"; // reset
  _colorCtx.fillStyle = color; // parse — browser converts to sRGB
  return _colorCtx.fillStyle; // "#rrggbb"
}

/**
 * Replace modern color functions in a CSS text string with sRGB equivalents.
 * Handles oklch(), lab(), oklab(), lch(), color() with one level of nested parens.
 */
function replaceModernColors(text: string): string {
  return text.replace(
    /(?:oklch|lab|oklab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
    (match) => toSrgb(match)
  );
}

/**
 * Patch all stylesheets in a cloned document so html2canvas's CSS parser
 * never encounters color functions it cannot handle.
 *
 * Two passes:
 *  1. <style> textContent  — covers statically-written CSS
 *  2. CSSOM cssRules       — covers Turbopack HMR / insertRule-injected CSS
 */
function patchDocumentColors(doc: Document): void {
  // Pass 1 — <style> textContent
  for (const el of doc.querySelectorAll("style")) {
    const text = el.textContent;
    if (!text) continue;
    const patched = replaceModernColors(text);
    if (patched !== text) el.textContent = patched;
  }

  // Pass 2 — CSSOM rules (catches insertRule-based injection)
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      patchRuleList(sheet);
    } catch {
      // Cross-origin stylesheet — skip
    }
  }
}

function patchRuleList(parent: CSSStyleSheet | CSSGroupingRule): void {
  let rules: CSSRuleList;
  try {
    rules = parent.cssRules;
  } catch {
    return;
  }
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule instanceof CSSStyleRule) {
      const style = rule.style;
      for (let j = 0; j < style.length; j++) {
        const prop = style[j];
        const val = style.getPropertyValue(prop);
        const fixed = replaceModernColors(val);
        if (fixed !== val) {
          style.setProperty(prop, fixed, style.getPropertyPriority(prop));
        }
      }
    } else if ("cssRules" in rule) {
      patchRuleList(rule as unknown as CSSGroupingRule);
    }
  }
}

/**
 * Inline sRGB-resolved colours on every element in the cloned document
 * so html2canvas's per-element getComputedStyle never returns lab()/oklch().
 */
const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
] as const;

function inlineResolvedColors(doc: Document): void {
  for (const el of doc.querySelectorAll<HTMLElement>("*")) {
    const cs = getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const val = cs[prop];
      if (val) {
        el.style[prop] = toSrgb(val);
      }
    }
  }
}

/**
 * Capture a container's [data-pdf-section] elements with html2canvas
 * and assemble them into a landscape A4 PDF via jspdf.
 */
export async function generatePdfFromElement(
  container: HTMLElement,
  filename: string
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Landscape A4 in points: 841.89 x 595.28
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth(); // ~841.89
  const pageHeight = pdf.internal.pageSize.getHeight(); // ~595.28
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const sections = container.querySelectorAll<HTMLElement>("[data-pdf-section]");
  let isFirstPage = true;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        patchDocumentColors(clonedDoc);
        inlineResolvedColors(clonedDoc);
      },
    });

    // Scale the captured canvas to fit page width
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height / canvas.width) * contentWidth;

    if (imgHeight <= contentHeight) {
      // Fits on one page
      if (!isFirstPage) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      isFirstPage = false;
    } else {
      // Slice into multiple pages (for methodology section, etc.)
      // Work in canvas pixel coordinates
      const scaleX = canvas.width / contentWidth;
      const sliceHeightPx = contentHeight * scaleX;
      let yOffset = 0;

      while (yOffset < canvas.height) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;

        const remainingPx = canvas.height - yOffset;
        const thisSlicePx = Math.min(sliceHeightPx, remainingPx);
        const thisSlicePt = thisSlicePx / scaleX;

        // Create a temp canvas for the slice
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = thisSlicePx;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            yOffset,
            canvas.width,
            thisSlicePx,
            0,
            0,
            canvas.width,
            thisSlicePx
          );
        }

        pdf.addImage(
          sliceCanvas.toDataURL("image/png"),
          "PNG",
          margin,
          margin,
          imgWidth,
          thisSlicePt,
          undefined,
          "FAST"
        );

        yOffset += thisSlicePx;
      }
    }
  }

  pdf.save(filename);
}
