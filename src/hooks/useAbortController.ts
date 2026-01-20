/**
 * useAbortController Hook - Request Deduplication & Cancellation
 * 
 * Purpose: Prevents duplicate/stale API requests by automatically canceling
 * previous requests when a new one is initiated
 * 
 * Benefits:
 * - Reduces unnecessary egress (Supabase bandwidth)
 * - Prevents race conditions with stale responses
 * - Improves UX by showing only latest data
 * - ISO Standard: Follows AbortController Web API standard
 * 
 * Usage:
 * ```tsx
 * const { getSignal, cleanup } = useAbortController();
 * 
 * const fetchData = async () => {
 *   const signal = getSignal(); // Get new signal, abort previous
 *   const { data, error } = await supabase
 *     .from('table')
 *     .select('*')
 *     .abortSignal(signal);
 * };
 * ```
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseAbortControllerReturn {
  /** Get a new signal and abort any previous request */
  getSignal: () => AbortSignal;
  /** Manually abort current request */
  abort: () => void;
  /** Cleanup (called automatically on unmount) */
  cleanup: () => void;
  /** Check if currently aborting */
  isAborted: () => boolean;
}

export const useAbortController = (): UseAbortControllerReturn => {
  const controllerRef = useRef<AbortController | null>(null);

  // Get new signal and abort previous request
  const getSignal = useCallback((): AbortSignal => {
    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Create new controller
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  // Manually abort current request
  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  // Check if currently aborted
  const isAborted = useCallback((): boolean => {
    return controllerRef.current?.signal.aborted ?? false;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    abort();
  }, [abort]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    getSignal,
    abort,
    cleanup,
    isAborted
  };
};

/**
 * useRequestDeduplication Hook - Higher-level API request management
 * 
 * Wraps useAbortController with loading state and error handling
 * 
 * Usage:
 * ```tsx
 * const request = useRequestDeduplication();
 * 
 * const fetchData = async () => {
 *   return request.execute(async (signal) => {
 *     const response = await fetch('/api/data', { signal });
 *     return response.json();
 *   });
 * };
 * ```
 */
export const useRequestDeduplication = <T = any>() => {
  const { getSignal, abort, cleanup } = useAbortController();
  const requestIdRef = useRef(0);

  const execute = useCallback(
    async (
      requestFn: (signal: AbortSignal) => Promise<T>,
      options?: {
        onSuccess?: (data: T) => void;
        onError?: (error: any) => void;
        throwOnAbort?: boolean;
      }
    ): Promise<T | null> => {
      const currentRequestId = ++requestIdRef.current;
      const signal = getSignal();

      try {
        const result = await requestFn(signal);
        
        // Only process if this is still the latest request
        if (currentRequestId === requestIdRef.current && !signal.aborted) {
          options?.onSuccess?.(result);
          return result;
        }
        
        return null;
      } catch (error: any) {
        // Don't report abort errors unless explicitly requested
        if (error.name === 'AbortError' && !options?.throwOnAbort) {
          return null;
        }
        
        // Only report error if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          options?.onError?.(error);
        }
        
        throw error;
      }
    },
    [getSignal]
  );

  return {
    execute,
    abort,
    cleanup
  };
};

/**
 * withAbortSignal - Helper to add abort signal to Supabase queries
 * 
 * Usage:
 * ```tsx
 * const query = supabase.from('table').select('*');
 * const { data } = await withAbortSignal(query, signal);
 * ```
 */
export const withAbortSignal = async <T,>(
  promise: Promise<T>,
  signal?: AbortSignal
): Promise<T> => {
  if (!signal) return promise;

  return new Promise((resolve, reject) => {
    // Listen for abort
    signal.addEventListener('abort', () => {
      reject(new DOMException('Request aborted', 'AbortError'));
    });

    // Execute promise
    promise.then(resolve).catch(reject);
  });
};
