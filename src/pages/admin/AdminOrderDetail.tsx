import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, User, Calendar, CreditCard, Phone, ArrowLeft } from 'lucide-react';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { formatCurrency } from '../../utils/helpers';
import { useModalData } from '../../hooks/useModalData';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import AdminHeroSection from './components/ui/AdminHeroSection';
import { adminCache } from '../../services/adminCache';

/**
 * AdminOrderDetail - Full Page Order Details
 * Route: /admin/orders/:orderId
 */

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_phone?: string;
  product_name: string;
  product_image?: string;
  amount: number;
  order_type: 'purchase' | 'rental';
  rental_duration?: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

const AdminOrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Use useModalData hook with caching for instant loads
  const {
    data: order,
    loading,
    error,
    refetch
  } = useModalData<OrderDetails>({
    isOpen: true,
    entityId: orderId,
    requiresId: true,
    fetchFn: async (id) => {
      // Use cache for instant loads on recently viewed orders (1min TTL)
      return adminCache.getOrFetch(
        `admin:order:${id}`,
        async () => {
          const sessionToken = localStorage.getItem('session_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
          }

          const response = await fetch(`/api/admin?action=get-order&orderId=${id}`, { headers });
          if (!response.ok) {
            throw new Error(`Failed to fetch order: ${response.status}`);
          }
          const data = await response.json();
          return data.order;
        },
        { ttl: 60 * 1000 } // 1 minute cache for order details
      );
    },
    onError: (err) => {
      console.error('Error fetching order details:', err);
    }
  });

  const handleMarkComplete = async () => {
    if (!order) return;
    setUpdating(true);
    setActionError(null);

    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/admin?action=update-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId: order.id, status: 'completed' })
      });

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.status}`);
      }

      // Invalidate cache for orders list and this specific order
      adminCache.invalidatePattern('admin:orders');
      adminCache.invalidate(`admin:order:${order.id}`);

      await refetch();
    } catch (err) {
      console.error('Gagal menyelesaikan order:', err);
      setActionError('Gagal menyelesaikan order');
      // Rollback on error - refetch will restore original state
      await refetch();
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'var(--admin-success)';
      case 'pending':
        return 'var(--admin-warning)';
      case 'cancelled':
        return 'var(--admin-error)';
      default:
        return 'var(--admin-text-secondary)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Dibayar';
      case 'completed':
        return 'Selesai';
      case 'pending':
        return 'Menunggu';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const canComplete = order && !['completed', 'cancelled'].includes(order.status);

  if (loading) {
    return <AdminLoadingState variant="spinner" message="Memuat detail order..." />;
  }

  if (error) {
    return (
      <AdminErrorState
        title="Gagal Memuat Order"
        message={error.message || 'Terjadi kesalahan saat memuat detail order'}
        onRetry={refetch}
      />
    );
  }

  if (!order) {
    return (
      <AdminErrorState
        title="Order Tidak Ditemukan"
        message="Order yang Anda cari tidak ditemukan"
        onRetry={() => navigate('/admin/orders')}
        retryLabel="Kembali ke Orders"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <AdminHeroSection
        title="Detail Order"
        subtitle={`Order ID: ${order.id}`}
        badge={getStatusLabel(order.status)}
        badgeColor={order.status === 'completed' ? 'success' : order.status === 'paid' ? 'info' : order.status === 'pending' ? 'warning' : 'pink'}
      >
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => navigate('/admin/orders')}
            className="admin-btn admin-btn-secondary admin-btn-sm flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
          {canComplete && (
            <button
              onClick={handleMarkComplete}
              disabled={updating}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              {updating ? 'Memperbarui...' : 'Tandai Selesai'}
            </button>
          )}
        </div>
      </AdminHeroSection>

      {/* Content */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-4">
        {/* Product Image & Basic Info */}
        <div className="flex gap-4">
          {order.product_image ? (
            <img
              src={order.product_image}
              alt={order.product_name}
              className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
              style={{ border: '1px solid var(--admin-border)' }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--admin-primary-light)',
                border: '1px solid var(--admin-border)'
              }}
            >
              <Package size={32} style={{ color: 'var(--admin-text-tertiary)' }} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-semibold mb-1"
              style={{ color: 'var(--admin-text)' }}
            >
              {order.product_name}
            </h3>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: order.order_type === 'rental' 
                    ? 'rgba(59, 130, 246, 0.125)'
                    : 'rgba(16, 185, 129, 0.125)',
                  color: order.order_type === 'rental' 
                    ? 'var(--admin-info)'
                    : 'var(--admin-success)'
                }}
              >
                {order.order_type === 'rental' ? '🎮 RENTAL' : '🛒 PURCHASE'}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `${getStatusColor(order.status)}20`,
                  color: getStatusColor(order.status)
                }}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--admin-success)' }}
            >
              {formatCurrency(order.amount)}
            </p>
          </div>
        </div>

        {/* Rental Duration */}
        {order.order_type === 'rental' && order.rental_duration && (
          <div
            className="p-4 rounded-cyber-lg"
            style={{
              background: 'var(--admin-info-bg)',
              border: '1px solid var(--admin-info-border)'
            }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--admin-info)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--admin-info)' }}>
                Durasi Rental: {order.rental_duration}
              </span>
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div>
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--admin-text)' }}
          >
            <User size={16} />
            Informasi Customer
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User size={16} className="mt-1 flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Nama</p>
                <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  {order.customer_name}
                </p>
              </div>
            </div>

            {order.customer_phone && (
              <div className="flex items-start gap-3">
                <Phone size={16} className="mt-1 flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Telepon</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {formatPhoneNumber(order.customer_phone)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--admin-text)' }}
          >
            <CreditCard size={16} />
            Informasi Pembayaran
          </h4>
          <div className="space-y-3">
            {order.payment_method && (
              <div className="flex items-start gap-3">
                <CreditCard size={16} className="mt-1 flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Metode</p>
                  <p className="text-sm font-medium uppercase" style={{ color: 'var(--admin-text)' }}>
                    {order.payment_method}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar size={16} className="mt-1 flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Tanggal Order</p>
                <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            {order.updated_at !== order.created_at && (
              <div className="flex items-start gap-3">
                <Calendar size={16} className="mt-1 flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Terakhir Diperbarui</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {formatDate(order.updated_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order ID */}
        <div
          className="p-3 rounded-cyber-lg"
          style={{
            background: 'var(--admin-primary-light)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--admin-text-tertiary)' }}>Order ID</p>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--admin-text-secondary)' }}>
            {order.id}
          </p>
        </div>

        {/* Action Error */}
        {actionError && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{ background: 'var(--admin-error-bg)', color: 'var(--admin-error)' }}
            role="alert"
          >
            {actionError}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDetail;
