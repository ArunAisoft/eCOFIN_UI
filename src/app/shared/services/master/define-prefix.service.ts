import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay, tap, map } from 'rxjs/operators';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

/* ================= DTOs ================= */

export interface PrefixLinkDto {
  prodPrefix: string;
  accountCode: string;
  description?: string;
  vchrType: string;
  prodPrefixType: string;
  prodLevyType: string;      // 'L' = Levy, 'P' = Product (Purchase) / Customer (Sales)
  dbcrFlag: string;          // 'D' or 'C'
  customerName?: string;
  objectStatus?: string;
}

export interface AccountLookupDto {
  accountCode: string;
  description: string;
}

export interface CustomerLookupDto {
  customerCode: string;
  customerName: string;
}

export interface PrefixLookupsDto {
  accounts: AccountLookupDto[];
  customers: CustomerLookupDto[];
}

/** One row of cfn_genhelp — the legacy lookup metadata registry. */
export interface HelpTopicDto {
  helpId: string;
  helpTopic: string;
  regFlag: string;
  helpObjectName?: string;
  helpUpdateableColumn?: string;
  tableName?: string;
  destColumn?: string;
}

/** Everything the Add button needs, in one round trip. */
export interface PrefixAddContextDto {
  taskId: string;
  levelNumber: number;
  levelLabel: string;
  canBrowse: boolean;
  canAdd: boolean;
  canHold: boolean;
  canPost: boolean;
  canObsolete: boolean;
  helpTopics: Record<string, HelpTopicDto>;
  accountsRestricted: boolean;
  accounts: AccountLookupDto[];
  customers: CustomerLookupDto[];
}

export interface PagedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PrefixRowPayload {
  prodPrefix: string;
  accountCode: string;
  prodLevyType: string;
  dbcrFlag: string;
}

export interface SavePrefixLinksPayload {
  vchrType: string;
  prefixType: string;
  rows: PrefixRowPayload[];
  username: string;
  location: string;
}

export interface DeletePrefixLinkPayload {
  prodPrefix: string;
  accountCode: string;
  vchrType: string;
  prefixType: string;
}

export type CtrlStatus = 'Post' | 'ONHOLD';

/* ================= SERVICE ================= */

@Injectable({ providedIn: 'root' })
export class DefinePrefixService {

  /** Cached for the session so revisiting the screen does not re-download the masters. */
  private lookups$?: Observable<PrefixLookupsDto>;

  constructor(private http: HttpService) { }

  /** Paged grid data. search/page/pageSize are handled server-side. */
  getLinks(
    vchrType: string,
    prefixType: string,
    opts: { search?: string; page?: number; pageSize?: number } = {}
  ): Observable<PagedResponse<PrefixLinkDto>> {

    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      pageSize: opts.pageSize ?? 50
    };
    if (opts.search?.trim()) params['search'] = opts.search.trim();

    return this.http.get<PagedResponse<PrefixLinkDto>>(
      `DefinePrefix/GetLinks/${encodeURIComponent(vchrType)}/${encodeURIComponent(prefixType)}`,
      { params: params as any }
    );
  }

  /** Permission + help metadata + lookups. Called on Add, never on page open. */
  getAddContext(username: string): Observable<ApiResponse<PrefixAddContextDto>> {
    return this.http.get<ApiResponse<PrefixAddContextDto>>(
      'DefinePrefix/GetAddContext',
      { params: { username } as any }
    );
  }

  /** Lookups only, cached for the session. */
  getLookups(forceRefresh = false): Observable<PrefixLookupsDto> {
    if (forceRefresh) this.lookups$ = undefined;

    if (!this.lookups$) {
      this.lookups$ = this.http
        .get<ApiResponse<PrefixLookupsDto>>('DefinePrefix/GetLookups')
        .pipe(
          map(res => res?.data ?? { accounts: [], customers: [] }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.lookups$;
  }

  clearLookupCache(): void {
    this.lookups$ = undefined;
  }

  /** ctrlStatus mirrors the legacy toolbar: Post or On Hold. */
  saveLinks(payload: SavePrefixLinksPayload, ctrlStatus: CtrlStatus = 'Post'): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`DefinePrefix/SaveLinks?ctrlStatus=${ctrlStatus}`, payload)
      .pipe(tap(() => this.clearLookupCache()));
  }

  deleteLink(payload: DeletePrefixLinkPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('DefinePrefix/DeleteLink', payload);
  }
}