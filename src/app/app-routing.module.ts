import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcofinComponent } from './ecofin/ecofin.component';
import { AuthGuard } from 'src/app/shared/utils/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    canActivate: [AuthGuard],
    component: EcofinComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('src/app/ecofin/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'master',
        loadChildren: () => import('src/app/ecofin/master/master.module').then(m => m.MasterModule)
      },
      {
        path: 'voucher',
        loadChildren: () => import('src/app/ecofin/voucher/voucher.module').then(m => m.VoucherModule)
      },
      {
        path: 'my-profile',
        loadChildren: () => import('src/app/ecofin/my-profile/my-profile.module').then(m => m.MyProfileModule)
      },
      {
        path: 'reports',
        loadChildren: () => import('src/app/ecofin/reports/reports.module').then(m => m.ReportsModule)
      },
      {
        path: 'change-password',
        loadChildren: () => import('src/app/ecofin/change-password/change-password.module').then(m => m.ChangePasswordModule)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
