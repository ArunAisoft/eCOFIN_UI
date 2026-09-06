export interface FinancialYear {
  financialYear: string;
  status?: string | null;
  accountingCalendars: AccountingCalendar[];
}

export interface AccountingCalendar {
  accPeriod: string;
  periodFrom: string;
  periodTo: string;
  sequence: number;
  periodState?: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountType?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface GLDetailRow {
  sequenceNo?: string | number;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
  voucherNumber?: string;
  voucherDate?: string;
  lineDetails?: string;
  voucherType?: string;
}

export interface SubledgerScheduleRow {
  accountCode: string;
  description?: string;
  subAccountCode: string;
  subCodeDescription?: string;
  debit: number;
  credit: number;
}

export interface SubledgerAccountRow {
  sequenceNo?: string | number;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
  voucherNumber?: string;
  voucherDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  subAccountCode?: string;
  subCodeDescription?: string;
}

export interface BillPaymentRow {
  nature: 'Bills' | 'Payments';
  accountCode: string;
  subAccountCode?: string;
  voucherNumber?: string;
  voucherDate?: string;
  billNo?: string;
  billDate?: string;
  billBalance?: number;
  subCodeDescription?: string;
  voucherNarration?: string;
}

export interface VoucherEntryRow {
  accountCode: string;
  description?: string;
  subAccountCode?: string;
  subCodeDescription?: string;
  voucherDate?: string;
  voucherNarration?: string;
  lineDetails?: string;
  dbCrFlag?: string;
  voucherAmount: number;
  debit: number;
  credit: number;
  instrumentNo?: string;
  instrumentDate?: string;
  tdsAmount: number;
  ctrlSequenceNo: number;
}

export interface CostProductEntryRow {
  accountCode: string;
  description: string;
  costCentreCode: string;
  costCentreDescription: string;
  voucherAmount: number;
  ctrlStatus: string;
  ctrlSequenceNo: number;
}
