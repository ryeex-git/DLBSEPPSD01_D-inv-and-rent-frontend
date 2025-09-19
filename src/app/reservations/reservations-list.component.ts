import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { asyncScheduler, merge, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  observeOn,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AdminPinService } from '../core/admin-pin.service';

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'CANCELLED';
export interface ReservationRow {
  id: number;
  itemId: number;
  itemName: string;
  inventoryNo: string;
  userName?: string;
  startAt: string; // ISO
  endAt: string; // ISO
  status: ReservationStatus;
  note?: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

@Component({
  selector: 'app-reservations-list',
  templateUrl: './reservations-list.component.html',
  styleUrls: ['./reservations-list.component.css'],
})
export class ReservationsListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  displayedColumns = ['period', 'item', 'user', 'status', 'note', 'actions'];
  dataSource: ReservationRow[] = [];
  total = 0;
  loading = false;
  isAdmin = false;

  filters = {
    search: '',
    status: '' as '' | ReservationStatus,
    from: '', // YYYY-MM-DD
    to: '', // YYYY-MM-DD
  };

  pageSize = 10;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  private destroy$ = new Subject<void>();
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private api: ApiService, private admin: AdminPinService) {}

  ngOnInit(): void {
    this.admin.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => (this.isAdmin = v));
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    merge(
      this.sort.sortChange.pipe(tap(() => (this.paginator.pageIndex = 0))),
      this.paginator.page
    )
      .pipe(
        startWith({}),
        observeOn(asyncScheduler),
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.api
            .listReservations({
              page: this.paginator?.pageIndex ?? 0,
              pageSize: this.paginator?.pageSize ?? this.pageSize,
              sortBy: this.mapSortColumn(this.sort?.active),
              sortDir: (this.sort?.direction || 'asc') as 'asc' | 'desc',
              search: this.filters.search || undefined,
              status: this.filters.status || undefined,
              from: this.filters.from || undefined,
              to: this.filters.to || undefined,
            })
            .pipe(
              tap((res) => {
                this.dataSource = res?.data ?? [];
                this.total = res?.total ?? 0;
              }),
              catchError((err) => {
                console.error('Load reservations failed', err);
                this.dataSource = [];
                this.total = 0;
                return of({
                  data: [],
                  total: 0,
                } as PagedResult<ReservationRow>);
              }),
              finalize(() => (this.loading = false))
            )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.paginator.pageIndex = 0;
    this.refresh();
  }

  resetFilters(): void {
    this.filters = { search: '', status: '', from: '', to: '' };
    this.paginator.pageIndex = 0;
    this.refresh();
  }

  cancel(row: ReservationRow) {
    this.admin.isAdmin$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((isAdmin) => {
        if (!isAdmin) return;
        if (
          !confirm(
            `Reservierung von ${row.userName ?? 'Nutzer'} für „${
              row.itemName
            }“ stornieren?`
          )
        )
          return;
        this.loading = true;
        this.api
          .cancelReservation(row.id)
          .pipe(
            finalize(() => (this.loading = false)),
            tap(() => this.refresh()),
            catchError((err) => {
              console.error(err);
              return of(void 0);
            })
          )
          .subscribe();
      })
      .unsubscribe();
  }

  approve(row: ReservationRow) {
    this.admin.isAdmin$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((isAdmin) => {
        if (!isAdmin) return;
        this.loading = true;
        this.api
          .approveReservation(row.id)
          .pipe(
            finalize(() => (this.loading = false)),
            tap(() => this.refresh()),
            catchError((err) => {
              console.error(err);
              return of(void 0);
            })
          )
          .subscribe();
      })
      .unsubscribe();
  }

  private refresh() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }

  fmtDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  private mapSortColumn(col?: string): string {
    switch (col) {
      case 'period':
        return 'startAt';
      case 'item':
        return 'itemName';
      case 'user':
        return 'userName';
      case 'status':
        return 'status';
      default:
        return 'startAt';
    }
  }
}
