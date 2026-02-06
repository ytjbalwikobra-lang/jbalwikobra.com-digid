import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazily initialize Supabase client to avoid throwing during module import
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[DynamicWhatsAppService] Supabase env missing. Service will be no-op.');
    return null;
  }
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return supabase;
}

interface WhatsAppProvider {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  send_message_endpoint: string;
  async_send_message_endpoint: string;
  phone_field_name: string;
  key_field_name: string;
  message_field_name: string;
  success_status_field: string;
  success_status_value: string;
  message_id_field: string;
  settings: any;
}

interface WhatsAppApiKey {
  api_key: string;
  key_id: string;
  provider_config: WhatsAppProvider;
}

interface SendMessageOptions {
  phone: string;
  message: string;
  messageType?: 'text' | 'image' | 'file';
  mediaUrl?: string;
  contextType?: string;
  contextId?: string;
  useAsync?: boolean;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  responseTime?: number;
}

export class DynamicWhatsAppService {
  
  /**
   * Get the best available API key for a provider
   */
  private async getActiveApiKey(providerName: string = 'woo-wa'): Promise<WhatsAppApiKey | null> {
    try {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('get_active_api_key', {
        provider_name: providerName
      });

      if (error || !data || data.length === 0) {
        // Fallback: direct table lookup when RPC not available
        try {
          // 1) Find an active key, prioritize primary
          const { data: keys } = await sb
            .from('whatsapp_api_keys')
            .select('id, api_key, provider_id, is_primary, is_active')
            .eq('is_active', true)
            .order('is_primary', { ascending: false })
            .limit(1);

          if (!keys || keys.length === 0) return null;
          const keyRow: any = keys[0];

          // 2) Get provider config - Optimized: Select only required fields
          const { data: provider } = await sb
            .from('whatsapp_providers')
            .select('id, name, base_url, is_active, settings, key_field_name, phone_field_name, message_field_name, send_message_endpoint')
            .eq('id', keyRow.provider_id)
            .maybeSingle();

          if (!provider) return null;

          return {
            api_key: keyRow.api_key,
            key_id: keyRow.id,
            provider_config: provider
          } as unknown as WhatsAppApiKey;
        } catch (fallbackErr) {
          console.error('Fallback getActiveApiKey error:', fallbackErr);
          return null;
        }
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error in getActiveApiKey:', error);
      return null;
    }
  }

  /**
   * Get active provider settings (from DB) for convenience
   */
  async getActiveProviderSettings(): Promise<any | null> {
    const api = await this.getActiveApiKey();
    // FIX: Return the full provider_config, not just .settings
    // The provider_config contains: name, base_url, is_active, send_message_endpoint, etc.
    // The .settings field is just extra configuration like supports_async, default_group_id
    return api?.provider_config || null;
  }

  /**
   * Get contact phone from website_settings for customer support
   */
  async getContactPhone(): Promise<string> {
    try {
      const sb = getSupabase();
      if (!sb) return '6289653510125'; // fallback
      
      const { data, error } = await sb
        .from('website_settings')
        .select('contact_phone')
        .limit(1)
        .maybeSingle();
      
      if (error || !data?.contact_phone) {
        console.warn('[WhatsApp] Failed to get contact_phone, using fallback');
        return '6289653510125'; // fallback
      }
      
      // Format phone number for wa.me link (remove non-digits, ensure starts with 62)
      let phone = String(data.contact_phone).replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      else if (phone.startsWith('8')) phone = '62' + phone;
      else if (!phone.startsWith('62')) phone = '62' + phone;
      
      return phone;
    } catch (error) {
      console.error('[WhatsApp] Error getting contact_phone:', error);
      return '6289653510125'; // fallback
    }
  }

  /**
   * Send WhatsApp message using dynamic provider configuration
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const startTime = Date.now();
    
    try {
      // Get active API configuration
      const apiConfig = await this.getActiveApiKey();
      if (!apiConfig) {
        return {
          success: false,
          error: 'No active WhatsApp API configuration found'
        };
      }

      const { api_key, key_id, provider_config } = apiConfig;
      const provider = provider_config;

      // Build API endpoint
      const endpoint = options.useAsync && provider.async_send_message_endpoint
        ? provider.async_send_message_endpoint
        : provider.send_message_endpoint;
      
      const apiUrl = `${provider.base_url}${endpoint}`;

      // Build request body using dynamic field names
      const requestBody: any = {};
      requestBody[provider.phone_field_name] = this.formatPhoneNumber(options.phone);
      requestBody[provider.key_field_name] = api_key;
      requestBody[provider.message_field_name] = options.message;

      // Add media URL if provided
      if (options.mediaUrl && provider.settings?.supports_media) {
        requestBody.url = options.mediaUrl;
      }

      // Make API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      const responseTime = Date.now() - startTime;

      // Check success based on provider configuration
      const isSuccess = this.isResponseSuccessful(responseData, provider);
      const messageId = this.extractMessageId(responseData, provider);

      // Log the message
      await this.logMessage({
        apiKeyId: key_id,
        phone: options.phone,
        messageType: options.messageType || 'text',
        messageContent: options.message,
        requestBody,
        responseBody: responseData,
        responseStatus: response.status,
        success: isSuccess,
        messageId,
        contextType: options.contextType,
        contextId: options.contextId,
        responseTime
      });

      if (isSuccess) {

        return {
          success: true,
          messageId,
          provider: provider.display_name,
          responseTime
        };
      } else {
        console.error(`❌ WhatsApp sending failed via ${provider.display_name}:`, responseData);

        return {
          success: false,
          error: responseData.message || responseData.error || 'Unknown error',
          provider: provider.display_name,
          responseTime
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('WhatsApp service error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        responseTime
      };
    }
  }

  /**
   * Send WhatsApp message to a group using provider configuration from DB.
   * Falls back to provider-specific defaults (woo-wa/NotifAPI) when settings are absent.
   */
  async sendGroupMessage(params: {
    message: string;
    groupId?: string; // if not provided, use provider settings default_group_id
    contextType?: string;
    contextId?: string;
  }): Promise<SendMessageResult> {
    const startTime = Date.now();
    try {
      const apiConfig = await this.getActiveApiKey();
      if (!apiConfig) {
        return { success: false, error: 'No active WhatsApp API configuration found' };
      }
      const { api_key, key_id, provider_config } = apiConfig;
      const provider = provider_config;

      // Resolve group send endpoint & field names from settings or sensible defaults
      const settings = (provider.settings || {}) as any;
      const isWooWa = provider.name === 'woo-wa' || /woo|notifapi/i.test(provider.name || '') || /notifapi/i.test(provider.base_url || '');
      let endpoint = settings.group_send_endpoint || '/send_message_group_id';
      // NotifAPI does NOT use /api prefix - endpoints are at root level
      // Remove /api prefix if present since NotifAPI endpoints don't have it
      if (isWooWa && endpoint.startsWith('/api')) {
        endpoint = endpoint.replace(/^\/api/, '');
      }
      const groupField = settings.group_id_field_name || 'group_id';
      const keyField = provider.key_field_name || 'key';
      const messageField = provider.message_field_name || 'message';

      // Resolve target group id
      const targetGroupId = params.groupId || settings.default_group_id || '';
      if (!targetGroupId) {
        // Log but don't fail hard; avoid accidental sends to wrong targets
        await this.logCustomMessage({
          phone: 'group:UNKNOWN',
          message: params.message,
          success: false,
          providerName: provider.name,
          requestBody: { reason: 'missing_group_id' },
          responseBody: { error: 'No groupId provided and no default_group_id in provider settings' },
          responseStatus: 400,
          contextType: params.contextType,
          contextId: params.contextId,
          responseTime: Date.now() - startTime
        });
        return { success: false, error: 'Missing groupId (and default_group_id not configured in provider settings)' };
      }

      const apiUrl = `${provider.base_url}${endpoint}`;
      const requestBody: any = {};
      requestBody[groupField] = targetGroupId;
      requestBody[keyField] = api_key;
      requestBody[messageField] = params.message;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const responseData = await response.json().catch(() => ({}));
      const responseTime = Date.now() - startTime;

      const isSuccess = this.isResponseSuccessful(responseData, provider);
      const messageId = this.extractMessageId(responseData, provider);

      await this.logCustomMessage({
        phone: `group:${targetGroupId}`,
        message: params.message,
        success: isSuccess,
        providerName: provider.name,
        requestBody,
        responseBody: responseData,
        responseStatus: response.status,
        contextType: params.contextType,
        contextId: params.contextId,
        responseTime
      });

      if (isSuccess) {
        return { success: true, messageId, provider: provider.display_name, responseTime };
      }
      return { success: false, error: responseData?.message || 'Send group failed', provider: provider.display_name, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { success: false, error: error instanceof Error ? error.message : 'Network error', responseTime };
    }
  }

  /**
   * List available WhatsApp groups/chats from the active provider.
   * Uses provider.settings to resolve endpoint and field names.
   */
  async listGroups(): Promise<{ success: boolean; groups?: Array<{ id: string; name: string }>; error?: string }> {
    try {
      const apiConfig = await this.getActiveApiKey();
      if (!apiConfig) return { success: false, error: 'No active WhatsApp API configuration found' };

      const { api_key, provider_config } = apiConfig;
      const provider = provider_config;
      const settings = (provider.settings || {}) as any;
      // Sensible defaults for Woo-WA/NotifAPI
      const isWooWa = provider.name === 'woo-wa' || /woo|notifapi/i.test(provider.name || '') || /notifapi/i.test(provider.base_url || '');
      // NotifAPI does NOT use /api prefix - endpoints are at root level
      let endpoint = settings.list_groups_endpoint || (isWooWa ? '/get_group_id' : '/list_groups');
      // Remove /api prefix if present since NotifAPI endpoints don't have it
      if (isWooWa && endpoint.startsWith('/api')) {
        endpoint = endpoint.replace(/^\/api/, '');
      }
      // NotifAPI uses GET method for fetching groups
      const method = (settings.list_groups_method || (isWooWa ? 'GET' : 'POST')).toUpperCase();
      const keyField = provider.key_field_name || 'key';
      const nameField = settings.group_name_field || 'subject'; // NotifAPI uses 'subject' for group name
      const idField = settings.group_id_field_name || 'id';
      const arrayField = settings.groups_array_field || (isWooWa ? 'results' : 'groups');
      // For GET methods, default to 'query' auth mode; NotifAPI uses 'token' which means query param
      // Also force 'query' for NotifAPI regardless of what's in the DB
      const authMode = isWooWa ? 'query' : (settings.list_groups_auth_mode || (method === 'GET' ? 'query' : 'body'));
      const headerName = settings.list_groups_auth_header || 'Authorization';
      const headerTemplate = settings.list_groups_auth_header_template || 'Bearer {api_key}';

      let url = `${provider.base_url}${endpoint}`;
      const headers: any = { 'Accept': 'application/json' };
      let body: any = undefined;

      if (authMode === 'header') {
        headers[headerName] = headerTemplate.replace('{api_key}', api_key);
      } else if (authMode === 'query' || authMode === 'token') {
        // 'token' auth mode also means query parameter (used by NotifAPI)
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}${encodeURIComponent(keyField)}=${encodeURIComponent(api_key)}`;
      } else {
        // body by default
        body = { [keyField]: api_key };
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? (body ? JSON.stringify(body) : undefined) : undefined
      });
      const data = await response.json().catch(() => ({}));

      // Some providers nest data; allow mapping (support common keys and Woo-WA's `results`)
      const groupsRaw = (data && (data[arrayField]
        || data.results
        || data.data
        || data.result
        || data.groups)) || [];
      if (!Array.isArray(groupsRaw)) {
        // Attempt a known structure e.g. [{ id, name }] or key/value pairs
        return { success: false, error: 'Unexpected groups response structure' };
      }

      const groups = groupsRaw.map((g: any) => ({
          id: String(g[idField] || g.id || g.jid || ''),
          name: String(g[nameField] || g.name || g.subject || g.title || '')
        }))
        .filter(g => g.id && g.name);

      return { success: true, groups };
    } catch (e: any) {
      return { success: false, error: e?.message || 'list_groups_failed' };
    }
  }

  /**
   * Send verification code via WhatsApp
   */
  async sendVerificationCode(phone: string, code: string): Promise<SendMessageResult> {
    const message = `🔐 *Kode Verifikasi JB Alwikobra*

Kode Anda: *${code}*

⏰ Berlaku 15 menit
🔒 Jangan bagikan kode ini

Masukkan kode di halaman verifikasi untuk mengaktifkan akun Anda.

_JB Alwikobra - Game Accounts & Services_`;

    return this.sendMessage({
      phone,
      message,
      messageType: 'text',
      contextType: 'verification',
      contextId: code
    });
  }

  /**
   * Send welcome message via WhatsApp
   */
  async sendWelcomeMessage(name: string, phone: string, email?: string): Promise<SendMessageResult> {
    const message = `🎮 *Selamat Datang di JB Alwikobra!*

Halo ${name}! 👋

Terima kasih telah bergabung dengan JB Alwikobra E-commerce - tempat terpercaya untuk game account premium!

🚀 *Sekarang Anda bisa:*
✅ Berbelanja game account terbaik
✅ Menyimpan wishlist favorit
✅ Tracking riwayat pesanan
✅ Mendapat notifikasi WhatsApp otomatis

🎯 *Fitur Unggulan:*
• Game account berkualitas tinggi
• Proses cepat & aman
• Support 24/7 via WhatsApp
• Garansi kepuasan pelanggan

📱 *Mulai belanja sekarang:*
${process.env.REACT_APP_SITE_URL || 'https://jbalwikobra.com'}

${email ? `📧 Email terdaftar: ${email}` : ''}

---
🎮 *JB Alwikobra E-commerce*
Premium Game Accounts & Services

Ada pertanyaan? Balas pesan ini! 💬`;

    return this.sendMessage({
      phone,
      message,
      messageType: 'text',
      contextType: 'welcome',
      contextId: `${name}-${Date.now()}`
    });
  }

  /**
   * Check if a successful message log already exists for a given context
   * Useful for idempotency: avoid duplicate sends for the same order/event
   */
  async hasMessageLog(contextType: string, contextId: string): Promise<boolean> {
    try {
      const sb = getSupabase();
      if (!sb) return false;
      const { data, error } = await sb
        .from('whatsapp_message_logs')
        .select('id')
        .eq('context_type', contextType)
        .eq('context_id', contextId)
        .eq('success', true)
        .limit(1);
      if (error) {
        console.error('Error checking message log:', error);
        return false;
      }
      return !!(data && data.length);
    } catch (err) {
      console.error('hasMessageLog error:', err);
      return false;
    }
  }

  /**
   * Log a custom WhatsApp message attempt (e.g., admin group sends)
   * This allows unified logging and idempotency checks even when not using sendMessage()
   */
  async logCustomMessage(params: {
    phone: string; // use a pseudo phone like `group:<group_id>` for group messages
    message: string;
    success: boolean;
    providerName?: string;
    requestBody?: any;
    responseBody?: any;
    responseStatus?: number;
    contextType?: string;
    contextId?: string;
    responseTime?: number;
  }): Promise<void> {
    try {
      const sb = getSupabase();
      if (!sb) return;

      // Get an active API key to associate the log entry with
      const apiConfig = await this.getActiveApiKey(params.providerName || 'woo-wa');
      if (!apiConfig) {
        console.warn('logCustomMessage: No active API key found for logging');
        return;
      }

      await sb.rpc('log_whatsapp_message', {
        p_api_key_id: apiConfig.key_id,
        p_phone_number: params.phone,
        p_message_type: 'text',
        p_message_content: params.message,
        p_request_body: params.requestBody || {},
        p_response_body: params.responseBody || {},
        p_response_status: params.responseStatus || 0,
        p_success: params.success,
        p_message_id: undefined,
        p_context_type: params.contextType,
        p_context_id: params.contextId,
        p_response_time_ms: params.responseTime || 0
      });
    } catch (error) {
      console.error('logCustomMessage error:', error);
    }
  }

  /**
   * Check if response indicates success based on provider configuration
   */
  private isResponseSuccessful(responseData: any, provider: WhatsAppProvider): boolean {
    if (!responseData) return false;

    const statusField = provider.success_status_field;
    const expectedValue = provider.success_status_value;

    // Check main status field
    if (responseData[statusField] === expectedValue) {
      return true;
    }

    // Check nested results field (common in some APIs)
    if (responseData.results && responseData.results[statusField] === expectedValue) {
      return true;
    }

    // For mock API, check success field
    if (provider.name === 'mock' && responseData.status === 'sent') {
      return true;
    }

    // Special handling for woo-wa (NotifAPI) - check for success message pattern
    if (provider.name === 'woo-wa' && responseData.results) {
      const message = responseData.results.message || '';
      if (message.includes('Message success sent to')) {
        return true;
      }
    }

    // Additional fallback: check for common success indicators
    if (responseData.results && responseData.results.id_message) {
      // If we have a message ID, it's likely successful
      return true;
    }

    return false;
  }

  /**
   * Extract message ID from response based on provider configuration
   */
  private extractMessageId(responseData: any, provider: WhatsAppProvider): string | undefined {
    const messageIdField = provider.message_id_field;

    // Check main level
    if (responseData[messageIdField]) {
      return responseData[messageIdField];
    }

    // Check nested results
    if (responseData.results && responseData.results[messageIdField]) {
      return responseData.results[messageIdField];
    }

    // Special handling for woo-wa (NotifAPI)
    if (provider.name === 'woo-wa' && responseData.results && responseData.results.id_message) {
      return responseData.results.id_message;
    }

    // Fallback fields
    return responseData.id_message || responseData.message_id || responseData.id;
  }

  /**
   * Format phone number for Indonesian format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Convert to Indonesian format (62xxx)
    if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    } else if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Log message to database
   */
  private async logMessage(params: {
    apiKeyId: string;
    phone: string;
    messageType: string;
    messageContent: string;
    requestBody: any;
    responseBody: any;
    responseStatus: number;
    success: boolean;
    messageId?: string;
    contextType?: string;
    contextId?: string;
    responseTime: number;
  }): Promise<void> {
    try {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc('log_whatsapp_message', {
        p_api_key_id: params.apiKeyId,
        p_phone_number: params.phone,
        p_message_type: params.messageType,
        p_message_content: params.messageContent,
        p_request_body: params.requestBody,
        p_response_body: params.responseBody,
        p_response_status: params.responseStatus,
        p_success: params.success,
        p_message_id: params.messageId,
        p_context_type: params.contextType,
        p_context_id: params.contextId,
        p_response_time_ms: params.responseTime
      });
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }

  /**
   * Get all available providers
   */
  async getProviders(): Promise<WhatsAppProvider[]> {
    try {
  const sb = getSupabase();
  if (!sb) return [];
  // Optimized: Select only required fields to reduce egress
  const { data, error } = await sb
        .from('whatsapp_providers')
        .select('id, name, display_name, base_url, is_active, settings, key_field_name, send_message_endpoint, async_send_message_endpoint, phone_field_name, message_field_name, success_status_field, success_status_value, message_id_field')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error getting providers:', error);
        return [];
      }

      return (data || []) as WhatsAppProvider[];
    } catch (error) {
      console.error('Error in getProviders:', error);
      return [];
    }
  }

  /**
   * Add new API key for a provider
   */
  async addApiKey(providerName: string, keyName: string, apiKey: string, isPrimary: boolean = false): Promise<boolean> {
    try {
  const sb = getSupabase();
  if (!sb) return false;
  // Get provider ID
  const { data: provider } = await sb
        .from('whatsapp_providers')
        .select('id')
        .eq('name', providerName)
        .single();

      if (!provider) {
        console.error('Provider not found:', providerName);
        return false;
      }

      // If setting as primary, unset other primary keys
      if (isPrimary) {
        await sb
          .from('whatsapp_api_keys')
          .update({ is_primary: false })
          .eq('provider_id', provider.id);
      }

      // Insert new key
      const { error } = await sb
        .from('whatsapp_api_keys')
        .insert({
          provider_id: provider.id,
          key_name: keyName,
          api_key: apiKey,
          is_primary: isPrimary,
          is_active: true
        });

      if (error) {
        console.error('Error adding API key:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addApiKey:', error);
      return false;
    }
  }

  /**
   * Get message logs with filtering
   */
  async getMessageLogs(filters: {
    phone?: string;
    contextType?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
        .from('whatsapp_message_logs')
        .select(`
          *,
          whatsapp_providers(name, display_name),
          whatsapp_api_keys(key_name)
        `)
        .order('created_at', { ascending: false });

      if (filters.phone) {
        query = query.eq('phone_number', filters.phone);
      }

      if (filters.contextType) {
        query = query.eq('context_type', filters.contextType);
      }

      if (filters.success !== undefined) {
        query = query.eq('success', filters.success);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting message logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMessageLogs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const whatsappService = new DynamicWhatsAppService();
