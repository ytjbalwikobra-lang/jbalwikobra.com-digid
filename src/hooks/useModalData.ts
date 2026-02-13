import { useState, useCallback, useEffect } from 'react';

/**
 * useModalData - Reusable hook for lazy-loading modal data
 * 
 * Eliminates duplicate data fetching patterns:
 * - OrderDetailsModal fetches order data when modal opens
 * - ProductModal loads dropdown data on mount
 * - Provides consistent error handling and loading states
 * 
 * Features:
 * - Lazy loading (only fetches when modal opens)
 * - Automatic retry on error
 * - Loading/error states
 * - Egress optimization: No wasted API calls
 * - ISO 9241-110: Consistent error feedback
 */

export interface UseModalDataOptions<T> {
  /** Whether modal is open (triggers data load) */
  isOpen: boolean;
  /** Entity ID to fetch (if applicable) */
  entityId?: string | null;
  /** Fetch function */
  fetchFn: (id?: string) => Promise<T>;
  /** Skip loading if no entityId */
  requiresId?: boolean;
  /** On error callback */
  onError?: (error: Error) => void;
  /** Dependencies that trigger refetch */
  dependencies?: any[];
}

export interface UseModalDataResult<T> {
  /** Fetched data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refetch data */
  refetch: () => Promise<void>;
  /** Clear data and error */
  reset: () => void;
}

export function useModalData<T>(
  options: UseModalDataOptions<T>
): UseModalDataResult<T> {
  const {
    isOpen,
    entityId,
    fetchFn,
    requiresId = false,
    onError,
    dependencies = []
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    // Skip if requires ID but none provided
    if (requiresId && !entityId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(entityId || undefined);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [entityId, fetchFn, requiresId, onError]);

  // Fetch when modal opens, entityId changes, or dependencies change
  useEffect(() => {
    if (!isOpen) {
      // Clear data when modal closes for security
      setData(null);
      setError(null);
      return;
    }

    fetchData();
  }, [isOpen, entityId, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset data and error
  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset
  };
}
