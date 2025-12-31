import React, { useEffect, useState } from 'react';
import { SettingsService } from '../../services/settingsService';
import { WebsiteSettings } from '../../types';
import { 
  Save, 
  Loader2, 
  Image as ImageIcon, 
  Globe, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Clock,
  Shield,
  Settings as SettingsIcon,
  Palette,
  Users,
  Bug,
  TestTube,
  Package,
  AlertCircle,
  Edit3,
  X,
  Check,
  Link,
  MessageCircle
} from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import { useToast } from '../../components/Toast';
// DS migration: replace legacy iOS components with DS panels/buttons
import { adminInputBase, adminCheckboxBase } from './components/ui/InputStyles';
import { adminNotificationService } from '../../services/adminNotificationService';
import { enhancedAdminService } from '../../services/enhancedAdminService';
import { AdminPageHeaderV2 } from './components/ui';

const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [form, setForm] = useState<any>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [phoneValidation, setPhoneValidation] = useState({ whatsapp: true, contact: true });
  const [activeSection, setActiveSection] = useState('general');
  const [testLoading, setTestLoading] = useState({ notification: false, product: false });
  const [editMode, setEditMode] = useState(false);
  const [originalForm, setOriginalForm] = useState<any>({});

  useEffect(() => { 
    (async () => {
      setLoading(true);
      try {
        console.log('🔍 AdminSettings: Loading website settings...');
        const s = await SettingsService.get();
        console.log('✅ AdminSettings: Settings loaded:', {
          heroButtonUrl: s.heroButtonUrl,
          topupGameUrl: s.topupGameUrl,
          whatsappChannelUrl: s.whatsappChannelUrl,
          jualAkunWhatsappUrl: s.jualAkunWhatsappUrl
        });
        setSettings(s);
        const formData = {
          // General Settings
          siteName: s.siteName || '',
          companyDescription: s.companyDescription || '',
          
          // Contact Information
          contactEmail: s.contactEmail || '',
          supportEmail: s.supportEmail || '',
          contactPhone: s.contactPhone || '',
          whatsappNumber: s.whatsappNumber || '',
          address: s.address || '',
          businessHours: s.businessHours || '',
          
          // Hero Section
          heroTitle: s.heroTitle || '',
          heroSubtitle: s.heroSubtitle || '',
          
          // Social Media
          facebookUrl: s.facebookUrl || '',
          instagramUrl: s.instagramUrl || '',
          twitterUrl: s.twitterUrl || '',
          tiktokUrl: s.tiktokUrl || '',
          youtubeUrl: s.youtubeUrl || '',
          
          // Footer Settings
          footerCopyrightText: s.footerCopyrightText || '',
          newsletterEnabled: s.newsletterEnabled !== false,
          socialMediaEnabled: s.socialMediaEnabled !== false,
          
          // Brand Assets
          logoUrl: s.logoUrl || '',
          faviconUrl: s.faviconUrl || '',
          
          // Additional URLs
          topupGameUrl: s.topupGameUrl || '',
          whatsappChannelUrl: s.whatsappChannelUrl || '',
          heroButtonUrl: s.heroButtonUrl || '',
          jualAkunWhatsappUrl: s.jualAkunWhatsappUrl || '',
        };
        setForm(formData);
        setOriginalForm({ ...formData });
      } catch (error) {
        showToast('Gagal memuat pengaturan', 'error');
      } finally {
        setLoading(false);
      }
    })(); 
  }, [showToast]);

  const save = async () => {
    // Validate phone numbers before saving
    if (!phoneValidation.whatsapp && form.whatsappNumber) {
      showToast('Nomor WhatsApp tidak valid. Pastikan format sudah benar.', 'error');
      return;
    }
    
    if (!phoneValidation.contact && form.contactPhone) {
      showToast('Nomor telepon tidak valid. Pastikan format sudah benar.', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await SettingsService.upsert({ ...form, logoFile, faviconFile });
      showToast('Pengaturan berhasil disimpan!', 'success');
      
      // Reset file states after successful save
      setLogoFile(null);
      setFaviconFile(null);
      setLogoPreview('');
      setFaviconPreview('');
      
      // Force refresh settings to bypass cache
      const updatedSettings = await SettingsService.forceRefresh();
      setSettings(updatedSettings);
      
      // Update original form and exit edit mode
      setOriginalForm({ ...form });
      setEditMode(false);
    } catch (error) {
      showToast('Gagal menyimpan pengaturan. Silakan coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Cancel edit - restore original form
      setForm({ ...originalForm });
      setLogoFile(null);
      setFaviconFile(null);
      setLogoPreview('');
      setFaviconPreview('');
    }
    setEditMode(!editMode);
  };

  const hasChanges = () => {
    return JSON.stringify(form) !== JSON.stringify(originalForm) || logoFile || faviconFile;
  };

  const handleTestNotification = async () => {
    setTestLoading(prev => ({ ...prev, notification: true }));
    try {
      await adminNotificationService.createTestNotification();
      showToast('Test notification berhasil dibuat!', 'success');
    } catch (error) {
      console.error('Failed to create test notification:', error);
      showToast('Gagal membuat test notification', 'error');
    } finally {
      setTestLoading(prev => ({ ...prev, notification: false }));
    }
  };

  const handleTestProduct = async () => {
    setTestLoading(prev => ({ ...prev, product: true }));
    try {
      const result = await enhancedAdminService.createTestProduct();
      if (result.success) {
        showToast('Test product berhasil dibuat!', 'success');
      } else {
        throw new Error(result.error || 'Failed to create test product');
      }
    } catch (error) {
      console.error('Failed to create test product:', error);
      showToast('Gagal membuat test product', 'error');
    } finally {
      setTestLoading(prev => ({ ...prev, product: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center gap-3 text-ds-text">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Memuat pengaturan...</span>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'general', label: 'Umum', icon: SettingsIcon },
    { id: 'contact', label: 'Kontak', icon: Phone },
    { id: 'social', label: 'Media Sosial', icon: Globe },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'links', label: 'Links & URLs', icon: Link },
    { id: 'hero', label: 'Hero Section', icon: Palette },
    { id: 'footer', label: 'Footer', icon: Users },
    { id: 'brand', label: 'Brand Assets', icon: ImageIcon },
    { id: 'debug', label: 'Debug', icon: Bug },
  ];

  return (
    <div className="p-4">
      <div className="space-y-6">
        {/* Enhanced Header with Edit Controls */}
        <div className="dashboard-data-panel padded rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ds-text flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-ds-pink" />
                Website Settings
              </h1>
              <p className="text-ds-text-secondary mt-1">
                Manage website configuration and company information
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={toggleEditMode}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Batal
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || !hasChanges()}
                    className="btn btn-primary bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Simpan
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleEditMode}
                  className="btn btn-primary bg-gradient-to-r from-ds-pink to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Settings
                </button>
              )}
            </div>
          </div>
          
          {editMode && hasChanges() && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Ada perubahan yang belum disimpan</span>
              </div>
            </div>
          )}
        </div>

        {/* Section Navigation */}
  <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-token">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                  ${activeSection === section.id
        ? 'bg-ds-pink text-white'
        : 'text-ds-text-secondary hover:text-ds-text hover:bg-[var(--bg-tertiary)]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* General Settings */}
        {activeSection === 'general' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Pengaturan Umum
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  Nama Website
                </label>
                <input 
                  value={form.siteName} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, siteName: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="Nama website/perusahaan"
                  disabled={!editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  Deskripsi Perusahaan
                </label>
                <textarea 
                  value={form.companyDescription} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, companyDescription: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  rows={4}
                  placeholder="Deskripsi singkat tentang perusahaan yang akan ditampilkan di footer"
                  disabled={!editMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {activeSection === 'contact' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Informasi Kontak
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Kontak
                  </label>
                  <input 
                    type="email"
                    value={form.contactEmail} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, contactEmail: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="contact@example.com"
                    disabled={!editMode}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Email Support
                  </label>
                  <input 
                    type="email"
                    value={form.supportEmail} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, supportEmail: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="support@example.com"
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Telepon Kontak
                  </label>
                  <PhoneInput
                    value={form.contactPhone}
                    onChange={(value) => editMode ? setForm((p: any) => ({...p, contactPhone: value})) : () => {}}
                    onValidationChange={(isValid) => setPhoneValidation(prev => ({...prev, contact: isValid}))}
                    placeholder="Masukkan Nomor Telepon"
                    className={`text-white ${!editMode ? 'pointer-events-none opacity-60' : ''}`}
                    disableAutoDetection={true}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    WhatsApp
                  </label>
                  <PhoneInput
                    value={form.whatsappNumber}
                    onChange={(value) => editMode ? setForm((p: any) => ({...p, whatsappNumber: value})) : () => {}}
                    onValidationChange={(isValid) => setPhoneValidation(prev => ({...prev, whatsapp: isValid}))}
                    placeholder="Masukkan Nomor WhatsApp"
                    className={`text-white ${!editMode ? 'pointer-events-none opacity-60' : ''}`}
                    disableAutoDetection={true}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Alamat
                </label>
                <textarea 
                  value={form.address} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, address: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  rows={3}
                  placeholder="Alamat lengkap perusahaan"
                  disabled={!editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Jam Operasional
                </label>
                <input 
                  value={form.businessHours} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, businessHours: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="Contoh: Senin-Jumat 09:00-17:00 atau 24/7"
                  disabled={!editMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Social Media */}
        {activeSection === 'social' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Media Sosial
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Facebook className="w-4 h-4 inline mr-2" />
                    Facebook URL
                  </label>
                  <input 
                    type="url"
                    value={form.facebookUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, facebookUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://facebook.com/username"
                    disabled={!editMode}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Instagram className="w-4 h-4 inline mr-2" />
                    Instagram URL
                  </label>
                  <input 
                    type="url"
                    value={form.instagramUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, instagramUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://instagram.com/username"
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Twitter className="w-4 h-4 inline mr-2" />
                    Twitter/X URL
                  </label>
                  <input 
                    type="url"
                    value={form.twitterUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, twitterUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://twitter.com/username"
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Youtube className="w-4 h-4 inline mr-2" />
                    YouTube URL
                  </label>
                  <input 
                    type="url"
                    value={form.youtubeUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, youtubeUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://youtube.com/channel/..."
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    TikTok URL
                  </label>
                  <input 
                    type="url"
                    value={form.tiktokUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, tiktokUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://tiktok.com/@username"
                    disabled={!editMode}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Configuration */}
        {activeSection === 'whatsapp' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp Configuration
            </h2>
            <div className="space-y-6">
              <div className="p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-200 mb-1">
                      WhatsApp Integration
                    </h4>
                    <p className="text-sm text-green-300">
                      Configure WhatsApp settings for customer communication and support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    WhatsApp Business Number
                  </label>
                  <PhoneInput
                    value={form.whatsappNumber}
                    onChange={(value) => editMode ? setForm((p: any) => ({...p, whatsappNumber: value})) : () => {}}
                    onValidationChange={(isValid) => setPhoneValidation(prev => ({...prev, whatsapp: isValid}))}
                    placeholder="Masukkan Nomor WhatsApp"
                    className={`text-white ${!editMode ? 'pointer-events-none opacity-60' : ''}`}
                    disableAutoDetection={true}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Nomor WhatsApp yang akan digunakan untuk komunikasi pelanggan
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    WhatsApp Channel URL
                  </label>
                  <input 
                    type="url"
                    value={form.whatsappChannelUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, whatsappChannelUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://whatsapp.com/channel/..."
                    disabled={!editMode}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    URL untuk channel broadcast WhatsApp
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-md font-semibold text-white mb-4">
                  Advanced WhatsApp Settings
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  For more advanced WhatsApp provider configuration, messaging settings, and group management, 
                  this would typically include provider connection status, group assignments, and messaging templates.
                </p>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">WhatsApp Provider Status</h4>
                      <p className="text-xs text-gray-400">Current provider connection and activity</p>
                    </div>
                    <div className="text-xs bg-green-600/20 text-green-300 px-3 py-1 rounded-full border border-green-600/30">
                      Connected
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Links & URLs */}
        {activeSection === 'links' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Link className="w-5 h-5" />
              Links & URLs
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    WhatsApp Channel URL
                  </label>
                  <input 
                    type="url"
                    value={form.whatsappChannelUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, whatsappChannelUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://whatsapp.com/channel/..."
                    disabled={!editMode}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    URL untuk channel broadcast WhatsApp
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <Package className="w-4 h-4 inline mr-2" />
                    Top Up Game URL
                  </label>
                  <input 
                    type="url"
                    value={form.topupGameUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, topupGameUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://example.com/topup-game"
                    disabled={!editMode}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    URL untuk halaman top up game
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <SettingsIcon className="w-4 h-4 inline mr-2" />
                    Hero Button URL
                  </label>
                  <input 
                    type="url"
                    value={form.heroButtonUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, heroButtonUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://example.com/special-offer"
                    disabled={!editMode}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    URL untuk tombol penawaran spesial di hero section homepage
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Jual Akun WhatsApp URL
                  </label>
                  <input 
                    type="url"
                    value={form.jualAkunWhatsappUrl} 
                    onChange={e => editMode ? setForm((p: any) => ({...p, jualAkunWhatsappUrl: e.target.value})) : undefined} 
                    className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="https://wa.me/6281234567890?text=..."
                    disabled={!editMode}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    URL WhatsApp untuk tombol "Jual dan Admin WA disini!" di homepage
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-200 mb-1">
                      Tentang Links & URLs
                    </h4>
                    <p className="text-sm text-blue-300">
                      URL ini digunakan untuk berbagai fitur di website. Pastikan URL yang dimasukkan valid dan dapat diakses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        {activeSection === 'hero' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-ds-text mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Hero Section
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Hero Title
                </label>
                <input 
                  value={form.heroTitle} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, heroTitle: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="Judul utama halaman"
                  disabled={!editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Hero Subtitle
                </label>
                <textarea 
                  value={form.heroSubtitle} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, heroSubtitle: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  rows={3}
                  placeholder="Deskripsi atau subtitle"
                  disabled={!editMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Settings */}
        {activeSection === 'footer' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-ds-text mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pengaturan Footer
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Teks Copyright
                </label>
                <input 
                  value={form.footerCopyrightText} 
                  onChange={e => editMode ? setForm((p: any) => ({...p, footerCopyrightText: e.target.value})) : undefined} 
                  className={`${adminInputBase} ${!editMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="All rights reserved."
                  disabled={!editMode}
                />
                <p className="text-xs text-ds-text-tertiary mt-2">
                  Teks yang akan ditampilkan di footer. Tahun akan ditambahkan otomatis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-xl border border-token">
                  <input 
                    type="checkbox"
                    checked={form.newsletterEnabled}
                    onChange={e => editMode ? setForm((p: any) => ({...p, newsletterEnabled: e.target.checked})) : () => {}}
                    className={`${adminCheckboxBase} ${!editMode ? 'pointer-events-none opacity-60' : ''}`}
                  />
                  <div>
                    <label className="text-sm font-medium text-ds-text">
                      Aktifkan Newsletter
                    </label>
                    <p className="text-xs text-ds-text-tertiary">
                      Tampilkan form berlangganan newsletter di footer
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-xl border border-token">
                  <input 
                    type="checkbox"
                    checked={form.socialMediaEnabled}
                    onChange={e => editMode ? setForm((p: any) => ({...p, socialMediaEnabled: e.target.checked})) : () => {}}
                    className={`${adminCheckboxBase} ${!editMode ? 'pointer-events-none opacity-60' : ''}`}
                  />
                  <div>
                    <label className="text-sm font-medium text-ds-text">
                      Tampilkan Media Sosial
                    </label>
                    <p className="text-xs text-ds-text-tertiary">
                      Tampilkan link media sosial di footer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand Assets */}
        {activeSection === 'brand' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Brand Assets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Logo Website
                </label>
                <div className="space-y-4">
                  <label className={`flex items-center justify-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-dashed border-white/30 rounded-xl transition-all duration-300 group ${
                    editMode 
                      ? 'hover:bg-white/20 hover:border-pink-500/50 cursor-pointer' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <ImageIcon className="w-5 h-5 text-white/60 group-hover:text-pink-400" />
                    <span className="text-white/80 group-hover:text-white">
                      {editMode ? 'Pilih Logo' : 'Logo (Edit mode required)'}
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      disabled={!editMode}
                      onChange={e => {
                        if (!editMode) return;
                        const f = e.target.files?.[0] || null; 
                        setLogoFile(f);
                        if (f) setLogoPreview(URL.createObjectURL(f));
                      }} 
                    />
                  </label>
                  {(logoPreview || settings?.logoUrl) && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/20">
                      <img 
                        src={logoPreview || settings?.logoUrl || ''} 
                        alt="Logo preview" 
                        className="h-16 w-auto mx-auto rounded-lg object-contain" 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Favicon
                </label>
                <div className="space-y-4">
                  <label className={`flex items-center justify-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-dashed border-white/30 rounded-xl transition-all duration-300 group ${
                    editMode 
                      ? 'hover:bg-white/20 hover:border-pink-500/50 cursor-pointer' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <ImageIcon className="w-5 h-5 text-white/60 group-hover:text-pink-400" />
                    <span className="text-white/80 group-hover:text-white">
                      {editMode ? 'Pilih Favicon' : 'Favicon (Edit mode required)'}
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      disabled={!editMode}
                      onChange={e => {
                        if (!editMode) return;
                        const f = e.target.files?.[0] || null; 
                        setFaviconFile(f);
                        if (f) setFaviconPreview(URL.createObjectURL(f));
                      }} 
                    />
                  </label>
                  {(faviconPreview || settings?.faviconUrl) && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/20">
                      <img 
                        src={faviconPreview || settings?.faviconUrl || ''} 
                        alt="Favicon preview" 
                        className="h-12 w-12 mx-auto rounded-lg object-contain" 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Section */}
        {activeSection === 'debug' && (
          <div className="dashboard-data-panel padded rounded-xl p-stack-lg">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Debug Tools
            </h2>
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Peringatan</span>
                </div>
                <p className="text-sm text-yellow-300/80">
                  Tools ini hanya untuk testing dan debugging. Jangan gunakan di production.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test Notification
                  </h3>
                  <p className="text-sm text-white/70">
                    Membuat notifikasi test untuk debugging sistem notifikasi
                  </p>
                  <button
                    onClick={handleTestNotification}
                    disabled={testLoading.notification}
                    className="btn btn-secondary btn-sm w-full"
                  >
                    {testLoading.notification ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Notifikasi
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Test Product
                  </h3>
                  <p className="text-sm text-white/70">
                    Membuat produk test untuk debugging sistem produk
                  </p>
                  <button
                    onClick={handleTestProduct}
                    disabled={testLoading.product}
                    className="btn btn-secondary btn-sm w-full"
                  >
                    {testLoading.product ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Test Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
