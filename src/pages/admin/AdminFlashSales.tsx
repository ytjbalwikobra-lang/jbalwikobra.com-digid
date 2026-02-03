/**
 * Admin Flash Sales Management Page
 * WCAG 2.1 AA Compliant - Admin V3 Design System
 * Refactored for egress efficiency using adminService
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../components/Toast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminPageHeader } from './components/ui/AdminPageHeader';
import { AdminAnalyticsCards, AnalyticsStat } from './components/ui/AdminAnalyticsCards';
import { AdminPagination } from './components/AdminPagination';
import { Zap, TrendingUp, Clock, Package, Plus, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/helpers';
import FlashSaleModal from './components/FlashSaleModal';
import '../../styles/admin-design-system-v3.css';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
  
  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  // Load flash sales with pagination
  const loadFlashSales = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch data and stats in parallel for efficiency
      const [result, statsResult] = await Promise.all([
        adminService.getFlashSales(currentPage, itemsPerPage),
        adminService.getFlashSaleStats()
      ]);
      
      setFlashSales(result.data as FlashSaleRow[]);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
      setStats(statsResult);
    } catch (error: any) {
      console.error('[FlashSales] Load error:', error);
      push('Gagal memuat flash sales', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, push]);

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
    const confirmed = await showConfirm({
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
    push(selectedFlashSale ? 'Flash sale berhasil diperbarui!' : 'Flash sale berhasil dibuat!', 'success');
  };

  // Analytics stats config
  const analyticsStats: AnalyticsStat[] = useMemo(() => [
    {
      label: 'Total Flash Sales',
      value: stats.total,
      icon: Package,
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-500/10',
      format: 'number'
    },
    {
      label: 'Sedang Berlangsung',
      value: stats.ongoing,
      icon: Zap,
      iconColor: 'text-green-400',
      iconBgColor: 'bg-green-500/10',
      format: 'number'
    },
    {
      label: 'Terjadwal',
      value: stats.upcoming,
      icon: Clock,
      iconColor: 'text-orange-400',
      iconBgColor: 'bg-orange-500/10',
      format: 'number'
    },
    {
      label: 'Berakhir',
      value: stats.expired,
      icon: TrendingUp,
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
        onClick={loadFlashSales}
        disabled={loading}
        icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
      >
        Refresh
      </AdminButton>
      <AdminButton
        variant="primary"
        icon={<Plus size={18} />}
        onClick={handleCreate}
      >
        Buat Flash Sale
      </AdminButton>
    </>
  );

  return (
    <div className="admin-page space-y-8">
      <ConfirmModal />
      
      {/* Header - Using AdminPageHeader */}
      <AdminPageHeader
        title="Manajemen Flash Sales"
        description={`${stats.ongoing} sedang berlangsung • ${stats.upcoming} terjadwal`}
        actions={headerActions}
      />

      {/* Analytics Cards - Using AdminAnalyticsCards */}
      <AdminAnalyticsCards stats={analyticsStats} loading={loading} columns={4} />

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Produk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Harga</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Periode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <AdminLoadingState variant="skeleton-table" rows={5} columns={5} />
              ) : flashSales.length === 0 ? (
                <AdminEmptyState 
                  icon={<Zap className="w-16 h-16" />}
                  title="Belum ada Flash Sale"
                  description="Buat flash sale pertama Anda untuk menarik lebih banyak pelanggan."
                  variant="table-row"
                  colSpan={5}
                  action={{
                    label: "Buat Flash Sale",
                    onClick: handleCreate,
                    icon: <Plus size={18} />
                  }}
                />
              ) : (
                flashSales.map(sale => {
                  const displayStatus = getDisplayStatus(sale);
                  const discount = sale.original_price > 0
                    ? Math.round(((sale.original_price - sale.sale_price) / sale.original_price) * 100)
                    : 0;

                  return (
                    <tr key={sale.id} className="hover:bg-gray-800/30 transition-colors">
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {sale.products?.image ? (
                            <img 
                              src={sale.products.image} 
                              alt={sale.products?.name} 
                              className="w-10 h-10 rounded-lg object-cover" 
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {sale.products?.name || 'Unknown Product'}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {sale.product_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-pink-400">
                            {formatCurrency(sale.sale_price)}
                          </p>
                          <p className="text-sm text-gray-400 line-through">
                            {formatCurrency(sale.original_price)}
                          </p>
                          {discount > 0 && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs font-semibold rounded">
                              -{discount}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          <p className="text-gray-300">
                            <span className="text-gray-500">Mulai:</span>{' '}
                            {new Date(sale.start_time).toLocaleString('id-ID', { 
                              dateStyle: 'short', 
                              timeStyle: 'short' 
                            })}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-500">Selesai:</span>{' '}
                            {new Date(sale.end_time).toLocaleString('id-ID', { 
                              dateStyle: 'short', 
                              timeStyle: 'short' 
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <AdminStatusBadge
                          status={displayStatus.status}
                          label={displayStatus.label}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sale)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
