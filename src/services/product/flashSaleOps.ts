/**
 * flashSaleOps.ts
 * Operasi Flash Sale: getFlashSales, getActiveFlashSaleByProductId, CRUD flash sale
 */

import { supabase } from '../supabase';
import { Product, FlashSale } from '../../types';
import { g, capState } from './helpers';
import { sampleProducts } from './sampleData';

/**
 * Ambil semua flash sale aktif dengan data produk terkait
 * Mendukung relational join dengan fallback ke basic select
 * Cache 2 menit
 */
export async function getFlashSales(): Promise<(FlashSale & { product: Product })[]> {
  // Cek cache (TTL 2 menit)
  const cacheKey = 'flash_sales';
  const hit = g._productServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 2 * 60 * 1000) {
    return hit.v;
  }

  try {
    // Cek konfigurasi Supabase
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured, using sample data');
      return _sampleFlashSales();
    }

    if (!supabase) {
      return _sampleFlashSales();
    }

    // Jika sudah diketahui join tidak didukung, langsung skip
    if (capState.hasFlashSaleJoin === false) {
      throw new Error('REL_SKIP');
    }

    const { data, error } = await supabase
      .from('flash_sales')
      .select(`
        *,
        products (
          *,
          game_titles (*),
          tiers (*)
        )
      `)
      .eq('is_active', true)
      .gte('end_time', new Date().toISOString())
      .order('end_time', { ascending: true });

    if (!error && data) {
      capState.hasFlashSaleJoin = true;
    }

    if (error) {
      if ((error as any).message !== 'REL_SKIP') {
        console.warn('Flash sales relational select failed, trying basic');
      }

      // Fallback: basic select
      const { data: basic, error: err2 } = await supabase
        .from('flash_sales')
        .select('id, product_id, sale_price, original_price, start_time, end_time, stock, is_active, created_at, updated_at')
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .order('end_time', { ascending: true });

      if (err2) {
        console.error('Supabase error:', err2);
        return _sampleFlashSalesSorted();
      }

      capState.hasFlashSaleJoin = false;

      const ids = (basic || []).map((b: any) => b.product_id);
      const { data: prods } = await supabase.from('products').select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, archived_at, created_at, updated_at').in('id', ids);

      // Best-effort fetch rental options
      const rentalsMap = new Map<string, number>();
      try {
        if (ids.length) {
          const { data: ros } = await supabase
            .from('rental_options')
            .select('id, product_id')
            .in('product_id', ids);
          for (const ro of ros || []) {
            rentalsMap.set(ro.product_id, (rentalsMap.get(ro.product_id) || 0) + 1);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('rental_options fetch failed (non-fatal):', e);
        }
      }

      const pmap = new Map((prods || []).map((p: any) => [p.id, p]));
      return (basic || []).map((sale: any) => {
        const raw = pmap.get(sale.product_id) || {};
        const product = { ...raw, hasRental: (raw as any).has_rental ?? (raw as any).hasRental ?? ((rentalsMap.get(sale.product_id) || 0) > 0) };
        return {
          id: sale.id,
          productId: sale.product_id,
          salePrice: sale.sale_price,
          originalPrice: sale.original_price,
          startTime: sale.start_time,
          endTime: sale.end_time,
          stock: sale.stock,
          isActive: sale.is_active,
          createdAt: sale.created_at,
          product,
        };
      });
    }

    // Relational join berhasil — enrichment rental options
    const rentalsMap = new Map<string, number>();
    try {
      const prodIds = (data || []).map((s: any) => s.product_id || s.productId || s.products?.id).filter(Boolean);
      if (prodIds.length) {
        const { data: ros } = await supabase
          .from('rental_options')
          .select('id, product_id')
          .in('product_id', prodIds);
        for (const ro of ros || []) {
          rentalsMap.set(ro.product_id, (rentalsMap.get(ro.product_id) || 0) + 1);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('rental_options fetch failed (non-fatal):', e);
      }
    }

    const result = data?.map((sale: any) => {
      const prod = sale.products || {};
      const gt = prod.game_titles;
      const tier = prod.tiers;
      const product = {
        ...prod,
        hasRental: prod.has_rental ?? prod.hasRental ?? ((rentalsMap.get(prod.id) || 0) > 0),
        gameTitleData: gt ? {
          id: gt.id,
          slug: gt.slug,
          name: gt.name,
          description: gt.description,
          icon: gt.icon,
          color: gt.color,
          logoUrl: gt.logo_url ?? gt.logoUrl,
          isPopular: gt.is_popular ?? gt.isPopular,
          isActive: gt.is_active ?? gt.isActive,
          sortOrder: gt.sort_order ?? gt.sortOrder,
          createdAt: gt.created_at ?? gt.createdAt,
          updatedAt: gt.updated_at ?? gt.updatedAt,
        } : undefined,
        tierData: tier ? {
          id: tier.id,
          name: tier.name,
          slug: tier.slug,
          description: tier.description,
          color: tier.color,
          borderColor: tier.border_color ?? tier.borderColor,
          backgroundGradient: tier.background_gradient ?? tier.backgroundGradient,
          icon: tier.icon,
          priceRangeMin: tier.price_range_min ?? tier.priceRangeMin,
          priceRangeMax: tier.price_range_max ?? tier.priceRangeMax,
          isActive: tier.is_active ?? tier.isActive,
          sortOrder: tier.sort_order ?? tier.sortOrder,
          createdAt: tier.created_at ?? tier.createdAt,
          updatedAt: tier.updated_at ?? tier.updatedAt,
        } : undefined,
        isFlashSale: true,
        flashSaleEndTime: sale.end_time || sale.endTime,
        price: sale.sale_price ?? sale.salePrice ?? prod.price,
        originalPrice: sale.original_price ?? sale.originalPrice ?? prod.original_price ?? prod.originalPrice ?? prod.price,
      } as any;

      return { ...sale, product };
    }) || [];

    // Cache hasil
    g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
    return result;
  } catch (error) {
    console.error('Error fetching flash sales:', error);
    return _sampleFlashSalesSorted();
  }
}

/**
 * Ambil flash sale aktif berdasarkan product ID
 * Return null jika tidak ada flash sale aktif
 */
export async function getActiveFlashSaleByProductId(productId: string): Promise<{
  salePrice: number;
  originalPrice: number;
  endTime: string;
  startTime?: string;
} | null> {
  try {
    // Fallback ke sample data
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY || !supabase) {
      const flashSales = await getFlashSales();
      const found = flashSales.find(fs => fs.productId === productId && fs.isActive);
      if (!found) return null;
      const now = new Date();
      const end = new Date(found.endTime);
      if (end.getTime() <= now.getTime()) return null;
      return {
        salePrice: found.salePrice,
        originalPrice: found.originalPrice,
        endTime: found.endTime,
        startTime: found.startTime,
      };
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('id, product_id, sale_price, original_price, start_time, end_time, stock, is_active, created_at, updated_at')
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('start_time', nowIso)
      .gte('end_time', nowIso)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching active flash sale:', error);
      return null;
    }

    if (!data) return null;

    return {
      salePrice: data.sale_price,
      originalPrice: data.original_price,
      endTime: data.end_time,
      startTime: data.start_time,
    };
  } catch (e) {
    console.error('Error getActiveFlashSaleByProductId:', e);
    return null;
  }
}

/** Buat flash sale baru */
export async function createFlashSale(sale: {
  product_id: string;
  sale_price: number;
  original_price?: number | null;
  start_time?: string | null;
  end_time: string;
  stock?: number | null;
  is_active?: boolean;
}): Promise<any | null> {
  try {
    if (!supabase) return null;

    const payload: any = { ...sale };
    if (!payload.start_time) payload.start_time = new Date().toISOString();
    if (!payload.original_price || Number(payload.original_price) <= 0) payload.original_price = Number(payload.sale_price);
    if (typeof payload.stock === 'undefined') payload.stock = 0;
    if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString();
    if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString();

    const { data, error } = await (supabase as any)
      .from('flash_sales')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Error creating flash sale:', e);
    return null;
  }
}

/** Update flash sale yang sudah ada */
export async function updateFlashSale(id: string, updates: Partial<{
  product_id: string;
  sale_price: number;
  original_price?: number | null;
  start_time?: string | null;
  end_time: string;
  stock?: number | null;
  is_active?: boolean;
}>): Promise<any | null> {
  try {
    if (!supabase) return null;

    const payload: any = { ...updates };
    if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString();
    if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString();
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    const { data, error } = await (supabase as any)
      .from('flash_sales')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Error updating flash sale:', e);
    return null;
  }
}

/** Hapus flash sale (via API endpoint dulu, fallback ke Supabase langsung) */
export async function deleteFlashSale(id: string): Promise<boolean> {
  try {
    // Coba API endpoint dulu (pakai service role, bypass RLS)
    const sessionToken = localStorage.getItem('session_token') || '';
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        action: 'deleteFlashSale',
        id
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      g._productServiceCache.delete('flash_sales');
      return true;
    }

    console.error('API delete failed:', result);

    // Fallback ke Supabase langsung (mungkin diblokir RLS)
    if (!supabase) return false;
    const { error } = await (supabase as any)
      .from('flash_sales')
      .delete()
      .eq('id', id);
    if (error) throw error;

    g._productServiceCache.delete('flash_sales');
    return true;
  } catch (e) {
    console.error('Error deleting flash sale:', e);
    return false;
  }
}

// --- Helper internal untuk sample data fallback ---

function _sampleFlashSales(): (FlashSale & { product: Product })[] {
  const flashSaleProducts = sampleProducts.filter(p => p.isFlashSale);
  return flashSaleProducts.map(product => ({
    id: `flash-${product.id}`,
    productId: product.id,
    salePrice: product.price,
    originalPrice: product.originalPrice || product.price,
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: product.flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    stock: product.stock,
    isActive: true,
    createdAt: product.createdAt,
    product
  }));
}

function _sampleFlashSalesSorted(): (FlashSale & { product: Product })[] {
  return _sampleFlashSales().sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
}
