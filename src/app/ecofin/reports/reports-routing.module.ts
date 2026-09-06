import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  { path: 'tdsreport', component: TdsreportComponent },
  { path: 'gstreport', component: GstreportComponent },
  { path: 'ledgerpartywisereport', component: LedgerpartywisereportComponent },
  { path: 'ledgeraccountwisereport', component: LedgeraccountwisereportComponent },
  { path: 'bankbookreport', component: BankbookreportComponent },
  { path: 'cashbookreport', component: CashbookreportComponent },
  { path: 'contravoucherregisterreport', component: ContravoucherregisterreportComponent },
  { path: 'purchaseregisterreport', component: PurchaseregisterreportComponent },
  { path: 'journalregisterreport', component: JournalregisterreportComponent },
  { path: 'debitnoteregisterreport', component: DebitnoteregisterreportComponent },
  { path: 'creditnoteregisterreport', component: CreditnoteregisterreportComponent },
  { path: 'travelregisterreport', component: TravelregisterreportComponent },
  { path: 'salesregisterreport', component: SalesregisterreportComponent },
  { path: 'salesjournalreport', component: SalesjournalreportComponent },
  { path: 'ageingreport', component: AgeingReportComponent },
  { path: 'generalledgerreport', component: GeneralLedgerReportComponent },
  { path: 'subledgerreport', component: SubLedgerReportComponent },
  { path: 'bankreconciliationreport', component: BankReconciliationReportComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
