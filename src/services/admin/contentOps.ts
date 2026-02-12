/**
 * admin/contentOps.ts
 * Operasi Flash Sales, Banners, dan Feed Posts
 */

import { adminCache } from '../adminCache';
import { supabase } from '../supabase';
import type { FlashSale, Banner, FeedPost, PaginatedResponse } from './types';

// ========================================
// FLASH SALES
// ========================================

export async function getFlashSales(page: number = 1, limit: number = 10): Promise<PaginatedResponse<FlashSale>> {
  return adminCache.getOrFetch(`admin:flash-sales:${page}:${limit}`, async () => {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error, count } = await supabase.from('flash_sales')
      .select(`*, products(name, price, image)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    return { data: data || [], count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  });
}

export async function createFlashSale(flashSaleData: {
  product_id: string; original_price: number; sale_price: number;
  start_time: string; end_time: string; is_active: boolean; stock?: number;
}): Promise<FlashSale> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('flash_sales')
    .insert([{ ...flashSaleData, stock: flashSaleData.stock || 10, created_at: new Date().toISOString() }])
    .select(`*, products(name, price, image)`).single();
  if (error) throw error;
  adminCache.clear();
  return data;
}

export async function updateFlashSale(id: string, updates: {
  product_id?: string; original_price?: number; sale_price?: number;
  start_time?: string; end_time?: string; is_active?: boolean; stock?: number;
}): Promise<FlashSale> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('flash_sales')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    .select(`*, products(name, price, image)`).single();
  if (error) throw error;
  adminCache.clear();
  return data;
}

export async function deleteFlashSale(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client not available');
  const { error } = await supabase.from('flash_sales').delete().eq('id', id);
  if (error) throw error;
  adminCache.invalidatePattern('admin:flash-sale');
  adminCache.invalidatePattern('admin:flash-sales');
  return true;
}

export async function getFlashSaleStats(): Promise<{ total: number; active: number; ongoing: number; upcoming: number; expired: number }> {
  return adminCache.getOrFetch('admin:flash-sale-stats', async () => {
    if (!supabase) throw new Error('Supabase client not available');
    try {
      const now = new Date().toISOString();
      // Gunakan head-only count queries — nol transfer data
      const [totalRes, activeRes, ongoingRes, upcomingRes, expiredRes] = await Promise.all([
        supabase.from('flash_sales').select('id', { count: 'exact', head: true }),
        supabase.from('flash_sales').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('flash_sales').select('id', { count: 'exact', head: true }).eq('is_active', true).lte('start_time', now).gte('end_time', now),
        supabase.from('flash_sales').select('id', { count: 'exact', head: true }).eq('is_active', true).gt('start_time', now),
        supabase.from('flash_sales').select('id', { count: 'exact', head: true }).lt('end_time', now),
      ]);
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        ongoing: ongoingRes.count ?? 0,
        upcoming: upcomingRes.count ?? 0,
        expired: expiredRes.count ?? 0,
      };
    } catch (error) { console.error('[getFlashSaleStats] error:', error); return { total: 0, active: 0, ongoing: 0, upcoming: 0, expired: 0 }; }
  }, { ttl: 60000 });
}

// ========================================
// BANNERS
// ========================================

export async function getBanners(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Banner>> {
  return adminCache.getOrFetch(`admin:banners:${page}:${limit}`, async () => {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error, count } = await supabase.from('banners')
      .select('id, title, subtitle, image_url, link_url, cta_text, sort_order, is_active, created_at, updated_at', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    return { data: data || [], count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  });
}

export async function createBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('banners').insert([banner]).select('id, title, subtitle, image_url, link_url, cta_text, sort_order, is_active, created_at, updated_at');
  if (error) throw error;
  adminCache.invalidatePattern('admin:banner');
  if (!data || data.length === 0) {
    return { ...banner, id: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Banner;
  }
  return data[0];
}

export async function updateBanner(id: string, updates: Partial<Omit<Banner, 'id' | 'created_at' | 'updated_at'>>): Promise<Banner> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('banners').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('id, title, subtitle, image_url, link_url, cta_text, sort_order, is_active, created_at, updated_at');
  if (error) throw error;
  adminCache.invalidatePattern('admin:banner');
  if (!data || data.length === 0) return { ...updates, id, updated_at: new Date().toISOString() } as Banner;
  return data[0];
}

export async function deleteBanner(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
  adminCache.invalidatePattern('admin:banner');
}

export async function getBannerStats(): Promise<{ total: number; active: number; inactive: number }> {
  return adminCache.getOrFetch('admin:banner-stats', async () => {
    if (!supabase) throw new Error('Supabase client not available');
    try {
      // Gunakan head-only count queries — nol transfer data
      const [totalRes, activeRes] = await Promise.all([
        supabase.from('banners').select('id', { count: 'exact', head: true }),
        supabase.from('banners').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      const total = totalRes.count ?? 0;
      const active = activeRes.count ?? 0;
      return { total, active, inactive: total - active };
    } catch (error) { console.error('[getBannerStats] error:', error); return { total: 0, active: 0, inactive: 0 }; }
  }, { ttl: 60000 });
}

export async function toggleBannerStatus(id: string): Promise<Banner> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data: currentBanner, error: fetchError } = await supabase.from('banners').select('is_active').eq('id', id).single();
  if (fetchError) throw fetchError;
  const { data, error } = await supabase.from('banners').update({ is_active: !currentBanner.is_active, updated_at: new Date().toISOString() }).eq('id', id).select('id, title, subtitle, image_url, link_url, cta_text, sort_order, is_active, created_at, updated_at').single();
  if (error) throw error;
  adminCache.clear();
  return data;
}

export async function reorderBanners(bannerIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  for (let i = 0; i < bannerIds.length; i++) {
    const { error } = await supabase.from('banners').update({ sort_order: i + 1, updated_at: new Date().toISOString() }).eq('id', bannerIds[i]);
    if (error) throw error;
  }
  adminCache.clear();
}

// ========================================
// FEED POSTS
// ========================================

export async function getFeedPosts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<FeedPost>> {
  return adminCache.getOrFetch(`admin:feed-posts:${page}:${limit}`, async () => {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error, count } = await supabase.from('feed_posts')
      .select(`*, users:user_id ( name )`, { count: 'exact' })
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    const postsWithAuthor = (data || []).map((post: any) => ({ ...post, author_name: post.users?.name || 'Unknown User' }));
    return { data: postsWithAuthor, count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  });
}

export async function deleteFeedPost(postId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
  if (error) throw error;
  adminCache.clear();
}

export async function createFeedPost(data: { title?: string; content: string; type: 'post' | 'announcement'; image_url?: string; is_pinned?: boolean }): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('Not authenticated');
  const { error } = await supabase.from('feed_posts').insert({
    ...data, user_id: user.user.id, likes_count: 0, comments_count: 0,
    is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  if (error) throw error;
  adminCache.clear();
}

export async function updateFeedPost(id: string, data: { title?: string; content: string; type: 'post' | 'announcement'; image_url?: string; is_pinned?: boolean }): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { error } = await supabase.from('feed_posts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  adminCache.clear();
}

export async function toggleFeedPostPin(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data: post, error: fetchError } = await supabase.from('feed_posts').select('is_pinned').eq('id', id).single();
  if (fetchError) throw fetchError;
  const { error } = await supabase.from('feed_posts').update({ is_pinned: !post.is_pinned, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  adminCache.clear();
}

export async function deleteFeedPostPermanent(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const { error } = await supabase.from('feed_posts').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  adminCache.clear();
}
