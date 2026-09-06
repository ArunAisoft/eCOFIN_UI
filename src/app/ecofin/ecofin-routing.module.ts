import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcofinComponent } from './ecofin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

const routes: Routes = [
  {
    path: '',
    component: EcofinComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'myprofile', component: MyProfileComponent },
      { path: 'changepassword', component: ChangePasswordComponent },
      {
        path: 'voucher',
        loadChildren: () =>
          import('./voucher/voucher.module').then((m) => m.VoucherModule),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EcofinRoutingModule {}
