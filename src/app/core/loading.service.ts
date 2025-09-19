import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  readonly loading$ = new BehaviorSubject<boolean>(false);

  start() {
    if (++this.counter === 1) this.loading$.next(true);
  }
  stop() {
    if (this.counter > 0 && --this.counter === 0) this.loading$.next(false);
  }
}
