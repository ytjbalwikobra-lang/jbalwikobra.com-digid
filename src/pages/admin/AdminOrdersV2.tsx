import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { 
  ShoppingCart, 
  Eye,
  Package,
  Clock,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { adminService, type Order as AdminOrder } from '../../services/adminService';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminPageHeader } from './components/ui/AdminPageHeader';
import { AdminAnalyticsCards, AnalyticsStat } from './components/ui/AdminAnalyticsCards';
import { AdminPagination } from './components/AdminPagination';
import { OrderDetailsModal } from '../../components/admin/OrderDetailsModal';
import { formatCurrency, formatDate } from '../../utils/helpers';
// Design system: cyber-compact.css (loaded via index.css)

type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  todayOrders: number;
}

// Map OrderStatus to AdminStatusBadge status
const mapOrderStatus = (status: OrderStatus): 'pending' | 'processing' | 'completed' | 'cancelled' | 'active' | 'inactive' | 'paid' => {
  const statusMap: Record<OrderStatus, 'pending' | 'processing' | 'completed' | 'cancelled' | 'active' | 'inactive' | 'paid'> = {
    pending: 'pending',
    paid: 'paid',
    completed: 'completed',
    cancelled: 'cancelled'
  };
  return statusMap[status];
};

// Main Orders Page Component
const AdminOrdersV2: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [realStats, setRealStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    paid: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    todayOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { push } = useToast();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Order details modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Cache for instant loading between page navigations
  const [cachedData, setCachedData] = useState<{
    orders: AdminOrder[];
    stats: OrderStats;
    totalCount: number;
    timestamp: number;
  } | null>(null);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Load orders data with caching for seamless navigation
  const loadOrders = useCallback(async (forceRefresh = false) => {
    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      setOrders(cachedData.orders);
      setRealStats(cachedData.stats);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Load stats and orders in parallel for speed
      const ordersResult = await adminService.getOrders(1, 100);

      const today = new Date().toDateString();
      const todaysOrders = ordersResult.data.filter(order => new Date(order.created_at).toDateString() === today);

      const paidOrders = todaysOrders.filter(o => o.status === 'paid' || o.status === 'completed');

      const stats: OrderStats = {
        total: todaysOrders.length,
        pending: todaysOrders.filter(o => o.status === 'pending').length,
        paid: todaysOrders.filter(o => o.status === 'paid').length,
        completed: todaysOrders.filter(o => o.status === 'completed').length,
        cancelled: todaysOrders.filter(o => o.status === 'cancelled').length,
        totalRevenue: paidOrders.reduce((acc, o) => acc + (o.amount || 0), 0),
        todayOrders: todaysOrders.length
      };
      
      setRealStats(stats);
      setOrders(todaysOrders);
      
      // Cache the results
      setCachedData({
        orders: todaysOrders,
        stats,
        totalCount: stats.total,
        timestamp: now
      });
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message);
      push(`Failed to load orders: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push, cachedData]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // View order details handler
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsModalOpen(true);
  };

  // Close details modal handler
  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedOrderId(null);
  };

  // Pagination calculations
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Analytics stats config
  const analyticsStats: AnalyticsStat[] = useMemo(() => [
    {
      label: 'Total Orders',
      value: realStats.total,
      icon: ShoppingCart,
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-500/10',
      format: 'number'
    },
    {
      label: "Today's Orders",
      value: realStats.todayOrders,
      icon: Calendar,
      iconColor: 'text-green-400',
      iconBgColor: 'bg-green-500/10',
      format: 'number'
    },
    {
      label: 'Total Revenue',
      value: realStats.totalRevenue,
      icon: DollarSign,
      iconColor: 'text-[var(--cyber-pink-primary)]',
      iconBgColor: 'bg-[var(--cyber-pink-subtle)]',
      format: 'currency'
    },
    {
      label: 'Pending Orders',
      value: realStats.pending,
      icon: Clock,
      iconColor: 'text-orange-400',
      iconBgColor: 'bg-orange-500/10',
      format: 'number'
    }
  ], [realStats]);

  // Header actions
  const headerActions = (
    <AdminButton
      variant="secondary"
      onClick={() => loadOrders()}
      disabled={loading}
      icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
    >
      Refresh
    </AdminButton>
  );

  if (error) {
    return (
      <div className="admin-page">
        <AdminErrorState 
          variant="full-page"
          title="Error Loading Orders"
          message={error}
          onRetry={() => loadOrders()}
        />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-8">
      {/* Header - Using AdminPageHeader */}
      <AdminPageHeader
        title="Orders (Today)"
        description="Ringkasan pesanan hari ini saja"
        actions={headerActions}
      />

      {/* Stats Cards - Using AdminAnalyticsCards */}
      <AdminAnalyticsCards stats={analyticsStats} loading={loading} columns={4} />

        {/* Orders Table */}
        <AdminCard>
          <AdminCardBody>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order Details</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {loading ? (
                  <AdminLoadingState variant="skeleton-table" rows={5} columns={6} />
                ) : orders.length === 0 ? (
                  <AdminEmptyState 
                    icon={<Package className="w-16 h-16" />}
                    title="No Orders Today"
                    hasFilters={false}
                    variant="table-row"
                    colSpan={6}
                  />
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--cyber-bg-pure)]/50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-white">{order.customer_name}</div>
                          <div className="text-sm text-[var(--cyber-text-muted)]">{order.customer_email}</div>
                          <div className="text-xs text-[var(--cyber-text-muted)]">{formatPhoneNumber(order.customer_phone)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.order_type === 'purchase'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}>
                              {order.order_type === 'purchase' ? 'Purchase' : 'Rental'}
                            </span>
                            {order.order_type === 'rental' && (order as any).rental_duration && (
                              <span className="text-xs text-[var(--cyber-text-muted)]">⏰ {(order as any).rental_duration}</span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--cyber-text-muted)]">Order ID: {order.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(order.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <AdminStatusBadge 
                          status={mapOrderStatus(order.status as OrderStatus)} 
                          label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--cyber-text-secondary)]">
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewOrder(order.id)}
                            className="p-2 text-[var(--cyber-text-secondary)] hover:text-white hover:bg-[var(--cyber-bg-card)] rounded-cyber-lg transition-colors"
                            title="View order details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (order.product_id) {
                                navigate(`/products/${order.product_id}`);
                              } else {
                                push('Product ID tidak tersedia', 'error');
                              }
                            }}
                            className="cyber-btn cyber-btn-primary cyber-btn-sm"
                          >
                            Lihat Produk
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </AdminCardBody>
        </AdminCard>

      {/* Pagination */}
      {orders.length > 0 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={orders.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          loading={loading}
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        orderId={selectedOrderId}
      />
      </div>
  );
};

export default AdminOrdersV2;
