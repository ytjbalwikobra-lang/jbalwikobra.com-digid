import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { normalizeLoginIdentifier } from '../utils/phoneUtils';
import { supabase } from '../services/supabase';

interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
  role?: string;
  avatarUrl?: string;
  phoneVerified: boolean;
  profileCompleted: boolean;
  authProvider?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  notificationPreferences?: {
    whatsapp: boolean;
    email: boolean;
  };
  lastLoginAt?: string;
  createdAt: string;
}

interface Session {
  expiresAt: string;
  lastActivity: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{error?: any; success?: boolean; user?: User; sessionToken?: string; profileCompleted?: boolean}>;
  signup: (email: string, password: string, name: string) => Promise<{error?: any; success?: boolean; user?: User; sessionToken?: string}>;
  loginWithGoogle: () => Promise<{error?: any; success?: boolean}>;
  completeProfile: (email: string, name: string) => Promise<{error?: any; success?: boolean; user?: User}>;
  logout: (logoutAll?: boolean) => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('session_token');
        const storedUser = localStorage.getItem('user_data');
        
        // Deteksi apakah ini OAuth callback — jika ya, jangan restore session lama
        // agar tidak trigger redirect sebelum OAuth selesai
        const hashHasOAuth = window.location.hash.includes('access_token') ||
          window.location.hash.includes('refresh_token') ||
          new URLSearchParams(window.location.search).has('code');
        
        // DEBUG: Auth initialization trace
        console.log('[AUTH DEBUG] initAuth started', {
          hasToken: !!storedToken,
          tokenPreview: storedToken ? storedToken.substring(0, 8) + '...' : null,
          hasUser: !!storedUser,
          isOAuthCallback: hashHasOAuth
        });

        // Jika ini OAuth callback, skip restore — biarkan onAuthStateChange yang handle
        if (hashHasOAuth) {
          console.log('[AUTH DEBUG] OAuth callback detected, skipping session restore');
        } else if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('[AUTH DEBUG] Stored user data:', { id: userData.id, isAdmin: userData.isAdmin, name: userData.name });
          
          // Validate session
          const isValid = await validateSession(storedToken);
          console.log('[AUTH DEBUG] Session validation result:', isValid);
          
          if (isValid) {
            setUser(userData);
            setSession({
              expiresAt: localStorage.getItem('session_expires') || '',
              lastActivity: new Date().toISOString()
            });
            console.log('[AUTH DEBUG] ✅ User authenticated successfully');
          } else {
            // Clear invalid session
            console.log('[AUTH DEBUG] ❌ Session invalid, clearing localStorage');
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('session_expires');
          }
        } else {
          console.log('[AUTH DEBUG] No stored credentials found');
        }
      } catch (error) {
        console.error('[AUTH DEBUG] Auth initialization error:', error);
      } finally {
        setLoading(false);
        console.log('[AUTH DEBUG] initAuth complete, loading=false');
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      // Use comprehensive phone normalization
      const normalizedIdentifier = normalizeLoginIdentifier(identifier);

      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier: normalizedIdentifier, 
          password
        }),
      });
      // Some hosts return HTML on 500; guard JSON parsing
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        return { error: data.error || 'Login failed' };
      }

      // Map backend field names to frontend (robust mapping)
      const mappedUser = mapBackendUser(data.user);

      // Store session data
      localStorage.setItem('session_token', data.session_token);
      localStorage.setItem('user_data', JSON.stringify(mappedUser));
      localStorage.setItem('session_expires', data.expires_at);

      // Update state
      setUser(mappedUser);
      setSession({
        expiresAt: data.expires_at,
        lastActivity: new Date().toISOString()
      });

      return { 
        success: true, 
        user: mappedUser, 
        sessionToken: data.session_token,
        profileCompleted: mappedUser.profileCompleted
      };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/auth?action=signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const ct2 = response.headers.get('content-type') || '';
      const data = ct2.includes('application/json') ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        return { error: data.error || 'Signup failed' };
      }

      // Map backend field names ke frontend
      const mappedUser = mapBackendUser(data.user);

      // Simpan session data (signup langsung dapat session tanpa verifikasi WA)
      localStorage.setItem('session_token', data.session_token);
      localStorage.setItem('user_data', JSON.stringify(mappedUser));
      localStorage.setItem('session_expires', data.expires_at);

      setUser(mappedUser);
      setSession({
        expiresAt: data.expires_at,
        lastActivity: new Date().toISOString()
      });

      return { 
        success: true, 
        user: mappedUser,
        sessionToken: data.session_token
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  /**
   * Login dengan Google OAuth via Supabase Auth
   * Flow: signInWithOAuth → redirect ke Google → callback ke Supabase → redirect kembali
   */
  const loginWithGoogle = async () => {
    try {
      if (!supabase) {
        return { error: 'Supabase client not initialized' };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        return { error: error.message };
      }

      // Redirect terjadi otomatis — tidak perlu return success
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { error: 'Failed to initiate Google login' };
    }
  };

  // Helper: Map backend user fields ke frontend
  const mapBackendUser = useCallback((backendUser: any): User => ({
    ...backendUser,
    isAdmin: backendUser.is_admin ?? false,
    role: backendUser.role || (backendUser.is_admin ? 'super_admin' : 'user'),
    phoneVerified: backendUser.phone_verified ?? false,
    profileCompleted: backendUser.profile_completed ?? false,
    authProvider: backendUser.auth_provider || 'email',
    avatarUrl: backendUser.avatar_url || '',
    createdAt: backendUser.created_at || backendUser.createdAt || new Date().toISOString(),
    name: backendUser.name || backendUser.full_name || backendUser.username || '',
    email: backendUser.email || backendUser.user_email || '',
    phone: backendUser.phone || backendUser.phone_number || ''
  }), []);

  // Handle Google OAuth callback
  // Supabase Auth redirect bisa ke URL manapun (implicit flow: #access_token=... di hash)
  // Deteksi: jika ada hash OAuth token → selalu proses, abaikan stale session
  useEffect(() => {
    if (!supabase) return;

    let processed = false;

    // Deteksi apakah URL saat ini mengandung OAuth callback hash
    const isOAuthCallback = window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token') ||
      new URLSearchParams(window.location.search).has('code');

    // Jika ini OAuth callback, hapus stale session tokens dulu agar tidak mengganggu
    if (isOAuthCallback) {
      console.log('[Auth] OAuth callback detected in URL, clearing stale session if any');
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('session_expires');
    }

    const processOAuthSession = async (authSession: { access_token: string }) => {
      if (processed || !authSession?.access_token) return;

      // Cek apakah sudah punya custom session (bukan OAuth callback)
      // Hanya skip jika BUKAN OAuth callback — karena OAuth callback sudah hapus stale tokens di atas
      const existingToken = localStorage.getItem('session_token');
      if (existingToken && !isOAuthCallback) {
        // Sudah login dengan custom session, cleanup Supabase session saja
        console.log('[Auth] Custom session exists, cleaning up Supabase session');
        await supabase?.auth.signOut();
        return;
      }

      processed = true;
      console.log('[Auth] OAuth session detected, processing...');

      try {
        // Kirim access_token ke backend untuk buat/link custom user + custom session
        const response = await fetch('/api/auth?action=google-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: authSession.access_token }),
        });

        const ct = response.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await response.json() : { error: await response.text() };

        if (!response.ok) {
          console.error('[Auth] Google callback failed:', data.error);
          await supabase?.auth.signOut();
          return;
        }

        // Map dan simpan user data (custom session, bukan Supabase session)
        const mappedUser = mapBackendUser(data.user);
        localStorage.setItem('session_token', data.session_token);
        localStorage.setItem('user_data', JSON.stringify(mappedUser));
        localStorage.setItem('session_expires', data.expires_at);

        setUser(mappedUser);
        setSession({
          expiresAt: data.expires_at,
          lastActivity: new Date().toISOString()
        });

        console.log('[Auth] OAuth login success:', mappedUser.name);

        // Sign out dari Supabase Auth (kita pakai custom session)
        await supabase?.auth.signOut();

        // Bersihkan hash fragment dari URL (implicit flow meninggalkan #access_token=...)
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('[Auth] OAuth processing error:', err);
        await supabase?.auth.signOut();
      }
    };

    // Listen untuk Supabase Auth session events (handles implicit + PKCE)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, 'hasSession:', !!session);
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          await processOAuthSession(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [mapBackendUser]);

  const completeProfile = async (email: string, name: string) => {
    try {
      const userData = localStorage.getItem('user_data');
      
      if (!userData) {
        return { error: 'Please login first' };
      }

      const user = JSON.parse(userData);
      
      const response = await fetch('/api/auth?action=complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user.id, 
          email, 
          name
          // Note: password removed - already set during signup
        }),
      });

  const ct4 = response.headers.get('content-type') || '';
  const data = ct4.includes('application/json') ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        return { error: data.error || 'Profile completion failed' };
      }

      // Map backend field names to frontend dan update user data
      const mappedUser = mapBackendUser({ ...user, ...data.user, profileCompleted: true });
      localStorage.setItem('user_data', JSON.stringify(mappedUser));
      setUser(mappedUser);

      return { 
        success: true, 
        user: mappedUser
      };
    } catch (error) {
      console.error('Profile completion error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const logout = async (logoutAll = false) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      if (sessionToken) {
        await fetch('/api/auth?action=logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ logout_all: logoutAll }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API success
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('session_expires');
      setUser(null);
      setSession(null);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      if (!sessionToken) {
        return false;
      }

      const isValid = await validateSession(sessionToken);
      
      if (!isValid) {
        await logout();
        return false;
      }

      // Update last activity
      setSession(prev => prev ? {
        ...prev,
        lastActivity: new Date().toISOString()
      } : null);

      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  const validateSession = async (token: string): Promise<boolean> => {
    console.log('[AUTH DEBUG] validateSession called with token:', token.substring(0, 8) + '...');
    try {
      const response = await fetch('/api/auth?action=validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_token: token }),
      });
      
      console.log('[AUTH DEBUG] validate-session response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[AUTH DEBUG] validate-session response data:', {
          success: data.success,
          hasUser: !!data.user,
          isAdmin: data.user?.is_admin
        });
        
        if (data.success && data.user) {
          // Map backend field names ke frontend (menggunakan helper)
          const mappedUser = mapBackendUser(data.user);
          // Update user data dengan latest dari server
          localStorage.setItem('user_data', JSON.stringify(mappedUser));
          setUser(mappedUser);
          console.log('[AUTH DEBUG] ✅ Session validated, mapped isAdmin:', mappedUser.isAdmin);
        }
        return true;
      }
      
      console.log('[AUTH DEBUG] ❌ validate-session failed with status:', response.status);
      return false;
    } catch (error) {
      console.error('[AUTH DEBUG] Session validation error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    login,
    signup,
    loginWithGoogle,
    completeProfile,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
