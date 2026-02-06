/**
 * Dashboard Metrics Overview - V3 Design System
 * Wrapper component for MetricsGrid with data loading and error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { AlertCircle } from 'lucide-react';
import { MetricsGrid, defaultStats } from './metrics/index';

export const DashboardMetricsOverview: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(() => ({ ...defaultStats }));
  const [loading, setLoading] = useState(true);
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

  // Show loading state when auth is still loading (production only)
  const isLoading = (!isDev && authLoading) || loading;

  return (
    <section className="space-y-3" aria-label="Store performance metrics">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--admin-success)]" />
        Overview
      </h2>
      
      {error && !isLoading && (
        <div
          className="bg-[var(--admin-error)]/10 border border-[var(--admin-error)]/30 rounded-cyber-lg p-4 flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 text-[var(--admin-error)] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-[var(--admin-error)] font-semibold mb-1">Error Loading Dashboard Data</h3>
            <p className="text-[var(--admin-error)]/80 text-sm">{error}</p>
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
