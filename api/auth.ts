import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
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

// In-memory rate limiter
const rateLimit = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || (now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS)) {
    rateLimit.set(ip, { count: 1, lastAttempt: now });
    return true;
  } else {
    entry.count++;
    entry.lastAttempt = now; // Update last attempt time
    rateLimit.set(ip, entry);
    return entry.count <= MAX_REQUESTS_PER_WINDOW;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;
  
  // Set cache headers - no caching for auth endpoints (sensitive data)
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // Early environment check to prevent framework HTML 500s
    try {
      getSupabase(); // This will throw if env vars are missing
    } catch (error) {
      console.error('Auth API misconfiguration:', error);
      return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
    }

    const { action } = req.query;
    const clientIp = getClientIP(req);

    // Apply rate limit to specific actions
    if (action === 'signup' || action === 'verify-phone') {
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
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

    // Find user by phone or email
    console.log('Attempting to find user in database...');
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, phone, name, password_hash, is_admin, is_active, created_at, profile_completed')
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

    // Update last login
    await supabaseClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const { password_hash, login_attempts, locked_until, ...safeUser } = user;

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

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

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
          name: name.trim(),
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
          name: name.trim()
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
      .select()
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

    const { password_hash, login_attempts, locked_until, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      user: safeUser,
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Update user profile (NO password update - already set during signup)
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .update({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
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

    const { password_hash, login_attempts, locked_until, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user: safeUser
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

    const { data: sessions, error: sessionError } = await getSupabase()
      .from('user_sessions')
      .select(`
        *,
        users (
          id, phone, email, name, is_admin, is_active, 
          phone_verified, profile_completed
        )
      `)
      .eq('session_token', session_token)
      .eq('is_active', true);

    if (sessionError || !sessions || sessions.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const session = sessions[0];

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    return res.status(200).json({
      success: true,
      user: session.users
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
    const { session_token } = req.body;

    if (session_token) {
      await getSupabase()
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', session_token);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
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
