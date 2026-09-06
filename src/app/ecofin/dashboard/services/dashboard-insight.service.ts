import { Injectable } from '@angular/core';
import { DashboardSummaryDto, VoucherTypeMetricDto } from 'src/app/shared/models/dashboard.models';
import {
  DashboardInsight, IDashboardInsightProvider, InsightEvidence
} from '../models/dashboard-view.models';
import {
  fmtAmount, fmtAmountShort, fmtCount, fmtPercent, share, detailLabel, tooltipLabel
} from './dashboard-format.util';

/**
 * Deterministic dashboard insights.
 *
 * This is NOT an AI integration and does not pretend to be one. Every insight
 * is a direct arithmetic statement about values already present in
 * DashboardSummaryDto, and every one carries the figures it was derived from
 * so "Explain more" can show the user the actual numbers.
 *
 * Rules this class follows:
 *   - never state anything the loaded data does not support
 *   - never compare periods unless both periods are present in monthlyTrend
 *   - never assert a trend from a single data point
 *   - emit nothing at all rather than emit filler
 *
 * It implements IDashboardInsightProvider so a real endpoint can be dropped in
 * later by swapping the provider binding. Components must depend on the
 * interface, never on this class directly.
 */
@Injectable({ providedIn: 'root' })
export class DashboardInsightService implements IDashboardInsightProvider {

  /** Below this share a "dominant category" claim is not worth making. */
  private static readonly DOMINANCE_THRESHOLD = 30;

  generate(summary: DashboardSummaryDto | null | undefined): DashboardInsight[] {
    if (!summary) { return []; }

    const insights: DashboardInsight[] = [];
    const metrics = summary.voucherMetrics ?? [];

    const byVolume = this.topBy(metrics, m => m.totalCount);
    const byAmount = this.topBy(metrics, m => m.postedAmount);

    const totalCount  = metrics.reduce((s, m) => s + (m.totalCount ?? 0), 0);
    const totalPosted = metrics.reduce((s, m) => s + (m.postedAmount ?? 0), 0);

    /* 1. Largest voucher type by volume ---------------------------------- */
    if (byVolume && byVolume.totalCount > 0) {
      const pct = share(byVolume.totalCount, totalCount);
      insights.push({
        id: 'top-volume',
        severity: 'info',
        text: `${detailLabel(byVolume.voucherSysCategory, byVolume.description)} `
            + `represents the largest voucher volume.`,
        evidence: [
          { label: 'Voucher type', value: tooltipLabel(byVolume.voucherSysCategory, byVolume.description) },
          { label: 'Vouchers',     value: fmtCount(byVolume.totalCount) },
          { label: 'Share of all vouchers', value: fmtPercent(pct) },
          { label: 'Total vouchers', value: fmtCount(totalCount) }
        ],
        actions: [
          { key: 'explain', label: 'Explain more' },
          { key: 'view-transactions', label: 'View transactions', target: byVolume.voucherSysCategory }
        ]
      });
    }

    /* 2. Largest voucher type by posted amount --------------------------- */
    if (byAmount && byAmount.postedAmount > 0 && byAmount !== byVolume) {
      const pct = share(byAmount.postedAmount, totalPosted);
      insights.push({
        id: 'top-amount',
        severity: 'info',
        text: `${byAmount.voucherSysCategory} accounts for ${fmtPercent(pct)} `
            + `of posted value.`,
        evidence: [
          { label: 'Voucher type', value: tooltipLabel(byAmount.voucherSysCategory, byAmount.description) },
          { label: 'Posted amount', value: fmtAmount(byAmount.postedAmount) },
          { label: 'Total posted',  value: fmtAmount(totalPosted) },
          { label: 'Share',         value: fmtPercent(pct) }
        ],
        actions: [
          { key: 'explain', label: 'Explain more' },
          { key: 'view-transactions', label: 'View transactions', target: byAmount.voucherSysCategory }
        ]
      });
    }

    /* 3. On-hold position ------------------------------------------------ */
    const onHoldCount  = summary.kpi?.onHoldCount ?? 0;
    const onHoldAmount = summary.kpi?.totalOnHoldAmount ?? 0;

    if (onHoldCount === 0) {
      insights.push({
        id: 'no-hold',
        severity: 'positive',
        text: 'No vouchers are currently on hold.',
        evidence: [
          { label: 'On-hold vouchers', value: '0' },
          { label: 'On-hold amount',   value: fmtAmount(0) }
        ],
        actions: [{ key: 'explain', label: 'Explain more' }]
      });
    } else {
      insights.push({
        id: 'has-hold',
        severity: 'warning',
        text: `${fmtCount(onHoldCount)} voucher(s) totalling `
            + `${fmtAmountShort(onHoldAmount)} are on hold.`,
        evidence: [
          { label: 'On-hold vouchers', value: fmtCount(onHoldCount) },
          { label: 'On-hold amount',   value: fmtAmount(onHoldAmount) },
          { label: 'Posted amount',    value: fmtAmount(summary.kpi?.totalPostedAmount ?? 0) }
        ],
        actions: [
          { key: 'explain', label: 'Explain more' },
          { key: 'view-transactions', label: 'View transactions' }
        ]
      });
    }

    /* 4. Period comparison - only when two real periods exist ------------ */
    const periodInsight = this.periodComparison(summary);
    if (periodInsight) { insights.push(periodInsight); }

    /* 5. Concentration warning ------------------------------------------- */
    if (byAmount && totalPosted > 0) {
      const pct = share(byAmount.postedAmount, totalPosted);
      if (pct >= DashboardInsightService.DOMINANCE_THRESHOLD && metrics.length > 2) {
        insights.push({
          id: 'concentration',
          severity: 'info',
          text: `Posted value is concentrated in ${byAmount.voucherSysCategory}, `
              + `which carries ${fmtPercent(pct)} of the total across `
              + `${fmtCount(metrics.length)} voucher types.`,
          evidence: [
            { label: 'Voucher type',   value: tooltipLabel(byAmount.voucherSysCategory, byAmount.description) },
            { label: 'Share of posted', value: fmtPercent(pct) },
            { label: 'Voucher types in period', value: fmtCount(metrics.length) }
          ],
          actions: [{ key: 'explain', label: 'Explain more' }]
        });
      }
    }

    return insights;
  }

  /**
   * Compares the two most recent periods present in monthlyTrend.
   * Returns null when fewer than two periods are loaded, or when the earlier
   * period is zero - a percentage change from zero is undefined, and inventing
   * one would be exactly the kind of unsupported statement this class avoids.
   */
  private periodComparison(summary: DashboardSummaryDto): DashboardInsight | null {
    const trend = [...(summary.monthlyTrend ?? [])].sort((a, b) => a.sequence - b.sequence);
    if (trend.length < 2) { return null; }

    const current  = trend[trend.length - 1];
    const previous = trend[trend.length - 2];

    const sum = (groups: { postedAmount: number }[] | undefined) =>
      (groups ?? []).reduce((s, g) => s + (g.postedAmount ?? 0), 0);

    const cur = sum(current.groups);
    const prv = sum(previous.groups);
    if (prv === 0) { return null; }

    const pct = ((cur - prv) / Math.abs(prv)) * 100;
    const rising = pct >= 0;

    const evidence: InsightEvidence[] = [
      { label: current.accPeriod,  value: fmtAmount(cur) },
      { label: previous.accPeriod, value: fmtAmount(prv) },
      { label: 'Change',           value: (rising ? '+' : '') + fmtPercent(pct) }
    ];

    return {
      id: 'period-change',
      severity: rising ? 'positive' : 'warning',
      text: `Posted amount ${rising ? 'increased' : 'decreased'} by `
          + `${fmtPercent(Math.abs(pct))} compared to ${previous.accPeriod}.`,
      evidence,
      actions: [
        { key: 'explain', label: 'Explain more' },
        { key: 'compare-periods', label: `Compare with ${previous.accPeriod}` }
      ]
    };
  }

  private topBy(metrics: VoucherTypeMetricDto[],
                selector: (m: VoucherTypeMetricDto) => number): VoucherTypeMetricDto | null {
    if (!metrics.length) { return null; }
    return metrics.reduce((best, m) => (selector(m) > selector(best) ? m : best), metrics[0]);
  }
}
