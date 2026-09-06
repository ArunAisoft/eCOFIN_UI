export interface FinancialYearsWithPeriodsModel {
    financialyear: string;
    fromdate: string;
    todate: string;
    description?: string | null;
    periods: FinancialYearPeriodsModel[];
}

export interface FinancialYearPeriodsModel {
    financialyear: string;
    accperiod: string;
    accmonth: string;
    accyear: string;
    periodfrom: string;
    periodto: string;
    sequence: number;
}

export interface CurrencyModel {
    currencyCode: string;
    currencyName: string;
    objectStatus?: number;
}

export interface BanksAndAccountsModel {
    bankCode: string;
    bankName?: string;
    objectStatus?: string;
    bankAccounts: BankAccountModel[];
}

export interface BankAccountModel {
    bankCode?: string;
    accountCode: string;
    accountName: string;
    accountStatus: string;
    accountType: string;
    billwiseAppl?: string;
    costAppl?: string;
    stockAppl?: string;
    budgetAppl?: string;
    subledgerAppl?: string;
    employeeAppl?: string;
    productAppl?: string;
    expenseAppl?: string;
    costTypeAppl?: string;
    budgetType?: string;
    balance?: number;
    voucherTypes: VoucherTypeModel[];
}

export interface VoucherTypeModel {
    voucherType: string;
    voucherDescription?: string;
    voucherGroup: string;
}

export interface GroupAccountModel {
    accountCode: string;
    accountName: string;
    accountType: string;
    billwiseAppl: string;
    costAppl: string;
    stockAppl: string;
    budgetAppl: string;
    subledgerAppl: string;
    employeeAppl: string;
    productAppl: string;
    expenseAppl: string;
    costTypeAppl: string;
    budgetType: string;
}

export interface CreditDebitBankAccountModel {
    bankCode?: string;
    accountCode: string;
    accountName: string;
    accountStatus: string;
    accountType: string;
    billwiseAppl?: string;
    costAppl?: string;
    stockAppl?: string;
    budgetAppl?: string;
    subledgerAppl?: string;
    employeeAppl?: string;
    productAppl?: string;
    expenseAppl?: string;
    costTypeAppl?: string;
    budgetType?: string;
    balance?: number;
    voucherTypes?: VoucherTypeModel[];
    vendors?: VendorModel[];
    customers?: CustomerModel[];
}

export interface GroupSubAccountModel {
    code: string;
    name: string;
}

export interface VendorModel {
    code: string;
    name: string;
}

export interface CustomerModel {
    code: string;
    name: string;
}

export interface InvoiceModel {
    voucherNo?: string;
    billNo?: string;
    billDate?: string;
    billAmount?: number;
    billBalance?: number;
    amountAdjusted?: number;
    orginalBillBalance?: number;
    orginalAmountAdjusted?: number;
    acceptedAmount?: number | null;
}

export interface BillPendingDetailsModel {
    ctrlOnHoldNo?: string | null;
    ctrlSequenceNo?: string | null;
    voucherNo?: string | null;
    billNo?: string | null;
    billDate?: string | null;
    billAmount: number;
    amountAdjusted: number;
    balanceAmount: number;
    acceptedAmount?: number | null;
    particulars?: string | null;
}

export interface PaymentPendingDetailsModel {
    ctrlOnHoldNo?: string | null;
    ctrlSequenceNo?: string | null;
    voucherNo?: string | null;
    voucherDate?: string | null;
    instrumentNo?: string | null;
    instrumentDate?: string | null;
    paymentAmount: number;
    amountAdjusted: number;
    balanceAmount: number;
    acceptedAmount?: number | null;
    originalBalanceAmount?: number;
    originalAmountAdjusted?: number;
    particulars?: string | null;
}

export interface BillAdjustmentDto {
  voucherNo: string;
  onHoldNo: string;
  sequenceNo: number;
  balanceAmount: number;
  amountAdjusted: number;
}

export interface PaymentAdjustmentDto {
  voucherNo: string;
  onHoldNo: string;
  sequenceNo: number;
  amountAdjusted: number;
  balanceAmount: number;
}

export interface BillPaymentAdjustmentRequest {
  bill: BillAdjustmentDto;
  payments: PaymentAdjustmentDto[];
}