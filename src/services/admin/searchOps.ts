/**
 * admin/searchOps.ts
 * Operasi pencarian global dan lookup data (kategori, game titles, tiers)
 */

import { supabase } from '../supabase';
import { fetchProductNames, fetchUserNames } from './helpers';
import type { Order, User, Product, Review } from './types';

/** Cari di semua entitas sekaligus */
export async function searchAll(query: string): Promise<{ orders: Order[]; users: User[]; products: Product[]; reviews: Review[] }> {
  const [orders, users, products, reviews] = await Promise.all([
    searchOrders(query), searchUsers(query), searchProducts(query), searchReviews(query)
  ]);
  return { orders, users, products, reviews };
}

/** Cari order berdasarkan ID, nama, atau email */
export async function searchOrders(query: string): Promise<Order[]> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data } = await supabase.from('orders')
    .select('id, customer_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id')
    .or(`id.ilike.%${query}%,customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
    .limit(10);
  const productIds = Array.from(new Set((data || []).map((o: any) => o.product_id).filter(Boolean)));
  const productsMap = await fetchProductNames(productIds);
  return (data || []).map((o: any) => ({
    id: o.id, customer_name: o.customer_name || 'Unknown Customer',
    product_name: o.product_id ? productsMap[o.product_id] : undefined,
    amount: Number(o.amount) || 0, status: o.status || 'pending',
    order_type: o.order_type || 'purchase', created_at: o.created_at, updated_at: o.updated_at,
    user_id: o.user_id, product_id: o.product_id, customer_email: o.customer_email,
    customer_phone: o.customer_phone, payment_method: o.payment_method, xendit_invoice_id: o.xendit_invoice_id
  }));
}

/** Cari user berdasarkan nama atau email */
export async function searchUsers(query: string): Promise<User[]> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data } = await supabase.from('users')
    .select('id, email, name, avatar_url, phone, created_at, is_admin, last_login')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`).limit(10);
  return data || [];
}

/** Cari produk berdasarkan nama atau deskripsi */
export async function searchProducts(query: string): Promise<Product[]> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data } = await supabase.from('products')
    .select('id, name, description, price, original_price, category_id, game_title, account_level, account_details, stock, is_active, created_at, updated_at, image, images, tier, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, archived_at')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`).limit(10);
  return data || [];
}

/** Cari review berdasarkan komentar */
export async function searchReviews(query: string): Promise<Review[]> {
  if (!supabase) throw new Error('Supabase client not available');
  try {
    const { data } = await supabase.from('reviews')
      .select('id, product_id, user_id, rating, comment, created_at')
      .or(`comment.ilike.%${query}%`).limit(10);
    const productIds = Array.from(new Set((data || []).map((r: any) => r.product_id).filter(Boolean)));
    const productsMap = await fetchProductNames(productIds);
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
    const usersMap = await fetchUserNames(userIds);
    return (data || []).map((r: any) => ({
      id: r.id, product_id: r.product_id, user_id: r.user_id, rating: r.rating,
      comment: r.comment, created_at: r.created_at,
      product_name: r.product_id ? productsMap[r.product_id] : undefined,
      user_name: r.user_id ? usersMap[r.user_id] : undefined
    }));
  } catch { return []; }
}

/** Buat sample review untuk testing */
export async function createSampleReviews(): Promise<void> {
  if (!supabase) throw new Error('Supabase client not available');
  const sampleComments = [
    'Produk sangat bagus! Kualitas premium dan pelayanan memuaskan.',
    'Rekomendasi banget! Akun game nya legit dan proses cepat.',
    'Pelayanan ramah, akun sesuai deskripsi. Puas dengan pembelian ini.',
    'Good seller, trusted! Akun game berkualitas tinggi.',
    'Terima kasih, produk sesuai ekspektasi. Akan beli lagi di sini.',
    'Fast response dan akun berkualitas. Highly recommended!',
    'Service excellent, akun game sesuai dengan yang dijanjikan.',
    'Transaksi lancar, seller responsif. Akun game premium quality.',
    'Sangat memuaskan! Proses cepat dan akun sesuai deskripsi.',
    'Top seller! Pelayanan ramah dan akun game berkualitas tinggi.'
  ];
  const [{ data: users }, { data: products }] = await Promise.all([
    supabase.from('users').select('id').limit(5),
    supabase.from('products').select('id').eq('is_active', true).limit(3)
  ]);
  if (!users?.length || !products?.length) throw new Error('No users or products found for sample data');

  const reviews: Array<{ user_id: string; product_id: string; rating: number; comment: string; is_verified: boolean }> = [];
  for (let i = 0; i < 10; i++) {
    reviews.push({
      user_id: users[Math.floor(Math.random() * users.length)].id,
      product_id: products[Math.floor(Math.random() * products.length)].id,
      rating: Math.floor(Math.random() * 2) + 4,
      comment: sampleComments[Math.floor(Math.random() * sampleComments.length)],
      is_verified: Math.random() < 0.7
    });
  }
  const { error } = await supabase.from('reviews').insert(reviews);
  if (error) throw error;
}

// ========================================
// LOOKUP DATA (Dropdown options)
// ========================================

/** Ambil daftar kategori aktif */
export async function getCategories(): Promise<Array<{ id: string; name: string; slug?: string }>> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name').limit(200);
  if (error) throw error;
  return data || [];
}

/** Ambil daftar game title aktif */
export async function getGameTitles(): Promise<Array<{ id: string; name: string; slug?: string }>> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('game_titles').select('id, name, slug').eq('is_active', true).order('name').limit(200);
  if (error) throw error;
  return data || [];
}

/** Ambil daftar tier aktif */
export async function getTiers(): Promise<Array<{ id: string; name: string; slug?: string }>> {
  if (!supabase) throw new Error('Supabase client not available');
  const { data, error } = await supabase.from('tiers').select('id, name, slug').eq('is_active', true).order('name').limit(200);
  if (error) throw error;
  return data || [];
}
