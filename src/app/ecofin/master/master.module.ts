import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MasterRoutingModule } from './master-routing.module';
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

@NgModule({
  declarations: [
    AccountingCalendarComponent,
    BankInstrumentComponent,
    CompanyComponent,
    CostCenterComponent,
    CurrencyComponent,
    CustomerComponent,
    EmployeeComponent,
    ImportCustomerComponent,
    ImportEmployeeComponent,
    ImportSupplierComponent,
    LedgerAccountComponent,
    OprefixComponent,
    TdsComponent,
    VendorComponent,
    UserComponent,
    BankComponent,
    UserPermissionsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MasterRoutingModule
  ]
})
export class MasterModule { }
