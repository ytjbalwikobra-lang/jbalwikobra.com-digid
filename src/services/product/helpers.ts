/**
 * helpers.ts
 * Cache global, state kapabilitas database, dan fungsi helper untuk ProductService
 */

// Cache global di-shared antar modul
const g = globalThis as any;
g._productServiceCache = g._productServiceCache || new Map();

/** Akses cache global ProductService */
export { g };

/**
 * State kapabilitas skema database
 * null = belum terdeteksi, true = support, false = legacy
 */
export const capState = {
  hasRelations: null as boolean | null,
  hasFlashSaleJoin: null as boolean | null,
};

/** Validasi apakah string adalah UUID v1-v5 */
export function isUuid(v?: string | null): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/** Normalisasi FK value — return UUID atau null */
export function normalizeFk(v: any): string | null {
  return typeof v === 'string' && isUuid(v) ? v : null;
}

/** Konversi string kosong ke null */
export function emptyToNull(v: any): any {
  return v === '' ? null : v;
}

/** Invalidate cache kategori */
export function invalidateCategoryCache(): void {
  try {
    g._productServiceCache.delete('categories_simple');
    g._productServiceCache.delete('categories_detailed');
  } catch (_) { /* ignore */ }
}

/** Reset state kapabilitas — berguna setelah perubahan skema */
export function resetCapabilities(): void {
  capState.hasRelations = null;
  capState.hasFlashSaleJoin = null;
}
