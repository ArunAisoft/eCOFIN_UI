import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { TdsreportComponent } from './tdsreport/tdsreport.component';
import { GstreportComponent } from './gstreport/gstreport.component';
import { LedgerpartywisereportComponent } from './ledgerpartywisereport/ledgerpartywisereport.component';
import { LedgeraccountwisereportComponent } from './ledgeraccountwisereport/ledgeraccountwisereport.component';
import { BankbookreportComponent } from './bankbookreport/bankbookreport.component';
import { CashbookreportComponent } from './cashbookreport/cashbookreport.component';
import { ContravoucherregisterreportComponent } from './contravoucherregisterreport/contravoucherregisterreport.component';
import { PurchaseregisterreportComponent } from './purchaseregisterreport/purchaseregisterreport.component';
import { JournalregisterreportComponent } from './journalregisterreport/journalregisterreport.component';
import { DebitnoteregisterreportComponent } from './debitnoteregisterreport/debitnoteregisterreport.component';
import { CreditnoteregisterreportComponent } from './creditnoteregisterreport/creditnoteregisterreport.component';
import { TravelregisterreportComponent } from './travelregisterreport/travelregisterreport.component';
import { SalesregisterreportComponent } from './salesregisterreport/salesregisterreport.component';
import { SalesjournalreportComponent } from './salesjournalreport/salesjournalreport.component';
import { AgeingReportComponent } from './ageingreport/ageingreport.component';
import { GeneralLedgerReportComponent } from './generalledgerreport/generalledgerreport.component';
import { SubLedgerReportComponent } from './subledgerreport/subledgerreport.component';
import { BankReconciliationReportComponent } from './bankreconciliationreport/bankreconciliationreport.component';


@NgModule({
  declarations: [
    TdsreportComponent,
    GstreportComponent,
    LedgerpartywisereportComponent,
    LedgeraccountwisereportComponent,
    BankbookreportComponent,
    CashbookreportComponent,
    ContravoucherregisterreportComponent,
    PurchaseregisterreportComponent,
    JournalregisterreportComponent,
    DebitnoteregisterreportComponent,
    CreditnoteregisterreportComponent,
    TravelregisterreportComponent,
    SalesregisterreportComponent,
    SalesjournalreportComponent,
    AgeingReportComponent,
    GeneralLedgerReportComponent,
    SubLedgerReportComponent,
    BankReconciliationReportComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    ReportsRoutingModule
  ]
})
export class ReportsModule { }
