import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { VoucherRoutingModule } from './voucher-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

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
import { TrialBalanceComponent } from './trialbalance/trialbalance.component';
import { CreditAdjustmentComponent } from './creditadjustment/creditadjustment.component';
import { DebitAdjustmentComponent } from './debitadjustment/debitadjustment.component';

@NgModule({
  declarations: [
    BankReceiptsComponent,
    CashReceiptsComponent,
    BankPaymentComponent,
    CashPaymentComponent,
    JournalComponent,
    DebitNoteComponent,
    CreditNoteComponent,
    ContraVoucherComponent,
    SaleVoucherComponent,
    PurchaseBillComponent,
    TrialBalanceComponent,
    CreditAdjustmentComponent,
    DebitAdjustmentComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    VoucherRoutingModule
  ]
})
export class VoucherModule { }
