/**
 * AdminWhatsAppSettings - Halaman konfigurasi WhatsApp
 * Admin V3 Design System | Folder-based component structure
 *
 * @description Menampilkan konfigurasi provider, API key, routing grup, dan test messaging.
 * Dipecah menjadi sub-komponen untuk maintainability (dari 848 baris → ~200 baris).
 */

import React from 'react';
import {
  Save, RefreshCw, CheckCircle, AlertCircle, Users,
  Smartphone, Clock, Info
} from 'lucide-react';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import { AdminHeroSection } from '../components/ui/AdminHeroSection';
import { AdminBentoMetricCard } from '../components/ui/AdminBentoCard';
import { copyToClipboard } from '../../../utils/adminUtils';

import { useWhatsAppSettings } from './useWhatsAppSettings';
import { WhatsAppApiKeySection } from './WhatsAppApiKeySection';
import { WhatsAppGroupConfig } from './WhatsAppGroupConfig';
import { WhatsAppTestMessaging } from './WhatsAppTestMessaging';

// Design system: cyber-compact.css (loaded via index.css)

const AdminWhatsAppSettings: React.FC = () => {
  const s = useWhatsAppSettings();

  // Loading state
  if (s.loading) {
    return (
      <div className="admin-page">
        <AdminLoadingState message="Memuat konfigurasi WhatsApp..." />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-4">
      {/* Hero Section */}
      <AdminHeroSection
        title="WhatsApp Configuration"
        subtitle={`${s.provider && s.apiKey ? '✓ Connected' : s.provider ? '⚠ API Key Missing' : '✗ Not Configured'} • ${s.groups.length} groups available`}
        badge={s.provider && s.apiKey ? 'Active' : s.provider ? 'Key Missing' : 'Inactive'}
        badgeColor={s.provider && s.apiKey ? 'success' : 'warning'}
      >
        <div className="flex gap-2 mt-3">
          <AdminButton variant="secondary" onClick={() => s.loadSettings(true)} disabled={s.loading} size="sm" icon={<RefreshCw size={14} className={s.loading ? 'animate-spin' : ''} />}>
            Refresh
          </AdminButton>
          <AdminButton variant="primary" onClick={s.saveConfig} disabled={s.saving} size="sm" icon={<Save size={14} />}>
            {s.saving ? 'Saving...' : 'Save All'}
          </AdminButton>
        </div>
      </AdminHeroSection>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminBentoMetricCard
          label="Connection"
          value={s.provider && s.apiKey ? 'Connected' : s.provider ? 'Key Missing' : 'Disconnected'}
          icon={s.provider && s.apiKey
            ? <CheckCircle size={16} className="text-[var(--admin-success)]" />
            : <AlertCircle size={16} className="text-[var(--admin-error)]" />}
        />
        <AdminBentoMetricCard
          label="Groups"
          value={s.groups.length}
          icon={<Users size={16} className="text-[var(--admin-accent)]" />}
        />
        <AdminBentoMetricCard
          label="Provider"
          value={s.provider?.display_name || s.provider?.name || 'N/A'}
          icon={<Smartphone size={16} className="text-[var(--admin-purple)]" />}
        />
        <AdminBentoMetricCard
          label="Last Updated"
          value={s.lastUpdated ? s.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
          icon={<Clock size={16} className="text-[var(--admin-info)]" />}
        />
      </div>

      {/* Help Card */}
      <div className="card-tint-info rounded-cyber-lg p-4 border border-[var(--admin-info)]/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-cyber-lg icon-gradient-info">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">Bantuan</h3>
            <ul className="space-y-1 text-xs text-[var(--admin-text-secondary)]">
              <li>• <strong>Device offline:</strong> Scan QR di dashboard WooWA</li>
              <li>• <strong>API key invalid:</strong> Periksa akun NotifAPI</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <a href="https://woo-wa.com" target="_blank" rel="noopener noreferrer nofollow"
                 className="inline-flex items-center gap-1 px-3 py-1.5 rounded-cyber-lg bg-gradient-to-r from-[var(--admin-accent)] to-[var(--admin-purple)] text-[var(--admin-text)] text-xs font-medium hover:opacity-90">
                WooWA Docs
              </a>
              <a href="https://notifapi.com" target="_blank" rel="noopener noreferrer nofollow"
                 className="inline-flex items-center gap-1 px-3 py-1.5 rounded-cyber-lg bg-[var(--admin-bg-elevated)] text-[var(--admin-text)] text-xs font-medium hover:bg-[var(--admin-bg-elevated)]">
                NotifAPI
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <WhatsAppApiKeySection
        apiKey={s.apiKey}
        showApiKey={s.showApiKey}
        onToggleShow={() => s.setShowApiKey(!s.showApiKey)}
        copied={s.copied}
        onCopy={() => {
          if (s.apiKey) {
            copyToClipboard(s.apiKey.api_key, () => {
              s.setCopied(true);
              setTimeout(() => s.setCopied(false), 2000);
            });
          }
        }}
        newApiKey={s.newApiKey}
        onNewApiKeyChange={s.setNewApiKey}
        onUpdate={s.updateApiKeyAction}
        updatingKey={s.updatingKey}
      />

      {/* Group Configuration (hanya jika API key aktif) */}
      {s.apiKey?.is_active && (
        <WhatsAppGroupConfig
          groups={s.groups}
          defaultGroupId={s.defaultGroupId}
          onDefaultGroupChange={s.setDefaultGroupId}
          groupConfigurations={s.groupConfigurations}
          onConfigChange={s.setGroupConfigurations}
          onApplyToAll={s.applyToAllNotifications}
          onSave={s.saveConfig}
          saving={s.saving}
        />
      )}

      {/* Test Messaging */}
      <WhatsAppTestMessaging
        groups={s.groups}
        defaultGroupId={s.defaultGroupId}
        customGroupId={s.customGroupId}
        onCustomGroupChange={s.setCustomGroupId}
        selectedTemplate={s.selectedTemplate}
        onTemplateChange={s.handleTemplateChange}
        testMessage={s.testMessage}
        onTestMessageChange={s.setTestMessage}
        onSend={s.testSend}
        testing={s.testing}
        resultModal={s.resultModal}
        onCloseModal={() => s.setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminWhatsAppSettings;
