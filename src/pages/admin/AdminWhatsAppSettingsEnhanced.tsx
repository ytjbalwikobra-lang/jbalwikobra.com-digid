/**
 * Admin WhatsApp Settings - Design System V3
 * WCAG 2.1 AA Compliant
 * 
 * @description WhatsApp configuration page matching AdminProductsV2 styling
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
  AdminCard, 
  AdminCardHeader, 
  AdminCardBody, 
  AdminCardFooter,
  AdminButton 
} from './components/ui';
import '../../styles/admin-design-system-v3.css';

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
      const errorMessage = parseErrorMessage(e);
      setError(errorMessage);
      setProviderStatus({
        isConnected: false,
        lastChecked: new Date().toLocaleString(),
        activeGroups: 0,
        lastActivity: navigator.onLine ? 'Connection failed' : 'Device offline'
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
        // Check for SERVICE_OFF state
        if (data.state === 'SERVICE_OFF' || data.message?.includes('SERVICE_OFF') || data.message?.includes('scan qr')) {
          throw new Error('SERVICE_OFF: Device not connected. Please scan QR code.');
        }
        const errorMsg = data.message || data.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }
      
      setGroups(data.groups || []);
      setProviderStatus(prev => ({
        ...prev,
        isConnected: true,
        activeGroups: data.groups?.length || 0,
        lastActivity: 'Groups loaded successfully',
        lastChecked: new Date().toLocaleString()
      }));
      
      setMessage('Groups loaded successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: unknown) {
      const errorMessage = parseErrorMessage(e);
      setError(errorMessage);
      setProviderStatus(prev => ({
        ...prev,
        isConnected: false,
        activeGroups: 0,
        lastActivity: 'Connection failed',
        lastChecked: new Date().toLocaleString()
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
      const errorMessage = parseErrorMessage(e);
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
      const errorMessage = parseErrorMessage(e);
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
      const errorMessage = parseErrorMessage(e);
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

  const parseErrorMessage = (error: unknown): string => {
    if (!navigator.onLine) {
      return 'Device offline. Please check your internet connection.';
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for SERVICE_OFF (device not connected/QR not scanned)
    if (errorMessage.includes('SERVICE_OFF') || 
        errorMessage.toLowerCase().includes('service off') ||
        errorMessage.toLowerCase().includes('service_off') ||
        errorMessage.toLowerCase().includes('scan qr')) {
      return 'Device offline. Your WhatsApp device is not connected. Please scan the QR code on your WooWA dashboard. Visit https://woo-wa.com for more details.';
    }
    
    // Check for API key errors
    if (errorMessage.toLowerCase().includes('unauthorized') || 
        errorMessage.toLowerCase().includes('invalid api') ||
        errorMessage.toLowerCase().includes('authentication') ||
        errorMessage.toLowerCase().includes('forbidden') ||
        errorMessage.toLowerCase().includes('api key') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403')) {
      return 'Incorrect API key. Please check your credentials and try again. Visit https://woo-wa.com for documentation.';
    }
    
    // Check for network errors
    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('connection')) {
      return 'Network error. Device may be offline or server is unreachable. Please check your connection.';
    }
    
    return errorMessage;
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            WhatsApp Configuration
          </h1>
          <p className="text-gray-400 mt-1">Manage WhatsApp provider, API keys, and notification routing</p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={() => { load(); loadGroups(); }}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={save}
            disabled={saving}
            icon={<Save size={18} />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </AdminButton>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <AdminCard>
          <AdminCardBody>
            <div className="flex items-center justify-center min-h-64">
              <Loader2 className="w-6 h-6 animate-spin mr-3 text-pink-500" />
              <span className="text-gray-400">Loading configuration...</span>
            </div>
          </AdminCardBody>
        </AdminCard>
      ) : (
          <>
            {/* Statistics Cards - matching AdminProductsV2 style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AdminCard hover>
                <AdminCardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Connection</p>
                      <p className={`text-2xl font-bold ${providerStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {providerStatus.isConnected ? 'Connected' : 'Disconnected'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{providerStatus.lastChecked}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${providerStatus.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                      {providerStatus.isConnected ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <AlertCircle className="text-red-600" size={24} />
                      )}
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>

              <AdminCard hover>
                <AdminCardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Active Groups</p>
                      <p className="text-3xl font-bold text-blue-400">{providerStatus.activeGroups}</p>
                      <p className="text-xs text-slate-500 mt-1">{groups.length} available</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="text-blue-600" size={24} />
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>

              <AdminCard hover>
                <AdminCardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Provider</p>
                      <p className="text-xl font-bold text-purple-400">{provider?.display_name || provider?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{provider?.base_url || 'No provider'}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="text-purple-600" size={24} />
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>

              <AdminCard hover>
                <AdminCardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">API Usage</p>
                      <p className="text-3xl font-bold text-pink-400">{apiKey?.usage_count || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">{providerStatus.lastActivity}</p>
                    </div>
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Activity className="text-pink-600" size={24} />
                    </div>
                  </div>
                </AdminCardBody>
              </AdminCard>
            </div>

            {/* Quick Help Section */}
            <AdminCard className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <AdminCardBody>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/20 flex-shrink-0">
                    <Info className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
                    <p className="text-sm text-slate-400 mb-3">
                      Experiencing connection issues? Common errors and solutions:
                    </p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 font-bold mt-0.5">•</span>
                        <span><strong className="text-white">Device offline:</strong> Your WhatsApp device is not connected. Scan the QR code on your WooWA dashboard.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold mt-0.5">•</span>
                        <span><strong className="text-white">Incorrect API key:</strong> Verify your API key is correct and active in your NotifAPI account.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold mt-0.5">•</span>
                        <span><strong className="text-white">Connection failed:</strong> Check your internet connection and firewall settings.</span>
                      </li>
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href="https://woo-wa.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-sm font-medium transition-all"
                      >
                        <Info className="w-4 h-4" />
                        WooWA Documentation
                      </a>
                      <a
                        href="https://notifapi.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
                      >
                        <Smartphone className="w-4 h-4" />
                        NotifAPI Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </AdminCardBody>
            </AdminCard>

            {/* Alert Messages */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {message && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-300">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Success</p>
                    <p className="text-sm mt-1">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Current API Key */}
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
                        <p className="text-sm text-slate-400">API Key</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-mono text-white">
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
                        <p className="text-xs mt-1 text-slate-500">
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

            {/* Step 2: Update API Key */}
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
                        className="block text-sm font-medium mb-2 text-white"
                      >
                        New API Key <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="new-api-key"
                        type="text"
                        className="w-full px-4 py-3 rounded-lg font-mono text-sm bg-slate-800/50 border-2 border-slate-700 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="Paste new API key here"
                        aria-describedby="api-key-hint"
                      />
                      <p id="api-key-hint" className="text-xs mt-1.5 text-slate-500">
                        Get your API key from{' '}
                        <a 
                          href="https://woo-wa.com" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-pink-400 hover:underline"
                        >
                          WooWA Documentation
                        </a>
                        {' '} | {' '}
                        <a 
                          href="https://notifapi.com" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-pink-400 hover:underline"
                        >
                          NotifAPI Dashboard
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

            {/* Step 3 & 4: Group Configuration (Only show if API key is active) */}
            {apiKey?.is_active && (
              <>
                {/* Current Group Configuration */}
                <AdminCard className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <AdminCardHeader
                      title="3. Current Group Configuration"
                      subtitle="Active notification routing settings"
                      icon={<Users className="w-5 h-5 text-green-400" />}
                    />
                    <AdminCardBody>
                      {/* Default Group */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <Users className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Default Group</p>
                            <p className="text-base font-semibold text-white">
                              {groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Not set'}
                            </p>
                          </div>
                        </div>
                        {defaultGroupId && (
                          <p className="text-xs font-mono text-slate-500">{defaultGroupId}</p>
                        )}
                      </div>

                      {/* Notification Types Grid */}
                      <div className="mt-4">
                        <p className="text-sm mb-3 text-slate-400">Notification Routing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: 'purchase_orders', label: 'Purchase Orders' },
                            { key: 'rental_orders', label: 'Rental Orders' },
                            { key: 'flash_sales', label: 'Flash Sales' },
                            { key: 'general_notifications', label: 'General Notifications' }
                          ].map(item => (
                            <div 
                              key={item.key}
                              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                            >
                              <p className="text-xs text-slate-500">{item.label}</p>
                              <p className="text-sm font-medium mt-1 text-white">
                                {groups.find(g => g.id === groupConfigurations[item.key as keyof GroupConfiguration])?.name || 'Using default'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AdminCardBody>
                </AdminCard>

                {/* Select Groups */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        4. Select Groups
                      </h2>
                      <p className="text-sm mt-1 text-slate-400">
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
                              className="block text-sm font-medium mb-2 text-white"
                            >
                              Select Default Group
                            </label>
                            <select
                              id="default-group"
                              className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border-2 border-slate-700 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
                              value={defaultGroupId}
                              onChange={(e) => setDefaultGroupId(e.target.value)}
                            >
                              <option value="">-- Select a group --</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                            <p className="text-xs mt-1.5 text-slate-500">
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
                              className="block text-sm font-medium mb-2 text-slate-400"
                            >
                              Or Enter Group ID Manually
                            </label>
                            <input
                              id="manual-group-id"
                              type="text"
                              className="w-full px-4 py-3 rounded-lg font-mono text-sm bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
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
                        icon={<MessageCircle className="w-5 h-5 text-pink-400" />}
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
                                className="block text-sm font-medium mb-2 text-white"
                              >
                                {item.label}
                              </label>
                              <select
                                id={`routing-${item.key}`}
                                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-800/50 border border-slate-700 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
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
                </div>
              </>
            )}

            {/* Test Messaging Section */}
            <AdminCard>
                <AdminCardHeader
                  title="Test Messaging"
                  subtitle="Send a test message to verify configuration"
                  icon={<Send className="w-5 h-5 text-pink-400" />}
                />
                <AdminCardBody>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label 
                        htmlFor="test-group"
                        className="block text-sm font-medium mb-2 text-slate-400"
                      >
                        Target Group (Optional)
                      </label>
                      <select
                        id="test-group"
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
                        value={customGroupId}
                        onChange={(e) => setCustomGroupId(e.target.value)}
                      >
                        <option value="">-- Use default group --</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <p className="text-xs mt-1 text-slate-500">
                        Override default group for this test
                      </p>
                    </div>

                    <div>
                      <label 
                        htmlFor="test-message"
                        className="block text-sm font-medium mb-2 text-slate-400"
                      >
                        Test Message
                      </label>
                      <textarea
                        id="test-message"
                        className="w-full px-4 py-3 h-24 rounded-lg resize-none bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors"
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
                      <p className="text-xs text-slate-500">
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
          </>
        )}
    </div>
  );
};

export default AdminWhatsAppSettingsEnhanced;
