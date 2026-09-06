import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private profileSource = new BehaviorSubject<any>(null);
  profile$ = this.profileSource.asObservable();

  setProfileData(profile: any) {
    this.profileSource.next(profile);
  }

  private firstNameSource = new BehaviorSubject<string>('');
  firstName$ = this.firstNameSource.asObservable();

  setfirstnameData(firstName: string) {
    this.firstNameSource.next(firstName);
  }

  private selectedValueSubject = new BehaviorSubject<string>('');
  selectedValue$: Observable<string> = this.selectedValueSubject.asObservable();

  urls: string = environment.baseApiUrl;

  constructor(private httpClient: HttpClient) { }

  fetchUserById(id: any): Observable<any> {
    return this.httpClient.get(this.urls + '/user/byId/' + id);
  }

  updateDiag(data: any): Observable<any> {
    const body = JSON.stringify(data);
    return this.httpClient.post(this.urls + '/user/update', body);
  }

  changePasswordApi(obj: any): Observable<any> {
    return this.httpClient.post<any>(
      this.urls + '/user/changePassword',
      obj
    );
  }

  setSelectedValue(value: string) {
    this.selectedValueSubject.next(value);
  }
}
