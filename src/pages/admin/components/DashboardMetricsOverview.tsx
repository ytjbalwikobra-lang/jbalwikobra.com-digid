/**
 * Dashboard Metrics Overview - V3 Design System
 * Wrapper component for MetricsGrid with data loading and error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { MetricsGrid, defaultStats } from './metrics/index';
import { AdminButton } from './ui/AdminButton';
import { cn } from '../../../utils/cn';

export const DashboardMetricsOverview: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(() => ({ ...defaultStats }));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Development mode bypass - API already handles dev auth
  const isDev = process.env.NODE_ENV === 'development';

  const load = useCallback(async () => {
    // In production: Don't load if auth is still loading or no user
    // In development: Allow loading (API handles dev auth bypass)
    if (!isDev && (authLoading || !user)) {
      return;
    }
    
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
  }, [authLoading, user, isDev]);

  useEffect(() => { 
    // In production: Only load when auth is ready and user exists
    // In development: Load immediately (API handles dev auth bypass)
    if (isDev || (!authLoading && user)) {
      load();
    }
  }, [load, authLoading, user, isDev]);

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

  // Show loading state when auth is still loading (production only)
  const isLoading = (!isDev && authLoading) || loading;

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
          disabled={refreshing || isLoading}
          aria-label={refreshing ? 'Refreshing data...' : 'Refresh dashboard data'}
        >
          <RotateCcw className={cn('w-4 h-4', (refreshing || isLoading) && 'animate-spin')} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </AdminButton>
      </div>
      
      {error && !isLoading && (
        <div 
          className="bg-red-500/10 border border-red-500/30 rounded-cyber-lg p-4 flex items-start gap-3"
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
        loading={isLoading} 
      />
    </section>
  );
};

export default DashboardMetricsOverview;
