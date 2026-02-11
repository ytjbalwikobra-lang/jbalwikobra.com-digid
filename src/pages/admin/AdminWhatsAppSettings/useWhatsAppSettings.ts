/**
 * useWhatsAppSettings.ts
 * Custom hook untuk mengelola state dan operasi API konfigurasi WhatsApp
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../../components/Toast';
import { adminService } from '../../../services/adminService';
import { SettingsService } from '../../../services/settingsService';
import { parseErrorMessage } from '../../../utils/adminUtils';
import type {
  ProviderSettings,
  ApiKeyInfo,
  WhatsAppGroup,
  GroupConfiguration,
  ResultModalState
} from './types';
import { MESSAGE_TEMPLATES } from './types';

/** Hook untuk mengelola seluruh state dan operasi halaman WhatsApp Settings */
export function useWhatsAppSettings() {
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

  /** Muat pengaturan WhatsApp dari server */
  const loadSettings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const [settings, groupsData] = await Promise.all([
        adminService.getWhatsAppSettings(forceRefresh),
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
      if (settings.apiKey) setApiKey(settings.apiKey);
      setGroups(groupsData);
      // Set pesan test awal
      const template = MESSAGE_TEMPLATES.find(t => t.id === 'simple');
      if (template?.text) {
        const ts = Date.now().toString().slice(-6);
        setTestMessage(template.text.replace(/{timestamp}/g, ts));
      }
    } catch (err) {
      showToast('Failed to load settings: ' + parseErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  /** Perbarui API key */
  const updateApiKeyAction = async () => {
    if (!newApiKey.trim()) { showToast('Please enter a valid API key', 'error'); return; }
    setUpdatingKey(true);
    try {
      const result = await adminService.updateWhatsAppApiKey(newApiKey);
      showToast('API key updated successfully!', 'success');
      setNewApiKey('');
      setLastUpdated(new Date());
      setApiKey(prev => prev ? { ...prev, api_key: result.api_key, is_active: true } : null);
      if (result.provider) setProvider(result.provider);
      SettingsService.clearCache();
      window.dispatchEvent(new CustomEvent('whatsapp-settings-updated', { detail: { apiKeyUpdated: true } }));
    } catch (err) {
      showToast('Failed to update API key: ' + parseErrorMessage(err), 'error');
    } finally {
      setUpdatingKey(false);
    }
  };

  /** Simpan konfigurasi routing grup */
  const saveConfig = async () => {
    setSaving(true);
    try {
      const result = await adminService.updateWhatsAppConfig({
        default_group_id: defaultGroupId || null,
        group_configurations: groupConfigurations
      });
      if (result.provider) setProvider(result.provider);
      setLastUpdated(new Date());
      SettingsService.clearCache();
      window.dispatchEvent(new CustomEvent('whatsapp-settings-updated', { detail: { groupConfigurations, defaultGroupId } }));
      showToast('Configuration saved!', 'success');
    } catch (err) {
      showToast('Failed to save: ' + parseErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  /** Kirim pesan test */
  const testSend = async () => {
    if (!testMessage.trim()) { showToast('Please enter a message or select a template', 'error'); return; }
    setTesting(true);
    const targetGroup = customGroupId || defaultGroupId;
    try {
      const result = await adminService.sendTestWhatsAppMessage(testMessage, targetGroup);
      setResultModal({
        isOpen: true, success: true,
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
        isOpen: true, success: false,
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

  /** Terapkan grup default ke semua jenis notifikasi */
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

  /** Handler perubahan template */
  const handleTemplateChange = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    setSelectedTemplate(templateId);
    if (template?.text) {
      const ts = Date.now().toString().slice(-6);
      setTestMessage(template.text.replace(/{timestamp}/g, ts).replace(/\\n/g, '\n'));
    }
  };

  return {
    // Data
    provider, apiKey, groups,
    // Form
    defaultGroupId, setDefaultGroupId,
    groupConfigurations, setGroupConfigurations,
    newApiKey, setNewApiKey,
    // Test messaging
    testMessage, setTestMessage,
    customGroupId, setCustomGroupId,
    selectedTemplate, handleTemplateChange,
    // UI
    loading, saving, updatingKey, testing,
    showApiKey, setShowApiKey,
    copied, setCopied,
    lastUpdated, resultModal, setResultModal,
    // Actions
    loadSettings, updateApiKeyAction, saveConfig, testSend,
    applyToAllNotifications
  };
}
