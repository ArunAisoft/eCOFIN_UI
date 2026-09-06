import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingCalendarComponent } from './accountingcalendar/accountingcalendar.component';
import { BankInstrumentComponent } from './bankinstrument/bankinstrument.component';
import { CompanyComponent } from './company/company.component';
import { CostCenterComponent } from './costcenter/costcenter.component';
import { CurrencyComponent } from './currency/currency.component';
import { CustomerComponent } from './customer/customer.component';
import { EmployeeComponent } from './employee/employee.component';
import { ImportCustomerComponent } from './importcustomer/importcustomer.component';
import { ImportEmployeeComponent } from './importemployee/importemployee.component';
import { ImportSupplierComponent } from './importsupplier/importsupplier.component';
import { LedgerAccountComponent } from './ledgeraccount/ledgeraccount.component';
import { OprefixComponent } from './oprefix/oprefix.component';
import { TdsComponent } from './tds/tds.component';
import { VendorComponent } from './vendor/vendor.component';
import { UserComponent } from './user/user.component';
import { BankComponent } from './bank/bank.component';
import { UserPermissionsComponent } from './userpermissions/userpermissions.component';

const routes: Routes = [
  { path: 'accounting-calendar', component: AccountingCalendarComponent },
  { path: 'currency', component: CurrencyComponent },
  { path: 'ledger-account', component: LedgerAccountComponent },
  { path: 'cost-center', component: CostCenterComponent },
  { path: 'customer', component: CustomerComponent },
  { path: 'import-supplier', component: ImportSupplierComponent },
  { path: 'import-customer', component: ImportCustomerComponent },
  { path: 'oprefix', component: OprefixComponent },
  { path: 'import-employee', component: ImportEmployeeComponent },
  { path: 'employee', component: EmployeeComponent },
  { path: 'company', component: CompanyComponent },
  { path: 'tds', component: TdsComponent },
  { path: 'bank-instrument', component: BankInstrumentComponent },
  { path: 'vendor', component: VendorComponent },
  { path: 'user', component: UserComponent },
  { path: 'bank', component: BankComponent },
  { path: 'user-permissions', component: UserPermissionsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MasterRoutingModule { }