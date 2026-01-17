/**
 * Admin WhatsApp Settings - Design System V3
 * WCAG 2.1 AA Compliant
 * 
 * @description WhatsApp configuration page following Admin Design System V3
 */

import React, { useEffect, useState } from 'react';
import { 
  Loader2, 
  Save, 
  Send, 
  Users, 
  RefreshCw, 
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Activity,
  Smartphone,
  Info,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { 
  AdminPageHeaderV2, 
  AdminStatCard, 
  AdminCard, 
  AdminCardHeader, 
  AdminCardBody, 
  AdminCardFooter,
  AdminButton 
} from './components/ui';

// ========================================
// TYPES
// ========================================

interface ProviderSettingsResp {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  settings: {
    default_group_id?: string;
    group_configurations?: {
      purchase_orders?: string;
      rental_orders?: string;
      flash_sales?: string;
      general_notifications?: string;
    };
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

interface ProviderStatus {
  isConnected: boolean;
  lastChecked: string;
  activeGroups: number;
  lastActivity: string;
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

// ========================================
// COMPONENT
// ========================================

const AdminWhatsAppSettingsEnhanced: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<ProviderSettingsResp | null>(null);
  const [apiKey, setApiKey] = useState<ApiKeyInfo | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [updatingKey, setUpdatingKey] = useState(false);
  const [defaultGroupId, setDefaultGroupId] = useState<string>('');
  const [groupConfigurations, setGroupConfigurations] = useState<GroupConfiguration>({
    purchase_orders: '',
    rental_orders: '',
    flash_sales: '',
    general_notifications: ''
  });
  const [customGroupId, setCustomGroupId] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [copied, setCopied] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    isConnected: false,
    lastChecked: 'Never',
    activeGroups: 0,
    lastActivity: 'No recent activity'
  });

  // ========================================
  // API FUNCTIONS
  // ========================================

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const res = await fetch('/api/admin-whatsapp', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load provider');
      
      setProvider(data.provider || data);
      setApiKey(data.api_key);
      setDefaultGroupId(data.provider?.settings?.default_group_id || data.settings?.default_group_id || '');
      
      const configs = data.provider?.settings?.group_configurations || data.settings?.group_configurations || {};
      setGroupConfigurations({
        purchase_orders: configs.purchase_orders || '',
        rental_orders: configs.rental_orders || '',
        flash_sales: configs.flash_sales || '',
        general_notifications: configs.general_notifications || ''
      });
      
      const hasValidConfig = !!(data.provider || data) && !!data.api_key;
      
      setProviderStatus({
        isConnected: hasValidConfig,
        lastChecked: new Date().toLocaleString(),
        activeGroups: groups.length,
        lastActivity: data.api_key?.last_used_at 
          ? `Last used: ${new Date(data.api_key.last_used_at).toLocaleString()}` 
          : hasValidConfig ? 'Ready to use' : 'Not configured'
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load';
      setError(errorMessage);
      setProviderStatus({
        isConnected: false,
        lastChecked: new Date().toLocaleString(),
        activeGroups: 0,
        lastActivity: 'Connection failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const res = await fetch('/api/admin-whatsapp-groups', { headers });
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data.message || data.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }
      
      setGroups(data.groups || []);
      setProviderStatus(prev => ({
        ...prev,
        activeGroups: data.groups?.length || 0,
        lastActivity: 'Groups loaded successfully'
      }));
      
      setMessage('Groups loaded successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError('Failed to load groups: ' + errorMessage);
      setProviderStatus(prev => ({
        ...prev,
        activeGroups: 0,
        lastActivity: 'Failed to load groups'
      }));
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => { 
    load();
  }, []);

  useEffect(() => {
    if (apiKey?.is_active) {
      loadGroups();
    }
  }, [apiKey?.is_active]);

  const updateApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }
    
    setUpdatingKey(true);
    setError('');
    setMessage('');
    
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const res = await fetch('/api/admin-whatsapp', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ api_key: newApiKey.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update API key');
      
      setMessage('API key updated successfully');
      setNewApiKey('');
      setApiKey(data.api_key);
      
      setTimeout(() => load(), 1000);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to update API key';
      setError(errorMessage);
    } finally {
      setUpdatingKey(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const res = await fetch('/api/admin-whatsapp', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          default_group_id: defaultGroupId || null,
          group_configurations: groupConfigurations
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      setMessage('Configuration saved successfully');
      setProvider(data.provider);
      setProviderStatus(prev => ({
        ...prev,
        lastActivity: 'Configuration updated'
      }));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to save';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/xendit/webhook?testGroupSend=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage || 'Test WhatsApp group message from Admin at ' + new Date().toLocaleTimeString(), 
          groupId: customGroupId || undefined 
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send test');
      
      setMessage('Test message sent successfully! Check your WhatsApp group.');
      setProviderStatus(prev => ({
        ...prev,
        lastActivity: 'Test message sent'
      }));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to send test';
      setError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 8) + '•'.repeat(Math.min(key.length - 8, 24));
  };

  const applyToAllNotifications = () => {
    setGroupConfigurations({
      purchase_orders: defaultGroupId,
      rental_orders: defaultGroupId,
      flash_sales: defaultGroupId,
      general_notifications: defaultGroupId
    });
    setMessage(`Applied "${groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId}" to all notifications`);
    setTimeout(() => setMessage(''), 3000);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="admin-container">
      {/* Page Header */}
      <AdminPageHeaderV2
        title="WhatsApp Configuration"
        subtitle="Manage WhatsApp provider, API keys, and notification routing"
        icon={MessageCircle}
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' },
          { label: 'WhatsApp' }
        ]}
        actions={[
          {
            key: 'refresh',
            label: 'Refresh',
            icon: RefreshCw,
            onClick: () => { load(); loadGroups(); },
            variant: 'secondary'
          },
          {
            key: 'save',
            label: 'Save Changes',
            icon: Save,
            onClick: save,
            variant: 'primary',
            disabled: saving,
            loading: saving
          }
        ]}
      />

      <main className="admin-main">
        {/* Loading State */}
        {loading ? (
          <section className="admin-section">
            <AdminCard>
              <div className="flex items-center justify-center min-h-64">
                <Loader2 className="w-6 h-6 animate-spin mr-3" style={{ color: 'var(--admin-accent)' }} />
                <span style={{ color: 'var(--admin-text-secondary)' }}>Loading configuration...</span>
              </div>
            </AdminCard>
          </section>
        ) : (
          <>
            {/* Status Overview */}
            <section className="admin-section">
              <h2 className="admin-card-title mb-4" style={{ color: 'var(--admin-text-primary)' }}>
                Provider Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AdminStatCard
                  title="Connection"
                  value={providerStatus.isConnected ? 'Connected' : 'Disconnected'}
                  subtitle={providerStatus.lastChecked}
                  icon={providerStatus.isConnected ? CheckCircle : AlertCircle}
                  iconColor={providerStatus.isConnected ? 'text-green-400' : 'text-red-400'}
                  iconBgColor={providerStatus.isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}
                />
                <AdminStatCard
                  title="Active Groups"
                  value={providerStatus.activeGroups}
                  subtitle={`${groups.length} available`}
                  icon={Users}
                  iconColor="text-blue-400"
                  iconBgColor="bg-blue-500/10"
                />
                <AdminStatCard
                  title="Provider"
                  value={provider?.display_name || provider?.name || 'Unknown'}
                  subtitle={provider?.base_url || 'No provider'}
                  icon={Smartphone}
                  iconColor="text-purple-400"
                  iconBgColor="bg-purple-500/10"
                />
                <AdminStatCard
                  title="API Usage"
                  value={apiKey?.usage_count || 0}
                  subtitle={providerStatus.lastActivity}
                  icon={Activity}
                  iconColor="text-pink-400"
                  iconBgColor="bg-pink-500/10"
                />
              </div>
            </section>

            {/* Alert Messages */}
            {(error || message) && (
              <section className="admin-section" style={{ paddingTop: 0 }}>
                {error && (
                  <AdminCard className="border-red-500/30 bg-red-500/10">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-400">Error</p>
                        <p className="text-sm mt-1 text-red-300">{error}</p>
                      </div>
                    </div>
                  </AdminCard>
                )}
                {message && (
                  <AdminCard className="border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-400">Success</p>
                        <p className="text-sm mt-1 text-green-300">{message}</p>
                      </div>
                    </div>
                  </AdminCard>
                )}
              </section>
            )}

            {/* Step 1: Current API Key */}
            <section className="admin-section">
              <AdminCard className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <AdminCardHeader
                  title="1. Active API Key"
                  subtitle="Your current WooWA API key"
                  icon={<Key className="w-5 h-5 text-purple-400" />}
                />
                <AdminCardBody>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-purple-500/20">
                        <Key className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--admin-text-tertiary)' }}>API Key</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                            {apiKey ? (showApiKey ? apiKey.api_key : maskApiKey(apiKey.api_key)) : 'Not configured'}
                          </p>
                          {apiKey && (
                            <>
                              <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                              >
                                {showApiKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(apiKey.api_key)}
                                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                                aria-label="Copy API key"
                              >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                          Usage: {apiKey?.usage_count?.toLocaleString() || '0'} messages
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${apiKey?.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {apiKey?.is_active ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>
            </section>

            {/* Step 2: Update API Key */}
            <section className="admin-section">
              <AdminCard className="border-2 border-pink-500/30">
                <AdminCardHeader
                  title="2. Update API Key"
                  subtitle="Enter a new API key to connect to WooWA"
                  icon={<Key className="w-5 h-5 text-pink-400" />}
                />
                <AdminCardBody>
                  <div className="space-y-4">
                    <div>
                      <label 
                        htmlFor="new-api-key"
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--admin-text-primary)' }}
                      >
                        New API Key <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="new-api-key"
                        type="text"
                        className="admin-input w-full px-4 py-3 rounded-lg font-mono text-sm"
                        style={{
                          backgroundColor: 'var(--admin-surface)',
                          border: '2px solid var(--admin-border)',
                          color: 'var(--admin-text-primary)'
                        }}
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="Paste new API key here"
                        aria-describedby="api-key-hint"
                      />
                      <p id="api-key-hint" className="text-xs mt-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                        Get your API key from{' '}
                        <a 
                          href="https://notifapi.com" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline"
                          style={{ color: 'var(--admin-accent)' }}
                        >
                          notifapi.com
                        </a>
                      </p>
                    </div>

                    <AdminButton
                      variant="primary"
                      onClick={updateApiKey}
                      disabled={updatingKey || !newApiKey.trim()}
                      loading={updatingKey}
                      icon={<Save className="w-4 h-4" />}
                      fullWidth
                    >
                      {updatingKey ? 'Updating...' : 'Update API Key'}
                    </AdminButton>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-300">
                          After updating the API key, you can discover and configure groups below
                        </p>
                      </div>
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>
            </section>

            {/* Step 3 & 4: Group Configuration (Only show if API key is active) */}
            {apiKey?.is_active && (
              <>
                {/* Current Group Configuration */}
                <section className="admin-section">
                  <AdminCard className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <AdminCardHeader
                      title="3. Current Group Configuration"
                      subtitle="Active notification routing settings"
                      icon={<Users className="w-5 h-5 text-green-400" />}
                    />
                    <AdminCardBody>
                      {/* Default Group */}
                      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <Users className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--admin-text-tertiary)' }}>Default Group</p>
                            <p className="text-base font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                              {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Not set'}
                            </p>
                          </div>
                        </div>
                        {defaultGroupId && (
                          <p className="text-xs font-mono" style={{ color: 'var(--admin-text-tertiary)' }}>{defaultGroupId}</p>
                        )}
                      </div>

                      {/* Notification Types Grid */}
                      <div className="mt-4">
                        <p className="text-sm mb-3" style={{ color: 'var(--admin-text-tertiary)' }}>Notification Routing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: 'purchase_orders', label: 'Purchase Orders' },
                            { key: 'rental_orders', label: 'Rental Orders' },
                            { key: 'flash_sales', label: 'Flash Sales' },
                            { key: 'general_notifications', label: 'General Notifications' }
                          ].map(item => (
                            <div 
                              key={item.key}
                              className="p-3 rounded-lg"
                              style={{ 
                                backgroundColor: 'var(--admin-surface)',
                                border: '1px solid var(--admin-border)'
                              }}
                            >
                              <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>{item.label}</p>
                              <p className="text-sm font-medium mt-1" style={{ color: 'var(--admin-text-primary)' }}>
                                {groups.find(g => g.id === groupConfigurations[item.key as keyof GroupConfiguration])?.name || 'Using default'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AdminCardBody>
                  </AdminCard>
                </section>

                {/* Select Groups */}
                <section className="admin-section">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="admin-card-title" style={{ color: 'var(--admin-text-primary)' }}>
                        4. Select Groups
                      </h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                        Choose WhatsApp groups for notifications
                      </p>
                    </div>
                    <AdminButton
                      variant="secondary"
                      onClick={loadGroups}
                      disabled={loadingGroups}
                      loading={loadingGroups}
                      icon={<RefreshCw className="w-4 h-4" />}
                      size="sm"
                    >
                      {loadingGroups ? 'Loading...' : 'Discover Groups'}
                    </AdminButton>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Default Group */}
                    <AdminCard>
                      <AdminCardHeader
                        title="Default Group"
                        subtitle="Primary notification destination"
                        icon={<Users className="w-5 h-5 text-green-400" />}
                      />
                      <AdminCardBody>
                        <div className="space-y-4">
                          <div>
                            <label 
                              htmlFor="default-group"
                              className="block text-sm font-medium mb-2"
                              style={{ color: 'var(--admin-text-primary)' }}
                            >
                              Select Default Group
                            </label>
                            <select
                              id="default-group"
                              className="admin-select w-full px-4 py-3 rounded-lg"
                              style={{
                                backgroundColor: 'var(--admin-surface)',
                                border: '2px solid var(--admin-border)',
                                color: 'var(--admin-text-primary)'
                              }}
                              value={defaultGroupId}
                              onChange={(e) => setDefaultGroupId(e.target.value)}
                            >
                              <option value="">-- Select a group --</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                              {groups.length > 0 ? `${groups.length} groups available` : 'Click "Discover Groups" to load'}
                            </p>
                          </div>

                          {defaultGroupId && (
                            <AdminButton
                              variant="secondary"
                              onClick={applyToAllNotifications}
                              icon={<Users className="w-4 h-4" />}
                              fullWidth
                            >
                              Apply to All Notifications
                            </AdminButton>
                          )}

                          <div>
                            <label 
                              htmlFor="manual-group-id"
                              className="block text-sm font-medium mb-2"
                              style={{ color: 'var(--admin-text-tertiary)' }}
                            >
                              Or Enter Group ID Manually
                            </label>
                            <input
                              id="manual-group-id"
                              type="text"
                              className="admin-input w-full px-4 py-3 rounded-lg font-mono text-sm"
                              style={{
                                backgroundColor: 'var(--admin-surface)',
                                border: '1px solid var(--admin-border)',
                                color: 'var(--admin-text-primary)'
                              }}
                              value={defaultGroupId}
                              onChange={(e) => setDefaultGroupId(e.target.value)}
                              placeholder="120363405729592501@g.us"
                            />
                          </div>

                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <p className="text-xs text-blue-300">
                                Used when specific routing is not configured
                              </p>
                            </div>
                          </div>
                        </div>
                      </AdminCardBody>
                    </AdminCard>

                    {/* Right Column: Notification Routing */}
                    <AdminCard>
                      <AdminCardHeader
                        title="Notification Routing"
                        subtitle="Configure groups for each notification type"
                        icon={<MessageCircle className="w-5 h-5" style={{ color: 'var(--admin-accent)' }} />}
                      />
                      <AdminCardBody>
                        <div className="space-y-4">
                          {[
                            { key: 'purchase_orders', label: 'Purchase Orders' },
                            { key: 'rental_orders', label: 'Rental Orders' },
                            { key: 'flash_sales', label: 'Flash Sales' },
                            { key: 'general_notifications', label: 'General Notifications' }
                          ].map(item => (
                            <div key={item.key}>
                              <label 
                                htmlFor={`routing-${item.key}`}
                                className="block text-sm font-medium mb-2"
                                style={{ color: 'var(--admin-text-primary)' }}
                              >
                                {item.label}
                              </label>
                              <select
                                id={`routing-${item.key}`}
                                className="admin-select w-full px-4 py-2.5 rounded-lg text-sm"
                                style={{
                                  backgroundColor: 'var(--admin-surface)',
                                  border: '1px solid var(--admin-border)',
                                  color: 'var(--admin-text-primary)'
                                }}
                                value={groupConfigurations[item.key as keyof GroupConfiguration]}
                                onChange={(e) => setGroupConfigurations({
                                  ...groupConfigurations,
                                  [item.key]: e.target.value
                                })}
                              >
                                <option value="">-- Use default group --</option>
                                {groups.map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </AdminCardBody>
                      <AdminCardFooter>
                        <AdminButton
                          variant="success"
                          onClick={save}
                          disabled={saving}
                          loading={saving}
                          icon={<Save className="w-4 h-4" />}
                          fullWidth
                        >
                          {saving ? 'Saving Configuration...' : 'Save All Settings'}
                        </AdminButton>
                      </AdminCardFooter>
                    </AdminCard>
                  </div>
                </section>
              </>
            )}

            {/* Test Messaging Section */}
            <section className="admin-section">
              <AdminCard>
                <AdminCardHeader
                  title="Test Messaging"
                  subtitle="Send a test message to verify configuration"
                  icon={<Send className="w-5 h-5" style={{ color: 'var(--admin-accent)' }} />}
                />
                <AdminCardBody>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label 
                        htmlFor="test-group"
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--admin-text-tertiary)' }}
                      >
                        Target Group (Optional)
                      </label>
                      <select
                        id="test-group"
                        className="admin-select w-full px-4 py-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--admin-surface)',
                          border: '1px solid var(--admin-border)',
                          color: 'var(--admin-text-primary)'
                        }}
                        value={customGroupId}
                        onChange={(e) => setCustomGroupId(e.target.value)}
                      >
                        <option value="">-- Use default group --</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <p className="text-xs mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                        Override default group for this test
                      </p>
                    </div>

                    <div>
                      <label 
                        htmlFor="test-message"
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--admin-text-tertiary)' }}
                      >
                        Test Message
                      </label>
                      <textarea
                        id="test-message"
                        className="admin-input w-full px-4 py-3 h-24 rounded-lg resize-none"
                        style={{
                          backgroundColor: 'var(--admin-surface)',
                          border: '1px solid var(--admin-border)',
                          color: 'var(--admin-text-primary)'
                        }}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Test message from Admin Panel"
                      />
                    </div>
                  </div>
                </AdminCardBody>
                <AdminCardFooter>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>
                        {customGroupId 
                          ? `Will send to: ${groups.find(g => g.id === customGroupId)?.name || 'Custom Group'}` 
                          : `Will send to default group: ${groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'None selected'}`
                        }
                      </p>
                    </div>
                    <AdminButton
                      variant="success"
                      onClick={testSend}
                      disabled={testing}
                      loading={testing}
                      icon={<Send className="w-4 h-4" />}
                    >
                      {testing ? 'Sending...' : 'Send Test Message'}
                    </AdminButton>
                  </div>
                </AdminCardFooter>
              </AdminCard>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminWhatsAppSettingsEnhanced;
