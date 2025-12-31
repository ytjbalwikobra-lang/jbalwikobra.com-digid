/**
 * Admin Settings Page - V3 Design System
 * WCAG 2.1 AA Compliant - Simplified CRUD
 */

import React, { useEffect, useState } from 'react';
import { SettingsService } from '../../services/settingsService';
import { WebsiteSettings } from '../../types';
import { 
  Save, 
  Loader2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import '../../styles/admin-design-system-v3.css';

const AdminSettings: React.FC = () => {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  
  const [form, setForm] = useState({
    // General
    siteName: '',
    companyDescription: '',
    
    // Contact
    contactEmail: '',
    supportEmail: '',
    contactPhone: '',
    whatsappNumber: '',
    address: '',
    
    // Hero Section
    heroTitle: '',
    heroSubtitle: '',
    heroButtonUrl: '',
    
    // Social Media
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    
    // Additional URLs
    topupGameUrl: '',
    whatsappChannelUrl: '',
    jualAkunWhatsappUrl: '',
    
    // Footer
    footerCopyrightText: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const s = await SettingsService.get();
      setSettings(s);
      setForm({
        siteName: s.siteName || '',
        companyDescription: s.companyDescription || '',
        contactEmail: s.contactEmail || '',
        supportEmail: s.supportEmail || '',
        contactPhone: s.contactPhone || '',
        whatsappNumber: s.whatsappNumber || '',
        address: s.address || '',
        heroTitle: s.heroTitle || '',
        heroSubtitle: s.heroSubtitle || '',
        heroButtonUrl: s.heroButtonUrl || '',
        facebookUrl: s.facebookUrl || '',
        instagramUrl: s.instagramUrl || '',
        twitterUrl: s.twitterUrl || '',
        youtubeUrl: s.youtubeUrl || '',
        topupGameUrl: s.topupGameUrl || '',
        whatsappChannelUrl: s.whatsappChannelUrl || '',
        jualAkunWhatsappUrl: s.jualAkunWhatsappUrl || '',
        footerCopyrightText: s.footerCopyrightText || '',
      });
    } catch (error) {
      push('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await SettingsService.upsert(form);
      push('Settings saved successfully!', 'success');
      
      // Refresh settings
      const updatedSettings = await SettingsService.forceRefresh();
      setSettings(updatedSettings);
    } catch (error) {
      push('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Website Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your website configuration and information
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadSettings}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </AdminButton>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Information */}
        <AdminCard>
          <AdminCardHeader
            title="General Information"
            subtitle="Basic website information"
            icon={<Globe size={20} />}
          />
          <AdminCardBody>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="admin-label">Site Name</label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => handleChange('siteName', e.target.value)}
                  className="admin-input"
                  placeholder="My Website"
                />
              </div>

              <div>
                <label className="admin-label">Company Description</label>
                <textarea
                  value={form.companyDescription}
                  onChange={(e) => handleChange('companyDescription', e.target.value)}
                  className="admin-input"
                  rows={3}
                  placeholder="Brief description of your company..."
                />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Contact Information */}
        <AdminCard>
          <AdminCardHeader
            title="Contact Information"
            subtitle="Customer contact details"
            icon={<Phone size={20} />}
          />
          <AdminCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="admin-label">
                  <Mail className="inline mr-1" size={16} />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="admin-input"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Mail className="inline mr-1" size={16} />
                  Support Email
                </label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="admin-input"
                  placeholder="support@example.com"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Phone className="inline mr-1" size={16} />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  className="admin-input"
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Phone className="inline mr-1" size={16} />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                  className="admin-input"
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div className="md:col-span-2">
                <label className="admin-label">
                  <MapPin className="inline mr-1" size={16} />
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="admin-input"
                  rows={2}
                  placeholder="Your business address..."
                />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Hero Section */}
        <AdminCard>
          <AdminCardHeader
            title="Hero Section"
            subtitle="Homepage hero section content"
            icon={<Globe size={20} />}
          />
          <AdminCardBody>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="admin-label">Hero Title</label>
                <input
                  type="text"
                  value={form.heroTitle}
                  onChange={(e) => handleChange('heroTitle', e.target.value)}
                  className="admin-input"
                  placeholder="Welcome to Our Store"
                />
              </div>

              <div>
                <label className="admin-label">Hero Subtitle</label>
                <textarea
                  value={form.heroSubtitle}
                  onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                  className="admin-input"
                  rows={2}
                  placeholder="Your tagline or description..."
                />
              </div>

              <div>
                <label className="admin-label">Hero Button URL</label>
                <input
                  type="url"
                  value={form.heroButtonUrl}
                  onChange={(e) => handleChange('heroButtonUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Social Media */}
        <AdminCard>
          <AdminCardHeader
            title="Social Media Links"
            subtitle="Connect your social media accounts"
          />
          <AdminCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="admin-label">
                  <Facebook className="inline mr-1" size={16} />
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) => handleChange('facebookUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Instagram className="inline mr-1" size={16} />
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={form.instagramUrl}
                  onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Twitter className="inline mr-1" size={16} />
                  Twitter URL
                </label>
                <input
                  type="url"
                  value={form.twitterUrl}
                  onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>

              <div>
                <label className="admin-label">
                  <Youtube className="inline mr-1" size={16} />
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://youtube.com/yourchannel"
                />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Additional URLs */}
        <AdminCard>
          <AdminCardHeader
            title="Additional URLs"
            subtitle="External links and integrations"
          />
          <AdminCardBody>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="admin-label">Top-up Game URL</label>
                <input
                  type="url"
                  value={form.topupGameUrl}
                  onChange={(e) => handleChange('topupGameUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://topup.example.com"
                />
              </div>

              <div>
                <label className="admin-label">WhatsApp Channel URL</label>
                <input
                  type="url"
                  value={form.whatsappChannelUrl}
                  onChange={(e) => handleChange('whatsappChannelUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://whatsapp.com/channel/..."
                />
              </div>

              <div>
                <label className="admin-label">Jual Akun WhatsApp URL</label>
                <input
                  type="url"
                  value={form.jualAkunWhatsappUrl}
                  onChange={(e) => handleChange('jualAkunWhatsappUrl', e.target.value)}
                  className="admin-input"
                  placeholder="https://wa.me/..."
                />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Footer Settings */}
        <AdminCard>
          <AdminCardHeader
            title="Footer Settings"
            subtitle="Footer content and copyright"
          />
          <AdminCardBody>
            <div>
              <label className="admin-label">Copyright Text</label>
              <input
                type="text"
                value={form.footerCopyrightText}
                onChange={(e) => handleChange('footerCopyrightText', e.target.value)}
                className="admin-input"
                placeholder="© 2025 Your Company. All rights reserved."
              />
            </div>
          </AdminCardBody>
        </AdminCard>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end">
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            size="lg"
          >
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </AdminButton>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
