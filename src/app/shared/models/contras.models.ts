export interface ContraSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  vchrDate?: string | null;
  totalAmount?: number | null;
  bankCode?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
}

export interface ContraModel {
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

export interface ContraDetailsModel {
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

export interface ContraWithDetailsModel {
  header: ContraModel;
  details: ContraDetailsModel[];
}

export interface ContrasRequestModel {
  voucherData: ContraModel;
  details: ContraDetailsModel[];
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}