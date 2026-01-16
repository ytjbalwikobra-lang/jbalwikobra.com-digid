import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
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

    console.log('[API /api/admin-whatsapp-groups] Authenticated admin access:', {
      userId: auth.userId,
      email: auth.userEmail
    });

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
    const baseUrl = provider.settings?.base_url || 'https://notifapi.com';
    // NotifAPI requires /api/ prefix for endpoints
    const endpoint = provider.settings?.list_groups_endpoint || '/api/get_group_id';
    // NotifAPI expects 'token' as the query parameter name
    const keyField = 'token'; // Hardcoded for NotifAPI - database may have incorrect value
    const responseField = provider.settings?.groups_array_field || 'results';
    
    const url = `${baseUrl}${endpoint}`;
    
    console.log('[admin-whatsapp-groups] Fetching groups from external API:', {
      url,
      keyField,
      providerKeyField: provider.key_field_name,
      provider: provider.name
    });
    
    let response;
    try {
      // NotifAPI /get_group_id uses GET with query parameters
      const params = {
        [keyField]: apiKeyData.api_key
      };
      
      response = await axios.get(url, { 
        params,
        timeout: 10000 // 10 second timeout
      });
    } catch (apiError: any) {
      console.error('[admin-whatsapp-groups] External API call failed:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message
      });
      
      return res.status(502).json({ 
        error: 'Failed to fetch groups from WhatsApp provider',
        message: apiError.response?.data?.message || apiError.message || 'External API error',
        providerResponse: apiError.response?.data,
        statusCode: apiError.response?.status
      });
    }
    
    console.log('[admin-whatsapp-groups] External API response received:', {
      status: response.status,
      hasData: !!response.data,
      hasResults: !!(response.data && response.data[responseField])
    });
    
    if (response.data && response.data[responseField]) {
      // Format the groups data properly for the frontend
      const formattedGroups = response.data[responseField].map((group: any) => ({
        id: group.id,
        name: group.subject || group.name || group.title || `Group ${group.id}`,
        value: group.id // For the dropdown value
      }));
      
      console.log('[admin-whatsapp-groups] Successfully formatted groups:', formattedGroups.length);
      
      return res.status(200).json({ 
        groups: formattedGroups,
        message: 'Groups loaded successfully'
      });
    }
    
    console.log('[admin-whatsapp-groups] No groups found in response');
    
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
