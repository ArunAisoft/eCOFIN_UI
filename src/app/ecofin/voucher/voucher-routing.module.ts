import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BankReceiptsComponent } from './bankreceipts/bankreceipts.component';
import { CashReceiptsComponent } from './cashreceipts/cashreceipts.component';
import { BankPaymentComponent } from './bankpayment/bankpayment.component';
import { CashPaymentComponent } from './cashpayment/cashpayment.component';
import { JournalComponent } from './journal/journal.component';
import { DebitNoteComponent } from './debitnote/debitnote.component';
import { CreditNoteComponent } from './creditnote/creditnote.component';
import { ContraVoucherComponent } from './contravoucher/contravoucher.component';
import { SaleVoucherComponent } from './salevoucher/salevoucher.component';
import { PurchaseBillComponent } from './purchasebill/purchasebill.component';
import { CreditAdjustmentComponent } from './creditadjustment/creditadjustment.component';
import { DebitAdjustmentComponent } from './debitadjustment/debitadjustment.component';
import { TrialBalanceComponent } from './trialbalance/trialbalance.component';

const routes: Routes = [
  { path: 'bankreceipts', component: BankReceiptsComponent },
  { path: 'cashreceipts', component: CashReceiptsComponent },
  { path: 'bankpayment', component: BankPaymentComponent },
  { path: 'cashpayment', component: CashPaymentComponent },
  { path: 'journal', component: JournalComponent },
  { path: 'debitnote', component: DebitNoteComponent },
  { path: 'creditnote', component: CreditNoteComponent },
  { path: 'contravoucher', component: ContraVoucherComponent },
  { path: 'salevoucher', component: SaleVoucherComponent },
  { path: 'purchasebill', component: PurchaseBillComponent },
  { path: 'creditadjustment', component: CreditAdjustmentComponent },
  { path: 'debitadjustment', component: DebitAdjustmentComponent },
  { path: 'trialbalance', component: TrialBalanceComponent },  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VoucherRoutingModule { }
