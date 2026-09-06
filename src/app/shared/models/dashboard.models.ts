export interface DashboardKpiDto {
  totalVouchers: number;
  totalPostedAmount: number;
  totalOnHoldAmount: number;
  totalBanks: number;
  totalAccounts: number;
  totalVendors: number;
  totalCustomers: number;
  postedCount: number;
  onHoldCount: number;
  draftCount: number;
}

export interface MonthlyVolumeDto {
  accPeriod: string;
  count: number;
  amount: number;
}

export interface LinkedBankAccountDto {
  bankCode: string;
  bankName: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

export interface VoucherTypeMetricDto {
  voucherType: string;
  voucherSysCategory: string;
  description: string;
  voucherGroup: string;
  accountType: string;
  totalCount: number;
  postedCount: number;
  onHoldCount: number;
  draftCount: number;
  postedAmount: number;
  onHoldAmount: number;
  postedPercent: number;
  onHoldPercent: number;
  linkedAccounts: LinkedBankAccountDto[];
  monthlyVolume: MonthlyVolumeDto[];
}

export interface BankAccountSummaryDto {
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
  postedDebit: number;
  postedCredit: number;
  onHoldDebit: number;
  onHoldCredit: number;
  voucherTypes: string[];
}

export interface BankSummaryDto {
  bankCode: string;
  bankName: string;
  objectStatus: string;
  accountCount: number;
  totalBalance: number;
  postedDebit: number;
  postedCredit: number;
  onHoldDebit: number;
  onHoldCredit: number;
  accounts: BankAccountSummaryDto[];
}

export interface GroupTrendDto {
  voucherGroup: string;
  count: number;
  postedAmount: number;
  onHoldAmount: number;
}

export interface MonthlyTrendDto {
  accPeriod: string;
  sequence: number;
  periodState: string;
  groups: GroupTrendDto[];
}

export interface RecentVoucherDto {
  voucherNo: string;
  onHoldNo: string;
  voucherType: string;
  voucherSysCat: string;
  voucherGroup: string;
  description: string;
  accountCode: string;
  subAccountCode: string;
  bankCode: string;
  accPeriod: string;
  voucherDate: string;
  amount: number;
  dbCrFlag: string;
  ctrlStatus: string;
  createdBy: string;
}

export interface StatusBreakdownDto {
  postedCount: number;
  onHoldCount: number;
  draftCount: number;
  postedAmount: number;
  onHoldAmount: number;
  postedPct: number;
  onHoldPct: number;
  draftPct: number;
}

export interface VoucherTypeDrillDto {
  voucherSysCategory: string;
  description: string;
  voucherGroup: string;
  kpi: DashboardKpiDto;
  linkedAccounts: LinkedBankAccountDto[];
  monthlyVolume: MonthlyVolumeDto[];
  recentVouchers: RecentVoucherDto[];
  statusBreakdown: StatusBreakdownDto;
}

export interface DashboardSummaryDto {
  /** Financial years with active periods, newest first, e.g. '2026-27'. */
  financialYears: string[];
  /** The year this payload was built for, null when unfiltered. */
  selectedFinYear: string | null;
  kpi: DashboardKpiDto;
  voucherMetrics: VoucherTypeMetricDto[];
  bankSummary: BankSummaryDto[];
  monthlyTrend: MonthlyTrendDto[];
  recentVouchers: RecentVoucherDto[];
}

export interface VoucherTypeConfig {
  code: string;
  label: string;
  group: string;
  color: string;
  bgColor: string;
}

export const VOUCHER_TYPE_CONFIG: VoucherTypeConfig[] = [
  { code: 'BNKP', label: 'Bank Payment', group: 'BNK', color: '#378ADD', bgColor: '#E6F1FB' },
  { code: 'BNKR', label: 'Bank Receipt', group: 'BNK', color: '#1D9E75', bgColor: '#E3F5EF' },
  { code: 'CASP', label: 'Cash Payment', group: 'CASH', color: '#D85A30', bgColor: '#FAEEE8' },
  { code: 'CASR', label: 'Cash Receipt', group: 'CASH', color: '#BA7517', bgColor: '#FAF0DC' },
  { code: 'SALE', label: 'Sales', group: 'SALE', color: '#7F77DD', bgColor: '#EEEDFB' },
  { code: 'PURCH', label: 'Purchase', group: 'PURCH', color: '#D4537E', bgColor: '#FAEAEF' },
  { code: 'DEB', label: 'Debit Note', group: 'DBNOT', color: '#E24B4A', bgColor: '#FAEAEA' },
  { code: 'CRDN', label: 'Credit Note', group: 'CRNOT', color: '#0F6E56', bgColor: '#E0F0EB' },
  { code: 'BCCON', label: 'Contra', group: 'CONTRA', color: '#534AB7', bgColor: '#ECEAFB' },
  { code: 'OTH', label: 'Journal', group: 'JRNL', color: '#888780', bgColor: '#F1F0EE' },
];