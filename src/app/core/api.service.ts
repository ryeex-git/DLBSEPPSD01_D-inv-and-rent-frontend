import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../enviroments/enviroments';
import {
  Category,
  HistoryRow,
  Item,
  ItemsApi,
  ListItemsParams,
  PagedResult,
} from './api.types';
import { isPlatformBrowser } from '@angular/common';

export interface ListReservationsParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: 'PENDING' | 'APPROVED' | 'CANCELLED';
  from?: string;
  to?: string; // YYYY-MM-DD
}
export interface ReservationRow {
  id: number;
  itemId: number;
  itemName: string;
  inventoryNo: string;
  userName?: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService implements ItemsApi {
  private readonly base = environment.apiUrl;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private http: HttpClient) {}

  listItems(p: ListItemsParams): Observable<PagedResult<Item>> {
    if (!this.isBrowser) return of({ data: [], total: 0 });
    let params = new HttpParams()
      .set('page', String(p.page ?? 0))
      .set('pageSize', String(p.pageSize ?? 10));

    if (p.sortBy) params = params.set('sortBy', p.sortBy);
    if (p.sortDir) params = params.set('sortDir', p.sortDir);
    if (p.search) params = params.set('search', p.search);
    if (p.categoryId != null)
      params = params.set('categoryId', String(p.categoryId));
    if (p.status) params = params.set('status', p.status);

    return this.http.get<PagedResult<Item>>(`${this.base}/items`, { params });
  }

  getItem(id: number): Observable<Item> {
    if (!this.isBrowser) return of(null as any);
    return this.http.get<Item>(`${this.base}/items/${id}`);
  }

  createItem(payload: Partial<Item>): Observable<Item> {
    return this.http.post<Item>(`${this.base}/items`, payload);
  }

  updateItem(id: number, payload: Partial<Item>): Observable<Item> {
    return this.http.put<Item>(`${this.base}/items/${id}`, payload);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${id}`);
  }

  getItemHistory(id: number): Observable<HistoryRow[]> {
    if (!this.isBrowser) return of([]);
    return this.http.get<HistoryRow[]>(`${this.base}/items/${id}/history`);
  }

  listCategories(): Observable<Category[]> {
    if (!this.isBrowser) return of([]);
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  createReservation(params: {
    itemId: number;
    start: string;
    end: string;
    note?: string;
    userName?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/reservations`, {
      itemId: params.itemId,
      start: params.start,
      end: params.end,
      note: params.note,
      userName: params.userName,
    });
  }

  issueLoan(params: {
    itemId: number;
    dueAt: string;
    note?: string;
    userName?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/loans/issue`, params);
  }

  returnLoan(params: { itemId: number }): Observable<any> {
    return this.http.post(`${this.base}/loans/return`, params);
  }

  adminPing() {
    if (!this.isBrowser) return of();
    return this.http.get<{ ok: true }>(`${this.base}/admin/ping`);
  }

  getAvailability(itemId: number, from: string, to: string) {
    if (!this.isBrowser) return of([]);
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http
      .get<any[]>(`${this.base}/items/${itemId}/availability`, { params })
      .pipe(
        map((rows) =>
          (rows ?? []).map((r) => ({
            start: r.start,
            end: r.end,
            type: r.type,
            status: r.status,
            label: r.label,
          }))
        )
      );
  }

  listReservations(p: ListReservationsParams) {
    const params: any = {
      page: String(p.page ?? 0),
      pageSize: String(p.pageSize ?? 10),
      sortBy: p.sortBy || 'startAt',
      sortDir: p.sortDir || 'asc',
    };
    if (p.search) params.search = p.search;
    if (p.status) params.status = p.status;
    if (p.from) params.from = p.from;
    if (p.to) params.to = p.to;

    return this.http.get<PagedResult<ReservationRow>>(
      `${this.base}/reservations`,
      { params }
    );
  }

  cancelReservation(id: number) {
    return this.http.post<void>(`${this.base}/reservations/${id}/cancel`, {});
  }
  approveReservation(id: number) {
    return this.http.post<void>(`${this.base}/reservations/${id}/approve`, {});
  }
}
