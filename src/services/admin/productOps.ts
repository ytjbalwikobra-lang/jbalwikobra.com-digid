/**
 * admin/productOps.ts
 * Operasi CRUD produk, statistik produk, dan review
 */

import { adminCache } from '../adminCache';
import { dbRowToDomainProduct } from '../mappers/productMapper';
import { supabase } from '../supabase';
import { fetchProductNames, fetchUserNames } from './helpers';
import type { Product, Review, PaginatedResponse } from './types';

/** Update field produk (price, stock, is_active) */
export async function updateProductFields(id: string, fields: Partial<Pick<Product, 'price' | 'stock' | 'is_active'>>): Promise<Product | null> {
  try {
    // Coba admin API dulu (service role)
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` },
        body: JSON.stringify({ action: 'updateProduct', id, fields: { ...fields, updated_at: new Date().toISOString() } })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) { adminCache.invalidatePattern('admin:products'); return result.data as Product; }
      } else { console.warn('[updateProductFields] API HTTP error:', response.status); }
    } catch (apiError) { console.warn('[updateProductFields] API call failed:', apiError); }

    // Fallback ke Supabase langsung
    if (!supabase) throw new Error('Supabase client not available');
    const updatePayload: any = { ...fields, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('products').update(updatePayload).eq('id', id).select('id, name, price, stock, is_active, image, images, updated_at');
    if (error) { console.error('[updateProductFields] Supabase error:', error); throw error; }
    if (!data || data.length === 0) { console.error('[updateProductFields] UPDATE BLOCKED - Empty response'); return null; }

    const updatedProduct = data[0];
    if (fields.price !== undefined && updatedProduct.price !== fields.price) { console.error('[updateProductFields] Price mismatch!'); return null; }
    if (fields.stock !== undefined && updatedProduct.stock !== fields.stock) { console.error('[updateProductFields] Stock mismatch!'); return null; }
    if (fields.is_active !== undefined && updatedProduct.is_active !== fields.is_active) { console.error('[updateProductFields] Status mismatch!'); return null; }
    adminCache.invalidatePattern('admin:products');
    return updatedProduct as Product;
  } catch (e) { console.error('[updateProductFields] Caught error:', e); return null; }
}

/** Toggle status aktif produk */
export async function toggleProductActive(id: string, current: boolean): Promise<boolean> {
  const res = await updateProductFields(id, { is_active: !current });
  return !!res;
}

/** Arsipkan produk (soft delete) */
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const sessionToken = localStorage.getItem('session_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    const response = await fetch('/api/admin', {
      method: 'POST', headers,
      body: JSON.stringify({ action: 'archive_product', productId: id })
    });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to archive product'); }
    return true;
  } catch (e: any) { console.error('[deleteProduct] error', e); throw e; }
}

/** Ambil daftar produk dengan paginasi, pencarian, dan sorting */
export async function getProducts(page: number = 1, limit: number = 10, searchTerm?: string, sort?: { column: string; direction: 'asc' | 'desc' }): Promise<PaginatedResponse<Product>> {
  const sortKey = sort ? `${sort.column}:${sort.direction}` : 'created_at:desc';
  return adminCache.getOrFetch(`admin:products:${page}:${limit}:${searchTerm || ''}:${sortKey}`, async () => {
    if (!supabase) throw new Error('Supabase client not available');

    let query = supabase.from('products').select(`
      id, name, description, price, original_price, tier_id, game_title_id, category_id,
      stock, is_active, image, images, created_at, updated_at, archived_at, sold_channel,
      is_flash_sale, flash_sale_end_time, has_rental,
      tiers ( id, name, slug, color, background_gradient, icon ),
      game_titles ( id, name, slug, icon, logo_url ),
      rental_options ( id, duration, price, description )
    `, { count: 'exact' }).is('archived_at', null);

    if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

    const orderColumn = sort?.column || 'created_at';
    const ascending = sort ? sort.direction === 'asc' : false;
    const { data, error, count } = await query.order(orderColumn, { ascending }).range((page - 1) * limit, page * limit - 1);
    if (error) { console.error('[getProducts] query error:', error); throw error; }

    const rows = data || [];
    // Fetch kategori terpisah
    const categoryIds = [...new Set(rows.filter(r => r.category_id).map(r => r.category_id))];
    let categoriesMap = new Map<string, any>();
    if (categoryIds.length > 0) {
      try {
        const { data: categories } = await supabase.from('categories').select('id, name, slug, icon').in('id', categoryIds);
        if (categories) categories.forEach(cat => categoriesMap.set(cat.id, cat));
      } catch (err) { console.warn('[getProducts] failed to fetch categories:', err); }
    }

    const mapped = rows.map((row: any) => {
      const base: any = dbRowToDomainProduct(row);
      if (row.category_id) base.categoryId = row.category_id;
      if (row.category_id && categoriesMap.has(row.category_id)) base.categoryData = categoriesMap.get(row.category_id);
      return base as Product;
    });

    return { data: mapped, count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  });
}

/** Ambil statistik produk (via RPC — 1 query server-side) */
export async function getProductStats(): Promise<{ total: number; active: number; soldViaWeb: number; soldViaWA: number; totalValue: number; activeValue: number }> {
  return adminCache.getOrFetch('admin:product-stats', async () => {
    if (!supabase) throw new Error('Supabase client not available');
    try {
      // RPC: agregasi di database — menggantikan SELECT semua baris + filter di client
      const { data, error } = await (supabase as any).rpc('get_product_stats');
      if (!error && data) {
        return {
          total: Number(data.total) || 0,
          active: Number(data.active) || 0,
          soldViaWeb: Number(data.soldViaWeb) || 0,
          soldViaWA: Number(data.soldViaWA) || 0,
          totalValue: Number(data.totalValue) || 0,
          activeValue: Number(data.activeValue) || 0,
        };
      }
      console.warn('[getProductStats] RPC fallback:', error?.message);
      // Fallback: gunakan count head:true untuk menghitung jumlah saja
      const [{ count: total }, { count: active }] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).is('sold_channel', null),
      ]);
      return { total: total || 0, active: active || 0, soldViaWeb: 0, soldViaWA: 0, totalValue: 0, activeValue: 0 };
    } catch (error) { console.error('[getProductStats] error:', error); return { total: 0, active: 0, soldViaWeb: 0, soldViaWA: 0, totalValue: 0, activeValue: 0 }; }
  }, { ttl: 300000 });
}

/** Ambil daftar review dengan paginasi */
export async function getReviews(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Review>> {
  return adminCache.getOrFetch(`admin:reviews:${page}:${limit}`, async () => {
    if (!supabase) throw new Error('Supabase client not available');
    try {
      const { data, error, count } = await supabase.from('reviews')
        .select('id, product_id, user_id, rating, comment, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      const productIds = Array.from(new Set((data || []).map((r: any) => r.product_id).filter(Boolean)));
      const productsMap = await fetchProductNames(productIds);
      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      const usersMap = await fetchUserNames(userIds);
      const mapped: Review[] = (data || []).map((r: any) => ({
        id: r.id, product_id: r.product_id, user_id: r.user_id, rating: r.rating,
        comment: r.comment, created_at: r.created_at,
        product_name: r.product_id ? productsMap[r.product_id] : undefined,
        user_name: r.user_id ? usersMap[r.user_id] : undefined
      }));
      return { data: mapped, count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
    } catch {
      return { data: [], count: 0, page, totalPages: 0 };
    }
  });
}

/** Buat produk baru via admin API */
export async function createProduct(data: {
  name: string; description: string; price: number; original_price?: number;
  category_id?: string; game_title_id?: string; tier_id?: string;
  image?: string; images?: string[]; stock?: number; is_active?: boolean; has_rental?: boolean;
}): Promise<Product> {
  const images = data.images && data.images.length > 0 ? data.images : [];
  const image = images.length > 0 ? images[0] : (data.image || 'https://via.placeholder.com/400x300?text=No+Image');
  const productData = { ...data, image, images, stock: data.stock || 1, is_active: data.is_active !== undefined ? data.is_active : true };

  try {
    const sessionToken = localStorage.getItem('session_token') || '';
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ action: 'createProduct', ...productData })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.error('[createProduct] API error:', result);
      throw new Error(result.details || result.message || result.error || 'Failed to create product');
    }
    adminCache.clear();
    return result.data as Product;
  } catch (error: any) { console.error('[createProduct] Exception:', error); throw error; }
}

/** Update produk via admin API dengan fallback Supabase */
export async function updateProduct(id: string, data: {
  name?: string; description?: string; price?: number; original_price?: number;
  category_id?: string; game_title_id?: string; tier_id?: string;
  image?: string; images?: string[]; stock?: number; is_active?: boolean; has_rental?: boolean;
}): Promise<Product> {
  const updateData: any = { ...data };
  if (data.images && data.images.length > 0) updateData.image = data.images[0];
  const finalUpdateData = { ...updateData, updated_at: new Date().toISOString() };

  // Coba API endpoint dulu
  try {
    const sessionToken = localStorage.getItem('session_token') || '';
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ action: 'updateProduct', id, fields: finalUpdateData })
    });
    const result = await response.json();
    if (response.ok && result.success && result.data) { adminCache.invalidatePattern('admin:products'); return result.data as Product; }
    console.warn('[updateProduct] API failed:', result.error || 'Unknown error');
  } catch (apiError) { console.warn('[updateProduct] API call failed:', apiError); }

  // Fallback ke Supabase langsung
  if (!supabase) throw new Error('Supabase client not available');
  const { data: products, error } = await supabase.from('products').update(finalUpdateData).eq('id', id).select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at');
  if (error) throw error;
  adminCache.clear();

  if (!products || products.length === 0) {
    console.warn('RLS may have blocked SELECT after UPDATE, fetching product separately');
    const { data: fetchedProducts, error: fetchError } = await supabase.from('products')
      .select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at')
      .eq('id', id).limit(1);
    if (fetchError || !fetchedProducts || fetchedProducts.length === 0) {
      console.warn('Could not fetch product after update, returning merged data');
      return { id, ...finalUpdateData } as Product;
    }
    return fetchedProducts[0] as Product;
  }
  return products[0] as Product;
}
