import { supabase } from './supabase';

export type UserProfile = {
  name?: string;
  email?: string;
  phone?: string;
};

// Optimized in-memory cache for auth state - reduces localStorage thrashing
// ISO 27001 compliant: Minimize sensitive data exposure time
interface AuthCacheState {
  profile: UserProfile | null;
  isLoggedIn: boolean | null;
  userId: string | null;
  role: string | null;
  lastCheck: number;
  sessionExpiry: number | null;
}

const authCache: AuthCacheState = {
  profile: null,
  isLoggedIn: null,
  userId: null,
  role: null,
  lastCheck: 0,
  sessionExpiry: null
};

// Reduced TTL for better security (10s instead of 30s)
const CACHE_TTL = 10 * 1000;

function isCacheValid(): boolean {
  const now = Date.now();
  const cacheAge = now - authCache.lastCheck;
  
  // Cache invalid if:
  // 1. TTL expired
  // 2. Session expiry time passed
  if (cacheAge >= CACHE_TTL) return false;
  if (authCache.sessionExpiry && now >= authCache.sessionExpiry) return false;
  
  return authCache.lastCheck > 0;
}

function clearAuthCache(): void {
  authCache.profile = null;
  authCache.isLoggedIn = null;
  authCache.userId = null;
  authCache.role = null;
  authCache.lastCheck = 0;
  authCache.sessionExpiry = null;
}

// Batch localStorage reads to minimize I/O
function getAuthDataBatch(): { token: string | null; userData: string | null; expires: string | null } {
  return {
    token: localStorage.getItem('session_token'),
    userData: localStorage.getItem('user_data'),
    expires: localStorage.getItem('session_expires')
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (isCacheValid() && authCache.profile !== null) {
    return authCache.profile;
  }

  try {
    const { userData } = getAuthDataBatch();
    
    if (userData) {
      const user = JSON.parse(userData);
      const profile: UserProfile = {
        name: user.name || undefined,
        email: user.email || undefined,
        phone: user.phone || undefined,
      };
      
      authCache.profile = profile;
      authCache.lastCheck = Date.now();
      return profile;
    }
    
    authCache.profile = null;
    authCache.lastCheck = Date.now();
    return null;
  } catch (error) {
    console.error('[authService] Failed to parse user data:', error);
    authCache.profile = null;
    authCache.lastCheck = Date.now();
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  if (isCacheValid() && authCache.isLoggedIn !== null) {
    return authCache.isLoggedIn;
  }

  try {
    const { token, userData, expires } = getAuthDataBatch();
    
    // All three must exist for valid session
    if (!token || !userData || !expires) {
      authCache.isLoggedIn = false;
      authCache.lastCheck = Date.now();
      return false;
    }
    
    // Validate session expiry
    const expiresAt = new Date(expires);
    const now = new Date();
    const isValid = expiresAt > now;
    
    if (isValid) {
      // Store expiry in cache for faster subsequent checks
      authCache.sessionExpiry = expiresAt.getTime();
    } else {
      // Clear expired session data
      authCache.sessionExpiry = null;
    }
    
    authCache.isLoggedIn = isValid;
    authCache.lastCheck = Date.now();
    return isValid;
  } catch (error) {
    console.error('[authService] Session validation error:', error);
    authCache.isLoggedIn = false;
    authCache.lastCheck = Date.now();
    return false;
  }
}

export function setLocalUserProfile(profile: UserProfile) {
  localStorage.setItem('user_profile', JSON.stringify(profile));
}

export async function getAuthUserId(): Promise<string | null> {
  if (isCacheValid() && authCache.userId !== null) {
    return authCache.userId;
  }

  try {
    const { userData } = getAuthDataBatch();
    
    if (userData) {
      const user = JSON.parse(userData);
      const userId = user.id || null;
      authCache.userId = userId;
      authCache.lastCheck = Date.now();
      return userId;
    }
    
    authCache.userId = null;
    authCache.lastCheck = Date.now();
    return null;
  } catch (error) {
    console.error('[authService] Failed to get user ID:', error);
    authCache.userId = null;
    authCache.lastCheck = Date.now();
    return null;
  }
}

export async function getUserRole(): Promise<string> {
  if (isCacheValid() && authCache.role !== null) {
    return authCache.role;
  }

  try {
    const { userData } = getAuthDataBatch();
    
    if (!userData) {
      authCache.role = 'guest';
      authCache.lastCheck = Date.now();
      return 'guest';
    }
    
    const user = JSON.parse(userData);
    
    // Normalize role determination
    let role = 'guest';
    if (user.isAdmin || user.is_admin) {
      role = 'admin';
    } else if (user.id) {
      role = 'user';
    }
    
    authCache.role = role;
    authCache.lastCheck = Date.now();
    return role;
  } catch (error) {
    console.error('[authService] Failed to get user role:', error);
    authCache.role = 'guest';
    authCache.lastCheck = Date.now();
    return 'guest';
  }
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  const r = String(role).toLowerCase().trim().replace(/\s+/g, ' ');
  const allowed = ['admin', 'superadmin', 'super-admin', 'super admin', 'owner'];
  return allowed.includes(r);
}

export async function logout(): Promise<void> {
  try {
    // Clear our custom auth session data
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('session_expires');
    localStorage.removeItem('user_profile'); // Legacy cleanup
    
    // Clear auth cache
    clearAuthCache();
  } catch {}
}
