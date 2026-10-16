export const PAGE_SIZES = [12, 24, 48, 96] as const;
export const DEFAULT_PAGE_SIZE = 48;

export function parsePageSize(raw: unknown): number {
  return (PAGE_SIZES as readonly unknown[]).includes(raw) ? (raw as number) : DEFAULT_PAGE_SIZE;
}

export interface Page<T> {
  items: T[];
  /** Current page, clamped into 1..pageCount. */
  page: number;
  pageCount: number;
  /** 1-based position of the first and last shown item (0 and 0 for an empty list). */
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(all.length / size));
  const current = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  const start = (current - 1) * size;
  const items = all.slice(start, start + size);
  return {
    items,
    page: current,
    pageCount,
    from: items.length ? start + 1 : 0,
    to: start + items.length,
    total: all.length,
  };
}
