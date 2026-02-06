import React, { createContext, useContext, useEffect, useState } from 'react';
import { normalizeLoginIdentifier } from '../utils/phoneUtils';

interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
  avatarUrl?: string;
  phoneVerified: boolean;
  profileCompleted: boolean;
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
  signup: (phone: string, password: string, name?: string) => Promise<{error?: any; success?: boolean; userId?: string; message?: string}>;
  verifyPhone: (userId: string, code: string) => Promise<{error?: any; success?: boolean; user?: User; sessionToken?: string; nextStep?: string}>;
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
        
        // DEBUG: Auth initialization trace
        console.log('[AUTH DEBUG] initAuth started', {
          hasToken: !!storedToken,
          tokenPreview: storedToken ? storedToken.substring(0, 8) + '...' : null,
          hasUser: !!storedUser
        });

        if (storedToken && storedUser) {
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
      const mappedUser = {
        ...data.user,
        // snake_case -> camelCase
        isAdmin: data.user.is_admin ?? false,
        phoneVerified: data.user.phone_verified ?? false,
        profileCompleted: data.user.profile_completed ?? false,
        createdAt: data.user.created_at || data.user.createdAt || new Date().toISOString(),
        // Normalize common aliases
        name: data.user.name || data.user.full_name || data.user.username || '',
        email: data.user.email || data.user.user_email || '',
        phone: data.user.phone || data.user.whatsapp || data.user.phone_number || ''
      } as User;

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

  const signup = async (phone: string, password: string, name?: string) => {
    try {
      // Use comprehensive phone normalization
      const normalizedPhone = normalizeLoginIdentifier(phone);
      
      const response = await fetch('/api/auth?action=signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: normalizedPhone, 
          password, 
          name
        }),
      });

  const ct2 = response.headers.get('content-type') || '';
  const data = ct2.includes('application/json') ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        return { error: data.error || 'Signup failed' };
      }

      return { 
        success: true, 
        userId: data.user_id,
        message: data.message
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const verifyPhone = async (userId: string, code: string) => {
    try {
      const response = await fetch('/api/auth?action=verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, verification_code: code }),
      });

  const ct3 = response.headers.get('content-type') || '';
  const data = ct3.includes('application/json') ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        return { error: data.error || 'Verification failed' };
      }

      // Map backend field names to frontend
      const mappedUser = {
        ...data.user,
        isAdmin: data.user.is_admin ?? false,
        phoneVerified: data.user.phone_verified ?? false,
        profileCompleted: data.user.profile_completed ?? false,
        createdAt: data.user.created_at || data.user.createdAt || new Date().toISOString(),
        name: data.user.name || data.user.full_name || data.user.username || '',
        email: data.user.email || data.user.user_email || '',
        phone: data.user.phone || data.user.whatsapp || data.user.phone_number || ''
      } as User;

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
        nextStep: data.next_step
      };
    } catch (error) {
      console.error('Verification error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

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

      // Map backend field names to frontend and update user data with completed profile
      const mappedUser = {
        ...user,
        ...data.user,
        isAdmin: data.user.is_admin ?? false,
        phoneVerified: data.user.phone_verified ?? false,
        profileCompleted: true,
        createdAt: data.user.created_at || user.createdAt || new Date().toISOString(),
        name: data.user.name || data.user.full_name || name || user.name || '',
        email: data.user.email || email || user.email || '',
        phone: data.user.phone || data.user.whatsapp || user.phone || ''
      } as User;
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
          // Map backend field names to frontend
          const mappedUser = {
            ...data.user,
            isAdmin: data.user.is_admin ?? false,
            phoneVerified: data.user.phone_verified ?? false,
            profileCompleted: data.user.profile_completed ?? false,
            createdAt: data.user.created_at || data.user.createdAt || new Date().toISOString(),
            name: data.user.name || data.user.full_name || data.user.username || '',
            email: data.user.email || data.user.user_email || '',
            phone: data.user.phone || data.user.whatsapp || data.user.phone_number || ''
          } as User;
          // Update user data with latest from server
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
    verifyPhone,
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
