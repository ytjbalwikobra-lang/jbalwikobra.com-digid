/**
 * admin/helpers.ts
 * Fungsi helper: fetchWithRetry, fetchProductNames, fetchUserNames
 */

import { supabase } from '../supabase';

// Deteksi mode development
const isDev = process.env.NODE_ENV === 'development';

/**
 * Retry helper untuk API call admin dengan exponential backoff
 * Menangani error 401 akibat race condition setelah login
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const sessionToken = localStorage.getItem('session_token');

    if (!isDev && !sessionToken) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw new Error('No session token available');
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'Content-Type': 'application/json'
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401 && !isDev && attempt < maxRetries - 1) {
        console.warn(`[adminService] 401 received, retrying in ${baseDelay * Math.pow(2, attempt)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed after max retries');
}

// --- Lookup helpers ---

interface ProductNameData { id: string; name: string; }
interface UserNameData { id: string; name: string; }

/** Ambil map id→name produk dari daftar ID */
export async function fetchProductNames(productIds: string[]): Promise<Record<string, string>> {
  if (!supabase || productIds.length === 0) return {};
  try {
    const { data: prodData, error } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    if (error) { console.warn('[fetchProductNames] Failed:', error); return {}; }
    return (prodData as ProductNameData[] || []).reduce((acc: Record<string, string>, p) => { acc[p.id] = p.name; return acc; }, {});
  } catch (error) { console.warn('[fetchProductNames] Error:', error); return {}; }
}

/** Ambil map id→name user dari daftar ID */
export async function fetchUserNames(userIds: string[]): Promise<Record<string, string>> {
  if (!supabase || userIds.length === 0) return {};
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
    if (error) { console.warn('[fetchUserNames] Failed:', error); return {}; }
    return (userData as UserNameData[] || []).reduce((acc: Record<string, string>, u) => { acc[u.id] = u.name; return acc; }, {});
  } catch (error) { console.warn('[fetchUserNames] Error:', error); return {}; }
}
