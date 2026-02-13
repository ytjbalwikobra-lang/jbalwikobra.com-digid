import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, User, Lock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { useToast } from '../components/Toast';
import PasswordInput from '../components/PasswordInput';
import { useTracking } from '../hooks/useTracking';
import { SettingsService } from '../services/settingsService';
import { ensureUrlProtocol } from '../utils/helpers';
import type { WebsiteSettings } from '../types';
import {
  PNContainer,
  PNCard,
  PNButton,
  PNHeading,
  PNText,
  PNInput,
  PNLinkButton,
} from '../components/ui/CyberDesignSystem';

/**
 * TraditionalAuthPage - Halaman Login/Signup (Revamped)
 * 
 * Perubahan:
 * - Tambah Google OAuth login
 * - Signup email-first (tanpa WhatsApp OTP)
 * - Hapus mode verifikasi WhatsApp
 * - Mode: login | signup | complete
 * 
 * Design System Tokens:
 * - Spacing: 16px (md), 24px (lg), 32px (xl)
 * - Border Radius: 12px (inputs), 16px (cards), 20px (containers)
 * - Min Touch Target: 48px
 * - Colors: Pink accent (#ec4899), White text, Dark backgrounds
 */

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'complete'>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, signup, loginWithGoogle, completeProfile } = useAuth();
  const { showToast } = useToast();
  const { trackLogin, trackSignUp } = useTracking();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  // Ambil settings untuk admin WhatsApp URL (untuk lupa password)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {
        // silent fail
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Redirect jika sudah login
  // Tidak perlu guard callback Google — saat callback diproses, user masih null
  // Setelah callback berhasil, user di-set → redirect otomatis
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        const redirect = searchParams.get('redirect');
        // Default redirect ke /profile (bukan homepage) agar user bisa lihat akun mereka
        navigate(redirect ? decodeURIComponent(redirect) : '/profile', { replace: true });
      }
    }
  }, [user, navigate, searchParams]);

  // URL WhatsApp admin untuk lupa password
  const adminWhatsAppUrl = ensureUrlProtocol(
    settings?.jualAkunWhatsappUrl || 'https://wa.me/6282242417788?text=Halo,%20saya%20lupa%20password%20akun%20saya'
  );

  // State form login
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // State form signup (email-first)
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // State profile completion
  const [profileData, setProfileData] = useState({ email: '', name: '' });

  // Handler login email + password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(loginData.email, loginData.password);
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Login berhasil!', 'success');
      try { trackLogin('email'); } catch { /* silent */ }
      
      if (!result.profileCompleted) {
        setMode('complete');
        return;
      }

      if (result.user?.isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }

      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/', { replace: true });
      
    } catch {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler login Google
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.error) {
        showToast(result.error, 'error');
        setGoogleLoading(false);
      }
      // Redirect otomatis jika sukses
    } catch {
      showToast('Gagal memulai login Google', 'error');
      setGoogleLoading(false);
    }
  };

  // Handler signup email-first
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.name.trim()) {
      showToast('Nama lengkap harus diisi', 'error');
      return;
    }

    if (!signupData.email.trim()) {
      showToast('Email harus diisi', 'error');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      showToast('Password tidak cocok', 'error');
      return;
    }

    if (signupData.password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(signupData.email, signupData.password, signupData.name);
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Akun berhasil dibuat! Selamat datang!', 'success');
      try { trackSignUp('email'); } catch { /* silent */ }

      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/', { replace: true });
      
    } catch {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler profile completion
  const handleProfileCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.email.trim()) {
      showToast('Email wajib diisi', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await completeProfile(profileData.email, profileData.name || '');
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Profil berhasil dilengkapi! Selamat datang!', 'success');
      
      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/', { replace: true });
      
    } catch {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google button component (dipakai di login dan signup)
  const GoogleButton = ({ label }: { label: string }) => (
    <button
      onClick={handleGoogleLogin}
      disabled={googleLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 min-h-[48px] bg-white text-gray-800 font-medium rounded-cyber-lg hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {googleLoading ? (
        <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      {googleLoading ? 'Menghubungkan...' : label}
    </button>
  );

  // Divider component
  const OrDivider = ({ text }: { text: string }) => (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--cyber-border)]" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-[var(--cyber-bg-card)] px-3 text-[var(--cyber-text-muted)]">
          {text}
        </span>
      </div>
    </div>
  );

  // Judul dan subtitle halaman
  const pageContent = {
    login: { title: 'Masuk ke Akun', subtitle: 'Login dengan Google atau email' },
    signup: { title: 'Daftar Akun Baru', subtitle: 'Buat akun dengan email' },
    complete: { title: 'Lengkapi Profil', subtitle: 'Tambahkan email dan nama lengkap' }
  };

  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white flex items-center justify-center px-4 py-8 sm:py-12 with-bottom-nav">
      <PNContainer className="max-w-md w-full">
        <PNCard className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] rounded-cyber-2xl flex items-center justify-center shadow-lg shadow-[var(--cyber-pink-muted)]">
              {mode === 'login' && <Lock size={28} className="text-white" />}
              {mode === 'signup' && <User size={28} className="text-white" />}
              {mode === 'complete' && <Shield size={28} className="text-white" />}
            </div>
            
            <PNHeading level={1} className="mb-2">
              {pageContent[mode].title}
            </PNHeading>
            <PNText color="muted" className="text-sm">
              {pageContent[mode].subtitle}
            </PNText>
          </div>

          {/* ========== LOGIN FORM ========== */}
          {mode === 'login' && (
            <div className="space-y-6">
              <GoogleButton label="Lanjutkan dengan Google" />
              <OrDivider text="atau login dengan email" />

              <form onSubmit={handleLogin} className="space-y-5">
                <PNInput
                  type="email"
                  label="Email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="email@example.com"
                  icon={<Mail size={18} />}
                  required
                />
                <PasswordInput
                  value={loginData.password}
                  onChange={(value) => setLoginData({ ...loginData, password: value })}
                  placeholder="Masukkan password"
                  required
                />

                <PNButton
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={loading}
                  loading={loading}
                  className="mt-6"
                >
                  Masuk dengan Email
                </PNButton>

                {/* Lupa Password */}
                <div className="pt-4">
                  <a 
                    href={adminWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <PNButton
                      variant="secondary"
                      fullWidth
                      size="md"
                      type="button"
                      className="group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Lupa Password? Hubungi Admin
                      </span>
                    </PNButton>
                  </a>
                </div>

                <div className="text-center pt-2">
                  <PNLinkButton onClick={() => setMode('signup')}>
                    Belum punya akun? Daftar di sini
                  </PNLinkButton>
                </div>
              </form>
            </div>
          )}

          {/* ========== SIGNUP FORM (Email-first) ========== */}
          {mode === 'signup' && (
            <div className="space-y-6">
              <GoogleButton label="Daftar dengan Google" />
              <OrDivider text="atau daftar dengan email" />

              <form onSubmit={handleSignup} className="space-y-5">
                <PNInput
                  type="text"
                  label="Nama Lengkap"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  icon={<User size={18} />}
                  required
                />

                <PNInput
                  type="email"
                  label="Email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  placeholder="email@example.com"
                  icon={<Mail size={18} />}
                  required
                />

                <PasswordInput
                  value={signupData.password}
                  onChange={(value) => setSignupData({ ...signupData, password: value })}
                  placeholder="Minimal 6 karakter"
                  required
                />

                <PasswordInput
                  value={signupData.confirmPassword}
                  onChange={(value) => setSignupData({ ...signupData, confirmPassword: value })}
                  placeholder="Ulangi password"
                  label="Konfirmasi Password"
                  required
                />

                <PNButton
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={loading}
                  loading={loading}
                  className="mt-6"
                >
                  Daftar
                </PNButton>

                <div className="text-center pt-2">
                  <PNLinkButton onClick={() => setMode('login')}>
                    Sudah punya akun? Masuk di sini
                  </PNLinkButton>
                </div>
              </form>
            </div>
          )}

          {/* ========== PROFILE COMPLETION FORM ========== */}
          {mode === 'complete' && (
            <form onSubmit={handleProfileCompletion} className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-cyber-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={28} className="text-[var(--cyber-pink-primary)]" />
                </div>
                <PNText color="muted" className="text-sm">
                  Tambahkan email untuk notifikasi dan pemulihan akun
                </PNText>
              </div>

              <PNInput
                type="email"
                label="Email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="email@example.com"
                icon={<Mail size={18} />}
                required
              />

              <PNButton
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
                loading={loading}
                className="mt-6"
              >
                Selesaikan Pendaftaran
              </PNButton>
            </form>
          )}
        </PNCard>
      </PNContainer>
    </div>
  );
};

export default AuthPage;
