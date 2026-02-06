/**
 * Admin Settings Page - Admin V3 Design System
 * WCAG 2.1 AA Compliant | Consistent with other admin pages
 * 
 * @description Website configuration using SettingsService with unified design
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SettingsService } from '../../services/settingsService';
import { PHONE_PLACEHOLDER, PHONE_HELP_TEXT } from '../../utils/phoneUtils';
import { 
  Save, 
  RefreshCw,
  Globe, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Building,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Image,
  Clock,
  Settings,
  Link,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminBentoCard, AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminPhoneInput } from './components/ui/AdminPhoneInput';
import { AdminImageUpload } from './components/ui/AdminImageUpload';
// Design system: cyber-compact.css (loaded via index.css)

// ========================================
// TYPES
// ========================================

interface SettingsFormState {
  siteName: string;
  companyDescription: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  supportEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  address: string;
  businessHours: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  topupGameUrl: string;
  whatsappChannelUrl: string;
  jualAkunWhatsappUrl: string;
  footerCopyrightText: string;
}

interface FormFieldConfig {
  field: keyof SettingsFormState;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  icon?: React.ReactNode;
  helpText?: string;
  required?: boolean;
  rows?: number;
}

// ========================================
// CONSTANTS
// ========================================

const INITIAL_FORM_STATE: SettingsFormState = {
  siteName: '',
  companyDescription: '',
  logoUrl: '',
  faviconUrl: '',
  contactEmail: '',
  supportEmail: '',
  contactPhone: '',
  whatsappNumber: '',
  address: '',
  businessHours: '',
  heroTitle: '',
  heroSubtitle: '',
  heroButtonUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  tiktokUrl: '',
  topupGameUrl: '',
  whatsappChannelUrl: '',
  jualAkunWhatsappUrl: '',
  footerCopyrightText: '',
};

// ========================================
// COMPONENT
// ========================================

const AdminSettings: React.FC = () => {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<SettingsFormState>(INITIAL_FORM_STATE);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Format relative time (e.g., "2 minutes ago")
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'Belum ada data';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ========================================
  // DATA LOADING
  // ========================================

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await SettingsService.get();
      setForm({
        siteName: s.siteName || '',
        companyDescription: s.companyDescription || '',
        logoUrl: s.logoUrl || '',
        faviconUrl: s.faviconUrl || '',
        contactEmail: s.contactEmail || '',
        supportEmail: s.supportEmail || '',
        contactPhone: s.contactPhone || '',
        whatsappNumber: s.whatsappNumber || '',
        address: s.address || '',
        businessHours: s.businessHours || '',
        heroTitle: s.heroTitle || '',
        heroSubtitle: s.heroSubtitle || '',
        heroButtonUrl: s.heroButtonUrl || '',
        facebookUrl: s.facebookUrl || '',
        instagramUrl: s.instagramUrl || '',
        twitterUrl: s.twitterUrl || '',
        youtubeUrl: s.youtubeUrl || '',
        tiktokUrl: s.tiktokUrl || '',
        topupGameUrl: s.topupGameUrl || '',
        whatsappChannelUrl: s.whatsappChannelUrl || '',
        jualAkunWhatsappUrl: s.jualAkunWhatsappUrl || '',
        footerCopyrightText: s.footerCopyrightText || '',
      });
      setLastUpdated(new Date()); // Track when data was loaded
      setHasChanges(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to load settings';
      setError(message);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleSave = async () => {
    // Validate required fields
    if (!form.siteName.trim()) {
      push('Nama situs wajib diisi', 'error');
      return;
    }
    if (!form.contactEmail.trim()) {
      push('Email kontak wajib diisi', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await SettingsService.upsert(form);
      push('Pengaturan berhasil disimpan!', 'success');
      await SettingsService.forceRefresh();
      setLastUpdated(new Date()); // Track when data was saved
      setHasChanges(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan';
      push(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = useCallback((field: keyof SettingsFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleLogoChange = useCallback((images: string[]) => {
    setForm(prev => ({ ...prev, logoUrl: images[0] || '' }));
    setHasChanges(true);
  }, []);

  const handleFaviconChange = useCallback((images: string[]) => {
    setForm(prev => ({ ...prev, faviconUrl: images[0] || '' }));
    setHasChanges(true);
  }, []);

  // ========================================
  // FORM FIELD CONFIGS (Memoized)
  // ========================================

  const generalFields: FormFieldConfig[] = useMemo(() => [
    { field: 'siteName', label: 'Nama Situs', placeholder: 'JB Alwikobra', required: true },
    { field: 'companyDescription', label: 'Deskripsi Perusahaan', type: 'textarea', placeholder: 'Deskripsi singkat untuk SEO...', helpText: 'Ditampilkan di hasil pencarian', rows: 3 },
    { field: 'footerCopyrightText', label: 'Teks Copyright', placeholder: '© 2026 JB Alwikobra. All rights reserved.', helpText: 'Ditampilkan di footer website' },
  ], []);

  const contactFields: FormFieldConfig[] = useMemo(() => [
    { field: 'contactEmail', label: 'Email Kontak', type: 'email', placeholder: 'contact@example.com', icon: <Mail size={14} />, required: true },
    { field: 'supportEmail', label: 'Email Support', type: 'email', placeholder: 'support@example.com', icon: <Mail size={14} /> },
    { field: 'contactPhone', label: 'Nomor Telepon', type: 'tel', placeholder: PHONE_PLACEHOLDER, icon: <Phone size={14} />, helpText: PHONE_HELP_TEXT },
    { field: 'whatsappNumber', label: 'Nomor WhatsApp', type: 'tel', placeholder: PHONE_PLACEHOLDER, icon: <MessageSquare size={14} />, helpText: PHONE_HELP_TEXT },
  ], []);

  const locationFields: FormFieldConfig[] = useMemo(() => [
    { field: 'address', label: 'Alamat Bisnis', type: 'textarea', placeholder: 'Jl. Example No. 123, Jakarta', rows: 2 },
    { field: 'businessHours', label: 'Jam Operasional', placeholder: '24/7 Customer Support', icon: <Clock size={14} />, helpText: 'Ditampilkan di halaman kontak' },
  ], []);

  const heroFields: FormFieldConfig[] = useMemo(() => [
    { field: 'heroTitle', label: 'Judul Hero', placeholder: 'Jual Beli & Rental Akun Game' },
    { field: 'heroSubtitle', label: 'Subtitle Hero', type: 'textarea', placeholder: 'Aman, cepat, terpercaya', rows: 2 },
    { field: 'heroButtonUrl', label: 'URL Tombol Hero', type: 'url', placeholder: 'https://example.com/shop', icon: <ExternalLink size={14} /> },
  ], []);

  const socialFields: FormFieldConfig[] = useMemo(() => [
    { field: 'facebookUrl', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/yourpage', icon: <Facebook size={14} /> },
    { field: 'instagramUrl', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/yourprofile', icon: <Instagram size={14} /> },
    { field: 'twitterUrl', label: 'Twitter / X', type: 'url', placeholder: 'https://x.com/yourhandle', icon: <Twitter size={14} /> },
    { field: 'youtubeUrl', label: 'YouTube', type: 'url', placeholder: 'https://youtube.com/@yourchannel', icon: <Youtube size={14} /> },
    { field: 'tiktokUrl', label: 'TikTok', type: 'url', placeholder: 'https://tiktok.com/@yourprofile' },
  ], []);

  const linkFields: FormFieldConfig[] = useMemo(() => [
    { field: 'topupGameUrl', label: 'URL Top-up Game', type: 'url', placeholder: 'https://topup.example.com' },
    { field: 'whatsappChannelUrl', label: 'WhatsApp Channel', type: 'url', placeholder: 'https://whatsapp.com/channel/...' },
    { field: 'jualAkunWhatsappUrl', label: 'URL Jual Akun WhatsApp', type: 'url', placeholder: 'https://wa.me/...' },
  ], []);

  // Analytics stats
  const stats = useMemo(() => {
    const filledCount = Object.values(form).filter(v => v && v.trim()).length;
    const totalFields = Object.keys(form).length;
    const socialCount = [form.facebookUrl, form.instagramUrl, form.twitterUrl, form.youtubeUrl, form.tiktokUrl].filter(v => v && v.trim()).length;
    
    return {
      filledFields: filledCount,
      totalFields,
      completion: Math.round((filledCount / totalFields) * 100),
      socialConnected: socialCount,
    };
  }, [form]);

  // ========================================
  // RENDER HELPERS
  // ========================================

  const renderField = (config: FormFieldConfig) => {
    const { field, label, type = 'text', placeholder, icon, helpText, required, rows = 3 } = config;
    
    // Special handling for phone inputs
    if (type === 'tel') {
      return (
        <AdminPhoneInput
          key={field}
          value={form[field]}
          onChange={(value) => handleChange(field, value)}
          label={label}
          icon={icon}
          required={required}
          helpText={helpText}
          placeholder={placeholder}
        />
      );
    }
    
    if (type === 'textarea') {
      return (
        <div key={field} className="space-y-1">
          <label className="block text-sm font-medium text-[var(--admin-text-muted)]">
            {label} {required && <span className="text-[var(--admin-error)]">*</span>}
          </label>
          <textarea
            value={form[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            className="w-full px-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] resize-none"
            placeholder={placeholder}
            rows={rows}
          />
          {helpText && <p className="text-xs text-[var(--admin-text-muted)]">{helpText}</p>}
        </div>
      );
    }

    return (
      <div key={field} className="space-y-1">
        <label className="block text-sm font-medium text-[var(--admin-text-muted)]">
          {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
          {!icon && label}
          {required && <span className="text-[var(--admin-error)] ml-1">*</span>}
        </label>
        <input
          type={type}
          value={form[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full px-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)]"
          placeholder={placeholder}
        />
        {helpText && <p className="text-xs text-[var(--admin-text-muted)]">{helpText}</p>}
      </div>
    );
  };

  // ========================================
  // RENDER
  // ========================================

  if (loading) {
    return (
      <div className="admin-page">
        <AdminLoadingState message="Memuat pengaturan website..." />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-4">
      {/* Hero Section */}
      <AdminHeroSection
        title="Website Settings"
        subtitle="Manage website configuration and information"
        badge={hasChanges ? 'Unsaved' : 'Saved'}
        badgeColor={hasChanges ? 'warning' : 'success'}
      >
        <div className="flex gap-2 mt-3">
          <AdminButton
            variant="secondary"
            onClick={loadSettings}
            disabled={loading}
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="sm"
            icon={<Save size={14} />}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
          </AdminButton>
        </div>
      </AdminHeroSection>

      {/* Error Banner */}
      {error && (
        <AdminErrorState
          variant="banner"
          title="Error Loading Settings"
          message={error}
          onRetry={loadSettings}
        />
      )}

      {/* Status Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminBentoMetricCard
          label="Completion"
          value={`${stats.completion}%`}
          icon={<Settings size={16} className="text-blue-400" />}
        />
        <AdminBentoMetricCard
          label="Status"
          value={hasChanges ? 'Unsaved' : 'Saved'}
          icon={hasChanges ? <AlertTriangle size={16} className="text-amber-400" /> : <CheckCircle size={16} className="text-emerald-400" />}
        />
        <AdminBentoMetricCard
          label="Social Links"
          value={stats.socialConnected}
          icon={<Link size={16} className="text-purple-400" />}
        />
        <AdminBentoMetricCard
          label="Last Updated"
          value={formatRelativeTime(lastUpdated)}
          icon={<Clock size={16} className="text-pink-400" />}
        />
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
      <AdminBentoCard>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <p className="text-xs text-amber-400">You have unsaved changes. Don't forget to save before leaving this page.</p>
          </div>
        </AdminBentoCard>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* General Settings */}
        <div className="bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-pink-500 to-rose-600">
              <Globe className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Pengaturan Umum</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Nama dan deskripsi website</p>
            </div>
          </div>
          <div className="space-y-4">
            {generalFields.map(renderField)}
            
            {/* Logo Upload */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--admin-text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Image size={14} /> Logo Website
                </span>
              </label>
              <AdminImageUpload
                images={form.logoUrl ? [form.logoUrl] : []}
                onChange={handleLogoChange}
                bucket="settings"
                maxImages={1}
                maxSizeMB={2}
                tileSize="md"
                helpText="Upload logo website (PNG/WebP, maks. 2MB)"
                showPrimaryBadge={false}
              />
            </div>

            {/* Favicon Upload */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--admin-text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Image size={14} /> Favicon
                </span>
              </label>
              <AdminImageUpload
                images={form.faviconUrl ? [form.faviconUrl] : []}
                onChange={handleFaviconChange}
                bucket="settings"
                maxImages={1}
                maxSizeMB={1}
                tileSize="sm"
                accept="image/x-icon,image/png,image/webp"
                helpText="Upload favicon (ICO/PNG, maks. 1MB, 32x32 atau 64x64)"
                showPrimaryBadge={false}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Phone className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Informasi Kontak</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Cara pelanggan menghubungi Anda</p>
            </div>
          </div>
          <div className="space-y-4">
            {contactFields.map(renderField)}
          </div>
        </div>

        {/* Business Location */}
        <div className="bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
              <MapPin className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Lokasi Bisnis</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Alamat dan jam operasional</p>
            </div>
          </div>
          <div className="space-y-4">
            {locationFields.map(renderField)}
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-glow)]">
              <Image className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Homepage Hero</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Konten banner utama</p>
            </div>
          </div>
          <div className="space-y-4">
            {heroFields.map(renderField)}
          </div>
        </div>

        {/* Social Media - Full Width */}
        <div className="lg:col-span-2 bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-fuchsia-500 to-fuchsia-600">
              <Building className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Media Sosial</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Hubungkan akun sosial media Anda</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {socialFields.map(renderField)}
          </div>
        </div>

        {/* Additional Links - Full Width */}
        <div className="lg:col-span-2 bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
              <Link className="w-5 h-5 text-[var(--admin-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Link Tambahan</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Integrasi dan channel eksternal</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {linkFields.map(renderField)}
          </div>
        </div>

        {/* Logo Preview */}
        {(form.logoUrl || form.faviconUrl) && (
          <div className="lg:col-span-2 bg-[var(--admin-bg-surface)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-gray-500 to-gray-600">
                <Image className="w-5 h-5 text-[var(--admin-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--admin-text)]">Branding Saat Ini</h2>
                <p className="text-xs text-[var(--admin-text-muted)]">Preview logo dan favicon</p>
              </div>
            </div>
            <div className="flex gap-8 items-center">
              {form.logoUrl && (
                <div className="text-center">
                  <p className="text-sm text-[var(--admin-text-muted)] mb-2">Logo</p>
                  <img 
                    src={form.logoUrl} 
                    alt="Site Logo" 
                    className="h-16 w-auto rounded-cyber-lg border border-[var(--admin-border)]"
                  />
                </div>
              )}
              {form.faviconUrl && (
                <div className="text-center">
                  <p className="text-sm text-[var(--admin-text-muted)] mb-2">Favicon</p>
                  <img 
                    src={form.faviconUrl} 
                    alt="Site Favicon" 
                    className="h-16 w-16 rounded-cyber-lg border border-[var(--admin-border)] object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--admin-text-muted)] mt-4">
              Untuk mengubah logo atau favicon, gunakan halaman manajemen banner/media.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;

