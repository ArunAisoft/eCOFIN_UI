import { Injectable } from '@angular/core';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private showAlert(message: string, confirmButtonColor: string, confirmButtonText: string = 'OK'): Promise<SweetAlertResult<any>> {
    return Swal.fire({ text: message, showCancelButton: false, confirmButtonColor, confirmButtonText, });
  }

  success(message: string) {
    return this.showAlert(message, '#28a745');
  }

  error(message: string) {
    return this.showAlert(message, '#d00d00');
  }

  warning(message: string) {
    return this.showAlert(message, '#ffc107');
  }

  info(message: string) {
    return this.showAlert(message, '#3085d6');
  }

  sessionExpired(
    message: string = 'Your session has expired. Please log in again.'
  ) {
    return this.showAlert(message, '#d00d00');
  }

  showCommonError(status: number, message: string | undefined, entity: string) {
    const fallback = `Failed to load ${entity}.`;
    const msg = (message?.toString().trim() || fallback);
    switch (status) {
      case 201:
        return this.error(msg);
      case 400:
        return this.error('Bad request. Please verify your input.');
      case 404:
        return this.warning(`${entity} not found.`);
      case 500:
        return this.error(`Server error while loading ${entity}.`);
      case 0:
        return this.error('Network error. Please check your connection.');
      default:
        return this.error(msg);
    }
  }
}
