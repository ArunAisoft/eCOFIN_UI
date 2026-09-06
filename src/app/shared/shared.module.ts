import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { SearchableSelectComponent } from './components/searchable-select/searchable-select.component';
import { MultiSearchableSelectComponent } from './components/multisearchable-select/multisearchable-select.component';

@NgModule({
    declarations: [
        HeaderComponent,
        SidebarComponent,
        FooterComponent,
        SearchableSelectComponent,
        MultiSearchableSelectComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule
    ],
    exports: [
        HeaderComponent,
        SidebarComponent,
        FooterComponent,
        SearchableSelectComponent,
        MultiSearchableSelectComponent,
        FormsModule,
        ReactiveFormsModule
    ]
})
export class SharedModule { }
