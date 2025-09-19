import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
} from '@angular/material/dialog';

export interface IssueDialogResult {
  dueAt: Date;
  note?: string;
}

type D = Date | null;
type IssueForm = {
  dueDate: FormControl<D>;
  dueTime: FormControl<string | null>;
  note: FormControl<string | null>;
};

@Component({
  selector: 'app-issue-dialog',
  templateUrl: './issue-dialog.component.html',
  styleUrls: ['./issue-dialog.component.css'],
})
export class IssueDialogComponent implements OnInit {
  form!: FormGroup<IssueForm>;
  readonly minDate = this.startOfDay(new Date());

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<IssueDialogComponent, IssueDialogResult | null>,
    @Inject(MAT_DIALOG_DATA)
    public data: { item?: { name?: string; inventoryNo?: string } } | null
  ) {}

  ngOnInit(): void {
    const now = new Date();

    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    if (now.getMinutes() > 0) nextHour.setHours(nextHour.getHours() + 1);

    const dueDateDefault = this.startOfDay(this.addHours(nextHour, 24));
    const dueTimeDefault = this.toTimeStr(nextHour);

    this.form = this.fb.group<IssueForm>(
      {
        dueDate: this.fb.control<D>(dueDateDefault, {
          validators: Validators.required,
        }),
        dueTime: this.fb.control<string>(dueTimeDefault, {
          validators: Validators.required,
        }),
        note: this.fb.control<string>(''),
      },
      { validators: this.futureValidator }
    );
  }

  cancel(): void {
    this.ref.close(null);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const dueAt = this.combine(
      this.form.controls.dueDate.value!,
      this.form.controls.dueTime.value!
    );

    this.ref.close({
      dueAt,
      note: (this.form.controls.note.value ?? '').trim() || undefined,
    });
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

  private futureValidator = (group: AbstractControl) => {
    const d = group.get('dueDate')?.value as Date | null;
    const t = group.get('dueTime')?.value as string | null;
    if (!d || !t) return null;
    const due = this.combine(d, t);
    return due.getTime() > Date.now() ? null : { dueNotInFuture: true };
  };
}
