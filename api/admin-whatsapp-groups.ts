import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }));
  }

  try {
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

    // Get active provider
    const { data: provider, error: providerError } = await supabase
      .from('whatsapp_providers')
      .select('id, name, api_url, is_active')
      .eq('is_active', true)
      .single();
    
    if (providerError || !provider) {
      return res.status(400).json({ 
        error: 'No active WhatsApp provider found',
        details: providerError?.message 
      });
    }

    // Get API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('whatsapp_api_keys')
      .select('id, key, provider_id, is_active')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .single();
    
    if (keyError || !apiKeyData) {
      return res.status(400).json({ 
        error: 'No active API key found',
        details: keyError?.message 
      });
    }

    // Use the correct Woo-WA API configuration with GET and body auth
    const baseUrl = provider.settings?.base_url || 'https://notifapi.com';
    const endpoint = provider.settings?.list_groups_endpoint || '/get_group_id';
    const method = provider.settings?.list_groups_method || 'GET';
    const authMode = provider.settings?.list_groups_auth_mode || 'body';
    const keyField = provider.key_field_name || 'key';
    const responseField = provider.settings?.groups_array_field || 'results';
    
    const url = `${baseUrl}${endpoint}`;
    
    let response;
    if (method.toUpperCase() === 'GET' && authMode === 'body') {
      // GET request with key in body (Woo-WA specific behavior)
      response = await axios({
        method: 'GET',
        url: url,
        data: {
          [keyField]: apiKeyData.api_key
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else if (method.toUpperCase() === 'POST' && authMode === 'body') {
      // POST request with key in body
      response = await axios.post(url, {
        [keyField]: apiKeyData.api_key
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Fallback to query parameters
      response = await axios.get(url, { 
        params: { [keyField]: apiKeyData.api_key }
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
    console.error('[admin-whatsapp-groups] error', e);
    return res.status(500).json({ 
      error: e?.message || 'internal_error',
      details: e?.response?.data || 'No additional details'
    });
  }
}
