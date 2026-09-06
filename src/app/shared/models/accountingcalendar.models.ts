export interface FinancialYearDto {
  financialYear: string;
  fromDate?: string | null;
  toDate?: string | null;
  description?: string | null;
}

export interface AccountingPeriodDto {
  accperiod: string;
  accmonth?: string;
  periodfrom?: string | null;
  periodto?: string | null;
  sequence?: string;
  accyear?: string;
}

export interface FinancialYearCreateModel {
  financialYear: string;
  fromDate: string;
  toDate: string;
  description?: string;
  accPeriod?: string;
  location?: string;
  username?: string;
}

export interface AccountingPeriodCreateModel {
  financialYear?: string;
  accPeriod: string;
  accmonth?: string;
  periodfrom: string;
  periodto: string;
  sequence?: string;
  accyear?: string;
  location?: string;
  username?: string;
}