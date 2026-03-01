/**
 * Format a number as currency (e.g., $1,234,567).
 * If compact is true, uses K/M abbreviations.
 */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Format a number as a percentage (e.g., 85.3%).
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format monthly dollars (e.g., $6,000/mo).
 */
export function formatMonthly(value: number): string {
  return `$${Math.round(value).toLocaleString()}/mo`;
}
