import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';
import { DashboardService } from 'src/app/shared/services/voucher/dashboard.service';
import { DashboardSummaryDto, DashboardKpiDto, VoucherTypeMetricDto, VoucherTypeDrillDto, BankSummaryDto, RecentVoucherDto, MonthlyTrendDto, VoucherTypeConfig } from 'src/app/shared/models/dashboard.models';
import { FinancialYearsWithPeriodsModel } from 'src/app/shared/models/common.models';
import { CommonService } from 'src/app/shared/services/voucher/common.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('barChartRef') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChartRef') donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChartRef') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stackChartRef') stackChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('drillChartRef') drillChartRef!: ElementRef<HTMLCanvasElement>;

  userName: string = '';
  isLoading: boolean = false;
  isDrillLoading: boolean = false;

  summary: DashboardSummaryDto | null = null;
  kpi: DashboardKpiDto | null = null;
  voucherMetrics: VoucherTypeMetricDto[] = [];
  bankList: BankSummaryDto[] = [];
  bankSummary: BankSummaryDto[] = [];
  monthlyTrend: MonthlyTrendDto[] = [];
  recentVouchers: RecentVoucherDto[] = [];
  drillData: VoucherTypeDrillDto | null = null;
  expandedBankCode: string | null = null;

  filterForm!: FormGroup;
  selectedVoucherType: VoucherTypeConfig | null = null;
  selectedStatus: string = '';

  voucherTypeConfig: VoucherTypeConfig[] = [];

  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];

  readonly statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Posted', value: 'Post' },
    { label: 'On Hold', value: 'Hold' },
  ];

  private barChart: Chart | null = null;
  private donutChart: Chart | null = null;
  private lineChart: Chart | null = null;
  private stackChart: Chart | null = null;
  private drillChart: Chart | null = null;

  private get CHART_COLORS(): string[] { return this.voucherTypeConfig.length ? this.voucherTypeConfig.map(v => v.color) : ['#546E7A']; }
  private readonly GRID_COLOR = 'rgba(128,128,128,0.1)';
  private readonly TICK_COLOR = 'rgba(128,128,128,0.6)';

  constructor(
    private fb: FormBuilder,
    private dashboardService: DashboardService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private commonService: CommonService
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.userName = localStorage.getItem('userName') ?? '';
    this.filterForm = this.fb.group({ bankCode: [null], finYear: [null], accPeriod: [null] });
    this.loadDropdownData();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroyAllCharts();
  }

  get bankCodeControl() { return this.filterForm.get('bankCode') as FormControl; }
  get accPeriodControl() { return this.filterForm.get('accPeriod') as FormControl; }
  get finYearControl() { return this.filterForm.get('finYear') as FormControl; }

  loadDropdownData(): void {
    this.commonService.getYearList().subscribe({
      next: (response) => {
        this.years = response.data ?? [];
        if (this.years.length > 0) {
          const firstYear = this.years[0];
          this.finYearControl.setValue(firstYear.financialyear, { emitEvent: false });
          this.months = firstYear.periods || [];
          this.accPeriodControl.setValue(null, { emitEvent: false });
          this.loadSummary();
        }
      },
      error: (error) => {
        console.error('Error loading financial years:', error);
      }
    });
  }

  loadSummary(): void {
    const { bankCode, accPeriod, finYear } = this.filterForm.value;
    this.isLoading = true;
    this.destroyAllCharts();

    normalizeResponse<any>(this.dashboardService.getSummary(this.userName, bankCode ?? undefined, accPeriod ?? undefined, finYear ?? undefined), 'Dashboard')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: res => {
          if (res.status === 200) {
            const data = res.data;
            if (!data) { this.alertService.warning('No dashboard data found.'); return; }
            if (!this.bankList.length) {
              this.bankList = data.bankSummary ?? [];
            }

            this.bankSummary = data.bankSummary ?? [];
            this.summary = data;
            this.kpi = data.kpi;
            this.voucherMetrics = data.voucherMetrics ?? [];
            this.buildVoucherTypeConfig();
            this.monthlyTrend = data.monthlyTrend ?? [];
            this.recentVouchers = data.recentVouchers ?? [];

            this.cdr.detectChanges();
            setTimeout(() => this.buildAllCharts(), 0);
          } else {
            this.alertService.showCommonError(res.status, res.message, 'Dashboard');
          }
        },
        error: (err: any) => this.alertService.showCommonError(err?.status || 0, err?.error?.message || err?.message, 'Dashboard')
      });
  }

  onFilterChange(): void {
    this.drillData = null;
    this.selectedVoucherType = null;
    this.loadSummary();
  }

  selectVoucherType(cfg: VoucherTypeConfig): void {
    if (!cfg) return;
    if (this.selectedVoucherType?.code === cfg.code) {
      this.selectedVoucherType = null;
      this.drillData = null;
      return;
    }
    this.selectedVoucherType = cfg;
    this.loadDrillDown(cfg.code);
  }

  private loadDrillDown(sysCategory: string): void {
    const { bankCode } = this.filterForm.value;
    this.isDrillLoading = true;
    this.destroyDrillChart();

    normalizeResponse<any>(this.dashboardService.getDrillDown(sysCategory, this.userName, bankCode ?? undefined), 'Drill Down')
      .pipe(finalize(() => (this.isDrillLoading = false)))
      .subscribe({
        next: res => {
          if (res.status === 200) {
            const data = res.data;
            if (!data) { this.alertService.warning('No drill-down data found.'); return; }
            this.drillData = data;
            this.cdr.detectChanges();
            setTimeout(() => this.buildDrillChart(data.monthlyVolume ?? []), 0);
            return;
          }
          this.alertService.showCommonError(res.status, res.message, 'Drill Down');
        },
        error: (err: any) =>
          this.alertService.showCommonError(
            err?.status || 0, err?.error?.message || err?.message, 'Drill Down'
          )
      });
  }

  closeDrillDown(): void {
    this.drillData = null;
    this.selectedVoucherType = null;
    this.destroyDrillChart();
  }

  toggleBankExpand(bankCode: string): void {
    this.expandedBankCode = this.expandedBankCode === bankCode ? null : bankCode;
  }

  get filteredRecentVouchers(): RecentVoucherDto[] {
    let rows = this.recentVouchers;
    if (this.selectedVoucherType)
      rows = rows.filter(r => r.voucherSysCat === this.selectedVoucherType!.code);
    if (this.selectedStatus)
      rows = rows.filter(r => r.ctrlStatus === this.selectedStatus);
    return rows;
  }

  onStatusFilterChange(status: string): void { this.selectedStatus = status; }


  onFinYearChange(): void {
    const fy = this.years.find(y => y.financialyear === this.finYearControl.value);
    this.months = fy?.periods || [];
    this.accPeriodControl.setValue(null, { emitEvent: false });
    this.loadSummary();
  }

  private buildAllCharts(): void {
    this.buildBarChart();
    this.buildDonutChart();
    this.buildLineChart();
    this.buildStackChart();
  }

  private buildBarChart(): void {
    if (!this.barChartRef?.nativeElement || !this.voucherMetrics.length) return;
    this.barChart?.destroy();
    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.voucherMetrics.map(v => v.voucherSysCategory),
        datasets: [{ label: 'Total vouchers', data: this.voucherMetrics.map(v => v.totalCount), backgroundColor: this.CHART_COLORS, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: this.GRID_COLOR }, ticks: { color: this.TICK_COLOR } },
          y: { grid: { display: false }, ticks: { color: this.TICK_COLOR } }
        },
        onClick: (_e, els) => {
          if (!els.length) return;
          const cfg = this.voucherTypeConfig.find(v => v.code === this.voucherMetrics[els[0].index]?.voucherSysCategory);
          if (cfg) this.selectVoucherType(cfg);
        }
      }
    });
  }

  private buildDonutChart(): void {
    if (!this.donutChartRef?.nativeElement || !this.voucherMetrics.length) return;
    this.donutChart?.destroy();
    this.donutChart = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.voucherMetrics.map(v => `${v.voucherSysCategory} ₹${this.fmtLakh(v.postedAmount)}L`),
        datasets: [{ data: this.voucherMetrics.map(v => v.postedAmount), backgroundColor: this.CHART_COLORS, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ₹${this.fmtAmount(ctx.raw as number)}` } }
        },
        onClick: (_e, els) => {
          if (!els.length) return;
          const cfg = this.voucherTypeConfig.find(v => v.code === this.voucherMetrics[els[0].index]?.voucherSysCategory);
          if (cfg) this.selectVoucherType(cfg);
        }
      }
    });
  }

  private buildLineChart(): void {
    if (!this.lineChartRef?.nativeElement || !this.monthlyTrend.length) return;
    this.lineChart?.destroy();
    const labels = this.monthlyTrend.map(m => m.accPeriod);
    const groupKeys = [...new Set(this.monthlyTrend.flatMap(m => m.groups.map(g => g.voucherGroup)))].sort();
    const groupColors: Record<string, string> = { BNK: '#378ADD', CASH: '#D85A30', SALE: '#7F77DD', PURCH: '#D4537E', CONTRA: '#534AB7', JRNL: '#888780', DBNOT: '#E24B4A', CRNOT: '#0F6E56', };
    this.lineChart = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: groupKeys.map((key, i) => ({
          label: key,
          data: this.monthlyTrend.map(m => m.groups.find(g => g.voucherGroup === key)?.postedAmount ?? 0),
          borderColor: groupColors[key] ?? this.CHART_COLORS[i % this.CHART_COLORS.length],
          backgroundColor: 'transparent',
          tension: 0.4, borderDash: i > 1 ? [5, 3] : [], pointRadius: 3,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { grid: { color: this.GRID_COLOR }, ticks: { color: this.TICK_COLOR, maxRotation: 0 } },
          y: { grid: { color: this.GRID_COLOR }, ticks: { color: this.TICK_COLOR, callback: v => `₹${this.fmtLakh(+v)}L` } }
        }
      }
    });
  }

  private buildStackChart(): void {
    if (!this.stackChartRef?.nativeElement || !this.voucherMetrics.length) return;
    this.stackChart?.destroy();

    const byGroup = new Map<string, { posted: number; hold: number; count: number }>();
    for (const m of this.voucherMetrics) {
      const key = m.voucherGroup || 'UNCLASSIFIED';
      const cur = byGroup.get(key) ?? { posted: 0, hold: 0, count: 0 };
      cur.posted += m.postedAmount ?? 0;
      cur.hold += m.onHoldAmount ?? 0;
      cur.count += m.totalCount ?? 0;
      byGroup.set(key, cur);
    }

    const rows = [...byGroup.entries()].sort((x, y) => y[1].posted - x[1].posted);

    this.stackChart = new Chart(this.stackChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: rows.map(r => r[0]),
        datasets: [
          {
            label: 'Posted amount',
            data: rows.map(r => r[1].posted),
            backgroundColor: '#1D9E75',
            borderRadius: 3
          },
          {
            label: 'On hold amount',
            data: rows.map(r => r[1].hold),
            backgroundColor: '#BA7517',
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ₹${this.fmtAmount(ctx.raw as number)}`,
              afterLabel: ctx => {
                const r = rows[ctx.dataIndex];
                return r ? `${r[1].count} voucher(s)` : '';
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: this.GRID_COLOR },
            ticks: {
              color: this.TICK_COLOR,
              callback: (v) => this.fmtAmountShort(Number(v))
            }
          },
          y: { stacked: true, grid: { display: false }, ticks: { color: this.TICK_COLOR } }
        }
      }
    });
  }

  private buildDrillChart(monthlyVolume: { accPeriod: string; count: number; amount: number }[]): void {
    if (!this.drillChartRef?.nativeElement || !monthlyVolume.length) return;
    this.destroyDrillChart();
    const color = this.selectedVoucherType?.color ?? '#378ADD';
    this.drillChart = new Chart(this.drillChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: monthlyVolume.map(m => m.accPeriod),
        datasets: [{ label: 'Volume', data: monthlyVolume.map(m => m.count), backgroundColor: color + 'CC', borderRadius: 3 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: this.TICK_COLOR, font: { size: 10 }, maxRotation: 0 } },
          y: { grid: { color: this.GRID_COLOR }, ticks: { color: this.TICK_COLOR, font: { size: 10 } } }
        }
      }
    });
  }

  private destroyAllCharts(): void {
    [this.barChart, this.donutChart, this.lineChart, this.stackChart, this.drillChart].forEach(c => c?.destroy());
    this.barChart = this.donutChart = this.lineChart = this.stackChart = this.drillChart = null;
  }

  private destroyDrillChart(): void {
    this.drillChart?.destroy();
    this.drillChart = null;
  }

  getVoucherConfig(code: string): VoucherTypeConfig | undefined {
    return this.voucherTypeConfig.find(v => v.code === code);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { Post: 'Posted', ONHOLD: 'On Hold', Draft: 'Draft' };
    return map[status] ?? status;
  }

  fmtAmount(val: number | null | undefined): string {
    if (val == null) return '₹0.00';
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtAmountShort(val: number | null | undefined): string {
    if (val == null) return '₹0';
    const n = Math.abs(val);
    if (n >= 1e7) return '₹' + (val / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (val / 1e5).toFixed(2) + ' L';
    return this.fmtAmount(val);
  }

  private buildVoucherTypeConfig(): void {
    const groupColor: Record<string, [string, string]> = {
      BNKP: ['#1565C0', '#E3F2FD'],
      BNKR: ['#00838F', '#E0F7FA'],
      CASP: ['#EF6C00', '#FFF3E0'],
      CASR: ['#F9A825', '#FFFDE7'],
      SALV: ['#2E7D32', '#E8F5E9'],
      DEBT: ['#C62828', '#FFEBEE'],
      CRDT: ['#6A1B9A', '#F3E5F5'],
      JRNL: ['#4527A0', '#EDE7F6'],
      CONT: ['#00695C', '#E0F2F1'],
      ADJV: ['#37474F', '#ECEFF1'],
      CHQR: ['#5D4037', '#EFEBE9'],
      PAYBR: ['#455A64', '#ECEFF1'],
      PAYCR: ['#455A64', '#ECEFF1'],
      MEMO: ['#616161', '#F5F5F5'],
      RETM: ['#616161', '#F5F5F5'],
      REVC: ['#616161', '#F5F5F5'],
      RJV: ['#616161', '#F5F5F5'],
      TRVL: ['#616161', '#F5F5F5'],
    };
    const fallback: [string, string] = ['#546E7A', '#ECEFF1'];

    this.voucherTypeConfig = this.voucherMetrics.map(m => {
      const [color, bgColor] = groupColor[m.voucherGroup] ?? fallback;
      return {
        code: m.voucherSysCategory,
        label: m.description || m.voucherSysCategory,
        group: m.voucherGroup,
        color,
        bgColor
      };
    });
  }

  fmtLakh(val: number): string { return (val / 100000).toFixed(1); }

  postedPct(m: VoucherTypeMetricDto): number {
    return m.totalCount > 0 ? Math.round((m.postedCount / m.totalCount) * 100) : 0;
  }

  onHoldPct(m: VoucherTypeMetricDto): number {
    return m.totalCount > 0 ? Math.round((m.onHoldCount / m.totalCount) * 100) : 0;
  }

  trackByCode(_: number, item: VoucherTypeMetricDto): string { return item.voucherSysCategory; }
  trackByCfgCode(_: number, item: VoucherTypeConfig): string { return item.code; }
  trackByBank(_: number, item: BankSummaryDto): string { return item.bankCode; }
  trackByVchr(_: number, item: RecentVoucherDto): string { return item.voucherNo; }
}