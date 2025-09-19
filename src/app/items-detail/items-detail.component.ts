import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AdminPinService } from '../core/admin-pin.service';
import { ApiService } from '../core/api.service';
import { isPlatformBrowser } from '@angular/common';
import { ReservationDialogComponent } from './reservation/reservation.component';
import {
  IssueDialogComponent,
  IssueDialogResult,
} from './issue/issue-dialog.component';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

export type ItemStatus = 'OK' | 'DEFECT' | 'OUT';

export interface Category {
  id: string;
  name: string;
}
export interface Location {
  id: string;
  name: string;
}
export interface Item {
  id: string;
  name: string;
  inventoryNo: string;
  status: ItemStatus;
  condition?: 'OK' | 'DEFECT';
  category?: Category;
  location?: Location;
  tags?: string[];
  activeLoanId?: string | null;
}

export interface HistoryRow {
  ts: string | Date;
  user: string;
  action: string;
}

interface ReservationDialogResult {
  start: Date;
  end: Date;
  note?: string;
}

@Component({
  selector: 'app-item-detail',
  templateUrl: './items-detail.component.html',
  styleUrls: ['./items-detail.component.css'],
})
export class ItemsDetailComponent implements OnInit, OnDestroy {
  item!: Item;
  isAdmin = false;

  historyDs: HistoryRow[] = [];
  mode: 'create' | 'edit' | 'view' = 'view';

  loading = false;
  saving = false;
  categories: { id: string; name: string }[] = [];
  readonly separatorKeys = [ENTER, COMMA] as const;

  private destroy$ = new Subject<void>();
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  compareCat = (a?: { id: string }, b?: { id: string }) =>
    !!a && !!b && a.id === b.id;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private adminPin: AdminPinService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.adminPin.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => (this.isAdmin = v));

    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      const dataMode = (d['mode'] as 'create' | 'edit' | undefined) ?? 'view';
      const id = this.route.snapshot.paramMap.get('id');
      if (dataMode === 'create' || id === 'new') {
        this.mode = 'create';
        this.item = {
          id: 'new',
          name: '',
          inventoryNo: '',
          status: 'OK',
          condition: 'OK',
          tags: [],
        };
        this.historyDs = [];
      } else {
        this.mode = dataMode;
        if (!id) {
          this.router.navigate(['/items']);
          return;
        }
        if (this.isBrowser) this.loadItem(id);
      }

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
            error: (e) => console.error('Kategorien laden fehlgeschlagen', e),
          });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadItem(id: string) {
    this.loading = true;
    const numId = this.toNumId(id);
    this.api
      .getItem(numId)
      .pipe(
        tap((it: any) => (this.item = this.mapFromApiItem(it))),
        switchMap(() => this.api.getItemHistory(numId)),
        tap((hist: any[]) => {
          this.historyDs = (hist ?? []).map((h) => ({
            ts: h.ts ?? h.createdAt ?? h.date ?? '',
            user: h.actor ?? h.user ?? '',
            action: h.action ?? '',
          }));
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (e) => {
          console.error(e);
        },
      });
  }

  canReturn(it: Item): boolean {
    return this.isAdmin && it.status === 'OUT';
  }

  openIssueDialog(it: Item) {
    if (!this.isAdmin) return;
    const ref = this.dialog.open<
      IssueDialogComponent,
      { item: Item },
      IssueDialogResult
    >(IssueDialogComponent, {
      width: '420px',
      data: { item: it },
      disableClose: true,
    });
    ref
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((result) => {
          if (!result) return of(null);
          this.saving = true;
          return this.api
            .issueLoan({
              itemId: this.toNumId(it.id),
              dueAt: result.dueAt.toISOString(),
              note: result.note,
            })
            .pipe(finalize(() => (this.saving = false)));
        }),
        tap(() => this.reloadCurrent())
      )
      .subscribe();
  }

  openReservationDialog(it: Item) {
    const ref = this.dialog.open<
      ReservationDialogComponent,
      { item: Item },
      ReservationDialogResult
    >(ReservationDialogComponent, {
      width: '480px',
      data: { item: it },
      disableClose: true,
    });
    ref
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((result) => {
          if (!result) return of(null);
          this.saving = true;
          return this.api
            .createReservation({
              itemId: this.toNumId(it.id),
              start: result.start.toISOString(),
              end: result.end.toISOString(),
              note: result.note,
            })
            .pipe(finalize(() => (this.saving = false)));
        }),
        tap(() => this.reloadCurrent())
      )
      .subscribe();
  }

  returnItem(it: Item) {
    if (!this.canReturn(it)) return;
    if (!confirm(`Item "${it.name}" (#${it.inventoryNo}) zurücknehmen?`))
      return;
    this.saving = true;
    this.api
      .returnLoan({ itemId: this.toNumId(it.id) })
      .pipe(
        finalize(() => (this.saving = false)),
        tap(() => this.reloadCurrent()),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (e) => console.error(e) });
  }

  saveBasic() {
    if (this.mode === 'create') {
      this.createItem();
      return;
    }
    if (!this.isAdmin || !this.item?.id || this.item.id === 'new') return;
    this.saving = true;
    const payload = this.mapToApiUpdatePayload(this.item);
    this.api
      .updateItem(this.toNumId(this.item.id), payload)
      .pipe(
        finalize(() => (this.saving = false)),
        tap((updated: any) => (this.item = this.mapFromApiItem(updated))),
        tap(() => this.reloadHistory()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private createItem() {
    this.saving = true;
    const payload = this.mapToApiCreatePayload(this.item);
    this.api
      .createItem(payload)
      .pipe(
        finalize(() => (this.saving = false)),
        tap((created: any) =>
          this.router.navigate(['/items', String(created.id)])
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private reloadCurrent() {
    if (!this.isBrowser) return;
    if (!this.item?.id || this.item.id === 'new') return;
    this.loadItem(this.item.id);
  }
  private reloadHistory() {
    if (!this.isBrowser) return;
    if (!this.item?.id || this.item.id === 'new') return;
    const numId = this.toNumId(this.item.id);
    this.api
      .getItemHistory(numId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((h: any[]) => {
        this.historyDs = (h ?? []).map((r) => ({
          ts: r.ts ?? r.createdAt ?? '',
          user: r.actor ?? r.user ?? '',
          action: r.action ?? '',
        }));
      });
  }

  private toNumId(id: string | number | null | undefined): number {
    const n = typeof id === 'number' ? id : Number(id);
    if (Number.isNaN(n)) {
      throw new Error(`Ungültige ID: ${id}`);
    }
    return n;
  }

  private mapFromApiItem(api: any): Item {
    return {
      id: String(api.id),
      name: api.name,
      inventoryNo: api.inventoryNo,
      status: api.status as ItemStatus,
      condition: (api.condition as any) ?? 'OK',
      category: api.category
        ? { id: String(api.category.id), name: api.category.name }
        : undefined,
      location: api.location
        ? { id: String(api.location.id), name: api.location.name }
        : undefined,
      tags: this.parseTagsCsv(api.tagsCsv),
      activeLoanId: api.activeLoanId ? String(api.activeLoanId) : null,
    };
  }

  private mapToApiCreatePayload(it: Item): any {
    return {
      name: it.name,
      inventoryNo: it.inventoryNo,
      status: it.status,
      condition: it.condition ?? 'OK',
      categoryId: it.category ? this.toNumId(it.category.id) : undefined,
      tagsCsv: this.joinTagsCsv(it.tags),
    };
  }
  private mapToApiUpdatePayload(it: Item): any {
    return {
      name: it.name,
      condition: it.condition ?? 'OK',
      status: it.status,
      categoryId: it.category ? this.toNumId(it.category.id) : undefined,
      tagsCsv: this.joinTagsCsv(it.tags),
    };
  }

  private parseTagsCsv(csv?: string | null): string[] {
    if (!csv) return [];
    return csv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  private joinTagsCsv(tags?: string[] | null): string | undefined {
    if (!tags || !tags.length) return '';
    return tags
      .map((t) => t.trim())
      .filter(Boolean)
      .join(',');
  }

  editItem(it: Item) {
    this.router.navigate(['/items', it.id, 'edit']);
  }

  addTag(ev: MatChipInputEvent) {
    const value = (ev.value || '').trim();
    if (value) {
      if (!this.item.tags) this.item.tags = [];
      this.item.tags.push(value);
    }
    ev.chipInput?.clear();
  }

  removeTag(index: number) {
    if (!this.item?.tags) return;
    this.item.tags.splice(index, 1);
  }
}
