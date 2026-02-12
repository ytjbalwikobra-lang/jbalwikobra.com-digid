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
  isValidName
} from './_utils/validation.js';

/**
 * AUTH API - REVAMPED VERSION (Google OAuth + Email/Password)
 * 
 * Perubahan:
 * - Tambah Google OAuth login via Supabase Auth
 * - Signup berubah dari phone-first ke email-first (tanpa WA OTP)
 * - Hapus ketergantungan WhatsApp untuk autentikasi
 * - Tetap menggunakan custom session (session_token)
 * - ISO 27001 & OWASP compliant
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Session configuration
const SESSION_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Rate limiting configuration (ISO 27001: Brute force protection)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RATE_LIMITS: Record<string, number> = {
  'login': 5,
  'signup': 3,
  'google-callback': 10,
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
const USER_SAFE_FIELDS = 'id,email,phone,name,role,is_admin,is_active,phone_verified,profile_completed,auth_provider,avatar_url,google_id';
const USER_AUTH_FIELDS = 'id,email,phone,name,role,password_hash,is_admin,is_active,profile_completed,auth_provider,avatar_url,google_id';

// ============================================================================
// SINGLETON SUPABASE CLIENT - BULLETPROOF VERSION
// ============================================================================

let supabaseClient: SupabaseClient | null = null;
let configurationLogged = false;

/**
 * Resolve an environment variable with fallback chain.
 * Handles quotes, CRLF characters, and whitespace.
 */
function resolveEnvVar(primaryKey: string, ...fallbacks: string[]): string {
  const keys = [primaryKey, ...fallbacks];
  
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      // Clean the value: remove quotes, CRLF, trim whitespace
      const cleaned = value.replace(/^["']|["']$/g, '').replace(/[\r\n]/g, '').trim();
      if (cleaned && !cleaned.startsWith('YOUR_') && !cleaned.startsWith('${')) {
        if (!configurationLogged) {
          console.log(`[Auth] ✅ ${primaryKey}: Found via ${key}`);
        }
        return cleaned;
      }
    }
  }
  
  if (!configurationLogged) {
    console.error(`[Auth] ❌ ${primaryKey}: NOT FOUND (checked: ${keys.join(', ')})`);
  }
  return '';
}

/**
 * Get Supabase client with verbose debugging.
 * Throws with detailed error message if configuration is missing.
 */
function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  
  console.log('[Auth] ========================================');
  console.log('[Auth] Initializing Supabase Client...');
  console.log('[Auth] ========================================');
  
  // Resolve environment variables with fallback chains
  const supabaseUrl = resolveEnvVar(
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'REACT_APP_SUPABASE_URL'
  );
  
  const supabaseServiceKey = resolveEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_KEY'
  );
  
  // Log all SUPABASE* env vars for debugging (values hidden)
  const supabaseEnvVars = Object.keys(process.env).filter(k => 
    k.toUpperCase().includes('SUPABASE')
  );
  console.log('[Auth] Available SUPABASE* environment variables:', supabaseEnvVars.length > 0 ? supabaseEnvVars.join(', ') : 'NONE');
  
  // Log final resolution status
  console.log('[Auth] ----------------------------------------');
  console.log('[Auth] Resolution Summary:');
  console.log(`[Auth]   SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : '❌ MISSING'}`);
  console.log(`[Auth]   SERVICE_KEY:  ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : '❌ MISSING'}`);
  console.log('[Auth] ----------------------------------------');
  
  configurationLogged = true;
  
  // Validate configuration
  const errors: string[] = [];
  
  if (!supabaseUrl) {
    errors.push('SUPABASE_URL is missing. Add it to your .env.local file.');
  } else if (!supabaseUrl.includes('.supabase.co')) {
    errors.push(`SUPABASE_URL appears invalid: ${supabaseUrl}`);
  }
  
  if (!supabaseServiceKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is missing. Add it to your .env.local file.');
  } else if (supabaseServiceKey.length < 100) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY appears too short. Verify it is the full key.');
  }
  
  if (errors.length > 0) {
    console.error('[Auth] ❌ Configuration Errors:');
    errors.forEach(err => console.error(`[Auth]   - ${err}`));
    console.error('[Auth] ');
    console.error('[Auth] 💡 Fix: Ensure your .env.local contains:');
    console.error('[Auth]   SUPABASE_URL=https://your-project.supabase.co');
    console.error('[Auth]   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    console.error('[Auth] ');
    console.error('[Auth] 💡 Then run: vercel env pull .env.local --environment=development');
    throw new Error(`Missing Supabase configuration: ${errors.join('; ')}`);
  }
  
  // Create client
  try {
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
    
    console.log('[Auth] ✅ Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('[Auth] ❌ Failed to create Supabase client:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         (req.headers['x-real-ip'] as string) || 
         'unknown';
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_EXPIRY_MS);
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
    role: result.user_role || (result.is_admin ? 'super_admin' : 'user'),
    created_at: result.user_created_at,
    auth_provider: result.user_auth_provider || 'email',
    avatar_url: result.user_avatar_url
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
    Promise.resolve(
      getSupabase()
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
    ).then(() => {}).catch((err: Error) => console.error('[Auth] Failed to update last_login_at:', err));

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
    const { email, password, name } = req.body;

    // Validasi — email-first signup (tanpa WhatsApp OTP)
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    if (!name || !isValidName(name)) {
      return res.status(400).json({ error: 'Valid name required (2-100 chars, letters only)' });
    }

    const sanitizedName = sanitizeString(name.trim(), 100);
    const normalizedEmail = email.trim().toLowerCase();

    // Cek apakah email sudah terdaftar
    const { data: existingUsers } = await getSupabase()
      .from('users')
      .select('id,email,profile_completed,auth_provider')
      .eq('email', normalizedEmail)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.auth_provider === 'google') {
        return res.status(400).json({ error: 'Email ini sudah terdaftar via Google. Silakan login dengan Google.' });
      }
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Buat user baru — langsung aktif (tanpa verifikasi WA)
    const { data: newUser, error: userError } = await getSupabase()
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        name: sanitizedName,
        is_active: true,
        phone_verified: false,
        profile_completed: true,
        auth_provider: 'email'
      })
      .select('id')
      .single();

    if (userError) {
      console.error('[Auth] User creation failed:', userError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Buat session langsung (tanpa verifikasi WA)
    const session = await createSession(newUser.id, req);

    // Ambil user data lengkap
    const { data: userData, error: fetchError } = await getSupabase()
      .from('users')
      .select(USER_SAFE_FIELDS)
      .eq('id', newUser.id)
      .single();

    if (fetchError) {
      console.error('[Auth] User fetch failed:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil dibuat',
      user: userData,
      ...session
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle Google OAuth callback
 * Frontend mengirim access_token dari Supabase Auth setelah Google sign-in
 * Backend: Validasi token, cari/buat user di tabel users, buat custom session
 */
async function handleGoogleCallback(req: VercelRequest, res: VercelResponse) {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Buat Supabase client dengan anon key untuk validasi user token
    const supabaseUrl = resolveEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL');
    const supabaseAnonKey = resolveEnvVar('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth] Missing Supabase anon config for Google callback');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Gunakan service role untuk mendapatkan user data dari access_token
    const { data: { user: authUser }, error: authError } = await getSupabase()
      .auth.getUser(access_token);

    if (authError || !authUser) {
      console.error('[Auth] Google token validation failed:', authError);
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }

    // Ekstrak info dari Google profile
    const googleId = authUser.id; // Supabase Auth user ID
    const googleEmail = authUser.email;
    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
    const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';

    if (!googleEmail) {
      return res.status(400).json({ error: 'Google account email not available' });
    }

    // Cari user berdasarkan google_id atau email
    const { data: existingUsers } = await getSupabase()
      .from('users')
      .select(USER_SAFE_FIELDS)
      .or(`google_id.eq.${googleId},email.eq.${googleEmail}`)
      .limit(2);

    let userId: string;
    let isNewUser = false;

    if (existingUsers && existingUsers.length > 0) {
      // User sudah ada — link Google account jika belum
      const user = existingUsers[0];
      userId = user.id;

      // Update google_id dan avatar jika belum di-set
      const updateData: Record<string, any> = {};
      if (!user.google_id) updateData.google_id = googleId;
      if (!user.avatar_url && googleAvatar) updateData.avatar_url = googleAvatar;
      if (user.auth_provider !== 'google' && !user.google_id) updateData.auth_provider = 'google';
      if (!user.name && googleName) updateData.name = googleName;
      updateData.last_login_at = new Date().toISOString();

      if (Object.keys(updateData).length > 0) {
        await getSupabase()
          .from('users')
          .update(updateData)
          .eq('id', userId);
      }
    } else {
      // User baru — buat akun otomatis
      isNewUser = true;
      const { data: newUser, error: createError } = await getSupabase()
        .from('users')
        .insert({
          email: googleEmail.toLowerCase(),
          name: googleName,
          avatar_url: googleAvatar,
          google_id: googleId,
          is_active: true,
          phone_verified: false,
          profile_completed: true,
          auth_provider: 'google'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[Auth] Google user creation failed:', createError);
        return res.status(500).json({ error: 'Failed to create account' });
      }

      userId = newUser.id;
    }

    // Buat custom session
    const session = await createSession(userId, req);

    // Ambil user data lengkap
    const { data: userData } = await getSupabase()
      .from('users')
      .select(USER_SAFE_FIELDS)
      .eq('id', userId)
      .single();

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Akun Google berhasil dibuat' : 'Login Google berhasil',
      user: { ...userData, profile_completed: userData?.profile_completed ?? true },
      ...session,
      is_new_user: isNewUser
    });
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
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

    // Validation - email required, name optional (already set during signup)
    if (!user_id || !email) {
      return res.status(400).json({ error: 'User ID and email required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Build update object
    const updateData: Record<string, any> = {
      email: email.trim().toLowerCase(),
      profile_completed: true,
      profile_completed_at: new Date().toISOString()
    };

    // Only update name if provided (allows override if needed)
    if (name && isValidName(name)) {
      updateData.name = sanitizeString(name.trim(), 100);
    }

    // Update profile
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update(updateData)
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
      case 'google-callback':
        return await handleGoogleCallback(req, res);
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
