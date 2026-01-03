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

          {/* API Key Management Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">API Key Management</h2>
              <p className="text-sm text-ds-text-secondary">Manage WooWA API authentication credentials</p>
            </div>
          </div>

          <div className="dashboard-data-panel padded rounded-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current API Key */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Key className="w-5 h-5 text-ds-pink" />
                  <h3 className="font-semibold text-ds-text">Current API Key</h3>
                </div>
                
                {apiKey && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-token">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-ds-text-secondary">Key Name</span>
                        <span className="text-sm font-medium text-ds-text">{apiKey.key_name}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-ds-text-secondary">Status</span>
                        <span className={`text-sm font-medium ${apiKey.is_active ? 'text-green-400' : 'text-red-400'}`}>
                          {apiKey.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ds-text-secondary">Usage Count</span>
                        <span className="text-sm font-medium text-ds-text">{apiKey.usage_count.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                        API Key
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text font-mono text-sm"
                          value={apiKey.api_key}
                          readOnly
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text hover:opacity-90 transition-opacity"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.api_key)}
                          className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text hover:opacity-90 transition-opacity"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {apiKey.last_used_at && (
                        <p className="text-xs text-ds-text-tertiary mt-1">
                          Last used: {new Date(apiKey.last_used_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Update API Key */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-ds-pink" />
                  <h3 className="font-semibold text-ds-text">Update API Key</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                      New API Key
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors font-mono text-sm"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Enter new WooWA API key"
                    />
                    <p className="text-xs text-ds-text-tertiary mt-1">
                      Get your API key from WooWA dashboard at notifapi.com
                    </p>
                  </div>

                  <button
                    onClick={updateApiKey}
                    disabled={updatingKey || !newApiKey.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ds-pink text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {updatingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {updatingKey ? 'Updating...' : 'Update API Key'}
                  </button>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Important</span>
                    </div>
                    <p className="text-xs text-blue-300">
                      Updating the API key will immediately affect all WhatsApp notifications. Make sure the new key is active and valid before saving.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Configuration Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Group Configuration</h2>
              <p className="text-sm text-ds-text-secondary">Manage WhatsApp groups and notification routing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Discovery */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-ds-pink" />
                <h3 className="font-semibold text-ds-text">Available Groups</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ds-text">Discovered Groups</p>
                    <p className="text-xs text-ds-text-tertiary">{groups.length} groups found</p>
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
                    {loadingGroups ? 'Loading...' : 'Reload Groups'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {groups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-ds-text-tertiary">
                      No groups found. Click "Reload Groups" to fetch.
                    </div>
                  ) : (
                    groups.map(g => (
                      <div
                        key={g.id}
                        className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-token hover:border-ds-pink/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setDefaultGroupId(g.id);
                          setGroupConfigurations(prev => ({
                            purchase_orders: prev.purchase_orders || g.id,
                            rental_orders: prev.rental_orders || g.id,
                            flash_sales: prev.flash_sales || g.id,
                            general_notifications: prev.general_notifications || g.id
                          }));
                        }}
                      >
                        <p className="text-sm font-medium text-ds-text">{g.name}</p>
                        <p className="text-xs text-ds-text-tertiary font-mono mt-1">{g.id}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300">
                    Click on a group to apply it as default for all configurations
                  </p>
                </div>
              </div>
            </div>

            {/* Default Group */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-ds-pink" />
                <h3 className="font-semibold text-ds-text">Default Fallback Group</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Group ID
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors font-mono text-sm"
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                    placeholder="120363405729592501@g.us"
                  />
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    Used when specific group configurations are not set
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Or Select from Groups
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                  >
                    <option value="">-- Select default group --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {defaultGroupId && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      ✓ Default: {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Configuration Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Notification Routing</h2>
              <p className="text-sm text-ds-text-secondary">Configure specific groups for different notification types</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-ds-text">Purchase Orders</h3>
              </div>
              
              <div className="space-y-4">
                <select
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={groupConfigurations.purchase_orders}
                  onChange={(e) => setGroupConfigurations(prev => ({ ...prev, purchase_orders: e.target.value }))}
                >
                  <option value="">-- Use default group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ds-text-tertiary">
                  Notifications when customers complete game account purchases
                </p>
                {groupConfigurations.purchase_orders && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      ✓ {groups.find(g => g.id === groupConfigurations.purchase_orders)?.name || 'Custom Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rental Orders */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-ds-text">Rental Orders</h3>
              </div>
              
              <div className="space-y-4">
                <select
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={groupConfigurations.rental_orders}
                  onChange={(e) => setGroupConfigurations(prev => ({ ...prev, rental_orders: e.target.value }))}
                >
                  <option value="">-- Use default group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ds-text-tertiary">
                  Notifications when customers complete account rental payments
                </p>
                {groupConfigurations.rental_orders && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400">
                      ✓ {groups.find(g => g.id === groupConfigurations.rental_orders)?.name || 'Custom Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Flash Sales */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-ds-text">Flash Sales</h3>
              </div>
              
              <div className="space-y-4">
                <select
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={groupConfigurations.flash_sales}
                  onChange={(e) => setGroupConfigurations(prev => ({ ...prev, flash_sales: e.target.value }))}
                >
                  <option value="">-- Use default group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ds-text-tertiary">
                  Notifications when customers purchase flash sale items
                </p>
                {groupConfigurations.flash_sales && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm text-orange-400">
                      ✓ {groups.find(g => g.id === groupConfigurations.flash_sales)?.name || 'Custom Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General Notifications */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-ds-text">General Notifications</h3>
              </div>
              
              <div className="space-y-4">
                <select
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={groupConfigurations.general_notifications}
                  onChange={(e) => setGroupConfigurations(prev => ({ ...prev, general_notifications: e.target.value }))}
                >
                  <option value="">-- Use default group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ds-text-tertiary">
                  System alerts and general announcements
                </p>
                {groupConfigurations.general_notifications && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-purple-400">
                      ✓ {groups.find(g => g.id === groupConfigurations.general_notifications)?.name || 'Custom Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Testing Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Connection Testing</h2>
              <p className="text-sm text-ds-text-secondary">Send test messages to verify WhatsApp configuration</p>
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
