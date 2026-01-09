/**
 * Admin Flash Sales Management Page
 * WCAG 2.1 AA Compliant - Redesigned with Admin V3 Design System
 */

import React, { useState, useEffect } from 'react';
import { ProductService } from '../../services/productService';
import { useToast } from '../../components/Toast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { Zap, TrendingUp, Clock, Package, Plus, Trash2, RefreshCw, Edit2 } from 'lucide-react';
import '../../styles/admin-design-system-v3.css';
import { Product, FlashSale } from '../../types';
import FlashSaleModal from './components/FlashSaleModal';

type FlashSaleWithProduct = FlashSale & { product: Product };

const AdminFlashSales: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null);
  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  useEffect(() => {
    loadFlashSales();
  }, []);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getFlashSales();
      setFlashSales(data || []);
    } catch (error) {
      push('Gagal memuat flash sales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeStatus = (sale: FlashSaleWithProduct): 'ongoing' | 'upcoming' | 'expired' => {
    const now = new Date();
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    return 'ongoing';
  };

  const handleDelete = async (sale: FlashSaleWithProduct) => {
    const confirmed = await showConfirm({
      title: 'Hapus Flash Sale',
      message: `Anda akan menghapus flash sale untuk produk "${sale.product?.name || 'Unknown'}".\n\nTindakan ini tidak dapat dibatalkan.\n\nLanjutkan?`,
      type: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });
    
    if (!confirmed) return;
    
    try {
      // Optimistic UI update
      const prev = flashSales;
      setFlashSales(prev.filter(s => s.id !== sale.id));
      push('Flash sale berhasil dihapus', 'success');
      
      // Delete in background
      await ProductService.deleteFlashSale(sale.id);
    } catch (error) {
      // Rollback on failure
      loadFlashSales();
      push('Gagal menghapus flash sale', 'error');
    }
  };

  const handleCreate = () => {
    setSelectedFlashSale(null);
    setModalOpen(true);
  };

  const handleEdit = (sale: FlashSaleWithProduct) => {
    setSelectedFlashSale(sale);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFlashSale(null);
  };

  const handleModalSuccess = () => {
    // Reload to get updated data (flash sales have complex relationships)
    loadFlashSales();
  };

  const stats = {
    total: flashSales.length,
    active: flashSales.filter(s => s.isActive).length,
    ongoing: flashSales.filter(s => getTimeStatus(s) === 'ongoing').length,
    upcoming: flashSales.filter(s => getTimeStatus(s) === 'upcoming').length,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Manajemen Flash Sales
          </h1>
          <p className="text-gray-400 mt-1">
            Kelola penawaran produk dengan waktu terbatas
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadFlashSales}
            disabled={loading}
            icon={<RefreshCw size={18} />}
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Flash Sales</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Aktif</p>
                <p className="text-3xl font-bold text-green-400">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="text-green-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Sedang Berlangsung</p>
                <p className="text-3xl font-bold text-pink-400">{stats.ongoing}</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-pink-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Akan Datang</p>
                <p className="text-3xl font-bold text-orange-400">{stats.upcoming}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>
      </div>

      {/* Flash Sales List */}
      <AdminCard>
        <AdminCardHeader
          title="Daftar Flash Sales"
          subtitle={`${flashSales.length} total`}
        />
        <AdminCardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <p className="mt-4 text-slate-400">Memuat flash sales...</p>
            </div>
          ) : flashSales.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto text-slate-300" size={48} />
              <p className="mt-4 text-slate-400">Belum ada flash sale</p>
              <p className="text-sm text-slate-500 mt-2">Buat flash sale pertama Anda untuk memulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Harga</th>
                    <th>Periode Waktu</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {flashSales.map((sale) => {
                    const timeStatus = getTimeStatus(sale);
                    const originalPrice = sale.originalPrice || 0;
                    const salePrice = sale.salePrice || 0;
                    const discount = originalPrice > 0
                      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                      : 0;

                    return (
                      <tr key={sale.id}>
                        <td>
                          <div>
                            <p className="font-medium text-white">
                              {sale.product?.name || 'Unknown Product'}
                            </p>
                            <p className="text-sm text-slate-500">
                              ID: {sale.productId}
                            </p>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="font-bold text-pink-400">
                              Rp {(sale.salePrice || 0).toLocaleString('id-ID')}
                            </p>
                            <p className="text-sm text-slate-500 line-through">
                              Rp {(sale.originalPrice || 0).toLocaleString('id-ID')}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-semibold rounded">
                              {discount}% OFF
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <p className="text-slate-300">
                              <span className="font-medium text-slate-400">Mulai:</span>{' '}
                              {new Date(sale.startTime).toLocaleString('id-ID')}
                            </p>
                            <p className="text-slate-300 mt-1">
                              <span className="font-medium text-slate-400">Selesai:</span>{' '}
                              {new Date(sale.endTime).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-white">
                            {sale.stock || 0} unit
                          </span>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <AdminStatusBadge
                              status={sale.isActive ? 'active' : 'inactive'}
                              label={sale.isActive ? 'Aktif' : 'Nonaktif'}
                            />
                            <AdminStatusBadge
                              status={timeStatus === 'ongoing' ? 'active' : timeStatus === 'upcoming' ? 'pending' : 'inactive'}
                              label={timeStatus === 'ongoing' ? 'Berlangsung' : timeStatus === 'upcoming' ? 'Akan Datang' : 'Berakhir'}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <AdminButton
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(sale)}
                              icon={<Edit2 size={16} />}
                              aria-label="Edit flash sale"
                            >
                              Edit
                            </AdminButton>
                            <AdminButton
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(sale)}
                              icon={<Trash2 size={16} />}
                              aria-label="Hapus flash sale"
                            >
                              Hapus
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCardBody>
      </AdminCard>

      {/* Confirmation Modal */}
      <ConfirmModal />

      {/* Flash Sale Modal */}
      <FlashSaleModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        flashSale={selectedFlashSale}
      />
    </div>
  );
};

export default AdminFlashSales;
