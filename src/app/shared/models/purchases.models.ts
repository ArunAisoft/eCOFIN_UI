export interface PurchaseSummaryModel {
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

export interface PurchaseModel {
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

export interface PurjDetailsModel {
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

export interface PurchaseBillDetailModel {
  billNo: string;
  billDate?: string;
  billDueDate?: string;
  poRefNo?: string;
  poDate?: string;
  tdsCode?: string;
  billAmount?: number;
  deduAmount?: number;
  tdsAmount?: number;
}

export interface PurchaseWithDetailsModel {
  header: PurchaseModel;
  details: PurjDetailsModel[];
  billDetails: PurchaseBillDetailModel;
}

export interface PurchasesRequestModel {
  voucherData: PurchaseModel;
  details: PurjDetailsModel[];
  billDetails: PurchaseBillDetailModel;
  financialYear: string;
  accountingPeriod: string;
  locationCode?: string;
  username: string;
}

export interface GINImportModel {
  ginNo: string;
  ginDate: string;
  invoiceNo: string;
  invoiceDate: string;
  pmtDDate?: string;
  poNo?: string;
  suppCode?: string;
  vendorName: string;
  appDate?: string;
  accQtyPSLPrice: number;
  isValid?: boolean;
  validationMessage?: string;
  selected?: boolean;
}

export interface JINImportModel {
  jinNo: string;
  jinDate: string;
  bankCode?: string;
  accountCode?: string;
  vendorCode: string;
  vendorName: string;
  accRemarks?: string;
  tdsCode?: string;
  productValue: number;
  rejValue: number;
  tdsValue: number;
  isValid?: boolean;
  validationMessage?: string;
  selected?: boolean;
}