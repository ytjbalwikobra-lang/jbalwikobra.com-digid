/**
 * productMapper
 * Lightweight mapping helpers to unify DB product row -> domain shape and
 * prepare insert/update payloads respecting mixed legacy / relational schema.
 *
 * Goals:
 *  - Avoid leaking raw table column variability throughout UI code.
 *  - Provide resilient fallbacks when certain columns are absent (legacy mode).
 *  - Central place to evolve transformations (e.g., price normalization, images array coercion).
 */

export interface DbProductRow {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  original_price?: number | null;
  category?: string | null; // legacy textual category
  tier_id?: string | null;  // relational FK (optional)
  tier?: string | null;     // sometimes stored as plain text tier
  game_title_id?: string | null; // relational FK (text column removed)
  stock?: number | null;
  is_active?: boolean | null;
  image?: string | null;
  images?: string[] | null;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
  sold_channel?: string | null;
  is_flash_sale?: boolean | null;
  flash_sale_end_time?: string | null;
  has_rental?: boolean | null;
  // LEFT JOIN relations
  tiers?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    background_gradient?: string;
    icon?: string;
  } | null;
  game_titles?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    logo_url?: string;
  } | null;
  rental_options?: {
    id: string;
    duration: string;
    price: number;
    description?: string;
  }[] | null;
}

// Domain shape used by admin panels (kept aligned with existing AdminService.Product interface)
export interface DomainProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number | null;
  category: string; // UI expects .category always present (fallback chain applied)
  // legacy text game_title removed – access via relation or *_id
  stock: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  image?: string;
  images?: string[];
  tier_id?: string | null;
  game_title_id?: string | null;
  is_flash_sale?: boolean | null;
  flash_sale_end_time?: string | null;
  has_rental?: boolean | null;
  archived_at?: string | null;
  sold_channel?: string | null;
  // LEFT JOIN relations for admin filtering
  tiers?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    background_gradient?: string;
    icon?: string;
  } | null;
  game_titles?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    logo_url?: string;
  } | null;
  rentalOptions?: {
    id: string;
    duration: string;
    price: number;
    description?: string;
  }[] | null;
}

// Helper: ensure images array & primary image coherence
function normalizeImages(row: Pick<DbProductRow, 'image' | 'images'>): { image?: string; images?: string[] } {
  if (Array.isArray(row.images) && row.images.length > 0) {
    return { image: row.images[0], images: row.images };
  }
  if (row.image && row.image.trim()) {
    return { image: row.image, images: [row.image] };
  }
  return { image: undefined, images: [] };
}

export function dbRowToDomainProduct(row: DbProductRow): DomainProduct {
  // Runtime guard: detect accidental reintroduction of legacy fields
  if (process.env.NODE_ENV !== 'production') {
    if ((row as any).game_title || (row as any).gameTitle) {
      console.warn('[productMapper] Detected legacy game_title field in row id', row.id);
    }
    if ((row as any).tier && !(row as any).tier_id && !row.tiers) {
      console.warn('[productMapper] Legacy textual tier detected without relation in row id', row.id);
    }
  }
  const { image, images } = normalizeImages(row);
  return {
    id: row.id,
    name: row.name || 'Unnamed Product',
    description: row.description || '',
    price: Number(row.price) || 0,
    original_price: row.original_price ?? null,
  // Category fallback updated: prefer category_id (relational), then legacy category, then tier_id, then game_title
  category: (row as any).category_id || row.category || row.tier_id || row.game_titles?.slug || row.game_titles?.name || 'general',
    // game_title textual value deprecated
  // account_details removed from schema
    stock: Number(row.stock) || 0,
    is_active: row.is_active !== false, // default true
    created_at: row.created_at,
    updated_at: row.updated_at,
    image,
    images,
  // tier textual field removed – use tier_id + relation only
    tier_id: row.tier_id || null,
  game_title_id: row.game_title_id || null,
    is_flash_sale: row.is_flash_sale || null,
    flash_sale_end_time: row.flash_sale_end_time || null,
    has_rental: row.has_rental || null,
    archived_at: row.archived_at || null,
    sold_channel: (row as any).sold_channel ?? null,
    // Include LEFT JOIN relations for admin filtering
    tiers: row.tiers || null,
    game_titles: row.game_titles || null,
    rentalOptions: row.rental_options || null
  };
}

// Insert payload builder (accepts partial domain product-like object)
export function domainToInsertPayload(input: Partial<DomainProduct>): Record<string, any> {
  return {
    name: input.name?.trim(),
    description: input.description?.trim() || '',
    price: input.price ?? 0,
    original_price: input.original_price ?? null,
    category: input.category, // keep for legacy support
    tier_id: input.tier_id ?? null,
  game_title_id: input.game_title_id ?? null,
  // account_details removed
    stock: input.stock ?? 0,
    is_active: input.is_active !== false,
    image: input.images && input.images.length > 0 ? input.images[0] : input.image || null,
    images: input.images || (input.image ? [input.image] : []),
    is_flash_sale: input.is_flash_sale ?? false,
    flash_sale_end_time: input.flash_sale_end_time ?? null,
    has_rental: input.has_rental ?? null
    // Note: No 'tier' field since it doesn't exist in actual schema
  };
}

export function domainToUpdatePayload(input: Partial<DomainProduct>): Record<string, any> {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => { if (value !== undefined) payload[key] = value; };

  assign('name', input.name?.trim());
  assign('description', input.description?.trim());
  assign('price', input.price);
  assign('original_price', input.original_price === undefined ? undefined : input.original_price);
  assign('category', input.category);
  assign('tier_id', input.tier_id);
  assign('game_title_id', input.game_title_id);
  // account_details removed
  assign('stock', input.stock);
  assign('is_active', input.is_active);
  if (input.images) {
    payload.image = input.images.length > 0 ? input.images[0] : null;
    payload.images = input.images;
  } else if (input.image) {
    payload.image = input.image;
  }
  assign('is_flash_sale', input.is_flash_sale);
  assign('flash_sale_end_time', input.flash_sale_end_time);
  assign('has_rental', input.has_rental);
  assign('archived_at', input.archived_at);
  return payload;
}

export default {
  dbRowToDomainProduct,
  domainToInsertPayload,
  domainToUpdatePayload
};
