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
  AlertTriangle,
  Info,
  ArrowRight,
  Globe,
  MessageSquare
} from 'lucide-react';
import { AdminPageHeaderV2, AdminStatCard } from './components/ui';

interface ProviderSettingsResp {
  id: string;
  name: string;
  display_name: string;
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

const AdminWhatsAppSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<ProviderSettingsResp | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string>('');
  const [groupConfigurations, setGroupConfigurations] = useState<GroupConfiguration>({
    purchase_orders: '',
    rental_orders: '',
    flash_sales: '',
    general_notifications: ''
  });
  const [customGroupId, setCustomGroupId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
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
      setProvider(data);
      setDefaultGroupId(data.settings?.default_group_id || '');
      
      // Load group configurations
      const configs = data.settings?.group_configurations || {};
      setGroupConfigurations({
        purchase_orders: configs.purchase_orders || '',
        rental_orders: configs.rental_orders || '',
        flash_sales: configs.flash_sales || '',
        general_notifications: configs.general_notifications || ''
      });
      
      setInfo('');
      
      // Update provider status
      setProviderStatus({
        isConnected: true,
        lastChecked: new Date().toLocaleString(),
        activeGroups: groups.length,
        lastActivity: 'Just now'
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

  useEffect(() => { load(); }, []);

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
      
      // Update provider status with group count
      setProviderStatus(prev => ({
        ...prev,
        activeGroups: data.groups?.length || 0,
        lastActivity: 'Groups loaded successfully'
      }));
    } catch (e: any) {
      console.warn('Failed to load groups:', e?.message || e);
      setProviderStatus(prev => ({
        ...prev,
        activeGroups: 0,
        lastActivity: 'Failed to load groups'
      }));
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setInfo('');
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
      setInfo('Configuration saved successfully.');
      setProvider(data.provider);
      
      // Update provider status
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
    setInfo('');
    try {
      // Hit a minimal inline API using dynamic service via a temporary endpoint in webhook pattern
      const res = await fetch('/api/xendit/webhook?testGroupSend=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || 'Test WhatsApp group message from Admin', groupId: customGroupId || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send test');
      setInfo('Test message sent successfully! Check your WhatsApp group.');
      
      // Update provider status
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

  // Helper function to get the selected group name
  const getSelectedGroupName = () => {
    const group = groups.find(g => g.id === defaultGroupId);
    return group?.name || 'No group selected';
  };

  return (
    <div className="dashboard-container">
      <AdminPageHeaderV2
        title="WhatsApp Configuration"
        subtitle="Manage WhatsApp provider settings and messaging configuration"
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
            onClick: load,
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
              subtitle={provider?.id || 'No provider'}
              icon={Smartphone}
              iconColor="text-purple-400"
              iconBgColor="bg-purple-500/10"
            />
            
            <AdminStatCard
              title="Last Activity"
              value={providerStatus.lastActivity}
              subtitle="Recent status"
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
                  <p className="text-red-400 font-medium">Configuration Error</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {info && (
            <div className="dashboard-data-panel padded rounded-xl border-green-500/20 bg-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">Success</p>
                  <p className="text-green-300 text-sm mt-1">{info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Provider Configuration Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Configuration</h2>
              <p className="text-sm text-ds-text-secondary">Manage WhatsApp provider settings and group assignments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Information */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-ds-pink" />
                <h3 className="font-semibold text-ds-text">Provider Information</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Active Provider
                  </label>
                  <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-token">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ds-text">
                          {provider?.display_name || provider?.name || 'Unknown Provider'}
                        </p>
                        <p className="text-xs text-ds-text-tertiary mt-1">
                          ID: {provider?.id || 'N/A'}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${providerStatus.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Default Fallback Group
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                    placeholder="1203xxxxxxxx@g.us"
                  />
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    Used when specific group configurations are not set
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Group Selection */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-ds-pink" />
                <h3 className="font-semibold text-ds-text">Quick Selection</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-ds-text-secondary">
                      Available Groups
                    </label>
                    <button
                      onClick={loadGroups}
                      disabled={loadingGroups}
                      className="inline-flex items-center gap-2 px-3 py-1 text-xs rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      {loadingGroups ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Reload
                    </button>
                  </div>
                  
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value=""
                    onChange={(e) => {
                      const selectedGroupId = e.target.value;
                      if (selectedGroupId) {
                        setDefaultGroupId(selectedGroupId);
                        // Also set as default for all configurations that are empty
                        setGroupConfigurations(prev => ({
                          purchase_orders: prev.purchase_orders || selectedGroupId,
                          rental_orders: prev.rental_orders || selectedGroupId,
                          flash_sales: prev.flash_sales || selectedGroupId,
                          general_notifications: prev.general_notifications || selectedGroupId
                        }));
                      }
                    }}
                  >
                    <option value="">-- Apply to all empty configurations --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    {groups.length} groups available
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Tip</span>
                  </div>
                  <p className="text-xs text-blue-300">
                    Select a group above to apply it to all empty configurations below. You can then customize individual notification types.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Group Configuration Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Notification Groups</h2>
              <p className="text-sm text-ds-text-secondary">Configure specific groups for different types of notifications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders Group */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-ds-text">Purchase Orders</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Group for Purchase Notifications
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={groupConfigurations.purchase_orders}
                    onChange={(e) => setGroupConfigurations(prev => ({ ...prev, purchase_orders: e.target.value }))}
                  >
                    <option value="">-- Select group for purchase orders --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    When customers complete game account purchases
                  </p>
                </div>
                
                {groupConfigurations.purchase_orders && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      ✓ Selected: {groups.find(g => g.id === groupConfigurations.purchase_orders)?.name || 'Unknown Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rental Orders Group */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-ds-text">Rental Orders</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Group for Rental Notifications
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={groupConfigurations.rental_orders}
                    onChange={(e) => setGroupConfigurations(prev => ({ ...prev, rental_orders: e.target.value }))}
                  >
                    <option value="">-- Select group for rental orders --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    When customers complete account rental payments
                  </p>
                </div>
                
                {groupConfigurations.rental_orders && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400">
                      ✓ Selected: {groups.find(g => g.id === groupConfigurations.rental_orders)?.name || 'Unknown Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Flash Sales Group */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-ds-text">Flash Sales</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Group for Flash Sale Notifications
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={groupConfigurations.flash_sales}
                    onChange={(e) => setGroupConfigurations(prev => ({ ...prev, flash_sales: e.target.value }))}
                  >
                    <option value="">-- Select group for flash sales --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    When customers purchase flash sale items
                  </p>
                </div>
                
                {groupConfigurations.flash_sales && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm text-orange-400">
                      ✓ Selected: {groups.find(g => g.id === groupConfigurations.flash_sales)?.name || 'Unknown Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General Notifications Group */}
            <div className="dashboard-data-panel padded rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-ds-text">General Notifications</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Group for General Notifications
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                    value={groupConfigurations.general_notifications}
                    onChange={(e) => setGroupConfigurations(prev => ({ ...prev, general_notifications: e.target.value }))}
                  >
                    <option value="">-- Select group for general notifications --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ds-text-tertiary mt-1">
                    For system alerts and general announcements
                  </p>
                </div>
                
                {groupConfigurations.general_notifications && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-purple-400">
                      ✓ Selected: {groups.find(g => g.id === groupConfigurations.general_notifications)?.name || 'Unknown Group'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Testing Section */}
          <div className="dashboard-section-header">
            <div>
              <h2 className="text-lg font-semibold text-ds-text">Message Testing</h2>
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
                  Custom Group ID (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors"
                  value={customGroupId}
                  onChange={(e) => setCustomGroupId(e.target.value)}
                  placeholder="Leave empty to use default group"
                />
                <p className="text-xs text-ds-text-tertiary mt-1">
                  Override default group for this test message
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Test Message
                </label>
                <textarea
                  className="w-full px-4 py-3 h-24 rounded-lg bg-[var(--bg-secondary)] border border-token text-ds-text placeholder-ds-text-tertiary focus:ring-2 focus:ring-ds-pink/20 focus:border-ds-pink transition-colors resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hello from Admin test message"
                />
                <p className="text-xs text-ds-text-tertiary mt-1">
                  Custom message content for testing
                </p>
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
                Message will be sent to {customGroupId ? 'custom group' : 'default group'} 
                {!customGroupId && defaultGroupId && ` (${getSelectedGroupName()})`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhatsAppSettings;
