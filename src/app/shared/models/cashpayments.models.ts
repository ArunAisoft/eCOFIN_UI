export interface CashPaymentSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  vchrDate?: string | null;
  totalAmount?: number | null;
  cashAccount?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
}

export interface CashPaymentsModel {
  ctrlOnHoldNo: string;
  voucherNumber: string;
  voucherDate?: string;
  cashAccount: string;
  voucherType: string;
  voucherSysCategory: string;
  voucherNarration: string;
  createdOn?: string;
  updatedOn?: string;
  balance?: number;
}

export interface CashpDetailsModel {
  ctrlOnHoldNo: string;
  ctrlSequenceNo?: number;
  dbCrFlag: string;
  accountCode: string;
  subAccountCode: string;
  drCrAmount?: number;
  instrument: string;
  instrumentNo: string;
  instrumentDate?: string;
  lineParticulars: string;
  automated: string;
}

export interface CashPaymentWithDetailsModel {
  header: CashPaymentsModel;
  details: CashpDetailsModel[];
}

export interface CashPaymentsRequestModel {
  voucherData: CashPaymentsModel;
  details: CashpDetailsModel[];
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}