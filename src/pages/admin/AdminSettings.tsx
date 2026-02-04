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
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<SettingsFormState>(INITIAL_FORM_STATE);

  // ========================================
  // DATA LOADING
  // ========================================

  const loadSettings = useCallback(async () => {
    setLoading(true);
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
      setHasChanges(false);
    } catch {
      push('Gagal memuat pengaturan', 'error');
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
    
    if (type === 'textarea') {
      return (
        <div key={field} className="space-y-1">
          <label className="block text-sm font-medium text-[var(--cyber-text-muted)]">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={form[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:border-[var(--cyber-pink-primary)] focus:ring-1 focus:ring-[var(--cyber-pink-primary)] resize-none"
            placeholder={placeholder}
            rows={rows}
          />
          {helpText && <p className="text-xs text-[var(--cyber-text-muted)]">{helpText}</p>}
        </div>
      );
    }

    return (
      <div key={field} className="space-y-1">
        <label className="block text-sm font-medium text-[var(--cyber-text-muted)]">
          {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
          {!icon && label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={type}
          value={form[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:border-[var(--cyber-pink-primary)] focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
          placeholder={placeholder}
        />
        {helpText && <p className="text-xs text-[var(--cyber-text-muted)]">{helpText}</p>}
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
    <div className="admin-page space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Pengaturan Website
          </h1>
          <p className="text-[var(--cyber-text-muted)] mt-1">
            Kelola konfigurasi dan informasi website
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadSettings}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            icon={<Save size={18} />}
          >
            {saving ? 'Menyimpan...' : hasChanges ? 'Simpan' : 'Tersimpan'}
          </AdminButton>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-500/10 rounded-cyber-lg p-4 border border-[var(--cyber-border)] transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Settings className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--cyber-text-muted)] uppercase tracking-wide">Kelengkapan</p>
              <p className="text-lg font-bold text-[var(--cyber-text-primary)]">{stats.completion}%</p>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 rounded-cyber-lg p-4 border border-[var(--cyber-border)] transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-green-500 to-green-600">
              <CheckCircle className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--cyber-text-muted)] uppercase tracking-wide">Field Terisi</p>
              <p className="text-lg font-bold text-[var(--cyber-text-primary)]">{stats.filledFields}/{stats.totalFields}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-500/10 rounded-cyber-lg p-4 border border-[var(--cyber-border)] transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Building className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--cyber-text-muted)] uppercase tracking-wide">Sosial Media</p>
              <p className="text-lg font-bold text-[var(--cyber-text-primary)]">{stats.socialConnected}/5</p>
            </div>
          </div>
        </div>

        <div className={`${hasChanges ? 'bg-amber-500/10' : 'bg-[var(--cyber-bg-elevated)]/10'} rounded-cyber-lg p-4 border border-[var(--cyber-border)] transition-all duration-300 hover:scale-[1.02]`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-cyber-lg bg-gradient-to-br ${hasChanges ? 'from-amber-500 to-amber-600' : 'from-gray-500 to-gray-600'}`}>
              <Save className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--cyber-text-muted)] uppercase tracking-wide">Status</p>
              <p className={`text-lg font-bold ${hasChanges ? 'text-amber-400' : 'text-[var(--cyber-text-muted)]'}`}>
                {hasChanges ? 'Belum Disimpan' : 'Tersimpan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-cyber-lg p-4 text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Ada perubahan yang belum disimpan. Jangan lupa simpan sebelum meninggalkan halaman.</p>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* General Settings */}
        <div className="bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Globe className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Pengaturan Umum</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Nama dan deskripsi website</p>
            </div>
          </div>
          <div className="space-y-4">
            {generalFields.map(renderField)}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-green-500 to-green-600">
              <Phone className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Informasi Kontak</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Cara pelanggan menghubungi Anda</p>
            </div>
          </div>
          <div className="space-y-4">
            {contactFields.map(renderField)}
          </div>
        </div>

        {/* Business Location */}
        <div className="bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-amber-500 to-amber-600">
              <MapPin className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Lokasi Bisnis</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Alamat dan jam operasional</p>
            </div>
          </div>
          <div className="space-y-4">
            {locationFields.map(renderField)}
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)]">
              <Image className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Homepage Hero</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Konten banner utama</p>
            </div>
          </div>
          <div className="space-y-4">
            {heroFields.map(renderField)}
          </div>
        </div>

        {/* Social Media - Full Width */}
        <div className="lg:col-span-2 bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Building className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Media Sosial</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Hubungkan akun sosial media Anda</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialFields.map(renderField)}
          </div>
        </div>

        {/* Additional Links - Full Width */}
        <div className="lg:col-span-2 bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
              <Link className="w-5 h-5 text-[var(--cyber-text-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Link Tambahan</h2>
              <p className="text-xs text-[var(--cyber-text-muted)]">Integrasi dan channel eksternal</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkFields.map(renderField)}
          </div>
        </div>

        {/* Logo Preview */}
        {(form.logoUrl || form.faviconUrl) && (
          <div className="lg:col-span-2 bg-[var(--cyber-bg-surface)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-gray-500 to-gray-600">
                <Image className="w-5 h-5 text-[var(--cyber-text-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Branding Saat Ini</h2>
                <p className="text-xs text-[var(--cyber-text-muted)]">Preview logo dan favicon</p>
              </div>
            </div>
            <div className="flex gap-8 items-center">
              {form.logoUrl && (
                <div className="text-center">
                  <p className="text-sm text-[var(--cyber-text-muted)] mb-2">Logo</p>
                  <img 
                    src={form.logoUrl} 
                    alt="Site Logo" 
                    className="h-16 w-auto rounded-cyber-lg border border-[var(--cyber-border)]"
                  />
                </div>
              )}
              {form.faviconUrl && (
                <div className="text-center">
                  <p className="text-sm text-[var(--cyber-text-muted)] mb-2">Favicon</p>
                  <img 
                    src={form.faviconUrl} 
                    alt="Site Favicon" 
                    className="h-16 w-16 rounded-cyber-lg border border-[var(--cyber-border)] object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--cyber-text-muted)] mt-4">
              Untuk mengubah logo atau favicon, gunakan halaman manajemen banner/media.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
