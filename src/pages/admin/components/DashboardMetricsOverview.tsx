/**
 * Dashboard Metrics Overview - V3 Design System
 * Wrapper component for MetricsGrid with data loading and error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../../services/adminService';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { MetricsGrid, defaultStats } from './metrics/index';
import { AdminButton } from './ui/AdminButton';

const cn = (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(' ');

export const DashboardMetricsOverview: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const [stats, setStats] = useState(() => ({ ...defaultStats }));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const s = await adminService.getDashboardStats();
      
      if (!s) {
        setStats({ ...defaultStats });
        setError('No data received from server');
      } else {
        setStats({ ...defaultStats, ...s });
      }
    } catch (e) {
      setStats({ ...defaultStats });
      setError(e instanceof Error ? e.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    load(); 
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      adminService.clearStatsCache();
      await load();
      onRefresh?.();
    } finally { 
      setRefreshing(false); 
    }
  };

  return (
    <section className="space-y-6" aria-label="Store performance metrics">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Overview
        </h2>
        <AdminButton 
          variant="secondary"
          size="sm"
          onClick={handleRefresh} 
          disabled={refreshing || loading}
          aria-label={refreshing ? 'Refreshing data...' : 'Refresh dashboard data'}
        >
          <RotateCcw className={cn('w-4 h-4', (refreshing || loading) && 'animate-spin')} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </AdminButton>
      </div>
      
      {error && (
        <div 
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-red-400 font-semibold mb-1">Error Loading Dashboard Data</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <MetricsGrid 
        stats={stats} 
        loading={loading} 
      />
    </section>
  );
};

export default DashboardMetricsOverview;
