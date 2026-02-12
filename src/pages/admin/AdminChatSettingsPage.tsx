/**
 * AdminChatSettingsPage — Pengaturan jam operasional live chat
 * 
 * Memungkinkan super_admin mengonfigurasi:
 * - Toggle jam operasional aktif/nonaktif
 * - Waktu mulai dan selesai jam operasional
 * - Timezone
 * - Pesan dan label offline yang ditampilkan ke pelanggan
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Save, ToggleLeft, ToggleRight, Globe, MessageSquare, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { getChatSettings, adminUpdateChatSettings } from '../../services/chatService';
import type { ChatSettings } from '../../types/chat';
import { AdminHeroSection } from './components/ui/AdminHeroSection';

/** Default pengaturan chat */
const DEFAULT_SETTINGS: ChatSettings = {
  businessHoursEnabled: true,
  businessHoursStart: '09:00',
  businessHoursEnd: '23:00',
  businessHoursTimezone: 'Asia/Jakarta',
  offlineMessage: 'Terima kasih telah menghubungi kami. Saat ini di luar jam operasional (23:00 - 09:00 WIB). Pesan Anda tetap kami terima dan akan dibalas paling lambat pukul 09:00 WIB. Terima kasih atas kesabarannya! 🙏',
  offlineLabel: 'Di Luar Jam Operasional'
};

/** Opsi timezone yang umum digunakan di Indonesia */
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'WIB (Jakarta, UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA (Makassar, UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT (Jayapura, UTC+9)' },
];

const AdminChatSettingsPage: React.FC = () => {
  const toast = useToast();
  
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /** Muat pengaturan dari server */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChatSettings();
      setSettings(data);
    } catch (err) {
      console.error('[ChatSettings] Gagal memuat pengaturan:', err);
      toast?.showToast('Gagal memuat pengaturan chat', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /** Handler perubahan field */
  const handleChange = useCallback(<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  /** Simpan pengaturan */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await adminUpdateChatSettings(settings);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      toast?.showToast('Pengaturan chat berhasil disimpan', 'success');
      setHasChanges(false);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  }, [settings, toast]);

  /** Hitung label preview waktu offline */
  const offlinePreview = `${settings.businessHoursEnd} - ${settings.businessHoursStart} ${
    TIMEZONE_OPTIONS.find(tz => tz.value === settings.businessHoursTimezone)?.label.split(' ')[0] || 'WIB'
  }`;

  // Kelas CSS yang digunakan berulang
  const inputCls = "w-full px-3 py-2.5 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)]/30 transition-all text-sm";
  const labelCls = "block text-xs font-medium text-[var(--admin-text-secondary)] mb-1.5";
  const cardCls = "bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-xl p-5";
  
  if (loading) {
    return (
      <>
        <AdminHeroSection
          title="Pengaturan Chat"
          subtitle="Mengonfigurasi jam operasional live chat"
          badge="CHAT"
          badgeColor="pink"
        />
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[var(--admin-text-secondary)]">Memuat pengaturan...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeroSection
        title="Pengaturan Chat"
        subtitle="Konfigurasi jam operasional dan pesan offline live chat"
        badge="CHAT"
        badgeColor="pink"
      >
        {/* Tombol simpan di hero */}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--admin-accent)] text-white text-sm font-medium rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </AdminHeroSection>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Card 1: Toggle Jam Operasional */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--admin-accent)]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--admin-accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">Jam Operasional Chat</h3>
                <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                  Aktifkan untuk menampilkan pemberitahuan di luar jam kerja
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChange('businessHoursEnabled', !settings.businessHoursEnabled)}
              className="p-1 rounded-lg hover:bg-white/5 active:scale-95 transition-all touch-manipulation"
              aria-label={settings.businessHoursEnabled ? 'Nonaktifkan' : 'Aktifkan'}
            >
              {settings.businessHoursEnabled ? (
                <ToggleRight className="w-10 h-6 text-[var(--admin-success)]" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-[var(--admin-text-muted)]" />
              )}
            </button>
          </div>

          {/* Preview status */}
          {settings.businessHoursEnabled && (
            <div className="mt-4 p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-light)]">
              <div className="flex items-center gap-2 text-xs text-[var(--admin-text-secondary)]">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--admin-warning)]" />
                <span>
                  Di luar jam <strong>{settings.businessHoursStart}</strong> – <strong>{settings.businessHoursEnd}</strong>, pelanggan akan melihat pesan offline
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Konfigurasi Waktu */}
        {settings.businessHoursEnabled && (
          <div className={cardCls}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[var(--admin-info)]/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[var(--admin-info)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">Konfigurasi Waktu</h3>
                <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                  Atur jam mulai, selesai, dan timezone
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Jam Mulai */}
              <div>
                <label className={labelCls}>
                  Jam Mulai (Online)
                </label>
                <input
                  type="time"
                  value={settings.businessHoursStart}
                  onChange={(e) => handleChange('businessHoursStart', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Jam Selesai */}
              <div>
                <label className={labelCls}>
                  Jam Selesai (Offline)
                </label>
                <input
                  type="time"
                  value={settings.businessHoursEnd}
                  onChange={(e) => handleChange('businessHoursEnd', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Timezone */}
              <div>
                <label className={labelCls}>
                  Zona Waktu
                </label>
                <select
                  value={settings.businessHoursTimezone}
                  onChange={(e) => handleChange('businessHoursTimezone', e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview waktu offline */}
            <div className="mt-4 p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-light)]">
              <p className="text-xs text-[var(--admin-text-secondary)]">
                <strong>Preview:</strong> Chat akan menampilkan pesan offline dari pukul <strong>{offlinePreview}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Pesan Offline */}
        {settings.businessHoursEnabled && (
          <div className={cardCls}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[var(--admin-warning)]/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--admin-warning)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">Pesan Offline</h3>
                <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                  Pesan yang ditampilkan ke pelanggan di luar jam operasional
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className={labelCls}>
                  Label Status
                </label>
                <input
                  type="text"
                  value={settings.offlineLabel}
                  onChange={(e) => handleChange('offlineLabel', e.target.value)}
                  className={inputCls}
                  placeholder="Contoh: Di Luar Jam Operasional"
                  maxLength={50}
                />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">
                  Akan ditampilkan sebagai badge di header chat widget
                </p>
              </div>

              {/* Pesan */}
              <div>
                <label className={labelCls}>
                  Pesan Pemberitahuan
                </label>
                <textarea
                  value={settings.offlineMessage}
                  onChange={(e) => handleChange('offlineMessage', e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Pesan yang akan ditampilkan ke pelanggan..."
                  maxLength={500}
                />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">
                  {settings.offlineMessage.length}/500 karakter
                </p>
              </div>
            </div>

            {/* Preview tampilan pelanggan */}
            <div className="mt-5">
              <p className="text-xs font-medium text-[var(--admin-text-secondary)] mb-2">Preview tampilan pelanggan:</p>
              <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5">
                {/* Preview header badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 rounded-full text-[10px] font-medium text-amber-400">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    {settings.offlineLabel || 'Offline'}
                  </span>
                </div>
                {/* Preview banner */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex gap-2">
                    <span className="text-sm mt-0.5">🕐</span>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {settings.offlineMessage || 'Pesan offline belum diatur...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Info */}
        <div className="p-4 bg-[var(--admin-info)]/5 border border-[var(--admin-info)]/20 rounded-xl">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--admin-info)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--admin-text-secondary)] space-y-1">
              <p className="font-medium text-[var(--admin-text)]">Catatan Penting</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Pelanggan <strong>tetap bisa mengirim pesan</strong> di luar jam operasional</li>
                <li>Pesan offline hanya sebagai pemberitahuan, bukan pemblokiran</li>
                <li>Perubahan langsung efektif setelah disimpan (tanpa restart)</li>
                <li>Waktu menggunakan timezone yang dikonfigurasi di atas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminChatSettingsPage;
