import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MyProfileComponent } from './my-profile.component';

const routes: Routes = [
  { path: '', component: MyProfileComponent }
];

@NgModule({
  declarations: [MyProfileComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class MyProfileModule { }
