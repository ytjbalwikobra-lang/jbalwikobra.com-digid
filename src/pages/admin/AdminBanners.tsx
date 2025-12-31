/**
 * Admin Banners Management - V3 Design System
 * Clean implementation with modern design
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Banner } from '../../types';
import { BannerService } from '../../services/bannerService';
import { useToast } from '../../components/Toast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import '../../styles/admin-design-system-v3.css';

interface BannerFormData {
  title: string;
  subtitle: string;
  link_url: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
}

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    subtitle: '',
    link_url: '',
    cta_text: '',
    sort_order: 1,
    is_active: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await BannerService.list();
      setBanners(data || []);
    } catch (error: any) {
      push(`Failed to load banners: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      link_url: '',
      cta_text: '',
      sort_order: 1,
      is_active: true
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (banner: Banner) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      link_url: banner.link_url || '',
      cta_text: banner.cta_text || '',
      sort_order: banner.sort_order,
      is_active: banner.is_active
    });
    setPreviewUrl(banner.image_url || '');
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      push('Title is required', 'error');
      return;
    }

    if (!editingId && !selectedFile) {
      push('Image is required for new banner', 'error');
      return;
    }

    try {
      if (editingId) {
        // Update existing banner
        const existingBanner = banners.find(b => b.id === editingId);
        if (existingBanner) {
          // Optimistic UI update
          const optimisticBanner = {
            ...existingBanner,
            ...formData
          };
          setBanners(prev => prev.map(b => b.id === editingId ? optimisticBanner : b));
          push('Banner updated successfully', 'success');
          resetForm();
          
          // Update in background
          try {
            const updated = await BannerService.update(editingId, optimisticBanner);
            if (updated) {
              setBanners(prev => prev.map(b => b.id === editingId ? updated : b));
            }
          } catch (error: any) {
            // Rollback on failure
            setBanners(prev => prev.map(b => b.id === editingId ? existingBanner : b));
            push(`Failed to update banner: ${error.message}`, 'error');
          }
        }
      } else {
        // Create new banner - show loading state
        push('Creating banner...', 'info');
        const created = await BannerService.create({
          title: formData.title,
          subtitle: formData.subtitle,
          image_url: '', // Will be set by service
          link_url: formData.link_url,
          cta_text: formData.cta_text,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        });
        if (created) {
          setBanners(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
          push('Banner created successfully', 'success');
          resetForm();
        }
      }
    } catch (error: any) {
      push(`Failed to save banner: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (banner: Banner) => {
    const confirmed = await showConfirm({
      title: 'Hapus Banner',
      message: `Apakah Anda yakin ingin menghapus "${banner.title}"? Tindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    try {
      const success = await BannerService.remove(banner.id, banner.image_url || '');
      if (success) {
        setBanners(prev => prev.filter(b => b.id !== banner.id));
        push('Banner deleted successfully', 'success');
      }
    } catch (error: any) {
      push(`Failed to delete banner: ${error.message}`, 'error');
    }
  };

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.is_active).length,
    inactive: banners.filter(b => !b.is_active).length
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Banners Management
          </h1>
          <p className="text-gray-400 mt-1">Manage website banners and promotional content</p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadBanners}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={() => setShowForm(true)}
            icon={<Plus size={18} />}
          >
            Add Banner
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Banners</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="text-blue-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="text-green-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Inactive</p>
                <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Eye className="text-gray-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>
      </div>

      {/* Form Card */}
      {showForm && (
        <AdminCard>
          <AdminCardHeader
            title={editingId ? 'Edit Banner' : 'Create New Banner'}
            subtitle="Fill in the banner details"
          />
          <AdminCardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="admin-label">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="admin-input"
                    placeholder="Enter banner title"
                    required
                  />
                </div>

                {/* Subtitle */}
                <div className="md:col-span-2">
                  <label className="admin-label">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="admin-input"
                    placeholder="Enter banner subtitle (optional)"
                  />
                </div>

                {/* CTA Text */}
                <div>
                  <label className="admin-label">CTA Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                    className="admin-input"
                    placeholder="e.g., Learn More, Shop Now"
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label className="admin-label">Link URL</label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    className="admin-input"
                    placeholder="/products or https://..."
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="admin-label">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                    className="admin-input"
                    min="1"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-pink-600 bg-gray-800 border-gray-700 rounded focus:ring-pink-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-300">Active</span>
                  </label>
                </div>

                {/* Image Upload */}
                <div className="md:col-span-2">
                  <label className="admin-label">
                    Banner Image {!editingId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="admin-input"
                  />
                  {previewUrl && (
                    <div className="mt-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-48 rounded-lg border border-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <AdminButton
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                >
                  Batal
                </AdminButton>
                <AdminButton
                  type="submit"
                  variant="primary"
                >
                  {editingId ? 'Perbarui Banner' : 'Buat Banner'}
                </AdminButton>
              </div>
            </form>
          </AdminCardBody>
        </AdminCard>
      )}

      {/* Banners List */}
      <AdminCard>
        <AdminCardHeader
          title="All Banners"
          subtitle={`${banners.length} total banners`}
        />
        <AdminCardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <p className="mt-4 text-slate-400">Loading banners...</p>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto text-slate-600" size={48} />
              <p className="mt-4 text-slate-400">No banners found</p>
              <p className="text-sm text-slate-500 mt-2">Create your first banner to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Link</th>
                    <th>Sort Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner) => (
                    <tr key={banner.id}>
                      <td>
                        <div className="w-24 h-16 bg-slate-800 rounded overflow-hidden">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={20} className="text-slate-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-white">{banner.title}</p>
                          {banner.subtitle && (
                            <p className="text-sm text-slate-400">{banner.subtitle}</p>
                          )}
                          {banner.cta_text && (
                            <p className="text-xs text-pink-400 mt-1">{banner.cta_text}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        {banner.link_url ? (
                          <a
                            href={banner.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                          >
                            {banner.link_url.length > 30
                              ? banner.link_url.substring(0, 30) + '...'
                              : banner.link_url}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td>
                        <span className="text-white">{banner.sort_order}</span>
                      </td>
                      <td>
                        <AdminStatusBadge
                          status={banner.is_active ? 'active' : 'inactive'}
                          label={banner.is_active ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <AdminButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(banner)}
                            icon={<Edit size={16} />}
                          >
                            Edit
                          </AdminButton>
                          <AdminButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(banner)}
                            icon={<Trash2 size={16} />}
                          >
                            Hapus
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCardBody>
      </AdminCard>

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
};

export default AdminBanners;
