/**
 * Admin Banners Management Page
 * WCAG 2.1 AA Compliant - Admin V3 Design System
 * Refactored for egress efficiency using adminService
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, RefreshCw, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { Banner } from '../../types';
import { useToast } from '../../components/Toast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminPagination } from './components/AdminPagination';
import { adminService } from '../../services/adminService';
import { formatAnalyticsValue } from '../../utils/adminUtils';
import '../../styles/admin-design-system-v3.css';

interface BannerFormData {
  title: string;
  subtitle: string;
  link_url: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
  image_url: string;
}

const initialFormData: BannerFormData = {
  title: '',
  subtitle: '',
  link_url: '',
  cta_text: '',
  sort_order: 1,
  is_active: true,
  image_url: ''
};

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  
  // Form state
  const [formData, setFormData] = useState<BannerFormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  // Load banners with pagination
  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const [result, statsResult] = await Promise.all([
        adminService.getBanners(currentPage, itemsPerPage),
        adminService.getBannerStats()
      ]);
      
      setBanners(result.data as Banner[]);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
      setStats(statsResult);
    } catch (error: any) {
      console.error('[Banners] Load error:', error);
      push('Gagal memuat banners', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, push]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setPreviewUrl('');
    setEditingId(null);
    setShowForm(false);
  }, []);

  // Handle edit
  const handleEdit = useCallback((banner: Banner) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      link_url: banner.link_url || '',
      cta_text: banner.cta_text || '',
      sort_order: banner.sort_order,
      is_active: banner.is_active,
      image_url: banner.image_url || ''
    });
    setPreviewUrl(banner.image_url || '');
    setEditingId(banner.id);
    setShowForm(true);
  }, []);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      push('Judul wajib diisi', 'error');
      return;
    }

    if (!editingId && !formData.image_url.trim()) {
      push('URL gambar wajib diisi untuk banner baru', 'error');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        // Update existing banner
        await adminService.updateBanner(editingId, {
          title: formData.title,
          subtitle: formData.subtitle,
          link_url: formData.link_url,
          cta_text: formData.cta_text,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
          image_url: formData.image_url
        });
        push('Banner berhasil diperbarui', 'success');
      } else {
        // Create new banner
        await adminService.createBanner({
          title: formData.title,
          subtitle: formData.subtitle,
          image_url: formData.image_url,
          link_url: formData.link_url,
          cta_text: formData.cta_text,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        });
        push('Banner berhasil dibuat', 'success');
      }
      
      resetForm();
      loadBanners();
    } catch (error: any) {
      push(`Gagal menyimpan banner: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (banner: Banner) => {
    const confirmed = await showConfirm({
      title: 'Hapus Banner',
      message: `Anda akan menghapus banner "${banner.title}".\n\nTindakan ini tidak dapat dibatalkan.\n\nLanjutkan?`,
      type: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    // Optimistic UI update
    const prevBanners = banners;
    setBanners(prev => prev.filter(b => b.id !== banner.id));

    try {
      await adminService.deleteBanner(banner.id);
      push('Banner berhasil dihapus', 'success');
      loadBanners();
    } catch (error: any) {
      setBanners(prevBanners);
      push(`Gagal menghapus banner: ${error.message}`, 'error');
    }
  };

  // Analytics cards config
  const analyticsCards = useMemo(() => [
    {
      label: 'Total Banners',
      value: stats.total,
      icon: ImageIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Aktif',
      value: stats.active,
      icon: Eye,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Nonaktif',
      value: stats.inactive,
      icon: EyeOff,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-500/10'
    }
  ], [stats]);

  return (
    <div className="admin-page space-y-8">
      <ConfirmModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Manajemen Banner
          </h1>
          <p className="text-gray-400 mt-1">
            {stats.active} banner aktif • {stats.inactive} nonaktif
          </p>
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
            Tambah Banner
          </AdminButton>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {analyticsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className={`${card.bgColor} rounded-xl p-4 border border-gray-800 transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-bold text-white">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-gray-700 rounded animate-pulse" />
                    ) : (
                      formatAnalyticsValue(card.value)
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Banner' : 'Buat Banner Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="Masukkan judul banner"
                  required
                />
              </div>

              {/* Subtitle */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="Subtitle opsional"
                />
              </div>

              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL Gambar {!editingId && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, image_url: e.target.value }));
                    setPreviewUrl(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="https://..."
                />
                {previewUrl && (
                  <div className="mt-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-32 rounded-lg border border-gray-700"
                      onError={() => setPreviewUrl('')}
                    />
                  </div>
                )}
              </div>

              {/* CTA Text */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Teks CTA</label>
                <input
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="Contoh: Lihat Selengkapnya"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Link URL</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="/products atau https://..."
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Urutan</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
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
                  <span className="text-sm font-medium text-gray-300">Aktif</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 transition-all"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Gambar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Urutan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <AdminLoadingState variant="skeleton-table" rows={5} columns={6} />
              ) : banners.length === 0 ? (
                <AdminEmptyState 
                  icon={<ImageIcon className="w-16 h-16" />}
                  title="Belum ada Banner"
                  description="Buat banner pertama Anda untuk menampilkan konten promosi."
                  variant="table-row"
                  colSpan={6}
                  action={{
                    label: "Tambah Banner",
                    onClick: () => setShowForm(true),
                    icon: <Plus size={18} />
                  }}
                />
              ) : (
                banners.map(banner => (
                  <tr key={banner.id} className="hover:bg-gray-800/30 transition-colors">
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="w-24 h-14 bg-gray-800 rounded-lg overflow-hidden">
                        {banner.image_url ? (
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{banner.title}</p>
                        {banner.subtitle && (
                          <p className="text-sm text-gray-400">{banner.subtitle}</p>
                        )}
                        {banner.cta_text && (
                          <p className="text-xs text-pink-400 mt-1">{banner.cta_text}</p>
                        )}
                      </div>
                    </td>

                    {/* Link */}
                    <td className="px-4 py-3">
                      {banner.link_url ? (
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline truncate block max-w-[150px]"
                        >
                          {banner.link_url}
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Sort Order */}
                    <td className="px-4 py-3">
                      <span className="text-white">{banner.sort_order}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <AdminStatusBadge
                        status={banner.is_active ? 'active' : 'inactive'}
                        label={banner.is_active ? 'Aktif' : 'Nonaktif'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AdminBanners;
