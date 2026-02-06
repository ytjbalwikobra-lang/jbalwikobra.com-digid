/**
 * Admin Flash Sales Management Page
 * WCAG 2.1 AA Compliant - Admin V3 Design System
 * Refactored for egress efficiency using adminService
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '../../components/Toast';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { AdminButton } from './components/ui/AdminButton';
import { AdminBentoCard, AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminPagination } from './components/AdminPagination';
import { Zap, TrendingUp, Clock, Package, Plus, Calendar, RefreshCw, Search } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/helpers';
import FlashSaleModal from './components/FlashSaleModal';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { useDebounce } from '../../hooks/useDebounce';
// Design system: cyber-compact.css (loaded via index.css)

interface FlashSaleRow {
  id: string;
  product_id: string;
  original_price: number;
  sale_price: number;
  start_time: string;
  end_time: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  products?: {
    name: string;
    price: number;
    image: string;
  };
}

const AdminFlashSales: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    ongoing: 0,
    upcoming: 0,
    expired: 0
  });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSaleRow | null>(null);
  
  // Search & Pagination (DNA from Products)
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const { push } = useToast();
  const confirm = useConfirmDialog();

  // Load all flash sales - no pagination for bento grid
  const loadFlashSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch data and stats in parallel
      const [result, statsResult] = await Promise.all([
        adminService.getFlashSales(1, 100), // Get first 100
        adminService.getFlashSaleStats()
      ]);
      
      setFlashSales(result.data as FlashSaleRow[]);
      setStats(statsResult);
    } catch (err: any) {
      const message = err?.message || 'Failed to load flash sales';
      setError(message);
      console.error('[FlashSales] Load error:', err);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadFlashSales();
  }, [loadFlashSales]);

  // Get time status for a flash sale
  const getTimeStatus = useCallback((sale: FlashSaleRow): 'ongoing' | 'upcoming' | 'expired' => {
    const now = new Date();
    const start = new Date(sale.start_time);
    const end = new Date(sale.end_time);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    return 'ongoing';
  }, []);

  // Get display status combining is_active and time status
  const getDisplayStatus = useCallback((sale: FlashSaleRow) => {
    const timeStatus = getTimeStatus(sale);
    
    if (!sale.is_active) return { status: 'inactive' as const, label: 'Nonaktif' };
    if (timeStatus === 'expired') return { status: 'inactive' as const, label: 'Berakhir' };
    if (timeStatus === 'upcoming') return { status: 'pending' as const, label: 'Terjadwal' };
    return { status: 'active' as const, label: 'Berlangsung' };
  }, [getTimeStatus]);

  // Handle delete
  const handleDelete = async (sale: FlashSaleRow) => {
    const productName = sale.products?.name || 'Unknown';
    const confirmed = await confirm({
      title: 'Hapus Flash Sale',
      message: `Anda akan menghapus flash sale untuk produk "${productName}".\n\nTindakan ini tidak dapat dibatalkan.\n\nLanjutkan?`,
      type: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });
    
    if (!confirmed) return;
    
    // Optimistic UI update
    const prevSales = flashSales;
    setFlashSales(prev => prev.filter(s => s.id !== sale.id));
    
    try {
      await adminService.deleteFlashSale(sale.id);
      push('Flash sale berhasil dihapus', 'success');
      // Reload to get updated stats
      loadFlashSales();
    } catch (error: any) {
      // Rollback on failure
      setFlashSales(prevSales);
      push('Gagal menghapus flash sale', 'error');
    }
  };

  // Modal handlers
  const handleCreate = () => {
    setSelectedFlashSale(null);
    setModalOpen(true);
  };

  const handleEdit = (sale: FlashSaleRow) => {
    setSelectedFlashSale(sale);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFlashSale(null);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setSelectedFlashSale(null);
    loadFlashSales();
    // Note: Toast is already shown by FlashSaleModal, no need to show duplicate
  };

  // Compact metrics
  const metricsData = useMemo(() => [
    {
      label: 'Total',
      value: stats.total,
      icon: <Package size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Berlangsung',
      value: stats.ongoing,
      icon: <Zap size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Terjadwal',
      value: stats.upcoming,
      icon: <Clock size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Berakhir',
      value: stats.expired,
      icon: <TrendingUp size={16} className="text-[var(--cyber-pink-primary)]" />
    }
  ], [stats]);

  // Filter flash sales by search term (DNA from Products)
  const filteredFlashSales = useMemo(() => {
    if (!debouncedSearch) return flashSales;
    
    const term = debouncedSearch.toLowerCase();
    return flashSales.filter(sale =>
      sale.products?.name?.toLowerCase().includes(term) ||
      sale.id?.toLowerCase().includes(term)
    );
  }, [flashSales, debouncedSearch]);

  // Paginate filtered flash sales (DNA from Products)
  const totalPages = Math.ceil(filteredFlashSales.length / itemsPerPage);
  const paginatedFlashSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFlashSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFlashSales, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  return (
    <div className="admin-page space-y-4">
      
      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="Flash Sales"
        subtitle={`${stats.ongoing} berlangsung • ${stats.upcoming} terjadwal`}
        badge="Live"
        badgeColor="warning"
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {/* Search Bar (DNA from Products) */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={loadFlashSales}
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
              Buat
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricsData.map((metric, idx) => (
          <AdminBentoMetricCard
            key={idx}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>

      {/* Flash Sales Bento Grid */}
      {loading ? (
        <AdminLoadingState variant="skeleton-cards" cards={8} />
      ) : filteredFlashSales.length === 0 ? (
        <AdminEmptyState 
          icon={<Zap className="w-12 h-12" />}
          title={debouncedSearch ? "No Flash Sales Match" : "No Flash Sales"}
          description={debouncedSearch ? "Try different search terms" : "Create your first flash sale"}
          hasFilters={!!debouncedSearch}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {paginatedFlashSales.map((sale) => {
            const displayStatus = getDisplayStatus(sale);
            const discount = Math.round((1 - sale.sale_price / sale.original_price) * 100);
            
            return (
              <AdminBentoCard
                key={sale.id}
                onClick={() => handleEdit(sale)}
                glowOnHover
              >
                {/* Product Image/Icon - 4:5 aspect ratio */}
                <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-[var(--cyber-pink-subtle)] to-[var(--cyber-bg-elevated)] mb-2 flex items-center justify-center">
                  {sale.products?.image ? (
                    <img
                      src={sale.products.image}
                      alt={sale.products?.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Zap className="w-12 h-12 text-[var(--cyber-pink-primary)]" />
                  )}
                  {/* Discount Badge */}
                  <div className="absolute top-1 left-1 px-2 py-1 bg-[var(--cyber-error)]/90 backdrop-blur-sm rounded text-xs font-bold text-white">
                    -{discount}%
                  </div>
                  {/* Status Badge */}
                  <div className="absolute top-1 right-1">
                    <AdminStatusBadge
                      status={displayStatus.status}
                      label={displayStatus.label}
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-white truncate">
                    {sale.products?.name || 'Unknown Product'}
                  </h3>
                  
                  {/* Pricing */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-[var(--cyber-pink-primary)]">
                      {formatCurrency(sale.sale_price)}
                    </span>
                    <span className="text-[10px] text-[var(--cyber-text-muted)] line-through">
                      {formatCurrency(sale.original_price)}
                    </span>
                  </div>

                  {/* Stock */}
                  <div className="flex items-center gap-1 text-[10px] text-[var(--cyber-text-muted)]">
                    <Package size={8} />
                    <span>Stok: {sale.stock}</span>
                  </div>

                  {/* Period */}
                  <div className="pt-1 border-t border-[var(--cyber-border)] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-[var(--cyber-text-muted)]">
                      <Calendar size={8} />
                      <span>{new Date(sale.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--cyber-text-muted)]">
                      <Clock size={8} />
                      <span>{new Date(sale.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(sale.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--cyber-border)]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(sale);
                    }}
                    className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--cyber-info)]/20 text-[var(--cyber-info)] hover:bg-[var(--cyber-info)]/30 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sale);
                    }}
                    className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--cyber-error)]/20 text-[var(--cyber-error)] hover:bg-[var(--cyber-error)]/30 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </AdminBentoCard>
            );
          })}
        </div>

        {/* Pagination (DNA from Products) */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredFlashSales.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </>
      )}

      {/* Flash Sale Modal */}
      <FlashSaleModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        flashSale={selectedFlashSale as any}
      />
    </div>
  );
};

export default AdminFlashSales;
