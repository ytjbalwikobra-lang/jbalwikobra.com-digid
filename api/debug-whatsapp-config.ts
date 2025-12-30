import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * DEBUG ENDPOINT: Check WhatsApp Configuration
 * Uses service role key to bypass RLS
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        error: 'Missing Supabase credentials',
        has_url: !!supabaseUrl,
        has_service_key: !!supabaseServiceKey
      });
    }

    console.log('[debug-whatsapp-config] Creating service role client...');
    
    // Create Supabase client with SERVICE ROLE KEY (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[debug-whatsapp-config] Querying admin_whatsapp_settings...');

    // Query admin_whatsapp_settings with service role (no RLS)
    const { data: settings, error, count } = await supabase
      .from('admin_whatsapp_settings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[debug-whatsapp-config] Query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message,
        code: error.code
      });
    }

    console.log('[debug-whatsapp-config] Found records:', count);

    // Check RLS policies
    const { data: policies, error: policyError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            polname as policy_name,
            polcmd as policy_command,
            polpermissive as is_permissive,
            polroles::regrole[] as roles,
            pg_get_expr(polqual, polrelid) as using_expression,
            pg_get_expr(polwithcheck, polrelid) as check_expression
          FROM pg_policy
          WHERE polrelid = 'admin_whatsapp_settings'::regclass;
        `
      })
      .single();

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      database_check: {
        total_records: count,
        has_records: (count || 0) > 0,
        records: settings || []
      },
      configuration_status: settings && settings.length > 0 ? {
        provider: settings[0].provider,
        base_url: settings[0].base_url,
        has_api_key: !!settings[0].api_key,
        api_key_length: settings[0].api_key?.length || 0,
        session: settings[0].session,
        is_active: settings[0].is_active,
        default_group_id: settings[0].default_group_id,
        created_at: settings[0].created_at,
        updated_at: settings[0].updated_at
      } : null,
      rls_policies: {
        checked: !policyError,
        policies: policies || null,
        error: policyError?.message || null
      },
      environment: {
        has_service_key: true,
        supabase_url: supabaseUrl
      }
    });

  } catch (err: any) {
    console.error('[debug-whatsapp-config] Unexpected error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
