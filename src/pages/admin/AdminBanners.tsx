/**
 * Admin Banners Management Page - Refactored
 * WCAG 2.1 AA Compliant - Admin V3 Design System
 * Uses modal-based CRUD with real image upload
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
import { AdminPageHeader } from './components/ui/AdminPageHeader';
import { AdminAnalyticsCards, AnalyticsStat } from './components/ui/AdminAnalyticsCards';
import { AdminPagination } from './components/AdminPagination';
import { BannerForm, BannerFormData } from './components/banners';
import { adminService } from '../../services/adminService';
// Design system: cyber-compact.css (loaded via index.css)

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Modal handlers
  const handleCreate = () => {
    setEditingBanner(null);
    setModalOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingBanner(null);
  };

  const handleSubmit = async (formData: BannerFormData) => {
    setSubmitting(true);
    try {
      if (editingBanner) {
        await adminService.updateBanner(editingBanner.id, formData);
        push('Banner berhasil diperbarui!', 'success');
      } else {
        await adminService.createBanner(formData);
        push('Banner berhasil dibuat!', 'success');
      }
      handleModalClose();
      loadBanners();
    } catch (error: any) {
      push(`Gagal menyimpan banner: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
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

  // Analytics stats config
  const analyticsStats: AnalyticsStat[] = useMemo(() => [
    {
      label: 'Total Banners',
      value: stats.total,
      icon: ImageIcon,
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-500/10',
      format: 'number'
    },
    {
      label: 'Aktif',
      value: stats.active,
      icon: Eye,
      iconColor: 'text-green-400',
      iconBgColor: 'bg-green-500/10',
      format: 'number'
    },
    {
      label: 'Nonaktif',
      value: stats.inactive,
      icon: EyeOff,
      iconColor: 'text-gray-400',
      iconBgColor: 'bg-gray-500/10',
      format: 'number'
    }
  ], [stats]);

  // Header actions
  const headerActions = (
    <>
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
        onClick={handleCreate}
        icon={<Plus size={18} />}
      >
        Tambah Banner
      </AdminButton>
    </>
  );

  return (
    <div className="admin-page space-y-8">
      <ConfirmModal />
      
      {/* Banner Form Modal */}
      <BannerForm
        isOpen={modalOpen}
        onClose={handleModalClose}
        editingBanner={editingBanner}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {/* Header - Using AdminPageHeader */}
      <AdminPageHeader
        title="Manajemen Banner"
        description={`${stats.active} banner aktif • ${stats.inactive} nonaktif`}
        actions={headerActions}
      />

      {/* Analytics Cards - Using AdminAnalyticsCards */}
      <AdminAnalyticsCards stats={analyticsStats} loading={loading} columns={3} />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--admin-primary-light)', border: '1px solid var(--admin-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'rgba(51, 65, 85, 0.5)', borderBottom: '1px solid var(--admin-border)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Gambar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Urutan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
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
                    onClick: handleCreate,
                    icon: <Plus size={18} />
                  }}
                />
              ) : (
                banners.map(banner => (
                  <tr key={banner.id} className="hover:bg-white/5 transition-colors">
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="w-24 h-14 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--admin-primary-lighter)' }}>
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
                          <p className="text-xs text-pink-500 mt-1">{banner.cta_text}</p>
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
                        <span className="text-gray-400">-</span>
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
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
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
