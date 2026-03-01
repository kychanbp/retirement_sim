/**
 * Seeded PRNG — Mulberry32
 */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform for standard normal variates.
 * Returns a function that produces N(0,1) samples using the given RNG.
 */
export function createNormalRng(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const val = spare;
      spare = null;
      return val;
    }
    let u: number, v: number, s: number;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

/**
 * Percentile of a sorted array. p is 0–100.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Compute percentiles across simulations at each time step.
 * allPaths[sim][month]. Returns percentile values at each month.
 */
export function computePercentileSeries(
  allPaths: Float64Array[],
  totalMonths: number,
  percentiles: number[]
): Record<string, number[]> {
  const nSims = allPaths.length;
  const result: Record<string, number[]> = {};
  for (const p of percentiles) {
    result[`p${p}`] = new Array(totalMonths + 1);
  }

  const col = new Float64Array(nSims);

  for (let m = 0; m <= totalMonths; m++) {
    for (let s = 0; s < nSims; s++) {
      col[s] = allPaths[s][m];
    }
    col.sort();
    const sorted = col as unknown as number[];
    for (const p of percentiles) {
      result[`p${p}`][m] = percentile(sorted as unknown as number[], p);
    }
  }

  return result;
}

/**
 * Compute histogram bins for an array of values.
 */
export function computeHistogramBins(
  values: number[],
  numBins: number
): { binCenter: number; count: number }[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = Math.min(0, sorted[0]);
  const max = percentile(sorted, 95);
  if (max <= min) {
    return [{ binCenter: min, count: values.length }];
  }

  const binWidth = (max - min) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    binCenter: min + (i + 0.5) * binWidth,
    count: 0,
  }));

  for (const v of values) {
    const idx = Math.min(
      Math.max(Math.floor((v - min) / binWidth), 0),
      numBins - 1
    );
    bins[idx].count++;
  }

  return bins;
}
