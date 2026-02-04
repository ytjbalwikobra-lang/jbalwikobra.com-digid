// Metrics utility functions and data formatting
import { AdminStats } from '../../../../services/adminService';
import { formatCurrency } from '../../../../utils/helpers';
import { formatAnalyticsValue } from '../../../../utils/adminUtils';

export const defaultStats: AdminStats = {
  totalOrders: 0,
  totalRevenue: 0,
  totalUsers: 0,
  totalProducts: 0,
  totalReviews: 0,
  averageRating: 0,
  pendingOrders: 0,
  completedOrders: 0,
  totalFlashSales: 0,
  activeFlashSales: 0
};

export const formatMetrics = (stats: AdminStats) => ({
  revenue: {
    formatted: formatCurrency(stats?.totalRevenue ?? 0),
    subtitle: `from ${stats.completedOrders} paid orders`
  },
  orders: {
    formatted: formatAnalyticsValue(stats.totalOrders || 0),
    subtitle: `${stats.pendingOrders || 0} pending, ${stats.completedOrders || 0} completed`
  },
  users: {
    formatted: formatAnalyticsValue(stats.totalUsers || 0),
    subtitle: 'registered users'
  },
  products: {
    formatted: formatAnalyticsValue(stats.totalProducts || 0),
    subtitle: 'active products'
  },
  reviews: {
    formatted: formatAnalyticsValue(stats.totalReviews || 0),
    subtitle: stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5 avg rating` : 'No reviews yet'
  },
  flashSales: {
    formatted: formatAnalyticsValue(stats.totalFlashSales || 0),
    subtitle: `${stats.activeFlashSales || 0} currently active`
  }
});

export const getMetricAccentColor = (type: string) => {
  const colors = {
    revenue: 'from-emerald-500/30 via-emerald-600/20 to-green-500/10',
    orders: 'from-blue-500/30 via-blue-600/20 to-cyan-500/10', 
    users: 'from-pink-500/30 via-pink-500/20 to-fuchsia-500/10',
    products: 'from-violet-500/30 via-purple-600/20 to-indigo-500/10',
    reviews: 'from-yellow-500/30 via-amber-600/20 to-orange-500/10',
    flashSales: 'from-orange-500/30 via-red-600/20 to-pink-500/10'
  };
  return colors[type as keyof typeof colors] || colors.users;
};
