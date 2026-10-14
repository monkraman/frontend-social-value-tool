/**
 * Formatting utilities for UK Public Sector tender data, currencies, and metrics.
 */

/**
 * Format a numeric value into GBP currency string (e.g. £10,000,000 or £45,250.50).
 */
export function formatGbp(amount: number | null | undefined, includeDecimals = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '£0';
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  }).format(amount);
}

/**
 * Format a percentage with standard symbol and optional decimal places.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an integer or float with standard thousands separators.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-GB').format(value);
}

/**
 * Format ISO datetime string to readable UK date format (e.g., 14 Oct 2026, 11:30).
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Truncate long text strings cleanly with an ellipsis.
 */
export function truncateText(text: string, maxLength = 120): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
