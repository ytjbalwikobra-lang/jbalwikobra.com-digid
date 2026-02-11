/**
 * WhatsAppGroupConfig.tsx
 * Bagian konfigurasi grup default dan routing notifikasi WhatsApp
 */

import React from 'react';
import { Users, MessageSquare, MessageCircle, Save } from 'lucide-react';
import { AdminButton } from '../components/ui/AdminButton';
import type { WhatsAppGroup, GroupConfiguration } from './types';
import { NOTIFICATION_TYPES } from './types';

interface WhatsAppGroupConfigProps {
  /** Daftar grup WhatsApp */
  groups: WhatsAppGroup[];
  /** ID grup default */
  defaultGroupId: string;
  /** Handler perubahan grup default */
  onDefaultGroupChange: (value: string) => void;
  /** Konfigurasi routing notifikasi */
  groupConfigurations: GroupConfiguration;
  /** Handler perubahan routing */
  onConfigChange: (config: GroupConfiguration) => void;
  /** Handler terapkan ke semua */
  onApplyToAll: () => void;
  /** Handler simpan konfigurasi */
  onSave: () => void;
  /** Status sedang menyimpan */
  saving: boolean;
}

/** Bagian konfigurasi routing grup notifikasi WhatsApp */
export const WhatsAppGroupConfig: React.FC<WhatsAppGroupConfigProps> = ({
  groups, defaultGroupId, onDefaultGroupChange,
  groupConfigurations, onConfigChange, onApplyToAll,
  onSave, saving
}) => (
  <>
    {/* Ringkasan Konfigurasi Saat Ini */}
    <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-success)]/20 p-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-cyber-lg icon-gradient-success">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Konfigurasi Saat Ini</h2>
          <p className="text-xs text-[var(--admin-text-muted)]">Routing notifikasi aktif</p>
        </div>
      </div>
      <div className="p-4 bg-[var(--admin-bg-surface)]/50 rounded-cyber-lg mb-4">
        <p className="text-xs text-[var(--admin-text-muted)]">Default Group</p>
        <p className="text-sm font-semibold text-[var(--admin-text)] mt-0.5">
          {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Belum diatur'}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {NOTIFICATION_TYPES.map(item => (
          <div key={item.key} className="p-4 bg-[var(--admin-bg-surface)]/50 rounded-cyber-lg">
            <p className="text-xs text-[var(--admin-text-muted)]">{item.label}</p>
            <p className="text-xs font-medium mt-0.5 text-[var(--admin-text)] truncate">
              {groups.find(g => g.id === groupConfigurations[item.key])?.name || 'Default'}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Pilih Grup */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Grup Default */}
      <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-cyber-lg icon-gradient-purple">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Default Group</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Tujuan notifikasi utama</p>
          </div>
        </div>
        <div className="space-y-4">
          <select
            className="w-full px-3 py-2.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-[var(--admin-text)] text-sm focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)]"
            value={defaultGroupId}
            onChange={(e) => onDefaultGroupChange(e.target.value)}
          >
            <option value="">-- Pilih grup --</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <p className="text-xs text-[var(--admin-text-muted)]">
            {groups.length > 0 ? `${groups.length} grup tersedia` : 'Klik "Discover" untuk memuat'}
          </p>
          {defaultGroupId && (
            <AdminButton variant="secondary" onClick={onApplyToAll} fullWidth icon={<Users size={16} />}>
              Terapkan ke Semua
            </AdminButton>
          )}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--admin-text-muted)]">Atau masukkan manual</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg font-mono text-xs text-[var(--admin-text)] placeholder-muted focus:border-[var(--admin-accent)]"
              value={defaultGroupId}
              onChange={(e) => onDefaultGroupChange(e.target.value)}
              placeholder="120363405729592501@g.us"
            />
          </div>
        </div>
      </div>

      {/* Routing Notifikasi */}
      <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-glow)]">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Notification Routing</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Grup per jenis notifikasi</p>
          </div>
        </div>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map(item => (
            <div key={item.key}>
              <label className="block text-xs font-medium mb-1 text-[var(--admin-text-secondary)]">{item.label}</label>
              <select
                className="w-full px-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)]"
                value={groupConfigurations[item.key]}
                onChange={(e) => onConfigChange({ ...groupConfigurations, [item.key]: e.target.value })}
              >
                <option value="">-- Gunakan default --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <AdminButton variant="success" onClick={onSave} disabled={saving} fullWidth icon={<Save size={18} />}>
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </AdminButton>
        </div>
      </div>
    </div>
  </>
);
