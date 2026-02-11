/**
 * Chat API Helper
 * 
 * Fungsi bantuan untuk panggilan API chat.
 * Digunakan oleh modul customer dan admin service.
 */

import { supabase } from './supabase';

const API_BASE = '/api/chat';

/**
 * Panggilan API generik untuk endpoint chat
 */
export async function chatApiCall<T>(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  params?: Record<string, any>,
  body?: any
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    
    if (method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Tambahkan token auth jika tersedia (untuk endpoint admin)
    const session = await supabase?.auth.getSession();
    if (session?.data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Request failed' };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('[ChatService] API error:', error);
    return { data: null, error: error.message || 'Network error' };
  }
}
