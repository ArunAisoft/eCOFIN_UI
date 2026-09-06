export interface SaleSummaryModel {
  ctrlOnHoldNo: string;
  vchrNumber?: string | null;
  billNumber?: string | null;
  billDate?: string | null;
  billAmount?: number | null;
  bankCode?: string | null;
  description?: string | null;
  vchrNarration?: string | null;
  selected?: boolean;
}

export interface SaleModel {
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

export interface SaleDetailsModel {
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

export interface SaleBillDetailModel {
  billNo: string;
  billDate?: string;
  billAmount?: number;
}

export interface SaleWithDetailsModel {
  header: SaleModel;
  details: SaleDetailsModel[];
  billDetails: SaleBillDetailModel;
}

export interface SalesRequestModel {
  voucherData: SaleModel;
  details: SaleDetailsModel[];
  billDetails: SaleBillDetailModel;
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}

export interface SaleImportModel {
  invoiceNo: string;
  invoiceDate: string;
  customerCode: string;
  customerName: string;
  isValid?: boolean;
  validationMessage?: string;
  selected?: boolean;
}