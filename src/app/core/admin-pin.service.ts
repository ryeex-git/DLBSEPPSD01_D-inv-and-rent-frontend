// src/app/core/admin-pin.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, finalize, take } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminPinService {
  private pin: string | null = null;
  readonly isAdmin$ = new BehaviorSubject<boolean>(false);
  readonly checking$ = new BehaviorSubject<boolean>(false);

  constructor(private api: ApiService) {}

  activate(pin: string) {
    const normalized = (pin ?? '').trim();
    if (!normalized) {
      this.deactivate();
      return;
    }

    this.pin = normalized;
    this.checking$.next(true);

    this.api
      .adminPing()
      .pipe(
        take(1),
        finalize(() => this.checking$.next(false)),
        catchError(() => {
          this.pin = null;
          this.isAdmin$.next(false);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isAdmin$.next(true);
      });
  }

  deactivate() {
    this.pin = null;
    this.isAdmin$.next(false);
  }

  getPin(): string | null {
    return this.pin;
  }
  hasPin(): boolean {
    return !!this.pin;
  }
}
