/**
 * Unified Admin Data Fetching Hooks
 * Consolidates data fetching logic across admin components
 */

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../../services/adminService';
import type { Order, User, Product } from '../../../services/adminService';
import { performanceMonitor } from '../utils/performanceMonitor';

interface UsePaginatedDataOptions {
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
}

interface PaginatedDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

/**
 * Hook for fetching paginated orders with filters
 */
export function useAdminOrders({ 
  page = 1, 
  limit = 10, 
  filters = {} 
}: UsePaginatedDataOptions = {}): PaginatedDataResult<Order> {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    performanceMonitor.startMeasure('fetch_admin_orders');
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminService.getOrders(page, limit, filters.status);
      setData(result.data);
      setTotalCount(result.count);
      performanceMonitor.endMeasure('fetch_admin_orders', { success: true, count: result.count });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
      performanceMonitor.endMeasure('fetch_admin_orders', { success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters.status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, totalCount, refetch: fetchData };
}

/**
 * Hook for fetching paginated users with filters
 */
export function useAdminUsers({ 
  page = 1, 
  limit = 10, 
  filters: _filters = {} 
}: UsePaginatedDataOptions = {}): PaginatedDataResult<User> {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    performanceMonitor.startMeasure('fetch_admin_users');
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminService.getUsers(page, limit);
      setData(result.data);
      setTotalCount(result.count);
      performanceMonitor.endMeasure('fetch_admin_users', { success: true, count: result.count });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
      performanceMonitor.endMeasure('fetch_admin_users', { success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, totalCount, refetch: fetchData };
}

/**
 * Hook for fetching paginated products with filters
 */
export function useAdminProducts({ 
  page = 1, 
  limit = 10, 
  filters: _filters = {} 
}: UsePaginatedDataOptions = {}): PaginatedDataResult<Product> {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    performanceMonitor.startMeasure('fetch_admin_products');
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminService.getProducts(page, limit);
      setData(result.data || []);
      setTotalCount(result.count || 0);
      performanceMonitor.endMeasure('fetch_admin_products', { success: true, count: result.count });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
      performanceMonitor.endMeasure('fetch_admin_products', { success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, totalCount, refetch: fetchData };
}

/**
 * Hook for fetching dashboard stats
 */
export function useAdminStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    performanceMonitor.startMeasure('fetch_admin_stats');
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getDashboardStats();
      setStats(data);
      performanceMonitor.endMeasure('fetch_admin_stats', { success: true });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
      console.error('Error fetching stats:', err);
      performanceMonitor.endMeasure('fetch_admin_stats', { success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
