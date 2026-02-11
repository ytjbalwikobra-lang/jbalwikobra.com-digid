import { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication result interface
 */
export interface AuthResult {
  valid: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
  role?: string;
  error?: string;
}

/**
 * Get Supabase client with service role (server-side only)
 * Lazy initialization with connection pooling
 */
let supabaseAdminClient: any = null;

function getSupabaseAdmin() {
  // Return cached client if exists
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }
  
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n]/g, '');
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').replace(/[\r\n]/g, '');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-client-info': 'jbalwikobra-admin-middleware'
      }
    },
    db: {
      schema: 'public'
    }
  });
  
  return supabaseAdminClient;
}

/**
 * Validate admin authentication from Authorization header
 * 
 * Checks:
 * 1. Authorization header exists and has Bearer token
 * 2. Session token is valid and not expired
 * 3. User associated with session exists
 * 4. User has admin privileges (is_admin = true)
 * 5. User account is active (is_active = true)
 * 
 * @param req - Vercel request object
 * @returns AuthResult with validation status and user details
 */
export async function validateAdminAuth(req: VercelRequest): Promise<AuthResult> {
  try {
    // DEVELOPMENT MODE: Bypass auth for local development
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.VERCEL_ENV === 'development' ||
                         req.headers.host?.includes('localhost');
    
    if (isDevelopment) {
      return {
        valid: true,
        userId: 'dev-user-id',
        userEmail: 'dev@localhost',
        userName: 'Developer',
        isAdmin: true,
        role: 'super_admin'
      };
    }
    
    // 1. Extract session token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return { 
        valid: false, 
        error: 'Missing authorization header' 
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { 
        valid: false, 
        error: 'Invalid authorization header format. Expected: Bearer <token>' 
      };
    }

    const sessionToken = authHeader.substring(7).trim();
    
    if (!sessionToken) {
      return { 
        valid: false, 
        error: 'Empty session token' 
      };
    }

    // 2. Get Supabase admin client
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[authMiddleware] Supabase not configured');
      return { 
        valid: false, 
        error: 'Server configuration error' 
      };
    }

    // 3. Validate session using optimized database function
    // This function does validation + auto-cleanup in a single call
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_session', { p_session_token: sessionToken });

    if (validationError) {
      console.error('[authMiddleware] Session validation error:', validationError);
      return { 
        valid: false, 
        error: 'Database error during authentication' 
      };
    }

    // Handle result (function returns array or single object)
    const result = Array.isArray(validationResult) ? validationResult[0] : validationResult;

    if (!result || !result.valid) {
      return { 
        valid: false, 
        error: 'Invalid or inactive session' 
      };
    }

    // Verify user is admin
    if (!result.is_admin) {
      console.warn('[authMiddleware] Non-admin user attempted admin access:', {
        userId: result.user_id,
        email: result.user_email
      });
      return { 
        valid: false, 
        error: 'Insufficient permissions. Admin access required.' 
      };
    }

    // Success - return user details
    return {
      valid: true,
      userId: result.user_id,
      userEmail: result.user_email || undefined,
      userName: result.user_name || undefined,
      isAdmin: true,
      role: result.user_role || 'super_admin'
    };

  } catch (error) {
    console.error('[authMiddleware] Unexpected error during authentication:', error);
    return {
      valid: false,
      error: 'Internal authentication error'
    };
  }
}

/**
 * Optional: Validate admin authentication with optional mode
 * Allows endpoints to work without auth in development
 * 
 * @param req - Vercel request object
 * @param options - Configuration options
 * @returns AuthResult
 */
export async function validateAdminAuthOptional(
  req: VercelRequest,
  options: { allowDevMode?: boolean } = {}
): Promise<AuthResult> {
  // In development mode with allowDevMode flag, skip auth
  if (options.allowDevMode && process.env.NODE_ENV === 'development') {
    console.warn('[authMiddleware] Development mode - skipping authentication');
    return {
      valid: true,
      userId: 'dev-user',
      userEmail: 'dev@localhost',
      userName: 'Developer',
      isAdmin: true,
      role: 'super_admin'
    };
  }

  // Otherwise use strict validation
  return validateAdminAuth(req);
}
