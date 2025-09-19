// Gemeinsame Typen/Interfaces

export type ItemStatus = 'OK' | 'DEFECT' | 'OUT';

export interface Category {
  id: number;
  name: string;
}

export interface Item {
  id: number;
  name: string;
  inventoryNo: string;
  status: ItemStatus;
  condition?: 'OK' | 'DEFECT' | string;
  categoryId?: number | null;
  category?: Category | null;
  location?: { id: number; name: string } | null;
  tagsCsv?: string | null;
}

export interface HistoryRow {
  id: number;
  itemId: number;
  action: string;
  actor?: string | null;
  ts: string; // ISO
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface ListItemsParams {
  page: number; // 0-basiert
  pageSize: number;
  sortBy?: string; // z. B. 'name' | 'status' | 'categoryName'
  sortDir?: 'asc' | 'desc';
  search?: string;
  categoryId?: number;
  status?: ItemStatus;
}

// Abstraktes Interface, das deine Komponenten erwarten
export abstract class ItemsApi {
  abstract listItems(
    params: ListItemsParams
  ): import('rxjs').Observable<PagedResult<Item>>;
  abstract getItem(id: number): import('rxjs').Observable<Item>;
  abstract createItem(payload: Partial<Item>): import('rxjs').Observable<Item>;
  abstract updateItem(
    id: number,
    payload: Partial<Item>
  ): import('rxjs').Observable<Item>;
  abstract deleteItem(id: number): import('rxjs').Observable<void>;
  abstract getItemHistory(id: number): import('rxjs').Observable<HistoryRow[]>;
  abstract listCategories(): import('rxjs').Observable<Category[]>;

  abstract createReservation(params: {
    itemId: number;
    start: string;
    end: string;
    note?: string;
    userName?: string;
  }): import('rxjs').Observable<any>;
  abstract issueLoan(params: {
    itemId: number;
    dueAt: string;
    note?: string;
    userName?: string;
  }): import('rxjs').Observable<any>;
  abstract returnLoan(params: {
    itemId: number;
  }): import('rxjs').Observable<any>;
}
