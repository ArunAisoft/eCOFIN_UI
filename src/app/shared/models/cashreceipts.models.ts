export interface CashReceiptSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  vchrDate?: string | null;
  totalAmount?: number | null;
  cashAccount?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
}

export interface CashReceiptsModel {
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

export interface CashrDetailsModel {
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

export interface CashReceiptWithDetailsModel {
  header: CashReceiptsModel;
  details: CashrDetailsModel[];
}

export interface CashReceiptsRequestModel {
  voucherData: CashReceiptsModel;
  details: CashrDetailsModel[];
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}