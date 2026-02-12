# Analisis Komprehensif: Flow Login, Sign Up, dan Profile

**Tanggal Analisis:** 31 Desember 2025  
**Terakhir Diupdate:** 13 Februari 2026 (Auth Revamp V2 — Google OAuth)  
**Repository:** jbalwikobra.com-digid  
**Branch:** Production

---

## 📋 Executive Summary

> **UPDATE Feb 2026:** Auth system dirombak total. WhatsApp OTP dihapus, Google OAuth ditambahkan.

Aplikasi menggunakan **hybrid authentication system**:
1. **Google OAuth** — Login via Google menggunakan Supabase Auth sebagai OAuth provider
2. **Email + Password** — Signup dan login tradisional berbasis email
3. **Custom Session** — Semua metode login menghasilkan `session_token` custom (bukan Supabase Auth session)

**Supabase Auth** digunakan HANYA sebagai OAuth relay untuk Google login. Setelah access_token didapat, custom session dibuat dan Supabase Auth session langsung di-signOut.

**Status Kondisi:**
- ✅ Login flow: **Google OAuth + Email/Password**
- ✅ Signup flow: **Email-first (tanpa WhatsApp OTP)**
- ✅ Profile management: **Basic implementation dengan caching**
- ✅ Custom session system: session_token di localStorage → validate_session() RPC
- ❌ WhatsApp login/signup: **DIHAPUS** (Feb 2026)
- ❌ Phone verification: **DIHAPUS** (Feb 2026)
- ❌ Individual WA notifications: **DIHAPUS** (Feb 2026, grup WA tetap aktif)

---

## 🔐 1. LOGIN FLOW

### 1.1 Arsitektur Login (Feb 2026 — Revamped)

#### A. Google OAuth Login

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                          │
│                                                             │
│  TraditionalAuthPage.tsx                                   │
│  └─ Google OAuth Button                                    │
│     └─ onClick → loginWithGoogle()                         │
│                                                             │
│  TraditionalAuthContext.tsx → loginWithGoogle()             │
│  └─ supabase.auth.signInWithOAuth({                        │
│       provider: 'google',                                  │
│       redirectTo: '${origin}/auth?callback=google'         │
│     })                                                      │
└─────────────────────────────────────────────────────────────┘
              ↓ Browser redirect
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE OAUTH + SUPABASE AUTH                   │
│                                                             │
│  1. Browser → Google OAuth consent screen                  │
│  2. Google → Supabase callback                             │
│     (https://xxx.supabase.co/auth/v1/callback)             │
│  3. Supabase → PKCE code exchange                          │
│  4. Redirect ke: /auth?callback=google&code=xxx            │
└─────────────────────────────────────────────────────────────┘
              ↓ Page reload
┌─────────────────────────────────────────────────────────────┐
│              CALLBACK HANDLER (Context useEffect)           │
│                                                             │
│  1. Detect ?callback=google di URL                         │
│  2. onAuthStateChange → tunggu PKCE code exchange selesai  │
│  3. Dapat Supabase Auth session (access_token)             │
│  4. POST /api/auth?action=google-callback                  │
│     {access_token}                                         │
│  5. Backend: validate token → find/create user →           │
│     create custom session                                  │
│  6. Simpan session_token di localStorage                   │
│  7. SignOut dari Supabase Auth (pakai custom session saja) │
│  8. Set user state → redirect ke home/admin                │
└─────────────────────────────────────────────────────────────┘
```

**PKCE Flow Note:** Supabase JS v2.58+ menggunakan PKCE flow by default.
Setelah OAuth redirect, URL mengandung `?code=xxx`. Supabase client
secara async menukar code ini menjadi session. Handler menggunakan
`onAuthStateChange` + `getSession()` fallback untuk menangkap session
yang sudah siap.

#### B. Email + Password Login

```
┌─────────────────────────────────────────────────────────────┐
│  TraditionalAuthPage.tsx                                   │
│  ├─ Email input                                             │
│  └─ Password input                                          │
│                                                             │
│  Context: TraditionalAuthContext.tsx                       │
│  └─ login(email, password)                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    POST /api/auth?action=login
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  api/auth.ts → handleLogin()                               │
│  ├─ 1. Validate input (identifier & password)              │
│  ├─ 2. Find user by phone OR email                         │
│  ├─ 3. Verify password (bcrypt)                            │
│  ├─ 4. Check account status (is_active)                    │
│  ├─ 5. Create session token (32 bytes crypto)              │
│  ├─ 6. Store session in user_sessions table                │
│  ├─ 7. Update last_login_at                                │
│  └─ 8. Return user data + session_token                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
              localStorage: session_token, user_data
```

### 1.2 Login Features

**Metode Login (Feb 2026):**
- ✅ **Google OAuth** (via Supabase Auth → custom session)
- ✅ **Email + Password**
- ❌ ~~Phone + Password~~ (masih bisa secara teknis, tapi UI sudah dihapus)
- ❌ ~~WhatsApp OTP~~ (DIHAPUS)

**Security Features:**
- ✅ Rate limiting (5 request/menit per IP untuk login, 10 untuk google-callback)
- ✅ Password hashing dengan bcrypt (10 rounds)
- ✅ Session expiry (7 hari)
- ✅ Account status check (is_active)
- ✅ Last login tracking
- ⚠️ Session token di localStorage (vulnerable to XSS)

**Validasi & Error Handling:**
```typescript
// api/auth.ts - handleLogin()
- Missing identifier/password → 400 Bad Request
- Invalid credentials → 401 Unauthorized
- Deactivated account → 403 Forbidden
- Turnstile verification fail → 400 Bad Request
- Database errors → 500 Internal Server Error
```

### 1.3 Phone Normalization

**Utils: `normalizeLoginIdentifier()`**
```typescript
// Supports formats:
- 08123456789 → +628123456789
- 628123456789 → +628123456789
- +628123456789 → +628123456789 (unchanged)
- 62-812-345-6789 → +628123456789 (strips dash)
```

### 1.4 Post-Login Flow

```typescript
// TraditionalAuthContext.tsx - login()
if (login success) {
  // 1. Store session data
  localStorage.setItem('session_token', data.session_token);
  localStorage.setItem('user_data', JSON.stringify(mappedUser));
  localStorage.setItem('session_expires', data.expires_at);
  
  // 2. Update context state
  setUser(mappedUser);
  setSession({ expiresAt, lastActivity });
  
  // 3. Check profile completion status
  if (!user.profileCompleted) {
    navigate('/auth?mode=complete');
  } else {
    // 4. Navigate to redirect URL or home
    const redirect = searchParams.get('redirect') || '/';
    navigate(redirect);
  }
  
  // 5. Track login analytics
  trackLogin(method); // GTM/GA4 tracking
}
```

---

## 📝 2. SIGN UP FLOW

### 2.1 Arsitektur Sign Up (Feb 2026 — Revamped)

> **PERUBAHAN BESAR:** Signup sekarang **1-step** (email-first), tanpa WhatsApp OTP.
> User juga bisa signup langsung via Google OAuth.

#### A. Google OAuth Signup

Sama dengan Google OAuth Login (Section 1.1A). Jika user belum ada di database,
backend otomatis membuat akun baru dengan `auth_provider: 'google'`.

#### B. Email + Password Signup (1-Step)

```
┌─────────────────────────────────────────────────────────────┐
│                   REGISTRATION (1-Step)                     │
│                                                             │
│  TraditionalAuthPage.tsx (mode='signup')                   │
│  ├─ Name input                                              │
│  ├─ Email input                                             │
│  ├─ Password input                                          │
│  └─ Confirm password                                        │
│                                                             │
│  Validations:                                               │
│  ├─ Name not empty                                          │
│  ├─ Email not empty                                         │
│  ├─ Password min 6 chars                                    │
│  └─ Password === confirmPassword                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    POST /api/auth?action=signup
                    {email, password, name}
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND: SIGNUP HANDLER                   │
│                                                             │
│  api/auth.ts → handleSignup()                              │
│  ├─ 1. Validate inputs                                      │
│  ├─ 2. Check if email already exists                        │
│  │     └─ If exists → Error                                 │
│  ├─ 3. Hash password (bcrypt)                               │
│  ├─ 4. Insert users table                                   │
│  │     ├─ profile_completed = true                          │
│  │     └─ auth_provider = 'email'                           │
│  ├─ 5. Create session token (langsung, tanpa verifikasi)    │
│  └─ 6. Return user + session_token                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
              localStorage: session_token, user_data
              → Redirect ke home (sudah login)
```

**Yang DIHAPUS dari signup (Feb 2026):**
- ❌ Phone input (WhatsApp number)
- ❌ Turnstile Captcha
- ❌ WhatsApp verification code (6-digit OTP)
- ❌ Mode 'verify' (phone verification step)
- ❌ `handleVerifyPhone()` di backend
- ❌ `DynamicWhatsAppService.sendVerificationCode()`
- ❌ `DynamicWhatsAppService.sendWelcomeMessage()`
- ❌ `phone_verifications` table (masih ada di DB, tidak digunakan)

### 2.2 Database Schema (Updated Feb 2026)

**Users Table (kolom baru):**
```sql
-- Kolom ditambahkan migration 067
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
```

### ~~2.3 WhatsApp Integration~~ (DIHAPUS Feb 2026)

> WhatsApp tidak lagi digunakan untuk auth. `sendVerificationCode()` dan
> `sendWelcomeMessage()` telah dihapus dari `DynamicWhatsAppService`.
> WhatsApp masih digunakan untuk **grup notification** (admin) saja.

---

### 2.OLD — Arsitektur Sign Up Lama (DEPRECATED)

<details>
<summary>Klik untuk melihat flow signup lama (sebelum Feb 2026)</summary>

Flow lama menggunakan 3-step process: Registration → Phone Verification → Profile Completion.
Menggunakan WhatsApp OTP via `DynamicWhatsAppService.sendVerificationCode()`.

Endpoint `verify-phone` sudah DIHAPUS dari backend.

</details>

### 2.x Profile Completion (Simplified)

Profile completion sekarang hanya untuk kasus edge (misal: user lama yang belum lengkap).

```
  TraditionalAuthPage.tsx (mode='complete')
  └─ Email input
```

POST `/api/auth?action=complete-profile` → update user → return updated data.

---

## 📡 3. API ENDPOINTS (Updated Feb 2026)

| Action | Method | Deskripsi |
|---|---|---|
| `login` | POST | Login email/password |
| `signup` | POST | Signup email-first (langsung dapat session) |
| `google-callback` | POST | Proses Google OAuth access_token → custom session |
| `validate-session` | POST | Validasi session_token |
| `logout` | POST | Logout (single/all devices) |
| `complete-profile` | POST | Lengkapi profil user |
| `update-profile` | POST | Update profil user |
| ~~`verify-phone`~~ | ~~POST~~ | ~~DIHAPUS (Feb 2026)~~ |
│  │     ├─ password_hash = new hash                          │
│  │     ├─ profile_completed = true                          │
│  │     └─ profile_completed_at = now                        │
│  └─ 4. Return updated user data                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    SUCCESS: Navigate to app
```

### 2.2 Database Schema

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMP,
  profile_completed BOOLEAN DEFAULT false,
  profile_completed_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Phone Verifications Table:**
```sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  phone VARCHAR(20) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**User Sessions Table:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 WhatsApp Integration

**Service: `DynamicWhatsAppService`**
```typescript
// api/_utils/dynamicWhatsAppService.ts
sendVerificationCode(phone: string, code: string) {
  // Format pesan:
  "Kode verifikasi JBal Wikobra: {code}
   Berlaku 15 menit. Jangan bagikan kode ini."
  
  // Kirim via WhatsApp API (Fonnte/Twilio/custom)
}
```

**Error Handling:**
- WhatsApp send failure **tidak menggagalkan signup**
- Verification code tetap disimpan di database
- User bisa request resend (implementasi manual via admin)

### 2.4 Sign Up Validations

**Frontend:**
```typescript
// TraditionalAuthPage.tsx - handleSignup()
- name.trim() !== '' → "Nama wajib diisi"
- phone.trim() !== '' → "Nomor HP wajib diisi"
- password.length >= 6 → "Password minimal 6 karakter"
- password === confirmPassword → "Password tidak cocok"
- turnstileToken (jika enabled) → "Selesaikan captcha"
```

**Backend:**
```typescript
// api/auth.ts - handleSignup()
- Rate limit: 5 requests/minute per IP
- Phone already verified → "User already exists and verified"
- Duplicate unverified users → Update existing record
```

### 2.5 Analytics Tracking

```typescript
// After successful signup
trackSignUp('phone'); // GTM/GA4 event

// Event structure:
{
  event: 'sign_up',
  method: 'phone',
  user_id: userId // (if available)
}
```

---

## 👤 3. PROFILE MANAGEMENT

### 3.1 Profile Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PROFILE PAGE                              │
│                                                             │
│  ProfilePage.tsx                                            │
│  ├─ User Info Display                                       │
│  │  ├─ Name                                                 │
│  │  ├─ Email                                                │
│  │  ├─ WhatsApp number                                      │
│  │  └─ Join date                                            │
│  │                                                           │
│  ├─ Statistics                                              │
│  │  ├─ Total orders (from Supabase)                        │
│  │  └─ Wishlist count (from WishlistContext)               │
│  │                                                           │
│  ├─ Recent Orders (last 3)                                  │
│  │  └─ Fetch from Supabase orders table                    │
│  │                                                           │
│  └─ Quick Actions                                           │
│     ├─ Edit Profile (toggle edit mode)                      │
│     ├─ View Orders (/orders)                                │
│     ├─ Wishlist (/wishlist)                                 │
│     ├─ Settings (/settings)                                 │
│     └─ Logout (with confirmation)                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Profile Data Sources

**Multiple Sources (Legacy Compatibility):**

```typescript
// 1. PRIMARY: TraditionalAuthContext
user: {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  createdAt: string;
}

// 2. SECONDARY: enhancedAuthService
getCurrentUserProfile() → {
  name?: string;
  email?: string;
  phone?: string;
}

// 3. FALLBACK: localStorage
- user_data (from login response)
- user_profile (legacy key)
```

### 3.3 Profile Loading Strategy

```typescript
// ProfilePage.tsx - loadProfile()
const loadProfile = async () => {
  try {
    // 1. Try unified auth service (with caching)
    const current = await enhancedAuthService.getCurrentUserProfile();
    
    // 2. Merge with context user data
    const name = current?.name ?? user?.name ?? '';
    const email = current?.email ?? user?.email ?? '';
    const phone = current?.phone ?? user?.phone ?? '';
    
    // 3. Update profile state
    setProfile({
      name,
      email,
      whatsapp: phone,
      joinDate: user?.createdAt 
        ? new Date(user.createdAt).toLocaleDateString('id-ID')
        : new Date().toLocaleDateString('id-ID'),
      totalOrders: 0, // Fetched separately
      wishlistCount: wishlistItems.length
    });
    
  } catch (e) {
    // 4. FALLBACK: Try legacy localStorage keys
    const legacy = localStorage.getItem('user_profile');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      setProfile(prev => ({ ...prev, ...parsed }));
    }
  }
};
```

### 3.4 Profile Update Flow

```typescript
// ProfilePage.tsx - saveProfile()
const saveProfile = async () => {
  // 1. Validation
  if (!profile.name.trim() || !profile.email.trim()) {
    showToast('Nama dan email wajib diisi', 'error');
    return;
  }
  
  if (profile.whatsapp && !isValidPhone) {
    showToast('Nomor WhatsApp tidak valid', 'error');
    return;
  }
  
  // 2. Confirmation modal
  const confirmed = await confirm({
    title: 'Simpan Perubahan',
    message: 'Yakin ingin menyimpan perubahan profil?'
  });
  
  if (confirmed) {
    try {
      // 3. Update via enhanced auth service
      await enhancedAuthService.updateProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.whatsapp
      });
      
      // 4. Update localStorage (unified cache)
      localStorage.setItem('user_profile', JSON.stringify({
        name: profile.name,
        email: profile.email,
        phone: profile.whatsapp
      }));
      
      // 5. Exit edit mode
      setIsEditing(false);
      showToast('Profil berhasil disimpan', 'success');
      
    } catch (e) {
      // Fallback: Save to localStorage only
      localStorage.setItem('user_profile', JSON.stringify({...}));
      showToast('Profil disimpan secara lokal', 'info');
    }
  }
};
```

**⚠️ PERHATIAN:** 
- Profile update **TIDAK** menyentuh database Supabase
- Hanya update localStorage (`user_profile` key)
- Tidak ada API endpoint untuk update profile
- Data profile di database hanya diupdate saat:
  - Sign up (handleSignup)
  - Profile completion (handleCompleteProfile)
  - Login (last_login_at only)

### 3.5 Enhanced Auth Service (Caching Layer)

```typescript
// src/services/enhancedAuthService.ts
export class EnhancedAuthService {
  private config: {
    profileTTL: 2 * 60 * 1000, // 2 minutes cache
    roleTTL: 5 * 60 * 1000,    // 5 minutes cache
    secureMode: true           // Always fetch fresh in secure mode
  };
  
  // Cache tags for invalidation
  private static readonly CACHE_TAGS = {
    USER_PROFILE: 'user-profile',
    USER_ROLE: 'user-role',
    AUTH_STATE: 'auth-state',
    PERMISSIONS: 'permissions'
  };
  
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (!this.config.secureMode) {
      // Use short-term caching (2 min)
      return globalCache.getOrSet(
        'auth:current-user-profile',
        () => BaseAuthService.getCurrentUserProfile(),
        { ttl: this.config.profileTTL }
      );
    } else {
      // Secure mode: always fresh (default)
      return BaseAuthService.getCurrentUserProfile();
    }
  }
  
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    // Note: Base auth service doesn't have updateProfile
    // Just update localStorage
    BaseAuthService.setLocalUserProfile(updates as UserProfile);
    
    // Invalidate caches
    globalCache.invalidateByTags([CACHE_TAGS.USER_PROFILE]);
    
    return updates as UserProfile;
  }
}
```

### 3.6 Profile Features

**View Mode:**
- ✅ Display user information
- ✅ Show total orders count (real-time from Supabase)
- ✅ Show wishlist count (from WishlistContext)
- ✅ Display recent orders (last 3)
- ✅ Quick action buttons

**Edit Mode:**
- ✅ Edit name
- ✅ Edit email
- ✅ Edit WhatsApp number (with validation)
- ✅ Phone input formatting
- ✅ Confirmation before save
- ⚠️ **NO password change feature**
- ⚠️ **NO avatar upload feature**

**Missing Features:**
- ❌ Change password
- ❌ Upload profile picture/avatar
- ❌ Update profile to database (only localStorage)
- ❌ Email verification
- ❌ Two-factor authentication
- ❌ Connected accounts/social login

---

## 🔧 4. AUTHENTICATION CONTEXTS

### 4.1 Dual Context System

**Context 1: `TraditionalAuthContext.tsx` (PRIMARY)**
```typescript
// Used by: Main app, user authentication
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (identifier, password, turnstileToken) => Promise<Result>;
  signup: (phone, password, name, turnstileToken) => Promise<Result>;
  verifyPhone: (userId, code) => Promise<Result>;
  completeProfile: (email, name, password) => Promise<Result>;
  logout: (logoutAll?) => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

// Usage:
import { useAuth } from '../contexts/TraditionalAuthContext';
const { user, login, logout } = useAuth();
```

**Context 2: `AuthContext.tsx` (LEGACY/UNUSED)**
```typescript
// Used by: Legacy components (mostly unused)
// Based on Supabase Auth (not active)
interface AuthContextType {
  user: User | null;  // Supabase User type
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email, password) => Promise<Result>;
  signUp: (email, password, whatsapp?) => Promise<Result>;
}

// NOTE: Masih ada import di beberapa file tapi tidak aktif
```

**⚠️ MASALAH:**
- Ada 2 `AuthContext` dengan nama berbeda
- Bisa membingungkan: `useAuth()` bisa refer ke 2 context berbeda
- Legacy `AuthContext.tsx` masih ada tapi tidak digunakan
- Perlu cleanup atau unifikasi

### 4.2 Session Management

**Session Creation:**
```typescript
// api/auth.ts - handleLogin/handleVerifyPhone
const sessionToken = generateSessionToken(); // 32 bytes crypto
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

await supabase
  .from('user_sessions')
  .insert({
    user_id: user.id,
    session_token: sessionToken,
    expires_at: expiresAt,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent']
  });
```

**Session Validation:**
```typescript
// api/auth.ts - handleValidateSession
POST /api/auth?action=validate-session
Body: { session_token: string }

Response:
- Valid: { success: true, user: {...} }
- Invalid: { success: false }
```

**Session Refresh:**
```typescript
// TraditionalAuthContext.tsx - refreshSession()
const refreshSession = async (): Promise<boolean> => {
  const sessionToken = localStorage.getItem('session_token');
  const isValid = await validateSession(sessionToken);
  
  if (!isValid) {
    await logout();
    return false;
  }
  
  // Update last activity
  setSession(prev => ({
    ...prev,
    lastActivity: new Date().toISOString()
  }));
  
  return true;
};
```

**⚠️ SESSION SECURITY ISSUES:**
- Token disimpan di localStorage (vulnerable to XSS)
- Tidak ada HttpOnly cookie
- Tidak ada CSRF protection
- Session tidak auto-refresh before expiry
- Tidak ada remember me feature

---

## 🔐 5. SECURITY ANALYSIS

### 5.1 Security Features (Implemented)

✅ **Password Security:**
- bcrypt hashing (10 rounds)
- Minimum 6 characters
- Confirm password validation

✅ **Rate Limiting:**
- 5 requests/minute per IP
- Applied to signup & verify-phone endpoints
- In-memory implementation

✅ **Turnstile Captcha:**
- Cloudflare Turnstile integration
- Optional (works without if not configured)
- Applied to login & signup

✅ **Input Validation:**
- Server-side validation for all fields
- Phone normalization
- SQL injection prevention (Supabase client)

✅ **Session Management:**
- Unique session tokens (crypto.randomBytes)
- Session expiry (7 days)
- IP address & user agent tracking
- Multiple device support

### 5.2 Security Vulnerabilities

⚠️ **HIGH PRIORITY:**

1. **XSS Vulnerability via localStorage:**
   ```typescript
   // Current: Vulnerable
   localStorage.setItem('session_token', token);
   
   // Recommended: HttpOnly Cookie
   res.setHeader('Set-Cookie', `session_token=${token}; HttpOnly; Secure; SameSite=Strict`);
   ```

2. **No CSRF Protection:**
   - API endpoints tidak memerlukan CSRF token
   - Vulnerable to cross-site request forgery

3. **Password in Profile Completion:**
   ```typescript
   // handleCompleteProfile - password dishash ulang
   // Padahal user sudah set password saat signup
   // Ini membingungkan dan berpotensi overwrite
   ```

4. **Rate Limit Bypass:**
   ```typescript
   // In-memory rate limit tidak persistent
   // Bisa direset dengan restart server
   // Tidak ada distributed rate limiting (Redis)
   ```

⚠️ **MEDIUM PRIORITY:**

5. **No Email Verification:**
   - Email diinput tanpa verifikasi
   - Bisa input email palsu/typo

6. **Phone Verification Code:**
   - 6 digit code (1,000,000 combinations)
   - Tidak ada retry limit
   - Bisa bruteforce jika rate limit bypassed

7. **Session Without Rotation:**
   - Session token tidak rotate setelah privilege escalation
   - Tidak ada session invalidation saat password change

8. **Weak Error Messages:**
   ```typescript
   // Current: Gives information
   return res.status(401).json({ error: 'Invalid credentials' });
   
   // Better: Generic message
   return res.status(401).json({ error: 'Invalid email or password' });
   ```

⚠️ **LOW PRIORITY:**

9. **No Account Lockout:**
   - Unlimited login attempts
   - `login_attempts` & `locked_until` fields exist but not used

10. **No 2FA:**
    - Tidak ada two-factor authentication
    - WhatsApp verification hanya saat signup

### 5.3 Security Recommendations

**IMMEDIATE (High Priority):**
```typescript
1. Migrate to HttpOnly Cookies
   - Remove token from localStorage
   - Set secure cookies di server-side
   - Implement CSRF token validation

2. Implement Account Lockout
   - Lock account after 5 failed login attempts
   - 15 minute cooldown
   - Send notification email/WhatsApp

3. Add Email Verification
   - Send verification email after profile completion
   - Verify before allowing critical actions

4. Strengthen Rate Limiting
   - Use Redis for distributed rate limiting
   - Different limits for different endpoints
   - Progressive delays
```

**SHORT TERM (Medium Priority):**
```typescript
5. Session Rotation
   - Rotate token after login
   - Invalidate old sessions on password change
   - Implement "logout all devices"

6. Enhanced Phone Verification
   - Add retry limit (max 3 attempts)
   - Implement exponential backoff
   - Add "resend code" with cooldown

7. Security Headers
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

8. Audit Logging
   - Log all authentication events
   - Track failed login attempts
   - Monitor suspicious activities
```

---

## 📊 6. DATA FLOW DIAGRAM

### 6.1 Complete Authentication Flow

```
┌──────────────┐
│   Browser    │
│  (React App) │
└──────┬───────┘
       │
       │ User visits /auth
       ↓
┌──────────────────────────────────┐
│  TraditionalAuthPage.tsx         │
│  ┌────────────────────────────┐  │
│  │ Mode: login                │  │
│  │ - Email/Phone tab          │  │
│  │ - Password input           │  │
│  │ - Turnstile widget         │  │
│  └────────────────────────────┘  │
│                                   │
│  On submit:                       │
│  → login(identifier, password, token)
└──────┬────────────────────────────┘
       │
       │ POST /api/auth?action=login
       ↓
┌─────────────────────────────────────┐
│  Vercel Serverless Function         │
│  api/auth.ts                        │
│  ┌───────────────────────────────┐  │
│  │ handleLogin()                 │  │
│  │ 1. Validate input             │  │
│  │ 2. Verify Turnstile           │  │
│  │ 3. Find user (phone OR email) │  │
│  │ 4. Verify password (bcrypt)   │  │
│  │ 5. Create session             │  │
│  │ 6. Update last_login_at       │  │
│  └───────────────────────────────┘  │
│                                      │
│  Database queries:                   │
│  → users (SELECT, UPDATE)            │
│  → user_sessions (INSERT)            │
└──────┬───────────────────────────────┘
       │
       │ Response: {user, session_token, expires_at}
       ↓
┌──────────────────────────────────────┐
│  TraditionalAuthContext.tsx          │
│  ┌────────────────────────────────┐  │
│  │ login() receives response      │  │
│  │ 1. Map backend fields          │  │
│  │ 2. Store to localStorage       │  │
│  │    - session_token             │  │
│  │    - user_data                 │  │
│  │    - session_expires           │  │
│  │ 3. Update context state        │  │
│  │    - setUser(mappedUser)       │  │
│  │    - setSession(session)       │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       │ Navigate to redirect URL or home
       ↓
┌──────────────────────────────────────┐
│  Protected Routes                    │
│  - ProfilePage.tsx                   │
│  - OrderHistoryPage.tsx              │
│  - WishlistPage.tsx                  │
│  etc.                                │
│                                      │
│  Access user via:                    │
│  const { user } = useAuth();         │
└──────────────────────────────────────┘
```

### 6.2 Profile Data Synchronization

```
┌─────────────────────────────────────────────┐
│         DATA SOURCES (Multiple)             │
├─────────────────────────────────────────────┤
│                                             │
│  1. Database (Supabase)                     │
│     └─ users table                          │
│        ├─ id, email, phone, name            │
│        ├─ is_admin, phone_verified          │
│        └─ profile_completed                 │
│                                             │
│  2. localStorage                            │
│     ├─ session_token (auth token)           │
│     ├─ user_data (from login)               │
│     │  └─ Full user object                  │
│     └─ user_profile (updates only)          │
│        └─ {name, email, phone}              │
│                                             │
│  3. Context State (React)                   │
│     └─ TraditionalAuthContext               │
│        ├─ user (User object)                │
│        └─ session (Session object)          │
│                                             │
│  4. Cache Layer                             │
│     └─ enhancedAuthService                  │
│        ├─ globalCache (2min TTL)            │
│        └─ authCache (30sec TTL)             │
└─────────────────────────────────────────────┘
                     ↓
          Profile Data Merge Logic
                     ↓
┌─────────────────────────────────────────────┐
│         ProfilePage.tsx Display             │
│                                             │
│  Priority (highest to lowest):              │
│  1. enhancedAuthService.getCurrentUserProfile()
│     └─ Reads from user_data localStorage    │
│                                             │
│  2. Context user object                     │
│     └─ user?.name, user?.email, user?.phone │
│                                             │
│  3. Legacy localStorage keys                │
│     └─ user_profile, userProfile            │
│                                             │
│  ⚠️ INCONSISTENCY RISK:                     │
│  - Profile updates only touch localStorage  │
│  - Database never updated after completion  │
│  - Data bisa out-of-sync antar device       │
└─────────────────────────────────────────────┘
```

---

## 🚨 7. CRITICAL ISSUES & RECOMMENDATIONS

### 7.1 Critical Issues

#### Issue #1: Dual Authentication System
**Problem:**
- Ada 2 authentication context yang berbeda
- `AuthContext.tsx` (Supabase-based, unused)
- `TraditionalAuthContext.tsx` (Custom, active)
- Membingungkan dan prone to errors

**Impact:** Medium  
**Recommendation:**
```typescript
// Action Items:
1. Remove AuthContext.tsx completely
2. Rename TraditionalAuthContext → AuthContext
3. Update all imports
4. Remove unused Supabase auth code
```

#### Issue #2: Profile Update Not Persistent
**Problem:**
- Profile update hanya ke localStorage
- Tidak ada API endpoint untuk update profile
- Data hilang jika clear browser/ganti device

**Impact:** High  
**Recommendation:**
```typescript
// Create new API endpoint
POST /api/auth?action=update-profile
Body: { name, email, phone }

// Update database and localStorage
async function handleUpdateProfile(req, res) {
  const { user_id, name, email, phone } = req.body;
  
  // Validate session
  const session = await validateSessionToken(req.headers.authorization);
  if (!session || session.user_id !== user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Update database
  const { data: user, error } = await supabase
    .from('users')
    .update({ name, email, phone, updated_at: new Date().toISOString() })
    .eq('id', user_id)
    .select()
    .single();
    
  if (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
  
  return res.status(200).json({ success: true, user });
}
```

#### Issue #3: Session Token in localStorage
**Problem:**
- Vulnerable to XSS attacks
- Tidak ada HttpOnly protection
- Token bisa dicuri via malicious scripts

**Impact:** Critical  
**Recommendation:**
```typescript
// Migrate to HttpOnly Cookies
// api/auth.ts - handleLogin
res.setHeader('Set-Cookie', [
  `session_token=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7*24*60*60}; Path=/`,
  `user_id=${user.id}; Secure; SameSite=Strict; Max-Age=${7*24*60*60}; Path=/`
]);

// Remove from response body
return res.status(200).json({
  success: true,
  user: safeUser
  // session_token removed
});

// Frontend: Automatic cookie handling
// No need to manually store in localStorage
```

#### Issue #4: Password Duplication in Profile Complete
**Problem:**
```typescript
// User flow:
1. Signup: set password → hashed & stored
2. Verify phone: OK
3. Complete profile: set password AGAIN → hashed & overwrite

// This is confusing and unnecessary
```

**Impact:** Medium  
**Recommendation:**
```typescript
// Remove password from handleCompleteProfile
// Only collect: email, name (optional: update phone)

async function handleCompleteProfile(req, res) {
  const { user_id, name, email } = req.body; // password removed
  
  const { data: user } = await supabase
    .from('users')
    .update({
      name,
      email,
      profile_completed: true,
      profile_completed_at: new Date().toISOString()
      // password_hash NOT updated
    })
    .eq('id', user_id)
    .select()
    .single();
    
  return res.status(200).json({ success: true, user });
}
```

### 7.2 Quick Wins

**✅ Easy fixes (< 1 hour each):**

1. **Remove legacy AuthContext:**
   - Delete `src/contexts/AuthContext.tsx`
   - Rename `TraditionalAuthContext.tsx` → `AuthContext.tsx`
   - Update imports

2. **Add password change feature:**
   ```typescript
   // New endpoint: POST /api/auth?action=change-password
   // Require: old_password, new_password, session_token
   ```

3. **Implement account lockout:**
   ```typescript
   // Use existing login_attempts & locked_until fields
   // Lock after 5 failed attempts for 15 minutes
   ```

4. **Add email verification:**
   ```typescript
   // Send verification email after profile completion
   // Use similar flow as phone verification
   ```

5. **Profile update API:**
   ```typescript
   // Create handleUpdateProfile endpoint
   // Update database + localStorage
   ```

---

## 📈 8. IMPROVEMENT ROADMAP

### Phase 1: Security & Stability (1-2 weeks)
```
Priority: CRITICAL
Timeline: Immediate

Tasks:
✅ Migrate session to HttpOnly cookies
✅ Implement CSRF protection
✅ Add account lockout mechanism
✅ Remove password from profile completion
✅ Create profile update API endpoint
✅ Add email verification
✅ Implement distributed rate limiting (Redis)
```

### Phase 2: User Experience (2-3 weeks)
```
Priority: HIGH
Timeline: Short term

Tasks:
✅ Add password change feature
✅ Implement "forgot password" flow
✅ Add avatar upload
✅ Session management UI (view/revoke devices)
✅ Remember me feature
✅ Better error messages
✅ Loading states & animations
```

### Phase 3: Advanced Features (1 month)
```
Priority: MEDIUM
Timeline: Mid term

Tasks:
✅ Two-factor authentication (2FA)
✅ Social login (Google, Facebook)
✅ Biometric authentication (WebAuthn)
✅ Security notifications (new login, suspicious activity)
✅ Export user data (GDPR compliance)
✅ Delete account feature
✅ Session activity log
```

### Phase 4: Enterprise Features (2-3 months)
```
Priority: LOW
Timeline: Long term

Tasks:
✅ Single Sign-On (SSO)
✅ LDAP/Active Directory integration
✅ Role-based access control (RBAC)
✅ Audit logging & compliance
✅ Multi-tenancy support
✅ Advanced analytics dashboard
✅ API key management
```

---

## 🔍 9. CODE REFERENCES

### Key Files

**Frontend (React):**
```
src/
├── pages/
│   ├── TraditionalAuthPage.tsx      # Main auth UI (login/signup/verify/complete)
│   └── ProfilePage.tsx              # User profile management
│
├── contexts/
│   ├── TraditionalAuthContext.tsx   # Primary auth context (ACTIVE)
│   └── AuthContext.tsx              # Legacy Supabase auth (UNUSED)
│
├── services/
│   ├── authService.ts               # Base auth utilities
│   └── enhancedAuthService.ts       # Caching layer for auth
│
├── components/
│   ├── PhoneInput.tsx               # Phone number input with formatting
│   ├── PasswordInput.tsx            # Password input with toggle visibility
│   ├── TurnstileWidget.tsx          # Cloudflare Turnstile captcha
│   └── ProtectedRoute.tsx           # Auth guard for routes
│
└── utils/
    └── phoneUtils.ts                # Phone normalization utilities
```

**Backend (Vercel API):**
```
api/
├── auth.ts                          # Main authentication API
│   ├── handleLogin()                # POST login
│   ├── handleSignup()               # POST signup
│   ├── handleVerifyPhone()          # POST verify-phone
│   ├── handleCompleteProfile()      # POST complete-profile
│   ├── handleValidateSession()      # POST validate-session
│   ├── handleLogout()               # POST logout
│   └── handleWhatsAppConfirm()      # POST whatsapp-confirm
│
├── _middleware/
│   └── authMiddleware.ts            # Session validation middleware
│
└── _utils/
    ├── dynamicWhatsAppService.ts    # WhatsApp messaging service
    └── corsConfig.ts                # CORS configuration
```

**Database Tables:**
```
Supabase:
├── users                            # Main user table
├── user_sessions                    # Active sessions
├── phone_verifications              # Phone verification codes
└── admin_notifications              # Admin notifications (signup events)
```

### Usage Examples

**Login:**
```typescript
// Component
import { useAuth } from '../contexts/TraditionalAuthContext';

const { login } = useAuth();

const handleLogin = async () => {
  const result = await login(
    email,           // or phone number
    password,
    turnstileToken   // optional
  );
  
  if (result.error) {
    showToast(result.error, 'error');
  } else {
    navigate('/dashboard');
  }
};
```

**Signup:**
```typescript
const { signup } = useAuth();

const handleSignup = async () => {
  const result = await signup(
    phone,           // WhatsApp number
    password,
    name,            // optional
    turnstileToken   // optional
  );
  
  if (result.error) {
    showToast(result.error, 'error');
  } else {
    // Navigate to verification
    setMode('verify');
  }
};
```

**Profile:**
```typescript
const { user } = useAuth();
const profile = await enhancedAuthService.getCurrentUserProfile();

// Display
<div>
  <p>Name: {profile?.name || user?.name}</p>
  <p>Email: {profile?.email || user?.email}</p>
  <p>Phone: {profile?.phone || user?.phone}</p>
</div>
```

---

## 📝 10. CONCLUSION

### Current State Summary

**✅ Strengths:**
- Functional custom authentication system
- Multi-method login (email/phone)
- WhatsApp verification integration
- Session management with expiry
- Basic rate limiting & captcha
- Analytics tracking integration

**⚠️ Weaknesses:**
- Critical XSS vulnerability (localStorage tokens)
- Dual auth system complexity
- Profile updates not persistent
- No email verification
- Weak session security
- Missing password management features

**📊 Complexity Score:** 7/10
- Architecture: Medium complexity
- Security: Needs improvement
- Maintainability: Could be better (dual system)
- Scalability: Good foundation

### Priority Action Items

**Immediate (This Week):**
1. ✅ Migrate to HttpOnly cookies
2. ✅ Remove legacy AuthContext
3. ✅ Create profile update API
4. ✅ Remove password from profile completion

**Short Term (This Month):**
5. ✅ Add password change feature
6. ✅ Implement email verification
7. ✅ Account lockout mechanism
8. ✅ Better error handling

**Long Term (Next Quarter):**
9. ✅ Two-factor authentication
10. ✅ Social login integration
11. ✅ Session management UI
12. ✅ Security audit & compliance

---

## 📚 APPENDIX

### A. Environment Variables

```bash
# Required for authentication
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional (Turnstile)
TURNSTILE_SITE_KEY=xxx
TURNSTILE_SECRET_KEY=xxx

# Optional (WhatsApp)
WHATSAPP_API_KEY=xxx
WHATSAPP_API_URL=xxx
```

### B. Database Schema (Full)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  name VARCHAR(255),
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMP,
  profile_completed BOOLEAN DEFAULT false,
  profile_completed_at TIMESTAMP,
  last_login_at TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Phone verifications
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX idx_verifications_code ON phone_verifications(verification_code);
```

### C. API Endpoints Reference

```
Authentication Endpoints:
POST /api/auth?action=login              # User login
POST /api/auth?action=signup             # User registration
POST /api/auth?action=verify-phone       # Verify phone code
POST /api/auth?action=complete-profile   # Complete user profile
POST /api/auth?action=validate-session   # Validate session token
POST /api/auth?action=logout             # Logout user
POST /api/auth?action=whatsapp-confirm   # WhatsApp confirmation (legacy)
POST /api/auth?action=verify-first-visit # First visit verification (legacy)

Future Endpoints (Recommended):
POST /api/auth?action=update-profile     # Update user profile
POST /api/auth?action=change-password    # Change password
POST /api/auth?action=forgot-password    # Request password reset
POST /api/auth?action=reset-password     # Reset password with token
POST /api/auth?action=verify-email       # Verify email address
POST /api/auth?action=resend-verification # Resend verification code
```

---

**Document Version:** 1.0  
**Last Updated:** 31 Desember 2025  
**Author:** AI Assistant (Comprehensive Analysis)  
**Status:** Complete ✅
