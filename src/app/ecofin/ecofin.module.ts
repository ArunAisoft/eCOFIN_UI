import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcofinRoutingModule } from './ecofin-routing.module';
import { EcofinComponent } from './ecofin.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [EcofinComponent],
  imports: [CommonModule, EcofinRoutingModule, SharedModule],
})
export class EcofinModule {}
