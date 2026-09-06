import { FlowNodeKey } from '../services/voucher-group.map';

/**
 * View models for the redesigned dashboard.
 *
 * These are derived client-side from DashboardSummaryDto. No API contract
 * changes. Nothing here is fetched; everything is computed from data the
 * existing GetSummary endpoint already returns.
 */

/* ---------------------------------------------------------------------- */
/* KPI cards                                                               */
/* ---------------------------------------------------------------------- */

/**
 * A period-over-period comparison. This is OPTIONAL by design.
 *
 * It is only produced where the data genuinely supports it:
 *   - Posted Amount   -> monthlyTrend has per-period posted amounts
 *   - On Hold Amount  -> monthlyTrend has per-period on-hold amounts
 *   - Total Vouchers  -> GroupTrendDto.count summed per period. NOTE the trend
 *                        query filters DBCRFLAG='D', so this counts debit-side
 *                        vouchers while kpi.totalVouchers counts all. Compare
 *                        trend-to-trend, never trend against the KPI.
 *
 * It is NOT produced for:
 *   - Banks / Accounts    (no history at all)
 *   - Vendors / Customers (no history at all)
 *
 * When a delta cannot be computed the card must render no indicator. It must
 * never fall back to zero, which would read as "no change".
 */
export interface KpiDelta {
  /** Signed percentage change. */
  pct: number;
  direction: 'up' | 'down' | 'flat';
  /** What the comparison is against, e.g. "vs JUL - 2026". Shown to the user. */
  basis: string;
}

export interface KpiCard {
  key: 'vouchers' | 'posted' | 'onhold' | 'banks' | 'parties';
  label: string;
  /** Pre-formatted for display. */
  value: string;
  /** Full-precision value for a title/tooltip, when the display value is compact. */
  valueFull?: string;
  secondary: string;
  icon: string;
  tint: string;
  /** Absent when no honest comparison exists. */
  delta?: KpiDelta;
}

/* ---------------------------------------------------------------------- */
/* Cash & Voucher Flow                                                     */
/* ---------------------------------------------------------------------- */

export interface FlowNode {
  key: FlowNodeKey;
  label: string;
  icon: string;
  amount: number;
  voucherCount: number;
  /** Share of the combined flow amount, for the small badge on each node. */
  sharePct: number;
  /** Group codes rolled up here, used for drill-down and the tooltip. */
  groups: string[];
}

export interface BankPositionNode {
  totalBalance: number;
  bankCount: number;
  accountCount: number;
}

export interface CashVoucherFlow {
  nodes: FlowNode[];
  bankPosition: BankPositionNode;
  /** Period label the flow describes, e.g. "AUG - 2026". */
  periodLabel: string;
}

/* ---------------------------------------------------------------------- */
/* AI insights                                                             */
/* ---------------------------------------------------------------------- */

export type InsightSeverity = 'info' | 'positive' | 'warning';

/** One piece of supporting data behind an insight, shown in "Explain more". */
export interface InsightEvidence {
  label: string;
  value: string;
}

export interface InsightAction {
  key: 'explain' | 'view-transactions' | 'compare-periods';
  label: string;
  /** Voucher type / group the action should drill into, when applicable. */
  target?: string;
}

export interface DashboardInsight {
  id: string;
  severity: InsightSeverity;
  /** Plain statement. Must be supported by every item in evidence. */
  text: string;
  evidence: InsightEvidence[];
  actions: InsightAction[];
}

/**
 * Lets a real AI endpoint replace the deterministic generator later without
 * touching any component. Components depend on this, not on the concrete
 * DashboardInsightService.
 */
export interface IDashboardInsightProvider {
  generate(summary: unknown): DashboardInsight[];
}

/* ---------------------------------------------------------------------- */
/* Charts                                                                  */
/* ---------------------------------------------------------------------- */

/**
 * A selectable series on the trend chart. The chart defaults to a single
 * total line; group series are opt-in, so it never renders 8-10 lines at once.
 */
export interface TrendSeriesOption {
  key: string;
  label: string;
  color: string;
  selected: boolean;
}

/** One row of the Top 5 voucher-group ranking card. */
export interface GroupRankRow {
  rank: number;
  groupCode: string;
  amount: number;
  sharePct: number;
}
