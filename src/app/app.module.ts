import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EcofinModule } from './ecofin/ecofin.module';
import { SharedModule } from './shared/shared.module'; 
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS }  from '@angular/common/http';
import { TokenInterceptor }   from 'src/app/shared/utils/token.interceptor';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SharedModule,
    EcofinModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule 
  ],
  providers: [
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi:    true,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
