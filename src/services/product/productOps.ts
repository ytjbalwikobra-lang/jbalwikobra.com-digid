/**
 * productOps.ts
 * Operasi CRUD produk: getAllProducts, getProductById, createProduct, updateProduct, deleteProduct
 */

import { supabase } from '../supabase';
import { deletePublicUrls } from '../storageService';
import { Product } from '../../types';
import { capState, isUuid, normalizeFk, emptyToNull } from './helpers';
import { sampleProducts } from './sampleData';

/**
 * Ambil semua produk dari database
 * Mendukung relational select (tiers, game_titles, categories) dengan fallback ke basic select
 */
export async function getAllProducts(opts?: { includeArchived?: boolean }): Promise<Product[]> {
  const isDev = process.env.NODE_ENV === 'development';

  try {
    // Cek apakah Supabase sudah dikonfigurasi
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.warn('[Products] Supabase not configured');
      return isDev ? sampleProducts : [];
    }

    if (!supabase) {
      console.warn('[Products] Supabase client not initialized');
      return isDev ? sampleProducts : [];
    }

    // Jika sudah diketahui relasi tidak didukung, langsung skip relational select
    if (capState.hasRelations === false) {
      throw new Error('REL_SKIP');
    }

    let query = supabase
      .from('products')
      .select(`
        id, name, description, price, original_price, image, images,
        category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time,
        has_rental, stock, is_active, sold_channel, archived_at, created_at, updated_at,
        rental_options (id, product_id, duration, price, description),
        tiers (
          id, name, slug, description, color, border_color, 
          background_gradient, icon, price_range_min, price_range_max,
          is_active, sort_order, created_at, updated_at
        ),
        game_titles (
          id, name, slug, description, icon, color,
          logo_url, is_popular, is_active, sort_order, created_at, updated_at
        ),
        categories!fk_products_category (
          id, name, slug, description, icon, color, is_active, sort_order
        )
      `);

    if (!opts?.includeArchived) {
      // Tampilkan semua produk termasuk sold, hanya sembunyikan archived
      query = (query as any).is('archived_at', null);
    }

    const { data, error } = await (query as any).order('created_at', { ascending: false }).limit(500);

    if (!error && data) {
      capState.hasRelations = true;
      return data.map((product: any) => {
        const cat = product.categories;
        return {
          ...product,
          isActive: product.is_active ?? product.isActive,
          soldChannel: product.sold_channel ?? null,
          archivedAt: product.archived_at ?? product.archivedAt,
          rentalOptions: product.rental_options || [],
          hasRental: product.has_rental ?? product.hasRental ?? ((product.rental_options || []).length > 0),
          tierData: product.tiers,
          gameTitleData: product.game_titles,
          categoryData: cat ? {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            isActive: cat.is_active ?? cat.isActive,
            sortOrder: cat.sort_order ?? cat.sortOrder,
          } : undefined,
          categoryId: cat?.id || product.category_id || product.categoryId,
        };
      });
    }

    if (error && (error as any).message !== 'REL_SKIP') {
      console.warn('Products relational select failed, trying basic select');
    }

    // Fallback: basic select tanpa relasi
    let q2: any = supabase.from('products').select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, sold_channel, archived_at, created_at, updated_at');
    if (!opts?.includeArchived) {
      q2 = q2.is('archived_at', null);
    }

    const { data: basic, error: err2 } = await q2.order('created_at', { ascending: false }).limit(500);
    if (err2) {
      console.error('[Products] Basic select failed:', err2);
      return isDev ? sampleProducts : [];
    }

    // Enrichment: ambil nama kategori dari tabel categories via category_id
    const allCatIds = Array.from(new Set((basic || []).map((p: any) => p.category_id).filter(Boolean)));
    const categoriesMap = new Map<string, any>();
    if (allCatIds.length) {
      try {
        const { data: cats } = await supabase.from('categories').select('id, name, slug, description, icon, color, is_active, sort_order').in('id', allCatIds);
        for (const c of cats || []) categoriesMap.set(c.id, c);
      } catch (_) { /* ignore */ }
    }

    capState.hasRelations = false;

    // Fetch rental options terpisah
    const rentalsByProduct = new Map<string, any[]>();
    try {
      const ids = (basic || []).map((p: any) => p.id);
      if (ids.length) {
        const { data: ros } = await supabase.from('rental_options').select('id, product_id, duration, price, description').in('product_id', ids);
        for (const ro of ros || []) {
          const arr = rentalsByProduct.get(ro.product_id) || [];
          arr.push(ro);
          rentalsByProduct.set(ro.product_id, arr);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('rental_options fetch failed (non-fatal):', e);
      }
    }

    return (basic || []).map((p: any) => {
      const cat = categoriesMap.get(p.category_id);
      return {
        ...p,
        isActive: p.is_active ?? p.isActive,
        archivedAt: p.archived_at ?? p.archivedAt,
        rentalOptions: rentalsByProduct.get(p.id) || [],
        hasRental: p.has_rental ?? p.hasRental ?? ((rentalsByProduct.get(p.id) || []).length > 0),
        categoryId: p.category_id || p.categoryId,
        categoryData: cat ? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          isActive: cat.is_active ?? cat.isActive,
          sortOrder: cat.sort_order ?? cat.sortOrder,
        } : undefined,
      };
    });
  } catch (error) {
    console.error('[Products] Error fetching products:', error);
    return isDev ? sampleProducts : [];
  }
}

/**
 * Ambil produk berdasarkan ID
 * Menggunakan relational select dengan join tiers, game_titles, categories, rental_options
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    // Validasi input ID
    if (!id || typeof id !== 'string' || id.trim() === '' || id.trim() === 'undefined') {
      console.error('[ProductService] Invalid product ID provided:', id);
      return null;
    }

    const trimmedId = id.trim();

    // Cek apakah Supabase dikonfigurasi
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.warn('[ProductService] Supabase not configured');
      return process.env.NODE_ENV === 'development' ? (sampleProducts.find(p => p.id === trimmedId) || null) : null;
    }

    if (!supabase) {
      console.warn('[ProductService] No supabase client available');
      return process.env.NODE_ENV === 'development' ? (sampleProducts.find(p => p.id === trimmedId) || null) : null;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Fetch product by ID (termasuk archived — akses direct URL)
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        rental_options (*),
        tiers (*),
        game_titles (*),
        categories!fk_products_category (*)
      `)
      .eq('id', trimmedId)
      .maybeSingle();

    if (error) {
      console.error('[ProductService] Supabase error fetching product by ID:', {
        id: trimmedId,
        error: JSON.stringify(error, null, 2),
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        isProduction
      });

      if (isProduction) {
        console.error('[ProductService] Production error details:', {
          supabaseUrl: process.env.REACT_APP_SUPABASE_URL ? 'configured' : 'missing',
          supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'configured' : 'missing',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }

      return process.env.NODE_ENV === 'development' ? (sampleProducts.find(p => p.id === trimmedId) || null) : null;
    }

    if (!data) return null;

    const rentalOptions: any[] = (data as any).rental_options || [];
    const cat = (data as any).categories;
    const result = {
      ...data,
      rentalOptions,
      hasRental: (data as any).has_rental ?? (data as any).hasRental ?? (rentalOptions.length > 0),
      tierData: (data as any).tiers,
      gameTitleData: (data as any).game_titles,
      categoryData: cat ? {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        isActive: cat.is_active ?? cat.isActive,
        sortOrder: cat.sort_order ?? cat.sortOrder,
      } : undefined,
      categoryId: cat?.id || (data as any).category_id || (data as any).categoryId,
      isActive: (data as any).is_active ?? (data as any).isActive ?? true,
      archivedAt: (data as any).archived_at ?? (data as any).archivedAt ?? null,
    } as any;

    return result;
  } catch (error) {
    console.error('[ProductService] Exception in getProductById:', {
      id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isProduction: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });

    return process.env.NODE_ENV === 'development' ? (sampleProducts.find(p => p.id === id) || null) : null;
  }
}

/**
 * Buat produk baru
 * Termasuk validasi blob URL, normalisasi FK, dan penanganan error RLS
 */
export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & Record<string, any>): Promise<Product | null> {
  try {
    // Guard: cegah blob: URL masuk ke DB
    if (Array.isArray(product.images) && product.images.some((img: string) => typeof img === 'string' && img.startsWith('blob:'))) {
      throw new Error('Blob URL detected in images payload (create). Upload not finished.');
    }
    if (typeof product.image === 'string' && product.image.startsWith('blob:')) {
      throw new Error('Blob URL detected in image cover (create).');
    }

    if (!supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }

    const payload: any = {
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.originalPrice ?? product.original_price ?? null,
      image: product.image,
      images: product.images ?? [],
      category_id: product.categoryId ?? (product as any).category_id ?? null,
      is_flash_sale: product.isFlashSale ?? false,
      has_rental: product.hasRental ?? false,
      stock: product.stock ?? 1,
      is_active: product.isActive !== undefined ? product.isActive : (product as any).is_active ?? true,
    };

    // --- Normalisasi defensif ---
    if (typeof payload.price !== 'number' || isNaN(payload.price)) {
      throw new Error('Invalid price supplied');
    }
    if (!payload.name || !payload.description) {
      throw new Error('Name & description required');
    }

    payload.stock = Number.isFinite(payload.stock) && payload.stock >= 0 ? Math.floor(payload.stock) : 0;

    if (!payload.category_id) {
      throw new Error('Category is required');
    }

    payload.category_id = normalizeFk(emptyToNull(payload.category_id));

    // Lazy capability detection jika belum terdeteksi
    if (capState.hasRelations === null) {
      try {
        const { error: relErr } = await supabase
          .from('products')
          .select('id, game_title_id, tier_id')
          .limit(1);
        capState.hasRelations = !relErr;
      } catch {
        capState.hasRelations = false;
      }
    }

    // Relational-only mode: set *_id fields
    payload.game_title_id = normalizeFk(emptyToNull(product.gameTitleId ?? (product as any).game_title_id));
    payload.tier_id = normalizeFk(emptyToNull(product.tierId ?? (product as any).tier_id));
    delete payload.game_title;

    // Hapus undefined agar PostgREST tidak error
    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k];
    });

    const { data, error } = await supabase.from('products').insert([payload]).select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, sold_channel, archived_at, created_at, updated_at').single();

    if (error) {
      console.error('❌ Database insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // Penanganan khusus error RLS
      if (error.code === '42501') {
        console.error('🔒 RLS Policy Error Detected!');
        console.error('💡 This indicates that Row Level Security policies are blocking the operation.');
        console.error('🔧 To fix this, the database administrator needs to update RLS policies.');
        const rlsError = new Error('Database access denied. This requires administrator access to fix Row Level Security policies.');
        (rlsError as any).code = 'RLS_POLICY_ERROR';
        (rlsError as any).originalError = error;
        throw rlsError;
      }

      throw error;
    }
    return data as unknown as Product;
  } catch (error) {
    console.error('💥 ProductService.createProduct error:', error);
    return null;
  }
}

/**
 * Update produk yang sudah ada
 * Termasuk validasi blob URL dan normalisasi FK
 */
export async function updateProduct(id: string, updates: Partial<Product> & Record<string, any>): Promise<Product | null> {
  try {
    // Guard: reject blob placeholders
    if (Array.isArray((updates as any).images) && (updates as any).images.some((img: string) => typeof img === 'string' && img.startsWith('blob:'))) {
      throw new Error('Blob URL detected in images payload (update). Upload not finished.');
    }
    if (typeof (updates as any).image === 'string' && (updates as any).image.startsWith('blob:')) {
      throw new Error('Blob URL detected in image cover (update).');
    }

    if (!supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }

    if (!isUuid(id)) {
      console.warn('❌ Refusing to update non-UUID id (likely sample data):', id);
      return null;
    }

    const payload: any = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      original_price: (updates as any).original_price ?? updates.originalPrice,
      image: (updates as any).image,
      images: (updates as any).images,
      category_id: (updates as any).category_id ?? updates.categoryId ?? null,
      is_flash_sale: (updates as any).is_flash_sale ?? updates.isFlashSale,
      has_rental: (updates as any).has_rental ?? updates.hasRental,
      stock: (updates as any).stock ?? updates.stock,
      is_active: (updates as any).is_active ?? updates.isActive,
    };

    // --- Normalisasi defensif (update) ---
    if (payload.price !== undefined && (typeof payload.price !== 'number' || isNaN(payload.price as any))) {
      delete payload.price;
    }
    if (payload.category_id !== undefined) {
      payload.category_id = normalizeFk(emptyToNull(payload.category_id));
    }

    // Lazy capability detection pada update
    if (capState.hasRelations === null) {
      try {
        const { error: relErr } = await supabase
          .from('products')
          .select('id, game_title_id, tier_id')
          .limit(1);
        capState.hasRelations = !relErr;
      } catch {
        capState.hasRelations = false;
      }
    }

    // Relational-only mode untuk updates
    payload.game_title_id = normalizeFk(emptyToNull((updates as any).game_title_id ?? updates.gameTitleId));
    payload.tier_id = normalizeFk(emptyToNull((updates as any).tier_id ?? updates.tierId));
    delete payload.game_title;

    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    });

    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, sold_channel, archived_at, created_at, updated_at').single();

    if (error) {
      console.error('❌ Database update error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: payload
      });
      throw error;
    }
    return data as unknown as Product;
  } catch (error) {
    console.error('💥 ProductService.updateProduct error:', error);
    return null;
  }
}

/**
 * Hapus produk beserta dependensi (rental_options, flash_sales, orders)
 * Opsional: hapus gambar dari storage
 */
export async function deleteProduct(id: string, options?: { images?: string[] }): Promise<boolean> {
  try {
    if (!supabase) return false;
    if (!isUuid(id)) {
      console.warn('Refusing to delete non-UUID id (likely sample data):', id);
      return false;
    }

    // Best-effort cleanup dependensi untuk hindari FK constraint error
    try {
      await (supabase as any).from('rental_options').delete().eq('product_id', id);
    } catch (_) { /* ignore */ }
    try {
      await (supabase as any).from('flash_sales').delete().eq('product_id', id);
    } catch (_) { /* ignore */ }
    try {
      await (supabase as any).from('orders').update({ product_id: null }).eq('product_id', id);
    } catch (_) { /* ignore */ }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Best-effort hapus gambar dari storage
    if (options?.images && options.images.length) {
      try { await deletePublicUrls(options.images); } catch (_) {}
    }
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
}
