import React, { useEffect, useState, useCallback } from 'react';
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
import { AdminPagination } from './components/AdminPagination';
import { formatCurrency, formatDate } from '../../utils/helpers';
import '../../styles/admin-design-system-v3.css';

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
  // Pagination calculations
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Orders (Today)
          </h1>
          <p className="text-gray-400 mt-1">Ringkasan pesanan hari ini saja</p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={() => loadOrders()}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white">{realStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Today's Orders</p>
                <p className="text-3xl font-bold text-green-600">{realStats.todayOrders}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-green-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-pink-600">{formatCurrency(realStats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-pink-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Pending Orders</p>
                <p className="text-3xl font-bold text-orange-600">{realStats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>
      </div>

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
                    <tr key={order.id} className="hover:bg-gray-900/50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-white">{order.customer_name}</div>
                          <div className="text-sm text-gray-400">{order.customer_email}</div>
                          <div className="text-xs text-gray-500">{formatPhoneNumber(order.customer_phone)}</div>
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
                              <span className="text-xs text-gray-400">⏰ {(order as any).rental_duration}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">Order ID: {order.id.slice(0, 8)}...</div>
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
                        <div className="text-sm text-gray-300">
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => {
                              if (order.product_id) {
                                navigate(`/products/${order.product_id}`);
                              } else {
                                push('Product ID tidak tersedia', 'error');
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
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
      </div>
  );
};

export default AdminOrdersV2;
