import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../core/api.service'; // dein HTTP-Service
import { AdminPinService } from '../core/admin-pin.service';
import { Category } from '../core/api.types';
interface LocationDto {
  id: number;
  name: string;
}

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  isAdmin = false;
  loadingCats = false;
  loadingLocs = false;

  newCategory = '';
  categoryDs: Category[] = [];

  enableLocations = false;
  newLocation = '';
  locationDs: LocationDto[] = [];

  private sub = new Subscription();

  constructor(
    private api: ApiService,
    private admin: AdminPinService,
    private toast: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sub.add(this.admin.isAdmin$.subscribe((v) => (this.isAdmin = v)));
    this.loadCategories();

    if (this.enableLocations) {
      this.loadLocations();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadCategories(): void {
    this.loadingCats = true;
    this.api.listCategories().subscribe({
      next: (rows) => (this.categoryDs = rows ?? []),
      error: (e) => this.error('Kategorien laden fehlgeschlagen', e),
      complete: () => (this.loadingCats = false),
    });
  }

  addCategory(): void {
    const name = (this.newCategory || '').trim();
    if (!name) return;
    this.loadingCats = true;
    this.api['http']
      .post<Category>(`${this.api['base']}/categories`, { name })
      .subscribe({
        next: (c) => {
          this.newCategory = '';
          this.toast.open(`Kategorie „${c.name}“ angelegt`, 'OK', {
            duration: 2000,
          });
          this.loadCategories();
        },
        error: (e) => this.error('Kategorie anlegen fehlgeschlagen', e),
        complete: () => (this.loadingCats = false),
      });
  }

  deleteCategory(row: Category): void {
    if (!confirm(`Kategorie „${row.name}“ löschen?`)) return;
    this.loadingCats = true;
    this.api['http']
      .delete<void>(`${this.api['base']}/categories/${row.id}`)
      .subscribe({
        next: () => {
          this.toast.open('Kategorie gelöscht', 'OK', { duration: 2000 });
          this.loadCategories();
        },
        error: (e) => this.error('Löschen fehlgeschlagen', e),
        complete: () => (this.loadingCats = false),
      });
  }

  loadLocations(): void {
    if (!this.enableLocations) return;
    this.loadingLocs = true;
    this.api['http']
      .get<LocationDto[]>(`${this.api['base']}/locations`)
      .subscribe({
        next: (rows) => (this.locationDs = rows ?? []),
        error: (e) =>
          this.error(
            'Standorte laden fehlgeschlagen (Backend nicht vorhanden?)',
            e
          ),
        complete: () => (this.loadingLocs = false),
      });
  }

  addLocation(): void {
    if (!this.enableLocations) {
      this.toast.open(
        'Standorte sind noch nicht konfiguriert (Backend fehlt).',
        'OK',
        { duration: 2500 }
      );
      return;
    }
    const name = (this.newLocation || '').trim();
    if (!name) return;
    this.loadingLocs = true;
    this.api['http']
      .post<LocationDto>(`${this.api['base']}/locations`, { name })
      .subscribe({
        next: (loc) => {
          this.newLocation = '';
          this.toast.open(`Standort „${loc.name}“ angelegt`, 'OK', {
            duration: 2000,
          });
          this.loadLocations();
        },
        error: (e) => this.error('Standort anlegen fehlgeschlagen', e),
        complete: () => (this.loadingLocs = false),
      });
  }

  deleteLocation(row: LocationDto): void {
    if (!this.enableLocations) {
      this.toast.open(
        'Standorte sind noch nicht konfiguriert (Backend fehlt).',
        'OK',
        { duration: 2500 }
      );
      return;
    }
    if (!confirm(`Standort „${row.name}“ löschen?`)) return;
    this.loadingLocs = true;
    this.api['http']
      .delete<void>(`${this.api['base']}/locations/${row.id}`)
      .subscribe({
        next: () => {
          this.toast.open('Standort gelöscht', 'OK', { duration: 2000 });
          this.loadLocations();
        },
        error: (e) => this.error('Löschen fehlgeschlagen', e),
        complete: () => (this.loadingLocs = false),
      });
  }

  private error(msg: string, err: unknown) {
    console.error(msg, err);
    this.toast.open(msg, 'OK', { duration: 3000 });
  }
}
