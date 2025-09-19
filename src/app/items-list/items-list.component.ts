import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import {
  catchError,
  finalize,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { AdminPinService } from '../core/admin-pin.service';
import { ApiService } from '../core/api.service';
import { isPlatformBrowser } from '@angular/common';

/** ====== Domänen-Modelle (FE) ====== */
export interface Category {
  id: string; // FE hält IDs als string
  name: string;
}
export type ItemStatus = 'OK' | 'DEFECT' | 'OUT';

export interface Item {
  id: string;
  name: string;
  inventoryNo: string;
  status: ItemStatus;
  category?: Category;
  location?: { name: string };
  tags?: string[];
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface ListItemsParams {
  page: number; // 0-basiert
  pageSize: number;
  sortBy?: string; // 'name' | 'categoryName' | 'status'
  sortDir?: 'asc' | 'desc';
  search?: string;
  categoryId?: string | '';
  status?: ItemStatus | '' | null;
}

@Component({
  selector: 'app-items-list',
  templateUrl: './items-list.component.html',
  styleUrls: ['./items-list.component.css'],
})
export class ItemsListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['name', 'category', 'status', 'actions'];
  dataSource: Item[] = [];
  total = 0;
  loading = false;
  isAdmin = false;

  filters: {
    search: string;
    categoryId: string | '';
    status: ItemStatus | '';
  } = {
    search: '',
    categoryId: '',
    status: '',
  };

  categories: Category[] = [];

  pageSize = 10;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  private destroy$ = new Subject<void>();
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private api: ApiService,
    private router: Router,
    private adminPin: AdminPinService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.adminPin.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => (this.isAdmin = v));

    if (this.isBrowser) {
      this.api
        .listCategories()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (rows) =>
            (this.categories = (rows ?? []).map((c) => ({
              id: String(c.id),
              name: c.name,
            }))),
          error: (err) => console.error('Kategorien laden fehlgeschlagen', err),
        });
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    merge(
      this.sort.sortChange.pipe(tap(() => (this.paginator.pageIndex = 0))),
      this.paginator.page
    )
      .pipe(
        startWith({}),
        tap(() => (this.loading = true)),
        switchMap(() => this.loadItems()),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.cdr.detectChanges();
    setTimeout(() => this.refresh());
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
    this.filters = { search: '', categoryId: '', status: '' };
    this.paginator.pageIndex = 0;
    this.refresh();
  }

  createItem(): void {
    this.router.navigate(['/items', 'new']);
  }

  editItem(row: Item): void {
    this.router.navigate(['/items', row.id, 'edit']);
  }

  deleteItem(row: Item): void {
    if (!this.isAdmin) return;
    if (!confirm(`Item "${row.name}" (#${row.inventoryNo}) endgültig löschen?`))
      return;
    this.loading = true;
    this.api
      .deleteItem(this.toNumId(row.id))
      .pipe(
        finalize(() => (this.loading = false)),
        tap(() => this.refresh()),
        catchError((err) => {
          console.error('Delete failed', err);
          return of(void 0);
        })
      )
      .subscribe();
  }

  private loadItems() {
    const sortBy = this.mapSortColumn(this.sort?.active);
    const sortDir = (this.sort?.direction || 'asc') as 'asc' | 'desc';

    const params = {
      page: this.paginator?.pageIndex ?? 0,
      pageSize: this.paginator?.pageSize ?? this.pageSize,
      sortBy,
      sortDir,
      search: this.filters.search?.trim() || undefined,
      categoryId: this.filters.categoryId
        ? this.toNumId(this.filters.categoryId)
        : undefined,
      status: (this.filters.status as ItemStatus) || undefined,
    };

    return this.api.listItems(params as any).pipe(
      tap((res) => {
        this.dataSource = (res.data ?? []).map(this.mapFromApiListItem);
        this.total = res.total ?? 0;
      }),
      catchError((err) => {
        console.error('Load failed', err);
        this.dataSource = [];
        this.total = 0;
        return of({ data: [], total: 0 } as PagedResult<Item>);
      }),
      finalize(() => (this.loading = false))
    );
  }

  private refresh() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }

  private mapSortColumn(col?: string): string | undefined {
    if (!col) return undefined;
    switch (col) {
      case 'name':
        return 'name';
      case 'category':
        return 'categoryName';
      case 'status':
        return 'status';
      default:
        return undefined;
    }
  }

  private toNumId(id: string | number | null | undefined): number {
    const n = typeof id === 'number' ? id : Number(id);
    if (Number.isNaN(n)) {
      throw new Error(`Ungültige ID: ${id}`);
    }
    return n;
  }

  private mapFromApiListItem = (api: any): Item => ({
    id: String(api.id),
    name: api.name,
    inventoryNo: api.inventoryNo,
    status: api.status as ItemStatus,
    category: api.category
      ? { id: String(api.category.id), name: api.category.name }
      : undefined,
  });
}
