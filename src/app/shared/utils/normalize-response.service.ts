import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse, ApiData } from 'src/app/shared/models/api-response.model';

function toMessage(value: unknown, fallback: string): string {
  return (value == null ? fallback : String(value)).trim();
}

function coerceStatus(value: unknown): number {
  const n = typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : 200;
}

function coerceSuccess(status: number, value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return status >= 200 && status < 300;
}

export function normalizeResponse<T extends ApiData>(src$: Observable<unknown>, name: string): Observable<ApiResponse<T | null>> {
  return src$.pipe(
    map((res: any) => {
      const status = coerceStatus(res?.status);
      const success = coerceSuccess(status, res?.success);
      const data = (res?.data ?? null) as T | null;

      return { success, status, message: toMessage(res?.message, `${name} loaded successfully.`), data, };
    }),
    catchError((err: HttpErrorResponse) => of<ApiResponse<T | null>>({ success: false, status: err?.status ?? 0, message: toMessage(err?.error?.message, `Failed to load ${name}.`), data: null, })
    )
  );
}
