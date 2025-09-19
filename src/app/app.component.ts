import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Component as NgComponent, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminPinService } from './core/admin-pin.service';
import { LoadingService } from './core/loading.service';
import { asyncScheduler, of } from 'rxjs';
import { observeOn, distinctUntilChanged } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@NgComponent({
  selector: 'app-admin-pin-dialog',
  template: `
    <h2 mat-dialog-title>Adminmodus</h2>
    <mat-dialog-content class="space-y-3">
      <p>Gib die Admin-PIN ein, um Admin-Funktionen freizuschalten.</p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Admin-PIN</mat-label>
        <input matInput [type]="hide ? 'password' : 'text'" [(ngModel)]="pin" autocomplete="off" />
        <button mat-icon-button matSuffix (click)="hide = !hide" [attr.aria-label]="'Sichtbarkeit umschalten'">
          <mat-icon>{{ hide ? 'visibility' : 'visibility_off' }}</mat-icon>
        </button>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Abbrechen</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="!pin">
        <mat-icon>vpn_key</mat-icon> Aktivieren
      </button>
    </mat-dialog-actions>
  `,
})
export class AdminPinDialogComponent {
  pin = '';
  hide = true;
  constructor(
    private ref: MatDialogRef<AdminPinDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  submit() {
    this.ref.close(this.pin);
  }
  close() {
    this.ref.close(null);
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  sidenavOpen = false;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  browser$ = of(this.isBrowser);

  get isAdmin$() {
    return this.adminPin.isAdmin$.pipe(
      distinctUntilChanged(),
      observeOn(asyncScheduler)
    );
  }
  get loading$() {
    return this.loadingSvc.loading$.pipe(
      distinctUntilChanged(),
      observeOn(asyncScheduler)
    );
  }

  constructor(
    private dialog: MatDialog,
    private adminPin: AdminPinService,
    private loadingSvc: LoadingService
  ) {}

  ngOnInit(): void {}

  enterAdmin() {
    const pin = prompt('Admin-PIN eingeben:')?.trim();
    if (pin) this.adminPin.activate(pin);
  }
  exitAdmin() {
    this.adminPin.deactivate();
  }

  openAdminPinDialog(): void {
    const ref = this.dialog.open(AdminPinDialogComponent, {
      width: '360px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((pin: string | null) => {
      if (pin && pin.trim()) {
        // FE aktiviert nur den Modus; echte Prüfung erfolgt serverseitig über Header x-admin-pin oder so
        this.adminPin.activate(pin.trim());
      }
    });
  }

  exitAdminMode(): void {
    this.adminPin.deactivate();
  }
}
