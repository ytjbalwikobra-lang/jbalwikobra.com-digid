import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { 
  ShoppingCart, 
  Package,
  Clock,
  RefreshCw,
  DollarSign,
  User,
  Search
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { adminService, type Order as AdminOrder } from '../../services/adminService';
import { supabase } from '../../services/supabase';
import { AdminButton } from './components/ui/AdminButton';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminBentoCard, AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminPagination } from './components/AdminPagination';
import { formatCurrency } from '../../utils/helpers';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';
// Design system: cyber-compact.css (loaded via index.css)
// Cyberpunk Compact Redesign

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
  const navigate = useNavigate();

  // Search & Pagination (DNA from Products)
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // REALTIME SUBSCRIPTIONS: Listen to order changes for live updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as AdminOrder;
          const today = new Date().toDateString();
          
          // Only add if it's today's order
          if (new Date(newOrder.created_at).toDateString() === today) {
            setOrders(prev => [newOrder, ...prev]);
            
            // Update stats
            setRealStats(prev => ({
              ...prev,
              total: prev.total + 1,
              [newOrder.status]: prev[newOrder.status as keyof OrderStats] + 1,
              totalRevenue: (newOrder.status === 'paid' || newOrder.status === 'completed') 
                ? prev.totalRevenue + (newOrder.amount || 0) 
                : prev.totalRevenue,
              todayOrders: prev.todayOrders + 1
            }));

            push('🔔 Order baru diterima!', 'success');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updatedOrder = payload.new as AdminOrder;
          const oldOrder = payload.old as AdminOrder;
          
          setOrders(prev => prev.map(order => 
            order.id === updatedOrder.id ? updatedOrder : order
          ));

          // Recalculate stats if status changed
          if (oldOrder.status !== updatedOrder.status) {
            setRealStats(prev => {
              const newStats = { ...prev };
              
              // Decrease old status count
              if (oldOrder.status in newStats) {
                newStats[oldOrder.status as keyof OrderStats] = Math.max(0, prev[oldOrder.status as keyof OrderStats] - 1);
              }
              
              // Increase new status count
              if (updatedOrder.status in newStats) {
                newStats[updatedOrder.status as keyof OrderStats] = prev[updatedOrder.status as keyof OrderStats] + 1;
              }

              // Update revenue if needed
              if ((updatedOrder.status === 'paid' || updatedOrder.status === 'completed') &&
                  (oldOrder.status !== 'paid' && oldOrder.status !== 'completed')) {
                newStats.totalRevenue = prev.totalRevenue + (updatedOrder.amount || 0);
              }

              return newStats;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [push]);

  // View order details handler - navigate to detail page
  const handleViewOrder = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  // Filter orders by search term (DNA from Products)
  const filteredOrders = useMemo(() => {
    if (!debouncedSearch) return orders;
    
    const term = debouncedSearch.toLowerCase();
    return orders.filter(order => 
      order.customer_name?.toLowerCase().includes(term) ||
      order.customer_phone?.includes(term) ||
      order.id?.toLowerCase().includes(term) ||
      order.status?.toLowerCase().includes(term)
    );
  }, [orders, debouncedSearch]);

  // Paginate filtered orders (DNA from Products)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  // Compact metric cards
  const metricsData = useMemo(() => [
    {
      label: 'Orders',
      value: realStats.total,
      icon: <ShoppingCart size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Revenue',
      value: formatCurrency(realStats.totalRevenue),
      icon: <DollarSign size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Pending',
      value: realStats.pending,
      icon: <Clock size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Completed',
      value: realStats.completed,
      icon: <Package size={16} className="text-[var(--cyber-pink-primary)]" />
    }
  ], [realStats]);

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
    <div className="admin-page space-y-4">
      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="Orders Today"
        subtitle={`${realStats.total} orders • ${formatCurrency(realStats.totalRevenue)} revenue`}
        badge="Live"
        badgeColor="success"
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {/* Search Bar (DNA from Products) */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, phone, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => loadOrders(true)}
              disabled={loading}
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </AdminHeroSection>

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

      {/* Orders Bento Grid */}
      {loading ? (
        <AdminLoadingState variant="skeleton-cards" cards={8} />
      ) : filteredOrders.length === 0 ? (
        <AdminEmptyState 
          icon={<Package className="w-12 h-12" />}
          title={debouncedSearch ? "No Orders Match" : "No Orders Today"}
          description={debouncedSearch ? "Try different search terms" : "Orders will appear here when customers make purchases"}
          hasFilters={!!debouncedSearch}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedOrders.map((order) => (
            <AdminBentoCard
              key={order.id}
              onClick={() => handleViewOrder(order.id)}
              glowOnHover
            >
              {/* Order Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--cyber-pink-subtle)] flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={14} className="text-[var(--cyber-pink-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                      {order.customer_name}
                    </p>
                    <p className="text-[10px] text-[var(--cyber-text-muted)] truncate">
                      #{order.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <AdminStatusBadge 
                  status={mapOrderStatus(order.status as OrderStatus)} 
                  label={order.status}
                />
              </div>

              {/* Order Details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--cyber-text-muted)]">Amount</span>
                  <span className="text-sm font-bold text-[var(--cyber-pink-primary)]">
                    {formatCurrency(order.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--cyber-text-muted)]">Type</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    order.order_type === 'purchase'
                      ? 'bg-[var(--cyber-info)]/10 text-[var(--cyber-info)]'
                      : 'bg-[var(--cyber-purple)]/10 text-[var(--cyber-purple)]'
                  )}>
                    {order.order_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--cyber-text-muted)]">Time</span>
                  <span className="text-[10px] text-[var(--cyber-text-secondary)]">
                    {new Date(order.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="mt-2 pt-2 border-t border-[var(--cyber-border)]">
                <div className="flex items-center gap-1.5">
                  <User size={10} className="text-[var(--cyber-text-muted)]" />
                  <span className="text-[10px] text-[var(--cyber-text-muted)] truncate">
                    {formatPhoneNumber(order.customer_phone)}
                  </span>
                </div>
              </div>
            </AdminBentoCard>
          ))}
        </div>

        {/* Pagination (DNA from Products) */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </>
      )}
    </div>
  );
};

export default AdminOrdersV2;
