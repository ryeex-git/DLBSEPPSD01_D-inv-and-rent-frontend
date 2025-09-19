import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AdminPinService } from './admin-pin.service';

@Injectable({ providedIn: 'root' })
export class AdminModeGuard implements CanActivate {
  constructor(private admin: AdminPinService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.admin.isAdmin$.pipe(
      take(1),
      map((isAdmin) => (isAdmin ? true : this.router.createUrlTree(['/items'])))
    );
  }
}
