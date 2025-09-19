// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ItemsListComponent } from './items-list/items-list.component';
import { ItemsDetailComponent } from './items-detail/items-detail.component';
import { AdminPanelComponent } from './admin/admin-panel.component';
import { AdminModeGuard } from './core/admin-mode.guard';
import { ReservationsListComponent } from './reservations/reservations-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'items', pathMatch: 'full' },

  // Items
  { path: 'items', component: ItemsListComponent, title: 'Inventar' },
  {
    path: 'items/new',
    component: ItemsDetailComponent,
    data: { mode: 'create' },
    title: 'Item anlegen',
  },
  { path: 'items/:id', component: ItemsDetailComponent, title: 'Item' },
  {
    path: 'items/:id/edit',
    component: ItemsDetailComponent,
    data: { mode: 'edit' },
    title: 'Item bearbeiten',
  },
  {
    path: 'reservations',
    component: ReservationsListComponent,
    title: 'Reservierungen',
  },

  // Admin (nur im Adminmodus erreichbar; echte Absicherung serverseitig!)
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [AdminModeGuard],
    title: 'Admin',
  },

  // Fallback
  { path: '**', redirectTo: 'items' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      initialNavigation: 'enabledBlocking',
      // bindToComponentInputs: true, // optional (nur falls du @Input via Route-Params nutzt)
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
