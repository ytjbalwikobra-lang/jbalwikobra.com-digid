import React, { useEffect, useState } from 'react';
import { 
  Loader2, 
  Save, 
  Send, 
  Users, 
  RefreshCw, 
  Settings, 
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Smartphone,
  Shield,
  Info,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import { AdminPageHeaderV2, AdminStatCard } from './components/ui';

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

const AdminWhatsAppSettingsEnhanced: React.FC = () => {
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
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [copied, setCopied] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    isConnected: false,
    lastChecked: 'Never',
    activeGroups: 0,
    lastActivity: 'No recent activity'
  });

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
      
      setMessage('');
      
      // Set connected status based on provider and API key existence
      const hasValidConfig = !!(data.provider || data) && !!data.api_key;
      
      setProviderStatus({
        isConnected: hasValidConfig,
        lastChecked: new Date().toLocaleString(),
        activeGroups: groups.length,
        lastActivity: data.api_key?.last_used_at 
          ? `Last used: ${new Date(data.api_key.last_used_at).toLocaleString()}` 
          : hasValidConfig ? 'Ready to use' : 'Not configured'
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load');
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
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const res = await fetch('/api/admin-whatsapp-groups', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load groups');
      setGroups(data.groups || []);
      
      setProviderStatus(prev => ({
        ...prev,
        activeGroups: data.groups?.length || 0,
        lastActivity: 'Groups loaded successfully'
      }));
      
      setMessage('Groups loaded successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      console.warn('Failed to load groups:', e?.message || e);
      setError('Failed to load groups: ' + (e?.message || 'Unknown error'));
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
    loadGroups();
  }, []);

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
        body: JSON.stringify({ 
          api_key: newApiKey.trim()
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update API key');
      
      setMessage('API key updated successfully');
      setNewApiKey('');
      setApiKey(data.api_key);
      
      // Reload to get fresh data
      setTimeout(() => load(), 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to update API key');
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
    } catch (e: any) {
      setError(e.message || 'Failed to save');
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
    } catch (e: any) {
      setError(e.message || 'Failed to send test');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 8) + '•'.repeat(Math.min(key.length - 8, 24));
  };

  return (
    <div className="dashboard-container">
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

      {loading ? (
        <div className="dashboard-section">
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <div className="flex items-center justify-center min-h-64 text-ds-text">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading configuration...
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-section">
          {/* Status Overview Cards */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Provider Status</h2>
              <p className="text-sm text-ds-text-secondary">Current WhatsApp provider connection and activity</p>
            </div>
          </div>
          
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
              iconColor="text-ds-pink"
              iconBgColor="bg-ds-pink/10"
            />
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="dashboard-data-panel padded rounded-xl border-red-500/20 bg-red-500/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {message && (
            <div className="dashboard-data-panel padded rounded-xl border-green-500/20 bg-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">Success</p>
                  <p className="text-green-300 text-sm mt-1">{message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Current Active API Key */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">1. Active API Key</h2>
              <p className="text-sm text-ds-text-secondary">Your current WooWA API key</p>
            </div>
          </div>

          <div className="dashboard-data-panel padded rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Key className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-ds-text-secondary mb-1">API Key</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-mono text-ds-text">
                      {apiKey ? (showApiKey ? apiKey.api_key : maskApiKey(apiKey.api_key)) : 'Not configured'}
                    </p>
                    {apiKey && (
                      <>
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4 text-ds-text-secondary" /> : <Eye className="w-4 h-4 text-ds-text-secondary" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.api_key)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ds-text-secondary" />}
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    Usage: {apiKey?.usage_count?.toLocaleString() || '0'} messages
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold px-3 py-1 rounded-full ${apiKey?.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {apiKey?.is_active ? '● Active' : '● Inactive'}
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Update API Key */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">2. Update API Key</h2>
              <p className="text-sm text-ds-text-secondary">Enter a new API key to connect to WooWA</p>
            </div>
          </div>

          <div className="dashboard-data-panel padded rounded-xl border-2 border-ds-pink/30">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ds-text mb-2">
                  New API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border-2 border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors font-mono text-sm"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Paste new API key here"
                />
                <p className="text-xs text-ds-text-tertiary mt-1.5">
                  Get your API key from <a href="https://notifapi.com" target="_blank" rel="noopener noreferrer" className="text-ds-pink hover:underline">notifapi.com</a>
                </p>
              </div>

              <button
                onClick={updateApiKey}
                disabled={updatingKey || !newApiKey.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-ds-pink text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-base shadow-lg shadow-ds-pink/20"
              >
                {updatingKey ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {updatingKey ? 'Updating...' : 'Update API Key'}
              </button>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    After updating the API key, you can discover and configure groups below
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Group Configuration (Only show if API key is active) */}
          {apiKey?.is_active && (
            <>
              <div className="dashboard-section-header">
                <div>
                  <h2 className="text-lg font-semibold text-ds-text">3. Current Group Configuration</h2>
                  <p className="text-sm text-ds-text-secondary">Active notification routing settings</p>
                </div>
              </div>

              <div className="dashboard-data-panel padded rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="space-y-4">
                  {/* Default Group */}
                  <div className="flex items-center justify-between pb-4 border-b border-token">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Users className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-ds-text-secondary">Default Group</p>
                        <p className="text-base font-semibold text-ds-text">
                          {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Not set'}
                        </p>
                      </div>
                    </div>
                    {defaultGroupId && (
                      <p className="text-xs font-mono text-ds-text-tertiary">{defaultGroupId}</p>
                    )}
                  </div>

                  {/* Notification Types */}
                  <div>
                    <p className="text-sm text-ds-text-secondary mb-3">Notification Routing</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token">
                        <p className="text-xs text-ds-text-tertiary mb-1">Purchase Orders</p>
                        <p className="text-sm font-medium text-ds-text">
                          {groups.find(g => g.id === groupConfigurations.purchase_orders)?.name || 'Using default'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token">
                        <p className="text-xs text-ds-text-tertiary mb-1">Rental Orders</p>
                        <p className="text-sm font-medium text-ds-text">
                          {groups.find(g => g.id === groupConfigurations.rental_orders)?.name || 'Using default'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token">
                        <p className="text-xs text-ds-text-tertiary mb-1">Flash Sales</p>
                        <p className="text-sm font-medium text-ds-text">
                          {groups.find(g => g.id === groupConfigurations.flash_sales)?.name || 'Using default'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token">
                        <p className="text-xs text-ds-text-tertiary mb-1">General Notifications</p>
                        <p className="text-sm font-medium text-ds-text">
                          {groups.find(g => g.id === groupConfigurations.general_notifications)?.name || 'Using default'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Select New Groups */}
              <div className="dashboard-section-header">
                <div>
                  <h2 className="text-lg font-semibold text-ds-text">4. Select Groups</h2>
                  <p className="text-sm text-ds-text-secondary">Choose WhatsApp groups for notifications</p>
                </div>
                <button
                  onClick={loadGroups}
                  disabled={loadingGroups}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {loadingGroups ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {loadingGroups ? 'Loading...' : 'Discover Groups'}
                </button>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Group Dropdown List */}
              <div className="dashboard-data-panel padded rounded-xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ds-text mb-2">
                      Select Default Group
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border-2 border-token text-ds-text focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors text-base"
                      value={defaultGroupId}
                      onChange={(e) => setDefaultGroupId(e.target.value)}
                    >
                      <option value="">-- Select a group --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-ds-text-tertiary mt-1.5">
                      {groups.length > 0 ? `${groups.length} groups available` : 'Click "Discover Groups" to load'}
                    </p>
                  </div>

                  {/* Apply to All Button */}
                  {defaultGroupId && (
                    <button
                      onClick={() => {
                        setGroupConfigurations({
                          purchase_orders: defaultGroupId,
                          rental_orders: defaultGroupId,
                          flash_sales: defaultGroupId,
                        general_notifications: defaultGroupId
                      });
                      setMessage(`Applied "${groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId}" to all notifications`);
                      setTimeout(() => setMessage(''), 3000);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold text-sm shadow-lg shadow-purple-600/20"
                  >
                    <Users className="w-5 h-5" />
                    Apply to All Notifications
                  </button>
                )}

                {/* Or Manual Entry */}
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Or Enter Group ID Manually
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors font-mono text-sm"
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                    placeholder="120363405729592501@g.us"
                  />
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-base shadow-lg shadow-green-600/20"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'Saving...' : 'Save Default Group'}
                </button>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-blue-300">
                      Used when specific routing is not configured
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {/* Test Message Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Test Messaging</h2>
              <p className="text-sm text-ds-text-secondary">Send a test message to verify configuration</p>
            </div>
          </div>

          <div className="dashboard-data-panel padded rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <Send className="w-5 h-5 text-ds-pink" />
              <h3 className="font-semibold text-ds-text">Send Test Message</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Target Group (Optional)
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={customGroupId}
                  onChange={(e) => setCustomGroupId(e.target.value)}
                >
                  <option value="">-- Use default group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ds-text-tertiary mt-1">
                  Override default group for this test
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Test Message
                </label>
                <textarea
                  className="w-full px-4 py-3 h-24 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors resize-none"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Test message from Admin Panel"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-token">
              <button
                onClick={testSend}
                disabled={testing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {testing ? 'Sending...' : 'Send Test Message'}
              </button>
              
              <p className="text-xs text-ds-text-tertiary mt-2">
                {customGroupId 
                  ? `Will send to: ${groups.find(g => g.id === customGroupId)?.name || 'Custom Group'}` 
                  : `Will send to default group: ${groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'None selected'}`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhatsAppSettingsEnhanced;
