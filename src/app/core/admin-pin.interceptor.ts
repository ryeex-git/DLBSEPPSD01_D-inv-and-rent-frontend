import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminPinService } from './admin-pin.service';

@Injectable()
export class AdminPinInterceptor implements HttpInterceptor {
  private admin = inject(AdminPinService);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const pin = this.admin.getPin();
    if (!pin) return next.handle(req);

    const authReq = req.clone({ setHeaders: { 'x-admin-pin': pin } });
    return next.handle(authReq);
  }
}
