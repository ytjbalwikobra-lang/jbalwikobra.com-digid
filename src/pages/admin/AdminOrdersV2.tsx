import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Eye,
  Package,
  Clock,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { adminService, type Order as AdminOrder } from '../../services/adminService';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminFilter } from './components/AdminFilter';
import { AdminPagination } from './components/AdminPagination';
import { formatCurrency, formatDate } from '../../utils/helpers';
import '../../styles/admin-design-system-v3.css';

type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';
type OrderType = 'purchase' | 'rental';

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
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

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
      console.log('[AdminOrdersV2] Using cached data');
      setOrders(cachedData.orders);
      setRealStats(cachedData.stats);
      setTotalOrdersCount(cachedData.totalCount);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Load stats and orders in parallel for speed
      const [dashboardStats, ordersResult] = await Promise.all([
        adminService.getDashboardStats().catch(() => null),
        adminService.getOrders(1, 100)
      ]);
      
      const stats: OrderStats = {
        total: dashboardStats?.totalOrders || ordersResult.count || 0,
        pending: dashboardStats?.pendingOrders || 0,
        paid: 0,
        completed: dashboardStats?.completedOrders || 0,
        cancelled: 0,
        totalRevenue: dashboardStats?.totalRevenue || 0,
        todayOrders: 0
      };
      
      // Calculate today's orders
      const today = new Date().toDateString();
      stats.todayOrders = ordersResult.data.filter(order => 
        new Date(order.created_at).toDateString() === today
      ).length;
      
      // Update state
      setRealStats(stats);
      setTotalOrdersCount(stats.total);
      setOrders(ordersResult.data);
      
      // Cache the results
      setCachedData({
        orders: ordersResult.data,
        stats,
        totalCount: stats.total,
        timestamp: now
      });
      
      console.log('[AdminOrdersV2] Loaded and cached orders:', ordersResult.data.length);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message);
      push(`Failed to load orders: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push, cachedData]);

  // Update order status function
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Store previous state for rollback
    const prev = orders;
    
    try {
      // Optimistic UI update
      setOrders(prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus as OrderStatus } : order
      ));
      push('Status pesanan berhasil diperbarui', 'success');
      
      // Update in background
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch('/api/admin?action=update-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error: any) {
      // Rollback on failure
      setOrders(prev);
      push(`Gagal memperbarui status: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchLower || 
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_email?.toLowerCase().includes(searchLower) ||
        order.customer_phone?.includes(searchLower);

      // Handle "completed" status to include both 'paid' and 'completed' orders
      const matchesStatus = !statusFilter || 
        (statusFilter === 'completed' 
          ? (order.status === 'paid' || order.status === 'completed')
          : order.status === statusFilter);
      
      const matchesType = !typeFilter || order.order_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchTerm, statusFilter, typeFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, itemsPerPage]);

  // Use real stats from API instead of calculating from paginated array
  const stats: OrderStats = realStats;

  if (error) {
    return (
      <div className="admin-page">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading Orders</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={loadOrders}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-medium"
            >
              Try Again
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="admin-page space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Orders Management
          </h1>
          <p className="text-gray-400 mt-1">Manage and track all customer orders</p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadOrders}
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
                <p className="text-3xl font-bold text-white">{stats.total}</p>
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
                <p className="text-3xl font-bold text-green-600">{stats.todayOrders}</p>
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
                <p className="text-3xl font-bold text-pink-600">{formatCurrency(stats.totalRevenue)}</p>
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
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search orders by customer name, email, or phone..."
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'completed', label: 'Completed (Including Paid)' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          },
          {
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: '', label: 'All Types' },
              { value: 'purchase', label: 'Purchase' },
              { value: 'rental', label: 'Rental' }
            ]
          }
        ]}
        onRefresh={loadOrders}
        loading={loading}
      />

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
                  // Loading skeleton
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-700 rounded w-32"></div>
                          <div className="h-3 bg-gray-800 rounded w-48"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-700 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-700 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 bg-gray-700 rounded w-8 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No Orders Found</h3>
                      <p className="text-gray-500">
                        {searchTerm || statusFilter || typeFilter
                          ? 'Try adjusting your filters to see more results.'
                          : 'No orders have been placed yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-900/50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-white">{order.customer_name}</div>
                          <div className="text-sm text-gray-400">{order.customer_email}</div>
                          <div className="text-xs text-gray-500">{order.customer_phone}</div>
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
                              // Navigate to product detail page
                              if (order.product_id) {
                                navigate(`/products/${order.product_id}`);
                              } else {
                                push('Product ID tidak tersedia', 'error');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all duration-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (order.status === 'completed') {
                                push('Pesanan sudah diproses', 'info');
                                return;
                              }
                              updateOrderStatus(order.id, 'completed');
                            }}
                            disabled={order.status === 'completed'}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                              order.status === 'completed' 
                                ? 'text-gray-600 cursor-not-allowed bg-gray-800' 
                                : 'text-white bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            Tandai Selesai
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
      {filteredOrders.length > 0 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredOrders.length}
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
