import { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication result interface
 */
export interface AuthResult {
  valid: boolean;
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
  error?: string;
}

/**
 * Get Supabase client with service role (server-side only)
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
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
      console.log('[authMiddleware] Development mode - bypassing authentication');
      return {
        valid: true,
        userId: 'dev-user-id',
        userEmail: 'dev@localhost',
        isAdmin: true
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

    // 3. Validate session token in database
    const { data: sessions, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        id,
        user_id,
        session_token,
        expires_at,
        is_active,
        users!inner (
          id,
          email,
          name,
          is_admin,
          is_active
        )
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .maybeSingle();

    if (sessionError) {
      console.error('[authMiddleware] Session query error:', sessionError);
      return { 
        valid: false, 
        error: 'Database error during authentication' 
      };
    }

    if (!sessions) {
      return { 
        valid: false, 
        error: 'Invalid or inactive session' 
      };
    }

    // 4. Check session expiration
    const expiresAt = new Date(sessions.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      // Mark session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessions.id);
      
      return { 
        valid: false, 
        error: 'Session expired' 
      };
    }

    // 5. Verify user data exists
    const user = sessions.users as any;
    
    if (!user) {
      console.error('[authMiddleware] User data missing for session:', sessions.id);
      return { 
        valid: false, 
        error: 'User not found' 
      };
    }

    // 6. Verify user is admin
    if (!user.is_admin) {
      console.warn('[authMiddleware] Non-admin user attempted admin access:', {
        userId: user.id,
        email: user.email
      });
      return { 
        valid: false, 
        error: 'Insufficient permissions. Admin access required.' 
      };
    }

    // 7. Verify user account is active
    if (!user.is_active) {
      console.warn('[authMiddleware] Inactive admin attempted access:', {
        userId: user.id,
        email: user.email
      });
      return { 
        valid: false, 
        error: 'Account is inactive' 
      };
    }

    // 8. Update last activity timestamp
    await supabase
      .from('user_sessions')
      .update({ last_activity: now.toISOString() })
      .eq('id', sessions.id);

    // Success - return user details
    return {
      valid: true,
      userId: user.id,
      userEmail: user.email || undefined,
      isAdmin: true
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
      isAdmin: true
    };
  }

  // Otherwise use strict validation
  return validateAdminAuth(req);
}
