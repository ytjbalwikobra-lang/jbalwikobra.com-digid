import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  try {
    setCorsHeaders(req, res);
  } catch (corsError) {
    console.error('[admin-whatsapp-groups] CORS error:', corsError);
    // Continue anyway, CORS shouldn't block the request
  }
  
  if (handleCorsPreFlight(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }));
  }

      try {
    // ✅ SECURITY: Validate admin authentication
    const auth = await validateAdminAuth(req);
    if (!auth.valid) {
      console.warn('[API /api/admin-whatsapp-groups] Unauthorized access attempt:', {
        error: auth.error,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).send(JSON.stringify({ 
        error: 'unauthorized', 
        message: auth.error || 'Authentication required'
      }));
    }

    // In local development without DB config, return a mock list
    const hasSupabase = !!(process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL);
    if (!hasSupabase && process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        dev: true,
        groups: [
          { id: '120363421819020887@g.us', name: 'ORDERAN WEBSITE' },
          { id: '120363421819020999@g.us', name: 'OPS SUPPORT' },
          { id: '120363421819021234@g.us', name: 'MARKETING' }
        ]
      });
    }

    // Use the EXACT same approach as our working test-supabase endpoint
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Missing Supabase configuration - groups',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          nodeEnv: process.env.NODE_ENV,
          vercel: !!process.env.VERCEL
        }
      });
    }

    // Create client exactly like the working test - with auth config!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get active provider - use same query as admin-whatsapp.ts that works
    const { data: provider, error: providerError } = await supabase
      .from('whatsapp_providers')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .limit(1)
      .maybeSingle();
    
    if (providerError) {
      console.error('[admin-whatsapp-groups] Provider query error:', providerError);
      return res.status(500).json({ 
        error: 'Database error when fetching provider',
        details: providerError.message 
      });
    }
    
    if (!provider) {
      console.warn('[admin-whatsapp-groups] No active provider found');
      return res.status(404).json({ 
        error: 'No active WhatsApp provider configured',
        message: 'Please configure a WhatsApp provider in the admin panel first'
      });
    }

    // Get API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('whatsapp_api_keys')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (keyError) {
      console.error('[admin-whatsapp-groups] API key query error:', keyError);
      return res.status(500).json({ 
        error: 'Database error when fetching API key',
        details: keyError.message 
      });
    }
    
    if (!apiKeyData) {
      console.warn('[admin-whatsapp-groups] No active API key found for provider:', provider.name);
      return res.status(404).json({ 
        error: 'No active API key found',
        message: 'Please add and activate an API key first'
      });
    }

    // Use the correct Woo-WA API configuration
    // NotifAPI uses GET with query parameters for group listing
    const baseUrl = provider.base_url || provider.settings?.base_url || 'https://notifapi.com';
    // NotifAPI does NOT use /api prefix - endpoints are at root
    let endpoint = provider.settings?.list_groups_endpoint || '/get_group_id';
    // Remove /api prefix if present for NotifAPI (they don't use it)
    if (baseUrl.includes('notifapi') || provider.name?.toLowerCase().includes('woo')) {
      endpoint = endpoint.replace(/^\/api/, '');
    }
    // Use provider's key_field_name - NotifAPI expects 'key' as the query parameter name
    const keyField = provider.key_field_name || 'key';
    const responseField = provider.settings?.groups_array_field || 'results';
    
    const url = `${baseUrl}${endpoint}`;
    
    let response;
    try {
      // NotifAPI /get_group_id requires GET with JSON body (non-standard HTTP)
      // We use axios with method: 'GET' and data property to send body
      const requestBody = {
        [keyField]: apiKeyData.api_key
      };
      
      response = await axios({
        method: 'GET',
        url,
        data: requestBody,
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000 // 15 second timeout for group listing
      });
    } catch (apiError: any) {
      console.error('[admin-whatsapp-groups] External API call failed:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message
      });
      
      // Check for common NotifAPI errors
      const providerData = apiError.response?.data;
      const providerState = providerData?.results?.state || providerData?.state;
      const providerMessage = providerData?.results?.message || providerData?.message;
      
      // Handle WhatsApp service not connected
      if (providerState === 'SERVICE_OFF' || providerMessage?.includes('scan qr')) {
        return res.status(503).json({ 
          error: 'WhatsApp service not connected',
          message: 'WhatsApp service is offline. Please log in to NotifAPI and scan the QR code to connect your WhatsApp.',
          action_required: 'Connect WhatsApp on NotifAPI dashboard',
          providerState: providerState,
          providerMessage: providerMessage
        });
      }
      
      // If the endpoint doesn't exist (404), return configured groups from provider settings
      if (apiError.response?.status === 404) {
        
        const configuredGroups: Array<{ id: string; name: string; value: string }> = [];
        const groupConfigs = provider.settings?.group_configurations || {};
        
        if (groupConfigs.purchase_orders) {
          configuredGroups.push({ 
            id: groupConfigs.purchase_orders, 
            name: 'Purchase Orders Group',
            value: groupConfigs.purchase_orders 
          });
        }
        if (groupConfigs.rental_orders && groupConfigs.rental_orders !== groupConfigs.purchase_orders) {
          configuredGroups.push({ 
            id: groupConfigs.rental_orders, 
            name: 'Rental Orders Group',
            value: groupConfigs.rental_orders 
          });
        }
        if (groupConfigs.flash_sales && !configuredGroups.find(g => g.id === groupConfigs.flash_sales)) {
          configuredGroups.push({ 
            id: groupConfigs.flash_sales, 
            name: 'Flash Sales Group',
            value: groupConfigs.flash_sales 
          });
        }
        if (groupConfigs.general_notifications && !configuredGroups.find(g => g.id === groupConfigs.general_notifications)) {
          configuredGroups.push({ 
            id: groupConfigs.general_notifications, 
            name: 'General Notifications Group',
            value: groupConfigs.general_notifications 
          });
        }
        if (provider.settings?.default_group_id && !configuredGroups.find(g => g.id === provider.settings.default_group_id)) {
          configuredGroups.push({ 
            id: provider.settings.default_group_id, 
            name: 'Default Group',
            value: provider.settings.default_group_id 
          });
        }
        
        return res.status(200).json({ 
          groups: configuredGroups,
          message: configuredGroups.length > 0 
            ? `Loaded ${configuredGroups.length} configured groups (group discovery not available)`
            : 'Group discovery not available and no groups configured',
          note: 'NotifAPI does not support group listing. Groups are loaded from your saved configuration.'
        });
      }
      
      return res.status(502).json({ 
        error: 'Failed to fetch groups from WhatsApp provider',
        message: providerMessage || apiError.message || 'External API error',
        providerResponse: providerData,
        statusCode: apiError.response?.status
      });
    }
    
        
    if (response.data && response.data[responseField]) {
      // Format the groups data properly for the frontend
      const formattedGroups = response.data[responseField].map((group: any) => ({
        id: group.id,
        name: group.subject || group.name || group.title || `Group ${group.id}`,
        value: group.id // For the dropdown value
      }));
      
      return res.status(200).json({ 
        groups: formattedGroups,
        message: 'Groups loaded successfully'
      });
    }
    
    return res.status(200).json({ 
      groups: [],
      message: 'No groups found'
    });

  } catch (e: any) {
    console.error('[admin-whatsapp-groups] Unexpected error:', {
      message: e?.message,
      stack: e?.stack,
      response: e?.response?.data
    });
    return res.status(500).json({ 
      error: e?.message || 'internal_error',
      details: e?.response?.data || 'No additional details'
    });
  }
}
