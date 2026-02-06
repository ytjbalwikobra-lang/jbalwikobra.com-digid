/**
 * UNIFIED SUPABASE CLIENT
 * 
 * This file provides a single source of truth for Supabase configuration.
 * It handles both client-side (browser) and server-side (Node.js) environments.
 * 
 * Environment Variable Priority:
 * - Client (Browser): VITE_SUPABASE_URL > NEXT_PUBLIC_SUPABASE_URL > REACT_APP_SUPABASE_URL
 * - Server (Node.js): SUPABASE_URL (via process.env)
 * 
 * Usage:
 * - Browser: import { supabase } from '@/lib/supabaseClient';
 * - Server:  import { getServerSupabase } from '@/lib/supabaseClient';
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

const isBrowser = typeof window !== 'undefined';

// ============================================================================
// ENVIRONMENT VARIABLE RESOLUTION
// ============================================================================

/**
 * Get an environment variable with fallback chain.
 * Works in both Vite (import.meta.env) and Node.js (process.env) environments.
 */
function getEnvVar(primaryKey: string, ...fallbackKeys: string[]): string {
  const keys = [primaryKey, ...fallbackKeys];
  
  for (const key of keys) {
    let value = '';
    
    // Try process.env (Node.js, Vercel serverless)
    if (typeof process !== 'undefined' && process.env) {
      value = process.env[key] || '';
    }
    
    // Try import.meta.env (Vite)
    // @ts-ignore - import.meta.env exists in Vite builds
    if (!value && typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || '';
    }
    
    // Clean the value (remove quotes, CRLF)
    value = value.replace(/^["']|["']$/g, '').replace(/[\r\n]/g, '').trim();
    
    if (value && !looksLikePlaceholder(value)) {
      return value;
    }
  }
  
  return '';
}

/**
 * Check if a value looks like a placeholder that hasn't been configured.
 */
function looksLikePlaceholder(value: string): boolean {
  return /^(YOUR_|your_|\$\{|<|https?:\/\/your-project)/i.test(value);
}

/**
 * Validate that a URL looks like a valid Supabase URL.
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

// ============================================================================
// CONFIGURATION RESOLUTION
// ============================================================================

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function resolveConfig(): SupabaseConfig {
  // URL: Try all possible env var names
  const url = getEnvVar(
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'REACT_APP_SUPABASE_URL'
  );
  
  // Anon Key (for client-side, public)
  const anonKey = getEnvVar(
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'REACT_APP_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY'
  );
  
  // Service Role Key (for server-side, private)
  const serviceRoleKey = getEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_KEY'
  );
  
  return { url, anonKey, serviceRoleKey };
}

// ============================================================================
// CLIENT-SIDE SUPABASE (Browser)
// Uses Anon Key - safe to expose to client
// ============================================================================

let clientInstance: SupabaseClient | null = null;

function createBrowserClient(): SupabaseClient | null {
  const config = resolveConfig();
  
  // Log configuration status
  console.log('[Supabase] Browser client initialization:', {
    url: config.url ? `${config.url.substring(0, 35)}...` : '❌ MISSING',
    anonKey: config.anonKey ? `${config.anonKey.substring(0, 20)}...` : '❌ MISSING',
    isValidUrl: isValidSupabaseUrl(config.url)
  });
  
  if (!config.url || !config.anonKey) {
    console.warn('[Supabase] ⚠️ Missing configuration for browser client.');
    console.warn('[Supabase] Expected env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    return null;
  }
  
  if (!isValidSupabaseUrl(config.url)) {
    console.warn('[Supabase] ⚠️ Invalid Supabase URL format:', config.url);
    return null;
  }
  
  try {
    return createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      global: {
        headers: { 'x-client-info': 'jbalwikobra-browser' }
      },
      db: { schema: 'public' }
    });
  } catch (error) {
    console.error('[Supabase] ❌ Failed to create browser client:', error);
    return null;
  }
}

// ============================================================================
// SERVER-SIDE SUPABASE (Node.js / Vercel Serverless)
// Uses Service Role Key - MUST NOT be exposed to client
// ============================================================================

let serverInstance: SupabaseClient | null = null;

function createServerClient(): SupabaseClient | null {
  const config = resolveConfig();
  
  // Verbose logging for debugging
  console.log('[Supabase] Server client initialization:', {
    url: config.url ? `${config.url.substring(0, 35)}...` : '❌ MISSING',
    serviceRoleKey: config.serviceRoleKey ? `${config.serviceRoleKey.substring(0, 20)}...` : '❌ MISSING',
    isValidUrl: isValidSupabaseUrl(config.url)
  });
  
  if (!config.url || !config.serviceRoleKey) {
    console.error('[Supabase] ❌ Missing server configuration.');
    console.error('[Supabase] ❌ Expected env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    console.error('[Supabase] Available SUPABASE* env vars:', 
      Object.keys(process.env || {}).filter(k => k.includes('SUPABASE')).join(', ') || 'NONE FOUND'
    );
    return null;
  }
  
  if (!isValidSupabaseUrl(config.url)) {
    console.error('[Supabase] ❌ Invalid Supabase URL format:', config.url);
    return null;
  }
  
  try {
    return createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: { 'x-client-info': 'jbalwikobra-server' }
      },
      db: { schema: 'public' }
    });
  } catch (error) {
    console.error('[Supabase] ❌ Failed to create server client:', error);
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Browser Supabase client (uses anon key).
 * Safe to use in React components.
 */
export const supabase: SupabaseClient | null = isBrowser 
  ? (clientInstance = clientInstance || createBrowserClient())
  : null;

/**
 * Get server-side Supabase client (uses service role key).
 * Use this in API routes and server-side code.
 * Returns a singleton instance.
 */
export function getServerSupabase(): SupabaseClient {
  if (!serverInstance) {
    serverInstance = createServerClient();
  }
  
  if (!serverInstance) {
    throw new Error(
      '[Supabase] Server client not available. ' +
      'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment.'
    );
  }
  
  return serverInstance;
}

/**
 * Check if the Supabase client is configured.
 * Useful for conditional rendering.
 */
export function isSupabaseConfigured(): boolean {
  const config = resolveConfig();
  return !!(config.url && config.anonKey && isValidSupabaseUrl(config.url));
}

/**
 * Get the current configuration (for debugging).
 * Never logs actual keys.
 */
export function getConfigStatus(): {
  urlSet: boolean;
  anonKeySet: boolean;
  serviceRoleKeySet: boolean;
  isValid: boolean;
} {
  const config = resolveConfig();
  return {
    urlSet: !!config.url,
    anonKeySet: !!config.anonKey,
    serviceRoleKeySet: !!config.serviceRoleKey,
    isValid: isValidSupabaseUrl(config.url)
  };
}
