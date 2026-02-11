/**
 * WhatsAppApiKeySection.tsx
 * Bagian tampilan dan pembaruan API key WhatsApp
 */

import React from 'react';
import { Key, Eye, EyeOff, Copy, Check, Save } from 'lucide-react';
import { AdminButton } from '../components/ui/AdminButton';
import { copyToClipboard, maskApiKey } from '../../../utils/adminUtils';
import type { ApiKeyInfo } from './types';

interface WhatsAppApiKeySectionProps {
  /** Info API key saat ini */
  apiKey: ApiKeyInfo | null;
  /** Apakah API key ditampilkan */
  showApiKey: boolean;
  /** Toggle tampilkan API key */
  onToggleShow: () => void;
  /** Status tombol copy */
  copied: boolean;
  /** Callback setelah copy berhasil */
  onCopy: () => void;
  /** Nilai API key baru */
  newApiKey: string;
  /** Handler perubahan API key baru */
  onNewApiKeyChange: (value: string) => void;
  /** Handler update API key */
  onUpdate: () => void;
  /** Status sedang memperbarui */
  updatingKey: boolean;
}

/** Bagian untuk menampilkan dan memperbarui API key WhatsApp */
export const WhatsAppApiKeySection: React.FC<WhatsAppApiKeySectionProps> = ({
  apiKey, showApiKey, onToggleShow, copied, onCopy,
  newApiKey, onNewApiKeyChange, onUpdate, updatingKey
}) => (
  <>
    {/* API Key Saat Ini */}
    <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-cyber-lg icon-gradient-purple">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">API Key Aktif</h2>
          <p className="text-xs text-[var(--admin-text-muted)]">Kunci API WooWA saat ini</p>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[var(--admin-bg-surface)]/50 rounded-cyber-lg">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-[var(--admin-text-muted)]">API Key</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-mono text-sm text-[var(--admin-text)]">
                {apiKey ? (showApiKey ? apiKey.api_key : maskApiKey(apiKey.api_key)) : 'Belum dikonfigurasi'}
              </p>
              {apiKey && (
                <>
                  <button onClick={onToggleShow} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label={showApiKey ? 'Hide' : 'Show'}>
                    {showApiKey ? <EyeOff className="w-4 h-4 text-[var(--admin-text-muted)]" /> : <Eye className="w-4 h-4 text-[var(--admin-text-muted)]" />}
                  </button>
                  <button onClick={() => copyToClipboard(apiKey.api_key, onCopy)} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Copy">
                    {copied ? <Check className="w-4 h-4 text-[var(--admin-success)]" /> : <Copy className="w-4 h-4 text-[var(--admin-text-muted)]" />}
                  </button>
                </>
              )}
            </div>
            <p className="text-xs mt-1 text-[var(--admin-text-muted)]">
              Penggunaan: {apiKey?.usage_count?.toLocaleString() || '0'} pesan
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${apiKey?.is_active ? 'bg-[var(--admin-success)]/20 text-[var(--admin-success)]' : 'bg-[var(--admin-error)]/20 text-[var(--admin-error)]'}`}>
          {apiKey?.is_active ? '● Aktif' : '● Nonaktif'}
        </span>
      </div>
    </div>

    {/* Perbarui API Key */}
    <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-accent-muted)] p-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-glow)]">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Perbarui API Key</h2>
          <p className="text-xs text-[var(--admin-text-muted)]">Masukkan API key baru untuk menghubungkan</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="new-api-key" className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
            API Key Baru <span className="text-[var(--admin-error)]">*</span>
          </label>
          <input
            id="new-api-key"
            type="text"
            className="w-full px-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg font-mono text-sm text-[var(--admin-text)] placeholder-muted focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)]"
            value={newApiKey}
            onChange={(e) => onNewApiKeyChange(e.target.value)}
            placeholder="Paste API key baru disini"
          />
          <p className="text-xs mt-1.5 text-[var(--admin-text-muted)]">
            Dapatkan dari <a href="https://woo-wa.com" target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--admin-accent)] hover:underline">WooWA</a> atau <a href="https://notifapi.com" target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--admin-accent)] hover:underline">NotifAPI</a>
          </p>
        </div>
        <AdminButton variant="primary" onClick={onUpdate} disabled={updatingKey || !newApiKey.trim()} fullWidth icon={<Save size={18} />}>
          {updatingKey ? 'Memperbarui...' : 'Perbarui API Key'}
        </AdminButton>
      </div>
    </div>
  </>
);
