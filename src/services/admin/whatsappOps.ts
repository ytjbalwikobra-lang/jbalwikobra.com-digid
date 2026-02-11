/**
 * admin/whatsappOps.ts
 * Operasi konfigurasi dan test messaging WhatsApp
 */

import { adminCache } from '../adminCache';

/** Ambil pengaturan WhatsApp (provider + API key) */
export async function getWhatsAppSettings(skipCache = false): Promise<{
  provider: {
    id: string; name: string; display_name: string; base_url: string;
    settings: { default_group_id?: string; group_configurations?: { purchase_orders?: string; rental_orders?: string; flash_sales?: string; general_notifications?: string } };
  } | null;
  apiKey: {
    id: string; key_name: string; api_key: string; is_active: boolean;
    is_primary: boolean; usage_count: number; last_used_at: string | null;
  } | null;
}> {
  const CACHE_KEY = 'admin:whatsapp:settings';
  if (!skipCache) {
    const cached = adminCache.get<{ provider: any; apiKey: any }>(CACHE_KEY);
    if (cached) return cached;
  }
  const sessionToken = localStorage.getItem('session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const response = await fetch('/api/admin-whatsapp', { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to load WhatsApp settings');

  const result = { provider: data.provider || null, apiKey: data.api_key || null };
  adminCache.set(CACHE_KEY, result, 2 * 60 * 1000);
  return result;
}

/** Ambil daftar grup WhatsApp */
export async function getWhatsAppGroups(): Promise<Array<{ id: string; name: string }>> {
  const CACHE_KEY = 'admin:whatsapp:groups';
  const cached = adminCache.get<Array<{ id: string; name: string }>>(CACHE_KEY);
  if (cached) return cached;

  const sessionToken = localStorage.getItem('session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const response = await fetch('/api/admin-whatsapp-groups', { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to load groups');

  const groups = data.groups || [];
  adminCache.set(CACHE_KEY, groups, 2 * 60 * 1000);
  return groups;
}

/** Perbarui API key WhatsApp */
export async function updateWhatsAppApiKey(apiKey: string): Promise<{ api_key: string; provider: any }> {
  const sessionToken = localStorage.getItem('session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const response = await fetch('/api/admin-whatsapp', { method: 'PUT', headers, body: JSON.stringify({ api_key: apiKey.trim() }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to update API key');
  adminCache.invalidatePattern('admin:whatsapp');
  return data;
}

/** Perbarui konfigurasi WhatsApp (default group, routing) */
export async function updateWhatsAppConfig(config: {
  default_group_id?: string | null;
  group_configurations?: { purchase_orders?: string; rental_orders?: string; flash_sales?: string; general_notifications?: string };
}): Promise<{ provider: any }> {
  const sessionToken = localStorage.getItem('session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const response = await fetch('/api/admin-whatsapp', { method: 'PUT', headers, body: JSON.stringify(config) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to save configuration');
  adminCache.invalidatePattern('admin:whatsapp');
  return data;
}

/** Kirim pesan test WhatsApp */
export async function sendTestWhatsAppMessage(message: string, groupId?: string): Promise<{
  success: boolean; messageId?: string; provider?: string; responseTime?: number; error?: string;
}> {
  const response = await fetch('/api/xendit/webhook?testGroupSend=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, groupId: groupId || undefined })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to send test message');
  return { success: true, messageId: data.messageId || data.message_id, provider: data.provider, responseTime: data.responseTime };
}

/** Ambil statistik WhatsApp untuk analytics */
export async function getWhatsAppStats(): Promise<{
  isConnected: boolean; activeGroups: number; providerName: string; apiUsage: number; lastActivity: string;
}> {
  const settings = await getWhatsAppSettings();
  const groups = await getWhatsAppGroups().catch(() => []);
  return {
    isConnected: settings.apiKey?.is_active || false,
    activeGroups: groups.length,
    providerName: settings.provider?.display_name || settings.provider?.name || 'Unknown',
    apiUsage: settings.apiKey?.usage_count || 0,
    lastActivity: settings.apiKey?.last_used_at ? new Date(settings.apiKey.last_used_at).toLocaleString() : 'Never'
  };
}
