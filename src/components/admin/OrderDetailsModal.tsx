import React, { useEffect, useState } from 'react';
import { X, Package, User, Calendar, CreditCard, Phone } from 'lucide-react';
import { AdminColors } from '../../pages/admin/design-tokens';
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
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    setActionMessage(null);

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
      setActionMessage(null);
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
        return AdminColors.success.DEFAULT;
      case 'pending':
        return AdminColors.warning.DEFAULT;
      case 'cancelled':
        return AdminColors.error.DEFAULT;
      default:
        return AdminColors.text.secondary;
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
      {/* Backdrop - ISO 9241-151: Modal overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - ISO 9241-110: Dialog container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: AdminColors.primary.DEFAULT,
            border: `2px solid ${AdminColors.border.DEFAULT}`,
            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px ${AdminColors.accent.DEFAULT}20`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
            style={{
              background: `linear-gradient(135deg, ${AdminColors.primary.DEFAULT} 0%, ${AdminColors.primary.light} 100%)`,
              borderColor: AdminColors.border.DEFAULT,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: AdminColors.primary.lighter,
                  color: AdminColors.primary.DEFAULT
                }}
              >
                <Package size={20} />
              </div>
              <h2
                id="order-details-title"
                className="text-lg font-semibold"
                style={{ color: AdminColors.text.primary }}
              >
                Detail Order
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                background: `${AdminColors.accent.DEFAULT}15`,
                color: AdminColors.accent.DEFAULT,
                border: `1px solid ${AdminColors.accent.DEFAULT}30`
              }}
              aria-label="Tutup modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: AdminColors.primary.DEFAULT }} />
              </div>
            )}

            {error && (
              <div
                className="p-4 rounded-xl text-center"
                style={{
                  background: AdminColors.error.bg,
                  color: AdminColors.error.DEFAULT
                }}
              >
                {error.message || 'Gagal memuat detail order'}
              </div>
            )}

            {order && !loading && (
              <div className="space-y-6">
                {/* Product Image & Basic Info */}
                <div className="flex gap-4">
                  {/* Egress optimization: Use thumbnail or placeholder if no image */}
                  {order.product_image ? (
                    <img
                      src={order.product_image}
                      alt={order.product_name}
                      className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                      style={{ border: `1px solid ${AdminColors.border.DEFAULT}` }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: AdminColors.background.secondary,
                        border: `1px solid ${AdminColors.border.DEFAULT}`
                      }}
                    >
                      <Package size={32} style={{ color: AdminColors.text.tertiary }} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold mb-1"
                      style={{ color: AdminColors.text.primary }}
                    >
                      {order.product_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: order.order_type === 'rental' 
                            ? `${AdminColors.info.DEFAULT}20`
                            : `${AdminColors.success.DEFAULT}20`,
                          color: order.order_type === 'rental' 
                            ? AdminColors.info.DEFAULT
                            : AdminColors.success.DEFAULT
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
                      style={{ color: AdminColors.success.DEFAULT }}
                    >
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                </div>

                {/* Rental Duration (if applicable) */}
                {order.order_type === 'rental' && order.rental_duration && (
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: AdminColors.info.bg,
                      border: `1px solid ${AdminColors.info.border}`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={16} style={{ color: AdminColors.info.DEFAULT }} />
                      <span className="text-sm font-medium" style={{ color: AdminColors.info.DEFAULT }}>
                        Durasi Rental: {order.rental_duration}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div>
                  <h4
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: AdminColors.text.primary }}
                  >
                    <User size={16} />
                    Informasi Customer
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User size={16} className="mt-1 flex-shrink-0" style={{ color: AdminColors.text.tertiary }} />
                      <div>
                        <p className="text-xs" style={{ color: AdminColors.text.tertiary }}>Nama</p>
                        <p className="text-sm font-medium" style={{ color: AdminColors.text.primary }}>
                          {order.customer_name}
                        </p>
                      </div>
                    </div>

                    {order.customer_phone && (
                      <div className="flex items-start gap-3">
                        <Phone size={16} className="mt-1 flex-shrink-0" style={{ color: AdminColors.text.tertiary }} />
                        <div>
                          <p className="text-xs" style={{ color: AdminColors.text.tertiary }}>Telepon</p>
                          <p className="text-sm font-medium" style={{ color: AdminColors.text.primary }}>
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
                    style={{ color: AdminColors.text.primary }}
                  >
                    <CreditCard size={16} />
                    Informasi Pembayaran
                  </h4>
                  <div className="space-y-3">
                    {order.payment_method && (
                      <div className="flex items-start gap-3">
                        <CreditCard size={16} className="mt-1 flex-shrink-0" style={{ color: AdminColors.text.tertiary }} />
                        <div>
                          <p className="text-xs" style={{ color: AdminColors.text.tertiary }}>Metode</p>
                          <p className="text-sm font-medium uppercase" style={{ color: AdminColors.text.primary }}>
                            {order.payment_method}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Calendar size={16} className="mt-1 flex-shrink-0" style={{ color: AdminColors.text.tertiary }} />
                      <div>
                        <p className="text-xs" style={{ color: AdminColors.text.tertiary }}>Tanggal Order</p>
                        <p className="text-sm font-medium" style={{ color: AdminColors.text.primary }}>
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    {order.updated_at !== order.created_at && (
                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="mt-1 flex-shrink-0" style={{ color: AdminColors.text.tertiary }} />
                        <div>
                          <p className="text-xs" style={{ color: AdminColors.text.tertiary }}>Terakhir Diperbarui</p>
                          <p className="text-sm font-medium" style={{ color: AdminColors.text.primary }}>
                            {formatDate(order.updated_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order ID */}
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: AdminColors.background.secondary,
                    border: `1px solid ${AdminColors.border.DEFAULT}`
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: AdminColors.text.tertiary }}>Order ID</p>
                  <p className="text-xs font-mono break-all" style={{ color: AdminColors.text.secondary }}>
                    {order.id}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {actionError && (
                    <div
                      className="p-3 rounded-xl text-sm"
                      style={{ background: AdminColors.error.bg, color: AdminColors.error.DEFAULT }}
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
                          ? `${AdminColors.accent.DEFAULT}25`
                          : `linear-gradient(135deg, ${AdminColors.accent.DEFAULT}, ${AdminColors.accent.dark})`,
                        color: 'white',
                        border: `1px solid ${AdminColors.accent.DEFAULT}40`
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
                        background: `${AdminColors.success.DEFAULT}20`,
                        color: AdminColors.success.DEFAULT,
                        border: `1px solid ${AdminColors.success.DEFAULT}40`
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
    </>
  );
};
