import React from 'react';
import { TrendingUp, Users, Package, Star, Clock, Zap, Key } from 'lucide-react';
import { AdminStats } from '../../../../services/adminService';
// NOTE: MetricCard deprecated in favor of AdminStatCard
import { AdminStatCard } from './AdminStatCard';
import { formatMetrics } from './metricsUtils';
import { cn } from '../../../../utils/cn';

interface MetricsGridProps {
  stats: AdminStats;
  loading?: boolean;
  className?: string;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ stats, loading, className }) => {
  const metrics = formatMetrics(stats);

  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              'rounded-cyber-2xl h-40 bg-gradient-to-br from-[var(--admin-accent-subtle)] to-[var(--admin-accent-subtle)]/25 border border-[var(--admin-accent-muted)]',
              i === 0 && 'lg:col-span-2 h-48'
            )} 
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      <AdminStatCard
        size="large"
        variant="success"
        label="Total Revenue"
        value={metrics.revenue.formatted}
        sub={metrics.revenue.subtitle}
        icon={<TrendingUp className="w-7 h-7" />}
      />
      
      <AdminStatCard
        label="Total Orders"
        variant="info"
        value={metrics.orders.formatted}
        sub={metrics.orders.subtitle}
        icon={<Clock className="w-6 h-6" />}
      />
      
      <AdminStatCard
        label="Users"
        variant="neutral"
        value={metrics.users.formatted}
        sub={metrics.users.subtitle}
        icon={<Users className="w-6 h-6" />}
      />
      
      <AdminStatCard
        label="Products"
        variant="default"
        value={metrics.products.formatted}
        sub={metrics.products.subtitle}
        icon={<Package className="w-6 h-6" />}
      />
      
      <AdminStatCard
        label="Flash Sales"
        variant="warning"
        value={metrics.flashSales?.formatted || "0"}
        sub={metrics.flashSales?.subtitle || "active sales"}
        icon={<Zap className="w-6 h-6" />}
      />
      
      <AdminStatCard
        label="Reviews & Ratings"
        variant="danger"
        value={metrics.reviews.formatted}
        sub={metrics.reviews.subtitle}
        icon={<Star className="w-6 h-6" />}
      />
      
      <AdminStatCard
        label="Active Rentals"
        variant="warning"
        value={metrics.rentals?.formatted || "0"}
        sub={metrics.rentals?.subtitle || "sedang aktif"}
        icon={<Key className="w-6 h-6" />}
      />
    </div>
  );
};

export default MetricsGrid;
