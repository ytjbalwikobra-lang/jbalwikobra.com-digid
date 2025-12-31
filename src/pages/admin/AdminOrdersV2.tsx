import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Filter, 
  Download, 
  Search, 
  MoreVertical, 
  Eye,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Calendar,
  DollarSign,
  Plus
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { adminService, type Order as AdminOrder } from '../../services/adminService';

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

// Modern Status Badge Component
const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const variants = {
    pending: {
      bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      icon: Clock,
      label: 'Pending'
    },
    paid: {
      bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      icon: CreditCard,
      label: 'Paid'
    },
    completed: {
      bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      icon: CheckCircle,
      label: 'Completed'
    },
    cancelled: {
      bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20',
      border: 'border-red-500/30',
      text: 'text-red-300',
      icon: XCircle,
      label: 'Cancelled'
    }
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${variant.bg} ${variant.border} backdrop-blur-sm`}>
      <Icon className={`w-3.5 h-3.5 ${variant.text}`} />
      <span className={`text-xs font-semibold ${variant.text} uppercase tracking-wide`}>
        {variant.label}
      </span>
    </div>
  );
};



// Modern Stats Card Component
const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<any>; 
  color: string;
  trend?: number;
  subtitle?: string;
}> = ({ title, value, icon: Icon, color, trend, subtitle }) => {
  return (
    <div className="group relative overflow-hidden bg-black border border-gray-800 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${
              trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Modern Filter Component
const OrderFilters: React.FC<{
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  onRefresh: () => void;
  loading: boolean;
}> = ({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onRefresh,
  loading
}) => {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search orders by customer name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all duration-200"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all duration-200 hover:bg-gray-800/80"
          >
            <option value="" className="bg-gray-800 text-white">All Status</option>
            <option value="pending" className="bg-gray-800 text-white">Pending</option>
            <option value="paid" className="bg-gray-800 text-white">Paid</option>
            <option value="completed" className="bg-gray-800 text-white">Completed (Including Paid)</option>
            <option value="cancelled" className="bg-gray-800 text-white">Cancelled</option>
          </select>
        </div>



        {/* Order Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all duration-200 hover:bg-gray-800/80"
          >
            <option value="" className="bg-gray-800 text-white">All Types</option>
            <option value="purchase" className="bg-gray-800 text-white">Purchase</option>
            <option value="rental" className="bg-gray-800 text-white">Rental</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end space-x-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center justify-center px-4 py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl transition-all duration-200 font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-200 font-medium">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
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

  // Load orders data
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load real stats from dashboard API for accurate counts
      try {
        const dashboardStats = await adminService.getDashboardStats();
        setRealStats({
          total: dashboardStats.totalOrders || 0,
          pending: dashboardStats.pendingOrders || 0,
          paid: 0, // Will be calculated from completed
          completed: dashboardStats.completedOrders || 0,
          cancelled: 0, // Not available in dashboard stats
          totalRevenue: dashboardStats.totalRevenue || 0,
          todayOrders: 0 // Will be calculated from loaded orders
        });
        setTotalOrdersCount(dashboardStats.totalOrders || 0);
      } catch (statsErr) {
        console.warn('[AdminOrdersV2] Failed to load dashboard stats:', statsErr);
      }
      
      // Clear cache to ensure fresh data
      if (adminService.clearOrdersCache) {
        adminService.clearOrdersCache();
      }
      
      // Load paginated orders for display (not for stats)
      const result = await adminService.getOrders(1, 100); // Load first 100 for display
      
      console.log('[AdminOrdersV2] Loaded orders:', {
        displayed: result.data.length,
        total: totalOrdersCount
      });
      
      setOrders(result.data);
      
      // Update today's orders count from loaded data
      const today = new Date().toDateString();
      const todayCount = result.data.filter(order => 
        new Date(order.created_at).toDateString() === today
      ).length;
      
      setRealStats(prev => ({
        ...prev,
        todayOrders: todayCount
      }));
      
      push('Orders data loaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message);
      push(`Failed to load orders: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  // Update order status function
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
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
      if (result.success) {
        push('Status pesanan berhasil diperbarui', 'success');
        // Refresh orders
        loadOrders();
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error: any) {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
              Orders Management
            </h1>
            <p className="text-gray-400 mt-2">Manage and track all customer orders</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-pink-500/25">
              <Plus className="w-5 h-5 mr-2 inline" />
              New Order
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Orders"
            value={stats.total}
            icon={ShoppingCart}
            color="from-blue-500 to-cyan-600"
            trend={12.5}
            subtitle="All time orders"
          />
          <StatsCard
            title="Today's Orders"
            value={stats.todayOrders}
            icon={Calendar}
            color="from-emerald-500 to-green-600"
            trend={8.2}
            subtitle="Orders placed today"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            color="from-purple-500 to-violet-600"
            trend={15.3}
            subtitle="From completed orders"
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pending}
            icon={Clock}
            color="from-amber-500 to-orange-600"
            trend={-2.1}
            subtitle="Awaiting processing"
          />
        </div>

        {/* Filters */}
        <OrderFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          onRefresh={loadOrders}
          loading={loading}
        />

        {/* Orders Table */}
        <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Order Details</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
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
                        <StatusBadge status={order.status as OrderStatus} />
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
        </div>

        {/* Enhanced Pagination */}
        {filteredOrders.length > 0 && (
          <div className="bg-black border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              {/* Items per page selector */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-300">Items per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all duration-200 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={1000}>All</option>
                </select>
              </div>

              {/* Page info - Center */}
              <div className="text-sm text-gray-400 text-center">
                Showing <span className="font-medium text-white">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-white">{Math.min(endIndex, filteredOrders.length)}</span> of{' '}
                <span className="font-medium text-white">{filteredOrders.length}</span> orders
                {filteredOrders.length !== orders.length && (
                  <span className="text-xs text-gray-500 ml-1">(filtered from {orders.length} total)</span>
                )}
              </div>

              {/* Page navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {/* First page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        1
                      </button>
                      {currentPage > 4 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                    </>
                  )}

                  {/* Page numbers around current page */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page >= Math.max(1, currentPage - 2) && page <= Math.min(totalPages, currentPage + 2))
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          page === currentPage
                            ? 'bg-pink-500 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  {/* Last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersV2;
