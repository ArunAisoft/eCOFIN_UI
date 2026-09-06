import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {

  /** Checks if a control has non-empty content, ignoring HTML tags. */
  static nonEmptyContent(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim();
    const strippedValue = value.replace(/<[^>]*>/g, '').trim();
    return strippedValue ? null : { emptyContent: true };
  }

  /** Checks for whitespace-only input. */
  static noWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').trim();
      return value ? null : { whitespace: true };
    };
  }

  /** Ensures editor content is not empty (ignores HTML tags). */
  static requiredEditor(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rawValue = (control.value || '').replace(/<[^>]*>/g, '').trim();
      return rawValue ? null : { requiredEditor: true };
    };
  }

  /** Ensures editor content is not whitespace-only. */
  static noWhitespaceEditor(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const cleanedValue = (control.value || '').replace(/<p>/g, '').replace(/<\/p>/g, '').trim();
      return cleanedValue ? null : { whitespaceEditor: true };
    };
  }

  /** Only letters (A-Z, a-z). */
  static onlyAlphabets(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z]*$/.test(control.value || '') ? null : { onlyAlphabets: true };
    };
  }

  /** Letters, numbers, and special characters. */
  static alphaNumericSpecial(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/? ]*$/.test(control.value || '')
        ? null : { alphaNumericSpecial: true };
    };
  }

  /** Letters, numbers, and spaces only. */
  static alphaNumericWithSpace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z0-9 ]*$/.test(control.value || '') ? null : { alphaNumericWithSpace: true };
    };
  }

  /** Letters and numbers only. */
  static alphaNumericNoSpecial(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z0-9]*$/.test(control.value || '') ? null : { alphaNumericNoSpecial: true };
    };
  }

  /** Starts with letter, followed by letters, numbers, or special chars. */
  static alphabetsStartsOptionalNumbersSpecial(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z][a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/? ]*$/.test(control.value || '')
        ? null : { alphabetsStartsOptionalNumbersSpecial: true };
    };
  }

  /** Must contain at least one letter, can contain numbers and symbols. */
  static alphabetsOptionalNumbersSpecial(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      const hasAlphabet = /[a-zA-Z]/.test(value);
      const isValid = hasAlphabet && /^[\p{L}\p{N}\p{P}\p{Z}]*$/u.test(value);
      return isValid ? null : { alphabetsOptionalNumbersSpecial: true };
    };
  }

  /** Numbers, optionally with decimals. */
  static numberWithOptionalDecimals(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      return /^\d+(\.\d+)?$/.test(value) ? null : { numberWithOptionalDecimals: true };
    };
  }

  /** Only numbers. */
  static onlyNumbers(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[0-9]*$/.test(control.value || '') ? null : { onlyNumbers: true };
    };
  }

  /** Only decimals. */
  static onlyDecimals(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[0-9]*(\.[0-9]+)?$/.test(control.value || '') ? null : { onlyDecimals: true };
    };
  }

  /** Sanitize numeric input and restrict max length. */
  static sanitizeNumberInputAndMaxLength(value: string, maxLength: number): string {
    return (value.replace(/[^0-9]/g, '')).slice(0, maxLength);
  }

  /** Sanitize numeric input only. */
  static sanitizeNumberInput(value: string): string {
    return value.replace(/[^0-9]/g, '');
  }

  /** 6-digit PIN code. */
  static pinCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^\d{6}$/.test(control.value || '') ? null : { pinCode: true };
    };
  }

  /** Valid date. */
  static validDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return !isNaN(Date.parse(control.value || '')) ? null : { validDate: true };
    };
  }

  /** Start date <= End date validation. */
  static dateRange(startControlName: string, endControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = new Date(control.get(startControlName)?.value);
      const end = new Date(control.get(endControlName)?.value);
      return start <= end ? null : { dateRange: true };
    };
  }

  /** Valid email format. */
  static validEmail(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(control.value || '') ? null : { validEmail: true };
    };
  }

  /** Email must end with allowed domains. */
  static emailDomainValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = (control.value || '').toLowerCase();
      const allowedDomains = ['.com', '.in', '.co', '.org', '.net', '.edu', '.gov'];
      return allowedDomains.some(d => email.endsWith(d)) ? null : { emailDomainValidator: true };
    };
  }

  /** Mobile number: 10 digits starting 6-9, with optional +91 or 91 prefix. */
  static mobileNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(control.value || '') ? null : { mobileNumber: true };
    };
  }

  /** Mobile number: exactly 10 digits starting 6-9. */
  static mobileNumberOnly10Digits(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[6-9]\d{9}$/.test(control.value || '') ? null : { mobileNumberOnly10Digits: true };
    };
  }

  /** Remove +91 prefix from mobile number. */
  static sanitizeMobileNumber(value: string): string {
    return value.startsWith('+91') ? value.slice(3) : value;
  }

  /** Maximum length validator. */
  static maxLength(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return (control.value || '').length <= max
        ? null
        : { maxLength: { requiredLength: max, actualLength: (control.value || '').length } };
    };
  }

  /** Uppercase letters only. */
  static onlyUppercaseAlphabets(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[A-Z]*$/.test(control.value || '') ? null : { onlyUppercaseAlphabets: true };
    };
  }

  /** Lowercase letters only. */
  static onlyLowercaseAlphabets(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-z]*$/.test(control.value || '') ? null : { onlyLowercaseAlphabets: true };
    };
  }

  /** Letters and spaces only. */
  static onlyLettersAndSpaces(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[a-zA-Z\s]*$/.test(control.value || '') ? null : { onlyLettersAndSpaces: true };
    };
  }

  /** Letters, numbers, symbols, and spaces (no emojis). */
  static alphaNumericSymbolsAndWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /^[A-Za-z0-9!@#$%^&*()_+{}:"<>?/.,';\][\s]*$/.test(control.value || '')
        ? null : { alphaNumericSymbolsAndWhitespace: true };
    };
  }

  /** Dropdown value cannot be 0 or null. */
  static notZeroDropdownlistValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      return (val === 0 || val === '0' || val === null) ? { notZero: true } : null;
    };
  }

  /** Dropdown value cannot be empty or null. */
  static notValueDropdownlistValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      return (val === '' || val === null) ? { notValue: true } : null;
    };
  }

  /** Date must be within minDate and maxDate. */
  static dateInRangeValidator(minDate: string, maxDate: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const date = new Date(value);
      if (isNaN(date.getTime())) return { invalidDate: true };

      return (date >= new Date(minDate) && date <= new Date(maxDate))
        ? null : { dateInRangeValidator: true };
    };
  }

  /** License number: alphanumeric, hyphen, slash only. */
  static validateLicenseNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').trim();
      if (!value) return { whitespace: true };
      return /^[A-Za-z0-9/-]+$/.test(value) ? null : { validateLicenseNumber: true };
    };
  }

  /** License date: today to 5 years from today. */
  static validateLicenseDateRange(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const issueDate = new Date(control.value || '');
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 5);

      if (issueDate < today) return { licenseDateInPast: true };
      if (issueDate > maxDate) return { licenseDateTooFuture: true };
      return null;
    };
  }

  /** Strong password: min 8 chars, uppercase, lowercase, digit, special char, no spaces. */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])\S{8,}$/;
      return regex.test(value) ? null : { strongPassword: true };
    };
  }
}
