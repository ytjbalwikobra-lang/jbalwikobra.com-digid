import React, { useEffect, useState } from 'react';
import { X, Package, User, Calendar, CreditCard, Phone } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { formatCurrency } from '../../utils/helpers';
import { useModalData } from '../../hooks/useModalData';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

/**
 * OrderDetailsModal - Refactored with useModalData hook
 * 
 * IMPROVEMENTS:
 * - useModalData: Lazy loads order data only when modal opens (egress optimization)
 * - Keyboard shortcuts: Escape to close
 * - Reduced duplicate loading logic
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

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId
}) => {
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Use useModalData hook for lazy loading - eliminates ~40 lines of fetch logic
  const {
    data: order,
    loading,
    error,
    refetch
  } = useModalData<OrderDetails>({
    isOpen,
    entityId: orderId,
    requiresId: true,
    fetchFn: async (id) => {
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
    onError: (err) => {
      console.error('Error fetching order details:', err);
    }
  });

  // Keyboard shortcuts (Escape to close)
  useKeyboardShortcuts({
    enabled: isOpen,
    shortcuts: [
      {
        key: 'Escape',
        action: onClose,
        description: 'Close modal',
        preventDefault: true
      }
    ]
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

      // Refetch to get updated data
      await refetch();
    } catch (err) {
      console.error('Gagal menyelesaikan order:', err);
      setActionError('Gagal menyelesaikan order');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

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

  return (
    <>
      {/* Modal Container - Same behavior as AdminModal */}
      <div 
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
      >
        <div 
          className="w-full max-w-2xl max-h-[85vh] my-auto flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
        >
          <div
            className="flex flex-col max-h-full overflow-hidden rounded-xl lg:rounded-2xl shadow-2xl"
            style={{
              background: 'var(--admin-primary)',
              border: '2px solid var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(236, 72, 153, 0.125)'
            }}
          >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{
              background: 'linear-gradient(135deg, var(--admin-primary) 0%, var(--admin-primary-light) 100%)',
              borderColor: 'var(--admin-border)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-1.5 rounded-cyber-lg flex items-center justify-center"
                style={{
                  background: 'var(--admin-primary-lighter)',
                  color: 'var(--admin-primary)'
                }}
              >
                <Package size={16} />
              </div>
              <h2
                id="order-details-title"
                className="text-lg font-semibold"
                style={{ color: 'var(--admin-text)' }}
              >
                Detail Order
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-cyber-lg transition-all duration-200 hover:bg-[var(--admin-bg-elevated)] flex items-center justify-center"
              style={{
                background: 'rgba(236, 72, 153, 0.082)',
                color: 'var(--admin-accent)',
                border: '1px solid rgba(236, 72, 153, 0.188)'
              }}
              aria-label="Tutup modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 cyber-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--admin-primary)' }} />
              </div>
            )}

            {error && (
              <div
                className="p-4 rounded-xl text-center"
                style={{
                  background: 'var(--admin-error-bg)',
                  color: 'var(--admin-error)'
                }}
              >
                {error.message || 'Gagal memuat detail order'}
              </div>
            )}

            {order && !loading && (
              <div className="space-y-3">
                {/* Product Image & Basic Info */}
                <div className="flex gap-4">
                  {/* Egress optimization: Use thumbnail or placeholder if no image */}
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
                    <div className="flex items-center gap-2 mb-2">
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

                {/* Rental Duration (if applicable) */}
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

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {actionError && (
                    <div
                      className="p-3 rounded-xl text-sm"
                      style={{ background: 'var(--admin-error-bg)', color: 'var(--admin-error)' }}
                      role="alert"
                    >
                      {actionError}
                    </div>
                  )}
                  {canComplete ? (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={updating}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2'
                      )}
                      style={{
                        background: updating
                          ? 'rgba(236, 72, 153, 0.145)'
                          : 'linear-gradient(135deg, var(--admin-accent), var(--admin-accent-dark))',
                        color: 'white',
                        border: '1px solid rgba(236, 72, 153, 0.25)'
                      }}
                      aria-label="Tandai order selesai"
                    >
                      {updating ? 'Memperbarui...' : 'Tandai Selesai'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                        'opacity-70 cursor-not-allowed'
                      )}
                      style={{
                        background: 'rgba(16, 185, 129, 0.125)',
                        color: 'var(--admin-success)',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                      }}
                      aria-label="Order sudah selesai"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
