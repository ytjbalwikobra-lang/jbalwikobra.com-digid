import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  color?: 'pink' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

interface AdminStatsProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
}

export const AdminStats: React.FC<AdminStatsProps> = ({
  stats,
  columns = 4,
  size = 'md'
}) => {
  const getColorClasses = (color: StatItem['color'] = 'pink') => {
    const colors = {
      pink: 'text-surface-tint-pink',
      blue: 'text-[var(--admin-info)]',
      green: 'text-[var(--admin-success)]',
      yellow: 'text-[var(--admin-warning)]',
      red: 'text-[var(--admin-error)]',
      purple: 'text-[var(--admin-purple)]'
    };
    return colors[color];
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return <TrendingUp size={14} className="text-[var(--admin-success)]" />;
      case 'decrease':
        return <TrendingDown size={14} className="text-[var(--admin-error)]" />;
      case 'neutral':
        return <Minus size={14} className="text-surface-tint-gray" />;
    }
  };

  const getChangeTextColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-[var(--admin-success)]';
      case 'decrease':
        return 'text-[var(--admin-error)]';
      case 'neutral':
        return 'text-surface-tint-gray';
    }
  };

  const getGridCols = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return 'p-stack-md';
      case 'md':
        return 'p-stack-lg';
      case 'lg':
        return 'p-stack-xl';
      default:
        return 'p-stack-lg';
    }
  };

  const getValueSize = () => {
    switch (size) {
      case 'sm':
        return 'fs-lg';
      case 'md':
        return 'fs-xl';
      case 'lg':
        return 'fs-2xl';
      default:
        return 'fs-xl';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 20;
      case 'md':
        return 24;
      case 'lg':
        return 28;
      default:
        return 24;
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-stack-lg`}>
      {stats.map(stat => (
  <div key={stat.id} className="dashboard-data-panel padded rounded-cyber-lg p-stack-lg">
          <div className={getPadding()}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="fs-sm text-surface-tint-gray mb-stack-xs">
                  {stat.label}
                </p>
                
                {stat.loading ? (
                  <div className="space-y-stack-xs">
                    <div className="h-8 bg-surface-tint-gray/20 rounded animate-pulse"></div>
                    <div className="h-4 bg-surface-tint-gray/20 rounded w-2/3 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <p className={`${getValueSize()} font-bold text-white mb-stack-xs`}>
                      {typeof stat.value === 'number' 
                        ? stat.value.toLocaleString() 
                        : stat.value
                      }
                    </p>
                    
                    {stat.change && (
                      <div className="flex items-center gap-cluster-xs">
                        {getChangeIcon(stat.change.type)}
                        <span className={`fs-sm ${getChangeTextColor(stat.change.type)}`}>
                          {Math.abs(stat.change.value)}%
                          {stat.change.period && (
                            <span className="text-surface-tint-gray ml-cluster-xs">
                              {stat.change.period}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {stat.icon && (
                <div className={`${getColorClasses(stat.color)} flex-shrink-0`}>
                  {React.isValidElement(stat.icon) 
                    ? React.cloneElement(stat.icon as React.ReactElement, { 
                        size: getIconSize() 
                      })
                    : stat.icon
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
