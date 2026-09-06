export interface BankReceiptSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  vchrDate?: string | null;
  totalAmount?: number | null;
  bankCode?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
}

export interface BankReceiptsModel {
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

export interface BankReceiptWithDetailsModel {
  header: BankReceiptsModel;
  details: BankrDetailsModel[];
}

export interface BankReceiptsRequestModel {
  voucherData: BankReceiptsModel;
  details: BankrDetailsModel[];
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}