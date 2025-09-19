import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

export type TimelineType = 'LOAN' | 'RESERVATION';
export type TimelineStatus = 'APPROVED' | 'PENDING' | 'CANCELLED' | 'RETURNED';

export interface TimelineSpan {
  start: string | Date; // Ende exklusiv empfohlen
  end: string | Date;
  type: TimelineType;
  status?: TimelineStatus;
  label?: string;
}

interface DayCell {
  date: Date;
  label: string;
  isWeekend: boolean;
}
interface PositionedSpan {
  colStart: number;
  colEnd: number;
  lane: number;
  span: TimelineSpan;
}

@Component({
  selector: 'app-availability-timeline',
  templateUrl: './availability-timeline.component.html',
  styleUrls: ['./availability-timeline.component.css'],
})
export class AvailabilityTimelineComponent
  implements OnInit, OnChanges, OnDestroy
{
  /** Übergabe aus Items-Detail */
  @Input() itemId?: string | number;
  @Input() start: Date | string = new Date();
  @Input() days = 21;
  @Input() showTodayLine = true;
  @Input() compact = false;

  loading = false;

  daysArr: DayCell[] = [];
  positioned: PositionedSpan[] = [];
  lanes = 0;
  todayCol = -1;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = inject(ApiService);
  private readonly params$ = new BehaviorSubject<void>(undefined);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.params$
      .pipe(
        switchMap(() => {
          const base = this.normalizeWindow();
          if (base.itemId == null) {
            this.rebuildGrid(base.start, base.days, []);
            return EMPTY;
          }
          this.loading = true;
          return this.api
            .getAvailability(base.itemId, base.fromISO, base.toISO)
            .pipe(
              map((spans) => spans ?? ([] as TimelineSpan[])),
              catchError((err) => {
                console.warn('availability endpoint missing?', err);
                return of<TimelineSpan[]>([]);
              }),
              tap((spans) => this.rebuildGrid(base.start, base.days, spans)),
              finalize(() => (this.loading = false))
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
    this.params$.next();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (!this.isBrowser) {
      const b = this.normalizeWindow();
      this.rebuildGrid(b.start, b.days, []);
      return;
    }
    this.params$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- UI Actions ----------
  prev(days = 7) {
    this.shiftWindow(-days);
  }
  next(days = 7) {
    this.shiftWindow(+days);
  }
  today() {
    const t = this.startOfDay(new Date());
    this.start = t;
    this.params$.next();
  }

  // ---------- Helpers ----------
  private normalizeWindow() {
    const s = this.startOfDay(
      this.start instanceof Date ? this.start : new Date(this.start)
    );
    const fromISO = s.toISOString().slice(0, 10);
    const toISO = this.addDays(s, this.days).toISOString().slice(0, 10);
    const itemId = this.toNum(this.itemId);
    return { start: s, days: this.days, fromISO, toISO, itemId };
  }
  private shiftWindow(deltaDays: number) {
    const s = this.startOfDay(
      this.start instanceof Date ? this.start : new Date(this.start)
    );
    this.start = this.addDays(s, deltaDays);
    this.params$.next();
  }

  private toNum(id: string | number | undefined): number | undefined {
    if (id == null) return undefined;
    const n = typeof id === 'number' ? id : Number(id);
    return Number.isNaN(n) ? undefined : n;
  }

  private startOfDay(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
  private addDays(d: Date, n: number): Date {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  }
  private dayDiff(a: Date, b: Date): number {
    return Math.floor(
      (this.startOfDay(a).getTime() - this.startOfDay(b).getTime()) / 86400000
    );
  }

  private buildDays(start: Date, days: number): DayCell[] {
    const weekday = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return Array.from({ length: days }, (_, i) => {
      const d = this.addDays(start, i);
      return {
        date: d,
        label: `${weekday[d.getDay()]} ${d.getDate()}.`,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }

  private normalizeSpan(span: TimelineSpan) {
    const sDt = span.start instanceof Date ? span.start : new Date(span.start);
    const eDt = span.end instanceof Date ? span.end : new Date(span.end);

    const s = this.startOfDay(sDt);
    let e = this.startOfDay(eDt);

    const endHasTime =
      eDt.getHours() +
        eDt.getMinutes() +
        eDt.getSeconds() +
        eDt.getMilliseconds() >
      0;
    if (endHasTime) e = this.addDays(e, 1);

    if (e <= s) e = this.addDays(s, 1);

    return { s, e };
  }

  private positionSpans(start: Date, days: number, spans: TimelineSpan[]) {
    const end = this.addDays(start, days);
    const items: PositionedSpan[] = [];
    const lanes: Date[] = [];

    for (const span of spans ?? []) {
      const { s, e } = this.normalizeSpan(span);
      if (e <= start || s >= end) continue;

      const from = s < start ? start : s;
      const to = e > end ? end : e;

      const colStart = this.dayDiff(from, start);
      let colEnd = this.dayDiff(to, start);

      let lane = 0;
      while (lane < lanes.length && lanes[lane] > from) lane++;
      lanes[lane] = to;

      if (colEnd <= colStart) colEnd = colStart + 1;
      items.push({ colStart, colEnd, lane, span });
    }
    return { items, lanes: Math.max(lanes.length, 1) };
  }

  private rebuildGrid(start: Date, days: number, spans: TimelineSpan[]) {
    this.daysArr = this.buildDays(start, days);
    const pos = this.positionSpans(start, days, spans);
    this.positioned = pos.items;
    this.lanes = pos.lanes;
    const today = this.startOfDay(new Date());
    const diff = this.dayDiff(today, start);
    this.todayCol = diff >= 0 && diff < days ? diff : -1;
  }

  barClass(s: TimelineSpan): string {
    if (s.type === 'LOAN') return 'bar bar-loan';
    switch (s.status) {
      case 'APPROVED':
        return 'bar bar-res-approve';
      case 'PENDING':
        return 'bar bar-res-pending';
      case 'CANCELLED':
        return 'bar bar-res-cancel';
      default:
        return 'bar bar-res';
    }
  }
  tooltip(s: TimelineSpan): string {
    const fmt = (d: string | Date) =>
      (d instanceof Date ? d : new Date(d)).toLocaleDateString();
    const type = s.type === 'LOAN' ? 'Ausleihe' : 'Reservierung';
    const st = s.status ? ` • ${s.status}` : '';
    const label = s.label ? `\n${s.label}` : '';
    return `${type}${st}\n${fmt(s.start)} – ${fmt(s.end)}${label}`;
  }
}
