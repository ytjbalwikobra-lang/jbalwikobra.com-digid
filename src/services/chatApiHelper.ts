/**
 * Chat API Helper
 * 
 * Fungsi bantuan untuk panggilan API chat.
 * Digunakan oleh modul customer dan admin service.
 */

const API_BASE = '/api/chat';

/**
 * Panggilan API generik untuk endpoint chat.
 * Menggunakan session_token dari localStorage (custom auth),
 * BUKAN supabase.auth.getSession() karena project ini tidak menggunakan Supabase Auth.
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

    // Tambahkan token auth dari localStorage (custom session auth)
    // Semua admin service lain menggunakan pola yang sama
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
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
