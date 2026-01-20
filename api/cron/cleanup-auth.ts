/**
 * Cron Job: Cleanup Expired Auth Data
 * 
 * This endpoint is called periodically by Vercel Cron to:
 * - Clean up expired sessions
 * - Clean up expired phone verifications
 * - Refresh session analytics
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-auth",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n]/g, '');
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').replace(/[\r\n]/g, '');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request (security)
  const authHeader = req.headers.authorization;
  
  // In production, Vercel cron sends a special header
  if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized cleanup attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const startTime = Date.now();
  const results: any = {
    sessions_cleaned: 0,
    verifications_cleaned: 0,
    analytics_refreshed: false,
    errors: []
  };

  try {
    const supabase = getSupabase();

    // 1. Clean up expired sessions
    try {
      const { data: sessionsResult, error: sessionsError } = await supabase
        .rpc('cleanup_expired_sessions');

      if (sessionsError) {
        throw sessionsError;
      }

      results.sessions_cleaned = sessionsResult || 0;
    } catch (error: any) {
      console.error('[Cron] Failed to clean sessions:', error);
      results.errors.push(`Sessions: ${error.message}`);
    }

    // 2. Clean up expired phone verifications
    try {
      const { data: verificationsResult, error: verificationsError } = await supabase
        .rpc('cleanup_expired_verifications');

      if (verificationsError) {
        throw verificationsError;
      }

      results.verifications_cleaned = verificationsResult || 0;
    } catch (error: any) {
      console.error('[Cron] Failed to clean verifications:', error);
      results.errors.push(`Verifications: ${error.message}`);
    }

    // 3. Refresh session analytics (materialized view)
    try {
      const { error: analyticsError } = await supabase
        .rpc('refresh_session_analytics');

      if (analyticsError) {
        throw analyticsError;
      }

      results.analytics_refreshed = true;
    } catch (error: any) {
      console.error('[Cron] Failed to refresh analytics:', error);
      results.errors.push(`Analytics: ${error.message}`);
    }

    const duration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      ...results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Cron] Cleanup failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      ...results
    });
  }
}
