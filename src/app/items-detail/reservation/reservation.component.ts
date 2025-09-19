import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ReservationDialogResult {
  start: Date;
  end: Date;
  note?: string;
}

@Component({
  selector: 'app-reservation-dialog',
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.css'],
})
export class ReservationDialogComponent implements OnInit {
  form!: FormGroup;
  readonly minDate = this.startOfDay(new Date());

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<
      ReservationDialogComponent,
      ReservationDialogResult | null
    >,
    @Inject(MAT_DIALOG_DATA)
    public data: { item?: { name?: string; inventoryNo?: string } } | null
  ) {}

  ngOnInit(): void {
    const now = new Date();
    const startDefault = this.startOfDay(now);
    const endDefault = this.addHours(startDefault, 1);

    // Default-Zeiten (nächste volle Stunde + 1h)
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(
      now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours()
    );

    const nextHourStr = this.toTimeStr(nextHour);
    const plus1hStr = this.toTimeStr(this.addHours(nextHour, 1));

    this.form = this.fb.group(
      {
        startDate: [startDefault, Validators.required],
        startTime: [nextHourStr, Validators.required],
        endDate: [endDefault, Validators.required],
        endTime: [plus1hStr, Validators.required],
        note: [''],
      },
      { validators: this.dateTimeRangeValidator }
    );
  }

  // --- Actions ---
  cancel(): void {
    this.ref.close(null);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const start = this.combine(
      this.f['startDate'].value,
      this.f['startTime'].value
    );
    const end = this.combine(this.f['endDate'].value, this.f['endTime'].value);

    this.ref.close({
      start,
      end,
      note: (this.f['note'].value ?? '').trim() || undefined,
    });
  }

  // --- Helpers / Validation ---
  get f() {
    return this.form.controls as Record<string, AbstractControl>;
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private addHours(d: Date, h: number): Date {
    const x = new Date(d);
    x.setHours(x.getHours() + h);
    return x;
  }

  private toTimeStr(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private combine(date: Date, time: string): Date {
    const [hh, mm] = (time || '00:00').split(':').map((n) => Number(n));
    const out = new Date(date);
    out.setHours(hh || 0, mm || 0, 0, 0);
    return out;
  }

  private dateTimeRangeValidator = (group: AbstractControl) => {
    const startDate = group.get('startDate')?.value as Date | null;
    const endDate = group.get('endDate')?.value as Date | null;
    const startTime = group.get('startTime')?.value as string | null;
    const endTime = group.get('endTime')?.value as string | null;

    if (!startDate || !endDate || !startTime || !endTime) return null;

    const start = this.combine(startDate, startTime);
    const end = this.combine(endDate, endTime);

    return end > start ? null : { rangeInvalid: true };
  };
}
