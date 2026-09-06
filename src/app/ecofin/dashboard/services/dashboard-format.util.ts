/**
 * Dashboard formatting helpers.
 *
 * Centralises Indian currency formatting and the voucher-label rules so that
 * every chart, card and table presents the same value the same way.
 *
 * Voucher label rule agreed for this dashboard:
 *   - chart axes / compact labels  -> code only            (SBR)
 *   - tooltips                     -> code + full text     (SBR - SBI B HALLI ...)
 *   - legends                      -> code + shortened     (SBR - SBI B Halli...)
 *   - cards / drill-down / detail  -> full description
 *   - transaction table            -> code badge, full text as title
 */

const LAKH  = 100000;
const CRORE = 10000000;

/**
 * Full Indian-format currency, always two decimals.
 *
 * Two decimals is deliberate: minimumFractionDigits of 0 produced
 * "3,21,475.6" sitting beside "96,40,964" in the same column.
 */
export function fmtAmount(value: number | null | undefined): string {
  if (value == null || isNaN(value)) { return '\u20B90.00'; }
  return '\u20B9' + value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** Compact form for KPI tiles and axis ticks: 2.99 Cr, 7.55 L. */
export function fmtAmountShort(value: number | null | undefined): string {
  if (value == null || isNaN(value)) { return '\u20B90'; }
  const abs = Math.abs(value);
  if (abs >= CRORE) { return '\u20B9' + (value / CRORE).toFixed(2) + ' Cr'; }
  if (abs >= LAKH)  { return '\u20B9' + (value / LAKH).toFixed(2) + ' L'; }
  return fmtAmount(value);
}

/** Whole-number count with Indian grouping. */
export function fmtCount(value: number | null | undefined): string {
  if (value == null || isNaN(value)) { return '0'; }
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Percentage to one decimal. Pass an already-computed percentage. */
export function fmtPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) { return '0%'; }
  return value.toFixed(decimals) + '%';
}

/** Share of a total, guarded against divide-by-zero. Returns a percentage. */
export function share(part: number | null | undefined, total: number | null | undefined): number {
  if (!total || total === 0 || part == null || isNaN(part)) { return 0; }
  return (part / total) * 100;
}

/**
 * Percentage change between two periods.
 * Returns null when it cannot be computed honestly - a null previous value, or
 * a previous value of zero (where any change is an undefined percentage).
 * Callers must render nothing when this returns null rather than showing 0%.
 */
export function pctChange(current: number | null | undefined,
                          previous: number | null | undefined): number | null {
  if (current == null || previous == null) { return null; }
  if (previous === 0) { return null; }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/* ---------------------------------------------------------------------- */
/* Voucher labels                                                          */
/* ---------------------------------------------------------------------- */

/** Compact label for chart axes. Code only. */
export function axisLabel(code: string | null | undefined): string {
  return (code ?? '').trim();
}

/** Tooltip label: code and full description. */
export function tooltipLabel(code: string | null | undefined,
                             description: string | null | undefined): string {
  const c = (code ?? '').trim();
  const d = (description ?? '').trim();
  if (!d || d.toUpperCase() === c.toUpperCase()) { return c; }
  return `${c} \u2014 ${d}`;
}

/** Legend label: code plus a shortened description. */
export function legendLabel(code: string | null | undefined,
                            description: string | null | undefined,
                            maxDescription = 22): string {
  const c = (code ?? '').trim();
  const d = (description ?? '').trim();
  if (!d || d.toUpperCase() === c.toUpperCase()) { return c; }
  return `${c} \u2014 ${truncate(toTitleCase(d), maxDescription)}`;
}

/** Full business description, falling back to the code when absent. */
export function detailLabel(code: string | null | undefined,
                            description: string | null | undefined): string {
  const d = (description ?? '').trim();
  return d ? d : (code ?? '').trim();
}

/** Truncate with an ellipsis, never mid-word where avoidable. */
export function truncate(text: string, max: number): string {
  const t = (text ?? '').trim();
  if (t.length <= max) { return t; }
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '\u2026';
}

/**
 * Many descriptions are stored fully upper case
 * ("SBI B HALLI BRANCH RECEIPT VOUCHER"), which is hard to read in a legend.
 * Mixed-case values are left exactly as they are.
 */
export function toTitleCase(text: string): string {
  const t = (text ?? '').trim();
  if (!t || t !== t.toUpperCase()) { return t; }
  return t.toLowerCase().replace(/\b([a-z])/g, (_m, ch: string) => ch.toUpperCase());
}
