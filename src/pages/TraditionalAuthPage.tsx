import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, User, Lock, Shield, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { useToast } from '../components/Toast';
import PhoneInput from '../components/PhoneInput';
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
  PNTabSwitcher,
  PNLinkButton,
} from '../components/ui/CyberDesignSystem';

/**
 * TraditionalAuthPage - Unified Login/Signup page
 * Uses CyberDesignSystem for consistent styling with ProfilePage
 * 
 * Design System Tokens:
 * - Spacing: 16px (md), 24px (lg), 32px (xl)
 * - Border Radius: 12px (inputs), 16px (cards), 20px (containers)
 * - Min Touch Target: 48px
 * - Colors: Pink accent (#ec4899), White text, Dark backgrounds
 */

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'complete'>('login');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup, verifyPhone, completeProfile } = useAuth();
  const { showToast } = useToast();
  const { trackLogin, trackSignUp } = useTracking();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  // Fetch settings for admin WhatsApp URL
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {
        // silent fail – use default WhatsApp URL
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Get admin WhatsApp URL from settings
  const adminWhatsAppUrl = ensureUrlProtocol(
    settings?.jualAkunWhatsappUrl || 'https://wa.me/6282242417788?text=Halo,%20saya%20lupa%20password%20akun%20saya'
  );

  // Login tab state
  const [loginTab, setLoginTab] = useState<'email' | 'phone'>('email');

  // Email login state
  const [emailLoginData, setEmailLoginData] = useState({
    email: '',
    password: ''
  });

  // Phone login state
  const [phoneLoginData, setPhoneLoginData] = useState({
    phone: '',
    password: ''
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Verification state
  const [verificationData, setVerificationData] = useState({
    userId: '',
    code: ''
  });

  // Profile completion state
  const [profileData, setProfileData] = useState({
    email: '',
    name: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const identifier = loginTab === 'email' ? emailLoginData.email : phoneLoginData.phone;
      const password = loginTab === 'email' ? emailLoginData.password : phoneLoginData.password;
      
      const result = await login(identifier, password);
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Login berhasil!', 'success');
      try {
        trackLogin(loginTab === 'email' ? 'email' : 'phone');
      } catch (error) {
        console.warn('Failed to track login:', error);
      }
      
      if (!result.profileCompleted) {
        setMode('complete');
        return;
      }

      // Admin langsung diarahkan ke dashboard admin
      if (result.user?.isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }

      const redirect = searchParams.get('redirect');
      const decodedRedirect = redirect ? decodeURIComponent(redirect) : '/';
      navigate(decodedRedirect, { replace: true });
      
    } catch (error) {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.name.trim()) {
      showToast('Nama lengkap harus diisi', 'error');
      return;
    }

    if (!signupData.phone.trim()) {
      showToast('Nomor WhatsApp harus diisi', 'error');
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
      const result = await signup(signupData.phone, signupData.password, signupData.name);
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      setVerificationData({ userId: result.userId!, code: '' });
      setMode('verify');
      showToast(result.message || 'Kode verifikasi telah dikirim ke WhatsApp', 'success');
      try {
        trackSignUp('phone');
      } catch (error) {
        console.warn('Failed to track signup:', error);
      }
      
    } catch (error) {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyPhone(verificationData.userId, verificationData.code);
      
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Nomor HP berhasil diverifikasi!', 'success');
      setMode('complete');
      
    } catch (error) {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      const decodedRedirect = redirect ? decodeURIComponent(redirect) : '/';
      navigate(decodedRedirect, { replace: true });
      
    } catch (error) {
      showToast('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Page titles and subtitles
  const pageContent = {
    login: {
      title: 'Masuk ke Akun',
      subtitle: 'Pilih metode masuk yang Anda inginkan'
    },
    signup: {
      title: 'Daftar Akun Baru',
      subtitle: 'Buat akun dengan nomor WhatsApp'
    },
    verify: {
      title: 'Verifikasi WhatsApp',
      subtitle: 'Masukkan kode yang dikirim ke WhatsApp'
    },
    complete: {
      title: 'Lengkapi Profil',
      subtitle: 'Tambahkan email dan nama lengkap'
    }
  };

  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white flex items-center justify-center px-4 py-8 sm:py-12 with-bottom-nav">
      <PNContainer className="max-w-md w-full">
        <PNCard className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo/Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] rounded-cyber-2xl flex items-center justify-center shadow-lg shadow-[var(--cyber-pink-muted)]">
              {mode === 'login' && <Lock size={28} className="text-white" />}
              {mode === 'signup' && <User size={28} className="text-white" />}
              {mode === 'verify' && <Phone size={28} className="text-white" />}
              {mode === 'complete' && <Shield size={28} className="text-white" />}
            </div>
            
            <PNHeading level={1} className="mb-2">
              {pageContent[mode].title}
            </PNHeading>
            <PNText color="muted" className="text-sm">
              {pageContent[mode].subtitle}
            </PNText>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <div className="space-y-6">
              <PNTabSwitcher
                tabs={[
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Nomor HP' }
                ]}
                activeTab={loginTab}
                onTabChange={(key) => setLoginTab(key as 'email' | 'phone')}
              />

              <form onSubmit={handleLogin} className="space-y-5">
                {loginTab === 'email' ? (
                  <>
                    <PNInput
                      type="email"
                      label="Email"
                      value={emailLoginData.email}
                      onChange={(e) => setEmailLoginData({ ...emailLoginData, email: e.target.value })}
                      placeholder="email@example.com"
                      icon={<Mail size={18} />}
                      required
                    />
                    <PasswordInput
                      value={emailLoginData.password}
                      onChange={(value) => setEmailLoginData({ ...emailLoginData, password: value })}
                      placeholder="Masukkan password"
                      required
                    />
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--cyber-text-secondary)]">
                        Nomor HP
                      </label>
                      <PhoneInput
                        value={phoneLoginData.phone}
                        onChange={(value) => setPhoneLoginData({ ...phoneLoginData, phone: value })}
                        placeholder="Masukkan Nomor WhatsApp"
                        required
                        disableAutoDetection={true}
                      />
                    </div>
                    <PasswordInput
                      value={phoneLoginData.password}
                      onChange={(value) => setPhoneLoginData({ ...phoneLoginData, password: value })}
                      placeholder="Masukkan password"
                      required
                    />
                  </>
                )}

                <PNButton
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={loading}
                  loading={loading}
                  className="mt-6"
                >
                  Masuk dengan {loginTab === 'email' ? 'Email' : 'Nomor HP'}
                </PNButton>

                {/* Forgot Password Button */}
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
                        <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
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

          {/* Signup Form */}
          {mode === 'signup' && (
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--cyber-text-secondary)]">
                  Nomor WhatsApp
                </label>
                <PhoneInput
                  value={signupData.phone}
                  onChange={(value) => setSignupData({ ...signupData, phone: value })}
                  placeholder="Masukkan Nomor WhatsApp"
                  required
                  disableAutoDetection={true}
                />
                <p className="text-xs text-[var(--cyber-text-muted)]">
                  Kode verifikasi akan dikirim ke nomor ini
                </p>
              </div>

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
          )}

          {/* Verification Form */}
          {mode === 'verify' && (
            <form onSubmit={handleVerification} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-cyber-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone size={28} className="text-green-400" />
                </div>
                <PNText color="muted" className="text-sm">
                  Kode verifikasi telah dikirim ke WhatsApp Anda
                </PNText>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--cyber-text-secondary)]">
                  Kode Verifikasi (6 digit)
                </label>
                <input
                  type="text"
                  value={verificationData.code}
                  onChange={(e) => setVerificationData({ 
                    ...verificationData, 
                    code: e.target.value.replace(/\D/g, '').slice(0, 6)
                  })}
                  className="w-full px-4 py-4 min-h-[56px] bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-cyber-lg text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-[var(--cyber-text-disabled)] placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-muted)] focus:border-[var(--cyber-pink-muted)]"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>

              <PNButton
                type="submit"
                fullWidth
                size="lg"
                disabled={loading || verificationData.code.length !== 6}
                loading={loading}
              >
                Verifikasi
              </PNButton>

              <div className="text-center pt-2">
                <PNLinkButton onClick={() => setMode('signup')}>
                  Kembali ke pendaftaran
                </PNLinkButton>
              </div>
            </form>
          )}

          {/* Profile Completion Form */}
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

              <div className="bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-cyber-lg p-4 space-y-2">
                <p className="text-sm text-[var(--cyber-text-muted)] flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Nama dan password sudah diatur saat pendaftaran
                </p>
                <p className="text-sm text-[var(--cyber-text-muted)] flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Nomor WhatsApp terverifikasi
                </p>
              </div>

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
