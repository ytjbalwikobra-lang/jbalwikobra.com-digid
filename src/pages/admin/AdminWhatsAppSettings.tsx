/**
 * Admin WhatsApp Settings - Admin V3 Design System
 * WCAG 2.1 AA Compliant | Consistent with other admin pages
 * 
 * @description WhatsApp configuration using adminService with unified design
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Save, 
  Send, 
  Users, 
  RefreshCw, 
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Info,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Clock,
  Zap
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { adminService } from '../../services/adminService';
import { SettingsService } from '../../services/settingsService';
import { copyToClipboard, maskApiKey, parseErrorMessage, formatAnalyticsValue } from '../../utils/adminUtils';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
// Design system: cyber-compact.css (loaded via index.css)

// ========================================
// TYPES
// ========================================

interface ProviderSettings {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  settings: {
    default_group_id?: string;
    group_configurations?: Partial<GroupConfiguration>;
  };
}

interface ApiKeyInfo {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  is_primary: boolean;
  usage_count: number;
  last_used_at: string | null;
}

interface GroupConfiguration {
  purchase_orders: string;
  rental_orders: string;
  flash_sales: string;
  general_notifications: string;
}

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface ResultModalState {
  isOpen: boolean;
  success: boolean;
  title: string;
  message: string;
  details?: {
    messageId?: string;
    provider?: string;
    responseTime?: number;
    groupId?: string;
    sentMessage?: string;
  };
}

// ========================================
// CONSTANTS
// ========================================

const MESSAGE_TEMPLATES = [
  { id: 'custom', label: '✏️ Custom Message', text: '' },
  { id: 'simple', label: '📨 Simple Test', text: '🔔 Test message from Admin - {timestamp}' },
  { id: 'order', label: '🛒 Order Notification', text: '🛒 *Test Order Notification*\n\nOrder #TEST-{timestamp}\nCustomer: John Doe\nTotal: Rp 150,000\nStatus: ✅ Paid\n\n_This is a test message_' },
  { id: 'rental', label: '🔄 Rental Notification', text: '🔄 *Test Rental Notification*\n\nRental #RNT-{timestamp}\nProduct: Premium Account\nDuration: 7 days\nStatus: 🟢 Active\n\n_This is a test message_' },
  { id: 'flash', label: '⚡ Flash Sale Alert', text: '⚡ *FLASH SALE ALERT!*\n\nTest Flash Sale #{timestamp}\nDiscount: 50% OFF!\nEnds: 2 hours\n\n🔥 _Limited time offer!_' }
];

const NOTIFICATION_TYPES = [
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'rental_orders', label: 'Rental Orders' },
  { key: 'flash_sales', label: 'Flash Sales' },
  { key: 'general_notifications', label: 'General' }
] as const;

// ========================================
// COMPONENT
// ========================================

const AdminWhatsAppSettings: React.FC = () => {
  const { showToast } = useToast();

  // Data state
  const [provider, setProvider] = useState<ProviderSettings | null>(null);
  const [apiKey, setApiKey] = useState<ApiKeyInfo | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);

  // Form state
  const [defaultGroupId, setDefaultGroupId] = useState('');
  const [groupConfigurations, setGroupConfigurations] = useState<GroupConfiguration>({
    purchase_orders: '',
    rental_orders: '',
    flash_sales: '',
    general_notifications: ''
  });
  const [newApiKey, setNewApiKey] = useState('');

  // Test messaging state
  const [testMessage, setTestMessage] = useState('');
  const [customGroupId, setCustomGroupId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('simple');

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [resultModal, setResultModal] = useState<ResultModalState>({
    isOpen: false,
    success: false,
    title: '',
    message: ''
  });

  // ========================================
  // DATA LOADING
  // ========================================

  const loadSettings = useCallback(async () => {
    setLoading(true);
    
    try {
      const [settings, groupsData] = await Promise.all([
        adminService.getWhatsAppSettings(),
        adminService.getWhatsAppGroups().catch(() => [])
      ]);

      if (settings.provider) {
        setProvider(settings.provider);
        setDefaultGroupId(settings.provider.settings?.default_group_id || '');
        setGroupConfigurations({
          purchase_orders: settings.provider.settings?.group_configurations?.purchase_orders || '',
          rental_orders: settings.provider.settings?.group_configurations?.rental_orders || '',
          flash_sales: settings.provider.settings?.group_configurations?.flash_sales || '',
          general_notifications: settings.provider.settings?.group_configurations?.general_notifications || ''
        });
      }

      if (settings.apiKey) {
        setApiKey(settings.apiKey);
      }

      setGroups(groupsData);

      // Set initial test message
      const template = MESSAGE_TEMPLATES.find(t => t.id === 'simple');
      if (template?.text) {
        const timestamp = Date.now().toString().slice(-6);
        setTestMessage(template.text.replace(/{timestamp}/g, timestamp));
      }
      setLastUpdated(new Date());
    } catch (err) {
      const errorMsg = parseErrorMessage(err);
      showToast('Failed to load settings: ' + errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const groupsData = await adminService.getWhatsAppGroups();
      setGroups(groupsData);
      showToast(`Found ${groupsData.length} groups`, 'success');
    } catch (err) {
      const errorMsg = parseErrorMessage(err);
      showToast('Failed to load groups: ' + errorMsg, 'error');
    } finally {
      setLoadingGroups(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ========================================
  // API OPERATIONS
  // ========================================

  const updateApiKey = async () => {
    if (!newApiKey.trim()) {
      showToast('Please enter a valid API key', 'error');
      return;
    }
    
    setUpdatingKey(true);
    
    try {
      const result = await adminService.updateWhatsAppApiKey(newApiKey);
      
      showToast('API key updated successfully!', 'success');
      setNewApiKey('');
      setLastUpdated(new Date());
      setApiKey(prev => prev ? { ...prev, api_key: result.api_key, is_active: true } : null);
      
      if (result.provider) {
        setProvider(result.provider);
      }
      
      // Clear global settings cache to ensure all components get fresh data
      SettingsService.clearCache();
      
      // Dispatch custom event to notify all components that settings have changed
      window.dispatchEvent(new CustomEvent('whatsapp-settings-updated', {
        detail: { apiKeyUpdated: true }
      }));
    } catch (err) {
      const errorMsg = parseErrorMessage(err);
      showToast('Failed to update API key: ' + errorMsg, 'error');
    } finally {
      setUpdatingKey(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    
    try {
      const result = await adminService.updateWhatsAppConfig({
        default_group_id: defaultGroupId || null,
        group_configurations: groupConfigurations
      });
      
      if (result.provider) {
        setProvider(result.provider);
      }
      setLastUpdated(new Date());
      
      // Clear global settings cache to ensure all components get fresh data
      SettingsService.clearCache();
      
      // Dispatch custom event to notify all components that settings have changed
      window.dispatchEvent(new CustomEvent('whatsapp-settings-updated', {
        detail: { groupConfigurations, defaultGroupId }
      }));
      
      showToast('Configuration saved!', 'success');
    } catch (err) {
      const errorMsg = parseErrorMessage(err);
      showToast('Failed to save: ' + errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    if (!testMessage.trim()) {
      showToast('Please enter a message or select a template', 'error');
      return;
    }
    
    setTesting(true);
    
    const targetGroup = customGroupId || defaultGroupId;
    
    try {
      const result = await adminService.sendTestWhatsAppMessage(testMessage, targetGroup);
      
      setResultModal({
        isOpen: true,
        success: true,
        title: 'Message Sent Successfully!',
        message: 'Your test message has been delivered.',
        details: {
          messageId: result.messageId || 'N/A',
          provider: result.provider || provider?.display_name || 'WhatsApp',
          responseTime: result.responseTime || 0,
          groupId: targetGroup || 'Default Group',
          sentMessage: testMessage.substring(0, 100) + (testMessage.length > 100 ? '...' : '')
        }
      });
      
      showToast('Test message sent!', 'success');
    } catch (err) {
      const errorMsg = parseErrorMessage(err);
      
      setResultModal({
        isOpen: true,
        success: false,
        title: 'Message Failed',
        message: errorMsg,
        details: {
          groupId: targetGroup || 'Default Group',
          sentMessage: testMessage.substring(0, 100) + (testMessage.length > 100 ? '...' : '')
        }
      });
      
      showToast('Failed to send test message', 'error');
    } finally {
      setTesting(false);
    }
  };

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const applyToAllNotifications = () => {
    setGroupConfigurations({
      purchase_orders: defaultGroupId,
      rental_orders: defaultGroupId,
      flash_sales: defaultGroupId,
      general_notifications: defaultGroupId
    });
    const groupName = groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId;
    showToast(`Applied "${groupName}" to all notifications`, 'success');
  };

  // Analytics cards config - matching other admin pages
  const analyticsCards = useMemo(() => [
    {
      label: 'Connection',
      value: apiKey?.is_active ? 'Connected' : 'Disconnected',
      icon: apiKey?.is_active ? CheckCircle : AlertCircle,
      color: apiKey?.is_active ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
      bgColor: apiKey?.is_active ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      label: 'Groups',
      value: groups.length,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Provider',
      value: provider?.display_name || provider?.name || 'N/A',
      icon: Smartphone,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Last Updated',
      value: lastUpdated ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      icon: Clock,
      color: 'from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)]',
      bgColor: 'bg-[var(--cyber-pink-subtle)]'
    }
  ], [apiKey, groups.length, provider, lastUpdated]);

  // ========================================
  // RENDER
  // ========================================

  if (loading) {
    return (
      <div className="admin-page">
        <AdminLoadingState message="Memuat konfigurasi WhatsApp..." />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Konfigurasi WhatsApp
          </h1>
          <p className="text-[var(--cyber-text-muted)] mt-1">
            {apiKey?.is_active ? '✓ Terhubung' : '✗ Tidak terhubung'} • {groups.length} grup tersedia
          </p>
        </div>
        <AdminButton
          variant="secondary"
          onClick={loadSettings}
          disabled={loading}
          icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
        >
          Refresh
        </AdminButton>
      </div>

      {/* Analytics Cards - same as other admin pages */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className={`${card.bgColor} rounded-cyber-lg p-4 border border-[var(--cyber-border)] transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-cyber-lg bg-gradient-to-br ${card.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--cyber-text-muted)] uppercase tracking-wide">{card.label}</p>
                  <p className="text-lg font-bold text-white truncate">
                    {formatAnalyticsValue(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Card */}
      <div className="bg-blue-500/10 rounded-cyber-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">Bantuan</h3>
            <ul className="space-y-1 text-xs text-[var(--cyber-text-secondary)]">
              <li>• <strong>Device offline:</strong> Scan QR di dashboard WooWA</li>
              <li>• <strong>API key invalid:</strong> Periksa akun NotifAPI</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <a href="https://woo-wa.com" target="_blank" rel="noopener noreferrer nofollow"
                 className="inline-flex items-center gap-1 px-3 py-1.5 rounded-cyber-lg bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-purple)] text-[var(--cyber-text-primary)] text-xs font-medium hover:opacity-90">
                WooWA Docs
              </a>
              <a href="https://notifapi.com" target="_blank" rel="noopener noreferrer nofollow"
                 className="inline-flex items-center gap-1 px-3 py-1.5 rounded-cyber-lg bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-primary)] text-xs font-medium hover:bg-[var(--cyber-bg-elevated)]">
                NotifAPI
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Current API Key Section */}
      <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">API Key Aktif</h2>
            <p className="text-xs text-[var(--cyber-text-muted)]">Kunci API WooWA saat ini</p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-[var(--cyber-bg-surface)]/50 rounded-cyber-lg">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-[var(--cyber-text-muted)]">API Key</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="font-mono text-sm text-[var(--cyber-text-primary)]">
                  {apiKey ? (showApiKey ? apiKey.api_key : maskApiKey(apiKey.api_key)) : 'Belum dikonfigurasi'}
                </p>
                {apiKey && (
                  <>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      aria-label={showApiKey ? 'Hide' : 'Show'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4 text-[var(--cyber-text-muted)]" /> : <Eye className="w-4 h-4 text-[var(--cyber-text-muted)]" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.api_key, () => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      })}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      aria-label="Copy"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[var(--cyber-text-muted)]" />}
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs mt-1 text-[var(--cyber-text-muted)]">
                Penggunaan: {apiKey?.usage_count?.toLocaleString() || '0'} pesan
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${apiKey?.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {apiKey?.is_active ? '● Aktif' : '● Nonaktif'}
          </span>
        </div>
      </div>

      {/* Update API Key Section */}
      <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-pink-muted)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)]">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Perbarui API Key</h2>
            <p className="text-xs text-[var(--cyber-text-muted)]">Masukkan API key baru untuk menghubungkan</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="new-api-key" className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
              API Key Baru <span className="text-red-500">*</span>
            </label>
            <input
              id="new-api-key"
              type="text"
              className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg font-mono text-sm text-[var(--cyber-text-primary)] placeholder-gray-500 focus:border-[var(--cyber-pink-primary)] focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="Paste API key baru disini"
            />
            <p className="text-xs mt-1.5 text-[var(--cyber-text-muted)]">
              Dapatkan dari <a href="https://woo-wa.com" target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--cyber-pink-primary)] hover:underline">WooWA</a> atau <a href="https://notifapi.com" target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--cyber-pink-primary)] hover:underline">NotifAPI</a>
            </p>
          </div>

          <AdminButton
            variant="primary"
            onClick={updateApiKey}
            disabled={updatingKey || !newApiKey.trim()}
            fullWidth
            icon={<Save size={18} />}
          >
            {updatingKey ? 'Memperbarui...' : 'Perbarui API Key'}
          </AdminButton>
        </div>
      </div>

      {/* Group Configuration (only if API key is active) */}
      {apiKey?.is_active && (
        <>
          {/* Current Configuration Summary */}
          <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-green-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-green-500 to-green-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Konfigurasi Saat Ini</h2>
                <p className="text-xs text-[var(--cyber-text-muted)]">Routing notifikasi aktif</p>
              </div>
            </div>

            <div className="p-4 bg-[var(--cyber-bg-surface)]/50 rounded-cyber-lg mb-4">
              <p className="text-xs text-[var(--cyber-text-muted)]">Default Group</p>
              <p className="text-sm font-semibold text-[var(--cyber-text-primary)] mt-0.5">
                {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Belum diatur'}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {NOTIFICATION_TYPES.map(item => (
                <div key={item.key} className="p-3 bg-[var(--cyber-bg-surface)]/50 rounded-cyber-lg">
                  <p className="text-xs text-[var(--cyber-text-muted)]">{item.label}</p>
                  <p className="text-xs font-medium mt-0.5 text-[var(--cyber-text-primary)] truncate">
                    {groups.find(g => g.id === groupConfigurations[item.key])?.name || 'Default'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Select Groups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Default Group */}
            <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-green-500 to-green-600">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Default Group</h2>
                    <p className="text-xs text-[var(--cyber-text-muted)]">Tujuan notifikasi utama</p>
                  </div>
                </div>
                <AdminButton
                  variant="secondary"
                  onClick={loadGroups}
                  disabled={loadingGroups}
                  size="sm"
                  icon={<RefreshCw className={loadingGroups ? 'animate-spin' : ''} size={16} />}
                >
                  Discover
                </AdminButton>
              </div>
              
              <div className="space-y-4">
                <select
                  className="w-full px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] text-sm focus:border-[var(--cyber-pink-primary)] focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
                  value={defaultGroupId}
                  onChange={(e) => setDefaultGroupId(e.target.value)}
                >
                  <option value="">-- Pilih grup --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                
                <p className="text-xs text-[var(--cyber-text-muted)]">
                  {groups.length > 0 ? `${groups.length} grup tersedia` : 'Klik "Discover" untuk memuat'}
                </p>

                {defaultGroupId && (
                  <AdminButton
                    variant="secondary"
                    onClick={applyToAllNotifications}
                    fullWidth
                    icon={<Users size={16} />}
                  >
                    Terapkan ke Semua
                  </AdminButton>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[var(--cyber-text-muted)]">
                    Atau masukkan manual
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg font-mono text-xs text-[var(--cyber-text-primary)] placeholder-gray-500 focus:border-[var(--cyber-pink-primary)]"
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                    placeholder="120363405729592501@g.us"
                  />
                </div>
              </div>
            </div>

            {/* Notification Routing */}
            <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)]">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Notification Routing</h2>
                  <p className="text-xs text-[var(--cyber-text-muted)]">Grup per jenis notifikasi</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {NOTIFICATION_TYPES.map(item => (
                  <div key={item.key}>
                    <label className="block text-xs font-medium mb-1 text-[var(--cyber-text-secondary)]">
                      {item.label}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-sm text-[var(--cyber-text-primary)] focus:border-[var(--cyber-pink-primary)]"
                      value={groupConfigurations[item.key]}
                      onChange={(e) => setGroupConfigurations(prev => ({
                        ...prev,
                        [item.key]: e.target.value
                      }))}
                    >
                      <option value="">-- Gunakan default --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <AdminButton
                  variant="success"
                  onClick={saveConfig}
                  disabled={saving}
                  fullWidth
                  icon={<Save size={18} />}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </AdminButton>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Test Messaging */}
      <div className="bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)]">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Test Messaging</h2>
            <p className="text-xs text-[var(--cyber-text-muted)]">Kirim pesan percobaan untuk verifikasi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--cyber-text-muted)]">
                Target Group (Opsional)
              </label>
              <select
                className="w-full px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] text-sm focus:border-[var(--cyber-pink-primary)]"
                value={customGroupId}
                onChange={(e) => setCustomGroupId(e.target.value)}
              >
                <option value="">-- Gunakan default --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--cyber-text-muted)]">
                Template Pesan
              </label>
              <select
                className="w-full px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] text-sm focus:border-[var(--cyber-pink-primary)]"
                value={selectedTemplate}
                onChange={(e) => {
                  const template = MESSAGE_TEMPLATES.find(t => t.id === e.target.value);
                  setSelectedTemplate(e.target.value);
                  if (template?.text) {
                    const timestamp = Date.now().toString().slice(-6);
                    setTestMessage(template.text.replace(/{timestamp}/g, timestamp).replace(/\\n/g, '\n'));
                  }
                }}
              >
                {MESSAGE_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--cyber-text-muted)]">
              Pesan Test
            </label>
            <textarea
              className="w-full px-3 py-2.5 h-28 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg resize-none text-[var(--cyber-text-primary)] placeholder-gray-500 focus:border-[var(--cyber-pink-primary)] font-mono text-xs"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Masukkan pesan test..."
            />
            <p className="text-xs mt-1 text-[var(--cyber-text-muted)]">
              Gunakan *bold*, _italic_ untuk formatting
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--cyber-border)]">
          <p className="text-xs text-[var(--cyber-text-muted)]">
            Target: {customGroupId 
              ? groups.find(g => g.id === customGroupId)?.name || 'Custom'
              : groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Belum dipilih'
            }
          </p>
          <AdminButton
            variant="success"
            onClick={testSend}
            disabled={testing || !testMessage.trim()}
            icon={<Send size={18} />}
          >
            {testing ? 'Mengirim...' : 'Kirim Test'}
          </AdminButton>
        </div>
      </div>

      {/* Result Modal */}
      {resultModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setResultModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div className={`relative w-full max-w-md bg-[var(--cyber-bg-pure)] rounded-cyber-lg border shadow-2xl ${resultModal.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <button
              onClick={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-3 right-3 p-1 rounded-cyber-lg text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-surface)]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="pt-6 pb-3 flex justify-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${resultModal.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {resultModal.success ? <CheckCircle className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
              </div>
            </div>
            
            <div className="px-5 pb-3 text-center">
              <h3 className="text-lg font-semibold text-[var(--cyber-text-primary)] mb-1">{resultModal.title}</h3>
              <p className="text-[var(--cyber-text-muted)] text-sm">{resultModal.message}</p>
            </div>
            
            {resultModal.details && (
              <div className="px-5 pb-4">
                <div className="bg-[var(--cyber-bg-surface)]/50 rounded-cyber-lg p-3 space-y-2">
                  {resultModal.details.messageId && resultModal.details.messageId !== 'N/A' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--cyber-text-muted)] flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> Message ID
                      </span>
                      <span className="text-[var(--cyber-text-primary)] font-mono bg-[var(--cyber-bg-elevated)] px-1.5 py-0.5 rounded text-xs">
                        {resultModal.details.messageId}
                      </span>
                    </div>
                  )}
                  
                  {resultModal.details.provider && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--cyber-text-muted)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Provider
                      </span>
                      <span className="text-[var(--cyber-text-primary)]">{resultModal.details.provider}</span>
                    </div>
                  )}
                  
                  {resultModal.details.responseTime !== undefined && resultModal.details.responseTime > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--cyber-text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Response
                      </span>
                      <span className="text-green-400">{resultModal.details.responseTime}ms</span>
                    </div>
                  )}
                  
                  {resultModal.details.groupId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--cyber-text-muted)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Group
                      </span>
                      <span className="text-[var(--cyber-text-primary)] text-xs truncate max-w-[180px]">
                        {groups.find(g => g.id === resultModal.details?.groupId)?.name || resultModal.details.groupId}
                      </span>
                    </div>
                  )}
                  
                  {resultModal.details.sentMessage && (
                    <div className="pt-2 border-t border-[var(--cyber-border)]">
                      <p className="text-[var(--cyber-text-muted)] text-xs mb-1">Pesan:</p>
                      <p className="text-[var(--cyber-text-secondary)] text-xs font-mono bg-[var(--cyber-bg-pure)]/50 p-2 rounded whitespace-pre-wrap">
                        {resultModal.details.sentMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="px-5 pb-5">
              <AdminButton
                variant={resultModal.success ? 'success' : 'danger'}
                fullWidth
                onClick={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
              >
                {resultModal.success ? 'Selesai' : 'Tutup'}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhatsAppSettings;
