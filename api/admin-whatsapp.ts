import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Shared helpers
function respond(res: VercelResponse, status: number, body: any) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }});
}

async function getActiveProvider(supabase: any) {
  const { data, error } = await supabase
    .from('whatsapp_providers')
    .select('id, name, api_url, is_active, created_at')
    .eq('is_active', true)
    .order('name')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function handleValidation(sb: any, res: VercelResponse) {
  try {
    // Get active provider
    const { data: provider, error: pErr } = await sb
      .from('whatsapp_providers')
      .select('id, name, api_url, is_active, created_at')
      .eq('is_active', true)
      .order('name')
      .limit(1)
      .maybeSingle();
    if (pErr) return respond(res, 500, { ok: false, error: pErr.message });
    if (!provider) return respond(res, 404, { ok: false, error: 'no_active_provider' });

    // Get an active key
    const { data: keyRow, error: kErr } = await sb
      .from('whatsapp_api_keys')
      .select('id, api_key, is_active, is_primary')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (kErr) return respond(res, 500, { ok: false, error: kErr.message });

    const settings = provider.settings || {};

    const checks: any[] = [];
    const check = (name: string, pass: boolean, detail?: any) => {
      checks.push({ name, pass, ...(detail ? { detail } : {}) });
    };

    // Core provider fields
    check('base_url present', !!provider.base_url, { value: provider.base_url });
    check('send_message_endpoint present', !!provider.send_message_endpoint, { value: provider.send_message_endpoint });
    check('async_send_message_endpoint present', !!provider.async_send_message_endpoint, { value: provider.async_send_message_endpoint });
    check('phone_field_name == phone_no', provider.phone_field_name === 'phone_no', { value: provider.phone_field_name });
    check('key_field_name == key', provider.key_field_name === 'key', { value: provider.key_field_name });
    check('message_field_name == message', provider.message_field_name === 'message', { value: provider.message_field_name });
    check('message_id_field set', !!provider.message_id_field, { value: provider.message_id_field });

    // Woo-WA defaults
    check('group_send_endpoint set', !!settings.group_send_endpoint, { value: settings.group_send_endpoint });
    check('group_id_field_name set', !!settings.group_id_field_name, { value: settings.group_id_field_name });
    check('list_groups_endpoint set', !!settings.list_groups_endpoint, { value: settings.list_groups_endpoint });
    check('list_groups_method set', !!settings.list_groups_method, { value: settings.list_groups_method });
    check('list_groups_auth_mode set', !!settings.list_groups_auth_mode, { value: settings.list_groups_auth_mode });
    check('groups_array_field set', !!settings.groups_array_field, { value: settings.groups_array_field });
    check('group_name_field set', !!settings.group_name_field, { value: settings.group_name_field });
    check('default_group_id set', !!settings.default_group_id, { value: settings.default_group_id || null });

    // Attempt listGroups using inline service to avoid import issues
    let listGroupsResult: any = null;
    try {
      // Inline service implementation
      const baseUrl = provider.settings?.base_url || 'https://notifapi.com';
      const endpoint = provider.settings?.list_groups_endpoint || '/get_group_id';
      const authField = provider.settings?.list_groups_auth_mode || 'token';
      const responseField = provider.settings?.groups_array_field || 'results';
      
      const url = `${baseUrl}${endpoint}`;
      const params = {
        [authField]: keyRow?.api_key
      };

      const response = await axios.get(url, { params });
      
      if (response.data && response.data[responseField]) {
        listGroupsResult = { success: true, groups: response.data[responseField] };
      } else {
        listGroupsResult = { success: true, groups: [] };
      }
      
      check('list_groups call ok', !!listGroupsResult.success, { error: listGroupsResult.error, count: listGroupsResult.groups?.length });
    } catch (e: any) {
      listGroupsResult = { success: false, error: e?.message };
      check('list_groups call ok', false, { error: e?.message });
    }

    const ok = checks.every(c => c.pass);
    return respond(res, 200, {
      ok,
      provider: {
        id: provider.id,
        name: provider.name,
        display_name: provider.display_name
      },
      active_key: !!keyRow,
      settings,
      checks,
      sample_groups: listGroupsResult?.groups?.slice(0, 5) || []
    });
  } catch (e: any) {
    console.error('[admin-whatsapp-validate] error', e);
    return respond(res, 500, { ok: false, error: e?.message || 'internal_error' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sb = getSupabase();
    // Development fallback: allow local UI testing without real Supabase credentials
    if (!sb && process.env.NODE_ENV !== 'production') {
      const devProvider = {
        id: 'dev-mock',
        name: 'dev-mock',
        display_name: 'Dev Mock Provider',
        settings: { default_group_id: 'DEV-GROUP-ID' }
      } as const;

      if (req.method === 'GET') {
        return respond(res, 200, devProvider);
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { default_group_id, group_configurations, settings: newSettings } = body;
        const merged = {
          ...devProvider,
          settings: {
            ...devProvider.settings,
            ...(default_group_id !== undefined ? { default_group_id: default_group_id || null } : {}),
            ...(group_configurations !== undefined ? { group_configurations: group_configurations || {} } : {}),
            ...(newSettings && typeof newSettings === 'object' ? newSettings : {})
          }
        };
        return respond(res, 200, { success: true, provider: merged, dev: true });
      }
      return respond(res, 405, { error: 'method_not_allowed' });
    }
    if (!sb) return respond(res, 500, { error: 'supabase_not_configured' });

    if (req.method === 'GET') {
      // Check if this is a validation request
      if (req.query.action === 'validate') {
        return await handleValidation(sb, res);
      }
      
      // Return active provider and settings
      const provider = await getActiveProvider(sb);
      if (!provider) return respond(res, 404, { error: 'no_active_provider' });
      return respond(res, 200, {
        id: provider.id,
        name: provider.name,
        display_name: provider.display_name,
        settings: provider.settings || {}
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { default_group_id, group_configurations, settings: newSettings } = body;
      const provider = await getActiveProvider(sb);
      if (!provider) return respond(res, 404, { error: 'no_active_provider' });

      const settings = { ...(provider.settings || {}) };
      if (default_group_id !== undefined) settings.default_group_id = default_group_id || null;
      if (group_configurations !== undefined) settings.group_configurations = group_configurations || {};
      if (newSettings && typeof newSettings === 'object') Object.assign(settings, newSettings);

      const { data, error } = await sb
        .from('whatsapp_providers')
        .update({ settings })
        .eq('id', provider.id)
        .select('id,name,display_name,settings')
        .maybeSingle();
      if (error) return respond(res, 400, { error: error.message || 'update_failed' });
      return respond(res, 200, { success: true, provider: data });
    }

    return respond(res, 405, { error: 'method_not_allowed' });
  } catch (e: any) {
    console.error('[admin-whatsapp] error', e);
    return respond(res, 500, { error: 'internal_error', message: e.message });
  }
}
