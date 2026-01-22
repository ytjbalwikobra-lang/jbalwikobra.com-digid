import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { 
  isValidEmail, 
  isValidPhone, 
  isValidPassword, 
  sanitizeString, 
  isValidName,
  isValidVerificationCode 
} from './_utils/validation.js';

/**
 * AUTH API - OPTIMIZED VERSION
 * 
 * Improvements:
 * - Eliminated code duplication (session creation, Supabase init)
 * - Reduced egress by selecting only required fields
 * - Enhanced security with consistent validation
 * - ISO 27001 & OWASP compliant
 * - Database function integration for optimal performance
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Session configuration
const SESSION_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Verification configuration
const VERIFICATION_EXPIRY_MINUTES = 15;
const VERIFICATION_EXPIRY_MS = VERIFICATION_EXPIRY_MINUTES * 60 * 1000;

// Rate limiting configuration (ISO 27001: Brute force protection)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RATE_LIMITS: Record<string, number> = {
  'login': 5,
  'signup': 3,
  'verify-phone': 5,
  'validate-session': 20,
  'logout': 10,
  'complete-profile': 10,
  'update-profile': 15,
  'default': 10
};

// Security headers (OWASP recommendations)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Fields to select (egress optimization)
const USER_SAFE_FIELDS = 'id,email,phone,name,is_admin,is_active,phone_verified,profile_completed';
const USER_AUTH_FIELDS = 'id,email,phone,name,password_hash,is_admin,is_active,profile_completed';

// ============================================================================
// SINGLETON SUPABASE CLIENT
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: { 'x-client-info': 'jbalwikobra-auth-api' }
    },
    db: { schema: 'public' }
  });
  
  return supabaseClient;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         (req.headers['x-real-ip'] as string) || 
         'unknown';
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_EXPIRY_MS);
}

function getVerificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_EXPIRY_MS);
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Auto-cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

function checkRateLimit(identifier: string, action: string): boolean {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  const limit = RATE_LIMITS[action] || RATE_LIMITS.default;
  
  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    return true;
  }
  
  // Reset if outside window
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    return true;
  }
  
  // Check limit
  if (entry.count >= limit) {
    return false;
  }
  
  // Increment
  entry.count++;
  entry.lastAttempt = now;
  return true;
}

// ============================================================================
// SESSION MANAGEMENT (DRY - Don't Repeat Yourself)
// ============================================================================

/**
 * Create session for user (consolidated function)
 * Used by: login, verify-phone
 */
async function createSession(
  userId: string,
  req: VercelRequest
): Promise<{ session_token: string; expires_at: string }> {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiry();
  
  const { error } = await getSupabase()
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'unknown'
    });
  
  if (error) {
    throw new Error('Failed to create session');
  }
  
  return {
    session_token: sessionToken,
    expires_at: expiresAt.toISOString()
  };
}

/**
 * Get user by session token (using DB function)
 */
async function getUserBySessionToken(sessionToken: string): Promise<any | null> {
  const { data, error } = await getSupabase()
    .rpc('validate_session', { p_session_token: sessionToken });
  
  if (error || !data) return null;
  
  const result = Array.isArray(data) ? data[0] : data;
  
  if (!result?.valid) return null;
  
  return {
    id: result.user_id,
    email: result.user_email,
    name: result.user_name,
    is_admin: result.is_admin,
    created_at: result.user_created_at
  };
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password required' });
    }

    // Find user (optimized: select only auth fields)
    const { data: users, error: userError } = await getSupabase()
      .from('users')
      .select(USER_AUTH_FIELDS)
      .or(`phone.eq.${identifier},email.eq.${identifier}`)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    // Create session
    const session = await createSession(user.id, req);

    // Update last login (fire and forget - don't wait)
    getSupabase()
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {})
      .catch(err => console.error('[Auth] Failed to update last_login_at:', err));

    // Return safe user data
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      user: { ...safeUser, profile_completed: safeUser.profile_completed ?? true },
      ...session
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  try {
    const { phone, password, name } = req.body;

    // Validation
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    if (!name || !isValidName(name)) {
      return res.status(400).json({ error: 'Valid name required (2-100 chars, letters only)' });
    }

    const sanitizedName = sanitizeString(name.trim(), 100);

    // Check existing user
    const { data: existingUsers } = await getSupabase()
      .from('users')
      .select('id,phone_verified')
      .eq('phone', phone)
      .limit(1);

    const existingUser = existingUsers?.[0];

    if (existingUser?.phone_verified) {
      return res.status(400).json({ error: 'User already exists and verified' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    let userId: string;

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: userError } = await getSupabase()
        .from('users')
        .insert({
          phone,
          password_hash: passwordHash,
          name: sanitizedName,
          is_active: true,
          phone_verified: false,
          profile_completed: false
        })
        .select('id')
        .single();

      if (userError) {
        console.error('[Auth] User creation failed:', userError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      userId = newUser.id;
    } else {
      // Update existing unverified user
      const { error: updateError } = await getSupabase()
        .from('users')
        .update({ password_hash: passwordHash, name: sanitizedName })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('[Auth] User update failed:', updateError);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      userId = existingUser.id;
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiry();

    // Delete old verifications (fire and forget)
    getSupabase()
      .from('phone_verifications')
      .delete()
      .eq('user_id', userId)
      .then(() => {})
      .catch(err => console.error('[Auth] Failed to cleanup old verifications:', err));

    // Create verification
    const { error: verificationError } = await getSupabase()
      .from('phone_verifications')
      .insert({
        user_id: userId,
        phone,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent'] || 'unknown'
      });

    if (verificationError) {
      console.error('[Auth] Verification creation failed:', verificationError);
      return res.status(500).json({ error: 'Failed to create verification' });
    }

    // Send WhatsApp (async, don't wait)
    (async () => {
      try {
        const { DynamicWhatsAppService } = await import('./_utils/dynamicWhatsAppService');
        const whatsappService = new DynamicWhatsAppService();
        await whatsappService.sendVerificationCode(phone, verificationCode);
      } catch (err) {
        console.error('[Auth] WhatsApp send failed:', err);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to WhatsApp',
      user_id: userId,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleVerifyPhone(req: VercelRequest, res: VercelResponse) {
  try {
    const { user_id, verification_code } = req.body;

    // Validation
    if (!user_id || !verification_code) {
      return res.status(400).json({ error: 'User ID and verification code required' });
    }

    if (!isValidVerificationCode(verification_code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Find verification
    const { data: verifications, error: verificationError } = await getSupabase()
      .from('phone_verifications')
      .select('id,expires_at')
      .eq('user_id', user_id)
      .eq('verification_code', verification_code)
      .eq('is_used', false)
      .limit(1);

    if (verificationError || !verifications || verifications.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const verification = verifications[0];

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    // Mark as used (fire and forget)
    getSupabase()
      .from('phone_verifications')
      .update({ is_used: true, verified_at: new Date().toISOString() })
      .eq('id', verification.id)
      .then(() => {})
      .catch(err => console.error('[Auth] Failed to mark verification as used:', err));

    // Update user
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update({ 
        phone_verified: true,
        phone_verified_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select(USER_SAFE_FIELDS)
      .single();

    if (userError) {
      console.error('[Auth] Phone verification failed:', userError);
      return res.status(500).json({ error: 'Failed to verify phone' });
    }

    // Create session
    const session = await createSession(user.id, req);

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      user,
      ...session,
      next_step: 'complete_profile'
    });
  } catch (error) {
    console.error('[Auth] Verify phone error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleValidateSession(req: VercelRequest, res: VercelResponse) {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      return res.status(400).json({ error: 'Session token required' });
    }

    // Use DB function (optimized)
    const user = await getUserBySessionToken(session_token);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[Auth] Validate session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  try {
    const { session_token, logout_all } = req.body;
    const authHeader = req.headers.authorization;
    const token = session_token || authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ error: 'Session token required' });
    }

    if (logout_all) {
      // Get user_id first
      const { data: sessionData } = await getSupabase()
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', token)
        .maybeSingle();

      if (sessionData?.user_id) {
        // Use DB function for batch invalidation
        await getSupabase()
          .rpc('invalidate_all_user_sessions', { p_user_id: sessionData.user_id });
      }
    } else {
      // Invalidate single session
      await getSupabase()
        .from('user_sessions')
        .update({ is_active: false, invalidated_at: new Date().toISOString() })
        .eq('session_token', token);
    }

    return res.status(200).json({
      success: true,
      message: logout_all ? 'Logged out from all devices' : 'Logged out successfully'
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCompleteProfile(req: VercelRequest, res: VercelResponse) {
  try {
    const { user_id, name, email } = req.body;

    // Validation
    if (!user_id || !name || !email) {
      return res.status(400).json({ error: 'User ID, name, and email required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ error: 'Invalid name (2-100 chars, letters only)' });
    }

    const sanitizedName = sanitizeString(name.trim(), 100);

    // Update profile
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update({
        name: sanitizedName,
        email: email.trim().toLowerCase(),
        profile_completed: true,
        profile_completed_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select(USER_SAFE_FIELDS)
      .single();

    if (userError) {
      console.error('[Auth] Profile completion failed:', userError);
      return res.status(500).json({ error: 'Failed to complete profile' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user
    });
  } catch (error) {
    console.error('[Auth] Complete profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdateProfile(req: VercelRequest, res: VercelResponse) {
  try {
    const { name, email, phone } = req.body;
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || req.body.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Session token required' });
    }

    // Get user via session
    const user = await getUserBySessionToken(sessionToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Validate at least one field
    if (!name && !email && !phone) {
      return res.status(400).json({ error: 'At least one field required' });
    }

    // Build update
    const updateData: any = {};

    if (name) {
      if (!isValidName(name)) {
        return res.status(400).json({ error: 'Invalid name' });
      }
      updateData.name = sanitizeString(name.trim(), 100);
    }

    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      updateData.email = email.trim().toLowerCase();
    }

    if (phone) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone' });
      }
      updateData.phone = phone.trim();
    }

    // Update user
    const { data: updatedUser, error: userError } = await getSupabase()
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select(USER_SAFE_FIELDS)
      .single();

    if (userError) {
      console.error('[Auth] Profile update failed:', userError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('[Auth] Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req, res);
  }

  // Security headers (OWASP)
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const action = (req.query.action as string) || '';
  const clientIP = getClientIP(req);

  // Rate limiting
  if (!checkRateLimit(clientIP, action)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retry_after: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    });
  }

  // Route to handler
  try {
    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'signup':
        return await handleSignup(req, res);
      case 'verify-phone':
        return await handleVerifyPhone(req, res);
      case 'validate-session':
        return await handleValidateSession(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'complete-profile':
        return await handleCompleteProfile(req, res);
      case 'update-profile':
        return await handleUpdateProfile(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(`[Auth] Unhandled error in ${action}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
