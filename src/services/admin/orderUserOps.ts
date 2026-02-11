/**
 * admin/orderUserOps.ts
 * Operasi order dan user management
 */

import { adminCache } from '../adminCache';
import { supabase } from '../supabase';
import { fetchProductNames } from './helpers';
import type { Order, User, PaginatedResponse } from './types';

/** Selesaikan order (set status completed) */
export async function completeOrder(orderId: string): Promise<boolean> {
  try {
    if (!supabase) throw new Error('Supabase client not available');
    const { error } = await supabase.from('orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('completeOrder error', e);
    return false;
  }
}

/** Ambil daftar order dengan paginasi dan filter status */
export async function getOrders(page: number = 1, limit: number = 10, statusFilter?: string): Promise<PaginatedResponse<Order>> {
  return adminCache.getOrFetch(`admin:orders:${page}:${limit}:${statusFilter || 'all'}`, async () => {
    // Prefer serverless admin API
    try {
      const params = new URLSearchParams({ action: 'orders', page: String(page), limit: String(limit) });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const resp = await fetch(`/api/admin?${params.toString()}`, { method: 'GET', headers });
      if (resp.ok) {
        const payload = await resp.json();
        const rows = payload.data || [];
        const total = payload.count ?? rows.length;
        return { data: rows as Order[], count: total, page, totalPages: Math.ceil((total || 0) / limit) };
      }
      console.warn('[adminService.getOrders] API fallback failed with status', resp.status);
    } catch (apiErr) {
      console.warn('[adminService.getOrders] API fetch failed, falling back to supabase:', apiErr);
    }

    if (!supabase) throw new Error('Supabase client not available');

    let query = supabase
      .from('orders')
      .select('id, product_id, customer_name, customer_email, customer_phone, order_type, rental_duration, amount, status, payment_method, user_id, created_at, updated_at, client_external_id', { count: 'exact' });
    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data: orders, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) { console.error('[adminService.getOrders] query error:', error); throw error; }

    const rows = orders || [];

    // Ambil data payment
    const externalIds = rows.map((order: any) => order.client_external_id).filter(Boolean);
    let paymentsMap: Record<string, any> = {};
    if (externalIds.length > 0) {
      const { data: payments } = await supabase.from('payments')
        .select('external_id, xendit_id, payment_method, status, payment_data, created_at, expiry_date')
        .in('external_id', externalIds);
      if (payments) payments.forEach((p: any) => { paymentsMap[p.external_id] = p; });
    }

    // Ambil nama produk
    const productIds = Array.from(new Set(rows.map((o: any) => o.product_id).filter(Boolean)));
    const productsMap = await fetchProductNames(productIds);

    const mapped: Order[] = rows.map((o: any) => {
      const paymentRecord = paymentsMap[o.client_external_id];
      return {
        id: o.id,
        customer_name: o.customer_name || o.customer || o.client_name || 'Unknown Customer',
        product_name: o.product_id ? productsMap[o.product_id] : undefined,
        amount: Number(o.amount) || 0,
        status: (o.status || 'pending').toLowerCase() as Order['status'],
        order_type: o.order_type || 'purchase',
        rental_duration: o.rental_duration ?? null,
        created_at: o.created_at,
        updated_at: o.updated_at,
        user_id: o.user_id,
        product_id: o.product_id,
        customer_email: o.customer_email,
        customer_phone: o.customer_phone,
        payment_method: o.payment_method,
        xendit_invoice_id: o.xendit_invoice_id,
        payment_data: paymentRecord ? {
          xendit_id: paymentRecord.xendit_id,
          payment_method_type: paymentRecord.payment_method,
          payment_status: paymentRecord.status,
          qr_url: paymentRecord.payment_data?.qr_url,
          qr_string: paymentRecord.payment_data?.qr_string,
          account_number: paymentRecord.payment_data?.account_number,
          bank_code: paymentRecord.payment_data?.bank_code,
          payment_url: paymentRecord.payment_data?.payment_url,
          payment_code: paymentRecord.payment_data?.payment_code,
          retail_outlet: paymentRecord.payment_data?.retail_outlet,
        } : undefined
      };
    });

    return { data: mapped, count: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  });
}

/** Ambil daftar user dengan paginasi dan pencarian */
export async function getUsers(page: number = 1, limit: number = 10, searchTerm?: string): Promise<PaginatedResponse<User>> {
  return adminCache.getOrFetch(`admin:users:${page}:${limit}:${searchTerm || ''}`, async () => {
    // Prefer serverless admin API
    try {
      const params = new URLSearchParams({ action: 'users', page: String(page), limit: String(limit) });
      if (searchTerm) params.set('search', searchTerm);

      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const resp = await fetch(`/api/admin?${params.toString()}`, { method: 'GET', headers });
      if (resp.ok) {
        const payload = await resp.json();
        const rows = payload.data || [];
        const total = payload.count ?? rows.length;
        const normalized = rows.map((u: any) => ({
          id: u.id, email: u.email || u.user_email || '',
          name: u.name || u.full_name || u.username || u.email || 'Unknown',
          avatar_url: u.avatar_url || u.avatar, phone: u.phone || u.phone_number,
          created_at: u.created_at, is_admin: u.is_admin ?? (u.role === 'admin'),
          last_login: u.last_login || u.last_sign_in_at || u.updated_at
        }));
        return { data: normalized, count: total, page, totalPages: Math.ceil((total || 0) / limit) };
      }
    } catch { /* Fallback ke Supabase langsung */ }

    if (!supabase) throw new Error('Supabase client not available');

    let query = supabase.from('users')
      .select('id, email, name, phone, created_at, is_admin, last_login_at, is_active, phone_verified, profile_completed', { count: 'exact' });
    if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

    const { data, error, count } = await query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    let usersData = data || [];
    let usersCount = count || 0;

    // Fallback: coba tabel profiles
    if (usersData.length === 0) {
      const { data: profiles, error: profilesError, count: profilesCount } = await supabase
        .from('profiles')
        .select('id, email, name, phone, created_at, is_admin, last_login_at, is_active, phone_verified, profile_completed', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (!profilesError && profiles) { usersData = profiles; usersCount = profilesCount || profiles.length; }
    }

    const normalized = usersData.map((u: any) => ({
      id: u.id, email: u.email || u.user_email || '',
      name: u.name || u.full_name || u.username || u.email || 'Unknown',
      avatar_url: u.avatar_url || u.avatar, phone: u.phone || u.phone_number,
      created_at: u.created_at, is_admin: u.is_admin ?? (u.role === 'admin'),
      last_login: u.last_login || u.last_sign_in_at || u.updated_at
    }));

    return { data: normalized, count: usersCount, page, totalPages: Math.ceil(usersCount / limit) };
  });
}
