import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
// Remove unused imports to prevent module resolution issues in production
// import { DynamicWhatsAppService } from './_utils/dynamicWhatsAppService';
// Remove adminNotificationService import to avoid module resolution issues
// import { adminNotificationService } from '../src/services/adminNotificationService';

// Lazily initialize Supabase client to avoid module-load failures
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (supabase) return supabase;
  
  // Clean environment variables to remove any CRLF characters  
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n]/g, '');
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').replace(/[\r\n]/g, '');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-client-info': 'jbalwikobra-auth-api'
      }
    },
    db: {
      schema: 'public'
    }
  });
  
  return supabase;
}

// Remove WhatsApp service dependency that might be causing failures
// const whatsappService = new DynamicWhatsAppService();

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(req: VercelRequest): string {
  return req.headers['x-forwarded-for'] as string || 
         req.headers['x-real-ip'] as string || 
         'unknown';
}

// Turnstile verification removed - no longer used

// Enhanced rate limiter with per-action tracking
// ISO 27001 compliance: Prevent brute force and DDoS attacks
interface RateLimitEntry {
  count: number;
  lastAttempt: number;
  firstAttempt: number;
}

const rateLimit = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Per-action rate limits (requests per minute)
const RATE_LIMITS: Record<string, number> = {
  'login': 5,
  'signup': 3,
  'verify-phone': 5,
  'validate-session': 20,
  'logout': 10,
  'default': 10
};

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimit.entries()) {
    if (now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimit.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

function checkRateLimit(ip: string, action: string = 'default'): boolean {
  const key = `${ip}:${action}`;
  const limit = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (!entry || (now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS)) {
    rateLimit.set(key, { count: 1, lastAttempt: now, firstAttempt: now });
    return true;
  }
  
  entry.count++;
  entry.lastAttempt = now;
  rateLimit.set(key, entry);
  
  return entry.count <= limit;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;
  
  // Security headers (ISO 27001 / OWASP best practices)
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  try {
    // Early environment check to prevent framework HTML 500s
    try {
      getSupabase(); // This will throw if env vars are missing
    } catch (error) {
      console.error('Auth API misconfiguration:', error);
      return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
    }

    const { action } = req.query;
    const actionStr = String(action || '');
    const clientIp = getClientIP(req);

    // Apply rate limiting to all actions for better security
    if (!checkRateLimit(clientIp, actionStr)) {
      console.warn(`[Security] Rate limit exceeded for IP ${clientIp}, action: ${actionStr}`);
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      });
    }

    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'signup':
        return await handleSignup(req, res);
      case 'verify-phone':
        return await handleVerifyPhone(req, res);
      case 'complete-profile':
        return await handleCompleteProfile(req, res);
      case 'update-profile':
        return await handleUpdateProfile(req, res);
      case 'validate-session':
        return await handleValidateSession(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'whatsapp-confirm':
        return await handleWhatsAppConfirm(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier, password } = req.body;

    console.log('Login attempt for identifier:', identifier ? 'provided' : 'missing');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    // Ensure Supabase is properly initialized
    let supabaseClient;
    try {
      supabaseClient = getSupabase();
    } catch (error) {
      console.error('Supabase initialization failed:', error);
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Find user by phone or email - optimized query (select only needed fields)
    console.log('Attempting to find user in database...');
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, phone, name, password_hash, is_admin, is_active, profile_completed')
      .or(`phone.eq.${identifier},email.eq.${identifier}`);

    if (userError) {
      console.error('Database error when finding user:', userError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!users || users.length === 0) {
      console.log('User not found for identifier');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    console.log('User found, verifying password...');

    // Verify password (handle users without password hash gracefully)
    if (!user.password_hash) {
      console.log('User has no password hash');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    let isValidPassword;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('bcrypt compare error:', bcryptError);
      return res.status(500).json({ error: 'Password verification error' });
    }
    
    if (!isValidPassword) {
      console.log('Password verification failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.is_active) {
      console.log('User account is deactivated');
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    console.log('Creating session...');

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: sessionError } = await supabaseClient
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent']
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Update last login timestamp
    await supabaseClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Return only safe user data (exclude sensitive fields)
    const { password_hash, ...safeUser } = user;

    // Ensure profile_completed is included (default to true if not set)
    const userResponse = {
      ...safeUser,
      profile_completed: safeUser.profile_completed ?? true
    };

    return res.status(200).json({
      success: true,
      user: userResponse,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, password, name } = req.body;

    // Validate phone
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    // Validate password
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.errors[0] || 'Invalid password' 
      });
    }

    // Validate name
    if (!name || !isValidName(name)) {
      return res.status(400).json({ 
        error: 'Valid name is required (2-100 characters, letters only)' 
      });
    }

    const sanitizedName = sanitizeString(name.trim(), 100);

    // Check if user already exists
    const { data: existingUsers } = await getSupabase()
      .from('users')
      .select('id, phone_verified')
      .eq('phone', phone);

    const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (existingUser && existingUser.phone_verified) {
      return res.status(400).json({ error: 'User already exists and verified' });
    }

    let userId = existingUser?.id;

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user if doesn't exist
    if (!existingUser) {
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
        .select()
        .single();

      if (userError) {
        console.error('Failed to create user:', userError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      userId = newUser.id;
    } else {
      // Update existing unverified user with new password and name
      const { error: updateError } = await getSupabase()
        .from('users')
        .update({ 
          password_hash: passwordHash,
          name: sanitizedName
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Failed to update user password:', updateError);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      userId = existingUser.id;
    }

    // Create admin notification for new user signup (only for new users)
    if (!existingUser) {
      try {
        // TODO: Re-enable when adminNotificationService module resolution is fixed
        // await adminNotificationService.createUserSignupNotification(
        //   userId,
        //   name.trim(),
        //   phone
        // );
        console.log(`[Admin] User signup notification skipped (service temporarily disabled) - ${name.trim()}`);
      } catch (notificationError) {
        console.error('[Admin] Failed to create user signup notification:', notificationError);
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing verification codes for this user
    await getSupabase()
      .from('phone_verifications')
      .delete()
      .eq('user_id', userId);

    // Create new verification record
    const { error: verificationError } = await getSupabase()
      .from('phone_verifications')
      .insert({
        user_id: userId,
        phone,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent']
      });

    if (verificationError) {
      return res.status(500).json({ error: 'Failed to create verification' });
    }

    // Send WhatsApp verification
    try {
      console.log('Sending WhatsApp verification code to:', phone);
      const { DynamicWhatsAppService } = await import('./_utils/dynamicWhatsAppService');
      const whatsappService = new DynamicWhatsAppService();
      const result = await whatsappService.sendVerificationCode(phone, verificationCode);
      
      if (!result.success) {
        console.error('WhatsApp send failed:', result.error);
        // Don't fail the signup if WhatsApp fails, just log it
        console.log('Continuing with signup despite WhatsApp failure');
      } else {
        console.log('WhatsApp verification sent successfully');
      }
    } catch (whatsappError) {
      console.error('WhatsApp error:', whatsappError);
      // Don't fail the signup if WhatsApp fails
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to WhatsApp',
      user_id: userId,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleVerifyPhone(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, verification_code } = req.body;

    if (!user_id || !verification_code) {
      return res.status(400).json({ error: 'User ID and verification code are required' });
    }

    // Validate verification code format
    if (!isValidVerificationCode(verification_code)) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }

    // Find verification record
    const { data: verifications, error: verificationError } = await getSupabase()
      .from('phone_verifications')
      .select('id, user_id, phone, verification_code, expires_at, is_used, created_at')
      .eq('user_id', user_id)
      .eq('verification_code', verification_code)
      .eq('is_used', false);

    if (verificationError || !verifications || verifications.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const verification = verifications[0];

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark verification as used
    await getSupabase()
      .from('phone_verifications')
      .update({ 
        is_used: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    // Update user as phone verified
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update({ 
        phone_verified: true,
        phone_verified_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, phone, email, name, is_admin, is_active, phone_verified, profile_completed')
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to verify phone' });
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await getSupabase()
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent']
      });

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      user: user,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      next_step: 'complete_profile'
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCompleteProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, name, email } = req.body;

    if (!user_id || !name || !email) {
      return res.status(400).json({ error: 'User ID, name, and email are required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate name
    if (!isValidName(name)) {
      return res.status(400).json({ 
        error: 'Invalid name format (2-100 characters, letters only)' 
      });
    }

    const sanitizedName = sanitizeString(name.trim(), 100);

    // Update user profile (NO password update - already set during signup)
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update({
        name: sanitizedName,
        email: email.trim().toLowerCase(),
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, phone, email, name, is_admin, is_active, phone_verified, profile_completed')
      .single();

    if (userError) {
      console.error('Failed to complete profile:', userError);
      return res.status(500).json({ error: 'Failed to complete profile' });
    }

    // Update admin notification with actual user name
    try {
      // TODO: Re-enable when adminNotificationService module resolution is fixed
      // Find recent signup notifications for this user and update them
      // const notifications = await adminNotificationService.getAdminNotifications(50);
      // const userNotification = notifications.find(n => 
      //   n.type === 'new_user' && n.user_id === user_id
      // );
      
      // if (userNotification) {
      //   // Update the notification with actual name and better message
      //   await getSupabase()
      //     .from('admin_notifications')
      //     .update({
      //       title: 'Bang! ada yang DAFTAR akun nih!',
      //       message: `namanya ${name} nomor wanya ${user.phone}`,
      //       customer_name: name
      //     })
      //     .eq('id', userNotification.id);
      //   console.log('[Admin] Updated user signup notification with actual name');
      // }
      console.log('[Admin] Notification update skipped (service temporarily disabled)');
    } catch (notificationError) {
      console.error('[Admin] Failed to update user signup notification:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user: user
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdateProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone } = req.body;
    
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || req.body.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized. Session token required.' });
    }

    // Validate session and get user
    const { data: sessions, error: sessionError } = await getSupabase()
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessions) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session is expired
    if (new Date(sessions.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session has expired' });
    }

    const userId = sessions.user_id;

    // Validate input - at least one field must be provided
    if (!name && !email && !phone) {
      return res.status(400).json({ error: 'At least one field (name, email, or phone) must be provided' });
    }

    // Build update object dynamically
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined && name !== null) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined && email !== null) {
      if (!email.trim()) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updateData.email = email.trim().toLowerCase();
    }

    if (phone !== undefined && phone !== null) {
      if (phone.trim()) {
        // Phone is optional, but if provided, validate format
        updateData.phone = phone.trim();
      }
    }

    // Update user profile in database
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, phone, email, name, is_admin, is_active, phone_verified, profile_completed, created_at')
      .single();

    if (userError) {
      console.error('Failed to update user profile:', userError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleValidateSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_token } = req.body;

    if (!session_token) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    // Use database function for optimized validation (single query + auto-cleanup)
    const { data, error } = await getSupabase()
      .rpc('validate_session', { p_session_token: session_token });

    if (error) {
      console.error('Session validation error:', error);
      return res.status(500).json({ error: 'Session validation failed' });
    }

    // data is an array with single result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.valid) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: result.user_id,
        email: result.user_email,
        name: result.user_name,
        is_admin: result.is_admin
      }
    });
  } catch (error) {
    console.error('Validate session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_token, logout_all } = req.body;
    const authHeader = req.headers.authorization;
    const token = session_token || authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    // Get user_id from session before invalidating
    const { data: sessionData } = await getSupabase()
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', token)
      .maybeSingle();

    if (logout_all && sessionData?.user_id) {
      // Invalidate all sessions for this user
      await getSupabase()
        .from('user_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString()
        })
        .eq('user_id', sessionData.user_id);
      
      console.log(`[Auth] Logged out user ${sessionData.user_id} from all devices`);
    } else {
      // Invalidate only current session
      await getSupabase()
        .from('user_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString()
        })
        .eq('session_token', token);
    }

    return res.status(200).json({
      success: true,
      message: logout_all ? 'Logged out from all devices' : 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleWhatsAppConfirm(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, whatsapp, name } = req.body;

    if (!email || !whatsapp) {
      return res.status(400).json({ error: 'Email and WhatsApp number are required' });
    }

    // For now, return a basic response - this can be extended based on specific needs
    return res.status(200).json({
      success: true,
      message: 'WhatsApp confirmation initiated',
      data: { email, whatsapp, name }
    });
  } catch (error) {
    console.error('WhatsApp confirm error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Turnstile first visit verification removed - no longer used
