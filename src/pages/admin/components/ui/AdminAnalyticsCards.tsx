import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AdminCard, AdminCardBody } from './AdminCard';
import { formatCurrency } from '../../../../utils/helpers';
import { formatAnalyticsValue } from '../../../../utils/adminUtils';

export interface AnalyticsStat {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
}

interface AdminAnalyticsCardsProps {
  stats: AnalyticsStat[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * AdminAnalyticsCards - Unified analytics cards component
 * Replaces duplicate stats rendering across admin pages
 */
export const AdminAnalyticsCards: React.FC<AdminAnalyticsCardsProps> = ({
  stats,
  loading = false,
  columns = 4,
  className = ''
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const formatValue = (stat: AnalyticsStat): string => {
    if (typeof stat.value === 'string') return stat.value;
    
    switch (stat.format) {
      case 'currency':
        return formatCurrency(stat.value);
      case 'percentage':
        return `${stat.value.toFixed(1)}%`;
      case 'number':
      default:
        return formatAnalyticsValue(stat.value);
    }
  };

  if (loading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
        {Array.from({ length: stats.length || columns }).map((_, i) => (
          <AdminCard key={i} className="animate-pulse">
            <AdminCardBody>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-cyber-lg bg-surface-card-hover" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-card-hover rounded w-24 mb-2" />
                  <div className="h-6 bg-surface-card-hover rounded w-16" />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const iconColor = stat.iconColor || 'text-accent-primary';
        const iconBgColor = stat.iconBgColor || 'bg-accent-primary/10';
        
        return (
          <AdminCard key={index} className="hover-lift">
            <AdminCardBody>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-cyber-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-tint-gray truncate">{stat.label}</p>
                  <p className="text-2xl font-bold text-white truncate" title={formatValue(stat)}>
                    {formatValue(stat)}
                  </p>
                  {stat.trend && (
                    <p className={`text-xs mt-1 ${stat.trend.direction === 'up' ? 'text-accent-success' : 'text-accent-error'}`}>
                      {stat.trend.direction === 'up' ? '↑' : '↓'} {stat.trend.value}%
                      {stat.trend.label && <span className="text-surface-tint-gray ml-1">{stat.trend.label}</span>}
                    </p>
                  )}
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>
        );
      })}
    </div>
  );
};

export default AdminAnalyticsCards;
