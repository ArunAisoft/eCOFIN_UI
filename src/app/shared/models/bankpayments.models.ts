export interface BankPaymentSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  vchrDate?: string | null;
  totalAmount?: number | null;
  bankCode?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
  vendorName?: string | null;
}

export interface BankPaymentsModel {
  ctrlOnHoldNo: string;
  voucherNumber: string;
  voucherDate?: string;
  bankCode: string;
  bankAccount: string;
  bankRate?: number;
  currencyCode: string;
  voucherType: string;
  voucherSysCategory: string;
  voucherNarration: string;
  createdOn?: string;
  updatedOn?: string;
  balance?: number;
}

export interface BankrDetailsModel {
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

export interface BankPaymentWithDetailsModel {
  header: BankPaymentsModel;
  details: BankrDetailsModel[];
}

export interface BankPaymentsRequestModel {
  voucherData: BankPaymentsModel;
  details: BankrDetailsModel[];
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}