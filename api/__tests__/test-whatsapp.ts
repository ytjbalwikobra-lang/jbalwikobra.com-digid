// Test WhatsApp service endpoint
// Usage: /api/test-whatsapp?phone=6281234567890&message=test

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow db_check without auth
  const dbCheckOnly = req.query.db_check_only === 'true';
  
  // Only require auth if not just checking DB
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && !authHeader && !dbCheckOnly) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // First check database configuration directly
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    
    const sb = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('[Test WhatsApp] Checking database configuration...');

    // Check ALL whatsapp_providers (active and inactive)
    const { data: allProviders, error: provErr } = await sb
      .from('whatsapp_providers')
      .select('*')
      .order('created_at', { ascending: false });
      
    const providers = allProviders?.filter(p => p.is_active);

    // Check ALL whatsapp_api_keys (active and inactive)
    const { data: allKeys, error: keyErr } = await sb
      .from('whatsapp_api_keys')
      .select('*')
      .order('is_primary', { ascending: false });
      
    const apiKeys = allKeys?.filter(k => k.is_active);

    console.log('[Test WhatsApp] Providers found:', providers?.length || 0);
    console.log('[Test WhatsApp] API Keys found:', apiKeys?.length || 0);

    const dbCheck = {
      providers: {
        total: allProviders?.length || 0,
        active_count: providers?.length || 0,
        inactive_count: (allProviders?.length || 0) - (providers?.length || 0),
        data: providers || [],
        all_providers: allProviders || [],
        error: provErr?.message || null
      },
      api_keys: {
        total: allKeys?.length || 0,
        active_count: apiKeys?.length || 0,
        inactive_count: (allKeys?.length || 0) - (apiKeys?.length || 0),
        data: apiKeys?.map(k => ({
          id: k.id,
          provider_id: k.provider_id,
          is_active: k.is_active,
          is_primary: k.is_primary,
          has_api_key: !!k.api_key,
          api_key_length: k.api_key?.length || 0
        })) || [],
        all_keys: allKeys?.map(k => ({
          id: k.id,
          provider_id: k.provider_id,
          is_active: k.is_active,
          is_primary: k.is_primary,
          has_api_key: !!k.api_key
        })) || [],
        error: keyErr?.message || null
      }
    };

    // Now test with service
    const { DynamicWhatsAppService } = await import('./_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();
    
    // Debug: Call getActiveApiKey directly (private method via any cast)
    console.log('[Test WhatsApp] Calling getActiveApiKey...');
    const apiKeyResult = await (wa as any).getActiveApiKey('woo-wa');
    console.log('[Test WhatsApp] API Key Result:', JSON.stringify(apiKeyResult, null, 2));
    
    // Get test parameters
    const phone = req.query.phone as string || '6285157768097';
    const message = req.query.message as string || `🧪 *TEST WHATSAPP SERVICE*

Halo! Ini adalah test message dari JB Alwikobra.

Jika Anda menerima pesan ini, berarti WhatsApp service berjalan dengan baik ✅

Timestamp: ${new Date().toISOString()}

Terima kasih! 🎮`;

    console.log('[Test WhatsApp] Sending test message to:', phone);
    
    // Get provider settings first
    const settings = await wa.getActiveProviderSettings();
    console.log('[Test WhatsApp] Provider Settings:', JSON.stringify(settings, null, 2));
    
    const result = {
      timestamp: new Date().toISOString(),
      database_check: dbCheck,
      service_debug: {
        api_key_result: apiKeyResult ? {
          has_api_key: !!apiKeyResult.api_key,
          has_provider_config: !!apiKeyResult.provider_config,
          provider_name: apiKeyResult.provider_config?.name,
          provider_has_settings: !!apiKeyResult.provider_config?.settings
        } : null
      },
      settings_check: {
        has_settings: !!settings,
        provider: settings?.provider || 'none',
        base_url: settings?.base_url ? 'configured' : 'missing',
        api_key: settings?.api_key ? 'configured' : 'missing',
        session: settings?.session || 'none',
        is_active: settings?.is_active || false
      },
      test_params: {
        phone,
        message_length: message.length
      },
      send_result: null as any,
      error: null as any
    };

    if (!settings || !settings.is_active) {
      result.error = 'WhatsApp provider not configured or not active';
      return res.status(200).json(result);
    }

    // Try to send message
    const contextId = `test:${Date.now()}`;
    const sendResult = await wa.sendMessage({
      phone,
      message,
      contextType: 'test',
      contextId
    });

    result.send_result = sendResult;

    if (sendResult.success) {
      console.log('[Test WhatsApp] ✅ Message sent successfully');
      return res.status(200).json({
        ...result,
        status: 'success',
        message: 'WhatsApp message sent successfully!'
      });
    } else {
      console.error('[Test WhatsApp] ❌ Failed to send:', sendResult.error);
      return res.status(200).json({
        ...result,
        status: 'failed',
        message: 'Failed to send WhatsApp message'
      });
    }

  } catch (error: any) {
    console.error('[Test WhatsApp] Exception:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
