/**
 * lib/chart-capture.ts
 *
 * Rasterizes the report's *actual, currently-rendered* recharts SVGs into
 * PNGs so PDF export can embed the real chart visuals rather than
 * reimplementing charting in a second system. Report sections that hold a
 * chart are tagged in report-view.tsx with `data-export-chart="<key>"` /
 * `data-export-chart-title="<label>"` — this module just walks the DOM for
 * those markers at export time and rasterizes whatever SVG it finds inside.
 *
 * Deliberately DOM-dependent: this only works while the report is actually
 * mounted on screen (which it is — Save lives in the Document Reader
 * header, so the report you're exporting is the one you're looking at).
 * If a chart is missing or fails to rasterize (e.g. a report section with
 * no data, so no chart mounted), it's silently skipped — reportToPdfBytes
 * falls back to numbers-only for that section rather than failing the
 * whole export.
 */

export interface CapturedChart {
  key: string;
  title: string;
  dataUrl: string; // PNG data URL
  width: number;
  height: number;
}

export async function captureReportCharts(container: HTMLElement): Promise<CapturedChart[]> {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-export-chart]"));
  const results: CapturedChart[] = [];

  for (const node of nodes) {
    const svg = node.querySelector("svg");
    if (!svg) continue;

    const key = node.getAttribute("data-export-chart") ?? "chart";
    const title = node.getAttribute("data-export-chart-title") ?? key;

    try {
      const captured = await svgToPng(svg as SVGSVGElement);
      results.push({ key, title, ...captured });
    } catch (err) {
      console.warn(`[chart-capture] Failed to capture "${key}" — PDF export will fall back to numbers only for this section:`, err);
    }
  }

  return results;
}

async function svgToPng(svgEl: SVGSVGElement, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  // Clone rather than rasterize the live node directly — avoids any risk
  // of layout/paint side effects on the on-screen chart, and lets us pin
  // explicit pixel dimensions (the live SVG is usually width="100%" via
  // ResponsiveContainer, which an isolated image load can't resolve).
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // The isolated SVG doesn't inherit the app's Inter font-face — pin a
  // clean system fallback rather than whatever the browser's serif
  // default would be.
  clone.style.fontFamily = "system-ui, -apple-system, sans-serif";

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  const img = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVG failed to rasterize"));
  });
  img.src = svgDataUrl;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);

  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}
