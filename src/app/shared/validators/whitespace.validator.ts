import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Validator to ensure input is not only whitespace. */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value || '';
    return value.trim().length > 0 ? null : { whitespace: true };
  };
}

/** Validator that trims input and checks for empty content. */
export function trimValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value || '';
    return value.trim().length > 0 ? null : { whitespace: true };
  };
}

/** Email domain validator: allows only .com, .in, .co domains. */
export function emailDomainValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = (control.value || '').toLowerCase().trim();
    const allowedDomains = ['.com', '.in', '.co'];

    if (!email) return null; // empty email handled by required validator

    const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));
    return isValidDomain ? null : { invalidDomain: true };
  };
}
