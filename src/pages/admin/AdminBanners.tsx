/**
 * Admin Banners Management Page - Refactored
 * WCAG 2.1 AA Compliant - Admin V3 Design System
 * Uses modal-based CRUD with real image upload
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Image as ImageIcon, Eye, EyeOff, ExternalLink, ArrowUpDown, RefreshCw, Search } from 'lucide-react';
import { Banner } from '../../types';
import { useToast } from '../../components/Toast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminBentoCard, AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminPagination } from './components/AdminPagination';
import { BannerForm, BannerFormData } from './components/banners';
import { adminService } from '../../services/adminService';
import { useDebounce } from '../../hooks/useDebounce';
// Design system: cyber-compact.css (loaded via index.css)

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination (DNA from Products)
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  // Load all banners - no pagination for bento grid
  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, statsResult] = await Promise.all([
        adminService.getBanners(1, 100), // Get first 100 banners
        adminService.getBannerStats()
      ]);
      
      setBanners(result.data as Banner[]);
      setStats(statsResult);
    } catch (err: any) {
      const message = err?.message || 'Failed to load banners';
      setError(message);
      console.error('[Banners] Load error:', err);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

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

  // Compact metrics
  const metricsData = useMemo(() => [
    {
      label: 'Total',
      value: stats.total,
      icon: <ImageIcon size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Aktif',
      value: stats.active,
      icon: <Eye size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Nonaktif',
      value: stats.inactive,
      icon: <EyeOff size={16} className="text-[var(--cyber-pink-primary)]" />
    }
  ], [stats]);

  // Filter banners by search term (DNA from Products)
  const filteredBanners = useMemo(() => {
    if (!debouncedSearch) return banners;
    
    const term = debouncedSearch.toLowerCase();
    return banners.filter(banner =>
      banner.title?.toLowerCase().includes(term) ||
      banner.link_url?.toLowerCase().includes(term) ||
      banner.subtitle?.toLowerCase().includes(term) ||
      banner.id?.toLowerCase().includes(term)
    );
  }, [banners, debouncedSearch]);

  // Paginate filtered banners (DNA from Products)
  const totalPages = Math.ceil(filteredBanners.length / itemsPerPage);
  const paginatedBanners = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBanners.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBanners, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  return (
    <div className="admin-page space-y-4">
      <ConfirmModal />
      
      {/* Banner Form Modal */}
      <BannerForm
        isOpen={modalOpen}
        onClose={handleModalClose}
        editingBanner={editingBanner}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="Banner Management"
        subtitle={`${stats.active} aktif • ${stats.inactive} nonaktif`}
        badge="Live"
        badgeColor="success"
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {/* Search Bar (DNA from Products) */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search banners by title, link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={loadBanners}
              disabled={loading}
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            >
              Refresh
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleCreate}
              size="sm"
              icon={<Plus size={14} />}
            >
              Tambah
            </AdminButton>
          </div>
        </div>
      </AdminHeroSection>

      {/* Error Banner */}
      {error && (
        <AdminErrorState
          variant="banner"
          message={error}
        />
      )}

      {/* Compact Metrics - Bento Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metricsData.map((metric, idx) => (
          <AdminBentoMetricCard
            key={idx}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>

      {/* Banners Bento Grid */}
      {loading ? (
        <AdminLoadingState variant="skeleton-cards" cards={6} />
      ) : filteredBanners.length === 0 ? (
        <AdminEmptyState 
          icon={<ImageIcon className="w-12 h-12" />}
          title={debouncedSearch ? "No Banners Match" : "No Banners Found"}
          description={debouncedSearch ? "Try different search terms" : "Create your first banner to get started"}
          hasFilters={!!debouncedSearch}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedBanners.map((banner) => (
            <AdminBentoCard
              key={banner.id}
              onClick={() => handleEdit(banner)}
              glowOnHover
            >
              {/* Banner Image - 16:9 aspect ratio */}
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--cyber-bg-elevated)] mb-2">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-[var(--cyber-text-muted)]" />
                  </div>
                )}
                {/* Sort Order Badge */}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white flex items-center gap-0.5">
                  <ArrowUpDown size={8} />
                  {banner.sort_order}
                </div>
                {/* Status Badge */}
                <div className="absolute top-1 right-1">
                  <AdminStatusBadge
                    status={banner.is_active ? 'active' : 'inactive'}
                    label={banner.is_active ? 'Aktif' : 'Nonaktif'}
                  />
                </div>
              </div>

              {/* Banner Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-white truncate">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-[10px] text-[var(--cyber-text-muted)] truncate">
                    {banner.subtitle}
                  </p>
                )}
                {banner.cta_text && (
                  <p className="text-[10px] text-[var(--cyber-pink-primary)] truncate">
                    {banner.cta_text}
                  </p>
                )}
                {banner.link_url && (
                  <div className="flex items-center gap-1 pt-1 border-t border-[var(--cyber-border)]">
                    <ExternalLink size={8} className="text-[var(--cyber-text-muted)]" />
                    <span className="text-[10px] text-[var(--cyber-text-muted)] truncate">
                      {banner.link_url.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--cyber-border)]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(banner);
                  }}
                  className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--cyber-info)]/20 text-[var(--cyber-info)] hover:bg-[var(--cyber-info)]/30 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(banner);
                  }}
                  className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--cyber-error)]/20 text-[var(--cyber-error)] hover:bg-[var(--cyber-error)]/30 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </AdminBentoCard>
          ))}
        </div>

        {/* Pagination (DNA from Products) */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredBanners.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </>
      )}
    </div>
  );
};

export default AdminBanners;
