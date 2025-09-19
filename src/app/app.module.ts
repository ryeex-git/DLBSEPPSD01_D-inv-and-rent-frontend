import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AdminPinDialogComponent, AppComponent } from './app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ItemsListComponent } from './items-list/items-list.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { ItemsDetailComponent } from './items-detail/items-detail.component';
import { MatTabsModule } from '@angular/material/tabs';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AdminPinInterceptor } from './core/admin-pin.interceptor';
import { MatCardModule } from '@angular/material/card';
import { AdminPanelComponent } from './admin/admin-panel.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpLoadingInterceptor } from './core/http-loading.interceptor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AvailabilityTimelineComponent } from './items-detail/timeline/availability-timeline.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservationDialogComponent } from './items-detail/reservation/reservation.component';
import { IssueDialogComponent } from './items-detail/issue/issue-dialog.component';
import { ReservationsListComponent } from './reservations/reservations-list.component';

@NgModule({
  declarations: [
    AppComponent,
    AdminPinDialogComponent,
    ItemsListComponent,
    ItemsDetailComponent,
    AdminPanelComponent,
    AvailabilityTimelineComponent,
    ReservationDialogComponent,
    IssueDialogComponent,
    ReservationsListComponent,
  ],
  imports: [
    ReactiveFormsModule,
    BrowserAnimationsModule,
    BrowserModule,
    AppRoutingModule,
    MatSidenavModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule,
    MatListModule,
    MatDialogModule,
    MatFormFieldModule,
    FormsModule,
    MatPaginatorModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  providers: [
    provideClientHydration(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpLoadingInterceptor,
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AdminPinInterceptor, multi: true },
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
