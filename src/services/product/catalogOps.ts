/**
 * catalogOps.ts
 * Operasi katalog: getTiers, getGameTitles, getCategories, getPopularGames, getCategoryList
 */

import { supabase } from '../supabase';
import { Tier, GameTitle } from '../../types';
import { g } from './helpers';
import { sampleTiers, sampleGameTitles, sampleProducts } from './sampleData';

/** Ambil semua tier aktif (cache 5 menit) */
export async function getTiers(): Promise<Tier[]> {
  const cacheKey = 'tiers';
  const hit = g._productServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
    return hit.v;
  }

  const isDev = process.env.NODE_ENV === 'development';

  try {
    if (!supabase) {
      console.warn('[Catalog] Supabase not available for tiers');
      return isDev ? sampleTiers : [];
    }

    const { data, error } = await supabase
      .from('tiers')
      .select('id, name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, is_active, sort_order, created_at, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Catalog] Error fetching tiers:', error);
      return isDev ? sampleTiers : [];
    }

    const result = data?.map(tier => ({
      ...tier,
      isActive: tier.is_active,
      sortOrder: tier.sort_order,
      borderColor: tier.border_color,
      backgroundGradient: tier.background_gradient,
      priceRangeMin: tier.price_range_min,
      priceRangeMax: tier.price_range_max,
      createdAt: tier.created_at,
      updatedAt: tier.updated_at
    })) || (isDev ? sampleTiers : []);

    g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
    return result;
  } catch (error) {
    console.error('[Catalog] Error fetching tiers:', error);
    return isDev ? sampleTiers : [];
  }
}

/** Ambil semua game title aktif dengan logo URL resolution (cache 5 menit) */
export async function getGameTitles(): Promise<GameTitle[]> {
  const cacheKey = 'game_titles';
  const hit = g._productServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
    return hit.v;
  }

  const isDev = process.env.NODE_ENV === 'development';

  try {
    if (!supabase) {
      console.warn('[Catalog] Supabase not available for game titles');
      return isDev ? sampleGameTitles : [];
    }

    const { data, error } = await supabase
      .from('game_titles')
      .select('id, slug, name, description, icon, color, logo_url, logo_path, is_popular, is_active, sort_order, created_at, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Catalog] Error fetching game titles:', error);
      return isDev ? sampleGameTitles : [];
    }

    const result = data?.map(gameTitle => {
      // Prioritas logo_path → public URL, fallback ke legacy logo_url
      let logoUrl = gameTitle.logo_url;

      if (gameTitle.logo_path) {
        try {
          const { data: urlData } = (supabase as any).storage
            .from('game-logos')
            .getPublicUrl(gameTitle.logo_path);
          logoUrl = urlData.publicUrl;
        } catch (error) {
          console.warn('Failed to get public URL for logo_path:', gameTitle.logo_path);
        }
      }

      return {
        ...gameTitle,
        isPopular: gameTitle.is_popular,
        isActive: gameTitle.is_active,
        sortOrder: gameTitle.sort_order,
        logoUrl,
        createdAt: gameTitle.created_at,
        updatedAt: gameTitle.updated_at
      };
    }) || (isDev ? sampleGameTitles : []);

    g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
    return result;
  } catch (error) {
    console.error('[Catalog] Error fetching game titles:', error);
    return isDev ? sampleGameTitles : [];
  }
}

/** Ambil daftar slug kategori aktif (cache 5 menit) */
export async function getCategories(): Promise<string[]> {
  const cacheKey = 'categories_simple';
  const hit = g._productServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
    return hit.v;
  }

  try {
    if (!supabase) return [];

    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .select('slug, name, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    let result: string[] = [];
    if (!catErr && catData && catData.length) {
      result = catData.map(c => c.slug || c.name).filter(Boolean);
    }

    g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
    return result;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Game populer dengan jumlah produk untuk carousel Home page
 * Cache 2 menit, menggunakan relational count query
 */
export async function getPopularGames(limit = 12): Promise<Array<{ id: string; name: string; slug: string; logoUrl?: string | null; count: number }>> {
  try {
    const cacheKey = `popular_games_${limit}`;
    // Cache terpisah untuk popular games
    const pgCache: any = (getPopularGames as any);
    pgCache._cache = pgCache._cache || new Map();
    const hit = pgCache._cache.get(cacheKey);
    if (hit && Date.now() - hit.t < 2 * 60 * 1000) {
      return hit.v;
    }

    // Fallback ke sample data saat Supabase tidak dikonfigurasi (hanya dev)
    const isDev = process.env.NODE_ENV === 'development';
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY || !supabase) {
      console.warn('[Catalog] Supabase not available for popular games');
      if (!isDev) return [];
      const counts = new Map<string, number>();
      for (const p of sampleProducts) {
        const key = p.gameTitleData?.name || 'Lainnya';
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const items = sampleGameTitles.map(gt => ({
        id: gt.id,
        name: gt.name,
        slug: gt.slug,
        logoUrl: (gt as any).logoUrl,
        count: counts.get(gt.name) || 0,
      })).filter(i => i.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      pgCache._cache.set(cacheKey, { v: items, t: Date.now() });
      return items;
    }

    // Query relational tunggal dengan product counts untuk hemat egress
    const relQuery = supabase
      .from('game_titles')
      .select(`
        id, name, slug, logo_url, logo_path, is_active,
        products:products!inner ( id )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: games, error: gErr } = await relQuery;
    if (gErr) throw gErr;

    const items = (games || []).map((gItem: any) => {
      let logoUrl = gItem.logo_url;
      if (gItem.logo_path) {
        try {
          const { data: urlData } = (supabase as any).storage
            .from('game-logos')
            .getPublicUrl(gItem.logo_path);
          logoUrl = urlData.publicUrl;
        } catch (_e) { /* ignore */ }
      }
      const count = Array.isArray(gItem.products) ? gItem.products.length : 0;
      return { id: gItem.id, name: gItem.name, slug: gItem.slug, logoUrl, count };
    })
    .filter((i: any) => i.count > 0)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, limit);

    pgCache._cache.set(cacheKey, { v: items, t: Date.now() });
    return items;
  } catch (error) {
    console.error('Error fetching popular games:', error);
    return [];
  }
}

/** Daftar kategori detail (id, name, slug) dengan cache 5 menit */
export async function getCategoryList(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const cacheKey = 'categories_detailed';
  const hit = g._productServiceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.v;

  try {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const result = (data || []).map(c => ({ id: c.id, name: c.name, slug: c.slug }));
    g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
    return result;
  } catch (e) {
    console.error('Error getCategoryList:', e);
    return [];
  }
}
