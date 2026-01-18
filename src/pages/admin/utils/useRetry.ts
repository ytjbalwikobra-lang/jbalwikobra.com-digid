/**
 * useRetry Hook - Retry Logic for Failed Operations
 * Provides exponential backoff retry functionality for API calls
 */

import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

/**
 * Calculate delay with exponential backoff
 */
const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number => {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hook for retrying failed operations with exponential backoff
 */
export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const stateRef = useRef<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute an operation with retry logic
   */
  const executeWithRetry = useCallback(
    async <T>(
      operation: (signal?: AbortSignal) => Promise<T>,
      operationName?: string
    ): Promise<T> => {
      stateRef.current.retryCount = 0;
      stateRef.current.lastError = null;

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      while (stateRef.current.retryCount <= maxRetries) {
        try {
          stateRef.current.isRetrying = stateRef.current.retryCount > 0;
          
          const result = await operation(signal);
          
          // Success - reset state
          stateRef.current.isRetrying = false;
          stateRef.current.retryCount = 0;
          stateRef.current.lastError = null;
          
          return result;
        } catch (error) {
          // Check if aborted
          if (signal.aborted) {
            throw new Error('Operation cancelled');
          }

          const err = error instanceof Error ? error : new Error(String(error));
          stateRef.current.lastError = err;

          // Check if we should retry
          if (stateRef.current.retryCount >= maxRetries) {
            stateRef.current.isRetrying = false;
            onMaxRetriesReached?.(err);
            throw err;
          }

          // Calculate delay
          const delay = calculateDelay(
            stateRef.current.retryCount,
            initialDelay,
            maxDelay,
            backoffMultiplier
          );

          // Notify retry callback
          onRetry?.(stateRef.current.retryCount + 1, err);

          console.warn(
            `[Retry] ${operationName || 'Operation'} failed (attempt ${stateRef.current.retryCount + 1}/${maxRetries + 1}). ` +
            `Retrying in ${delay}ms...`,
            err.message
          );

          // Wait before retry
          await sleep(delay);

          stateRef.current.retryCount++;
        }
      }

      // Should never reach here, but TypeScript needs this
      throw stateRef.current.lastError || new Error('Unknown error');
    },
    [maxRetries, initialDelay, maxDelay, backoffMultiplier, onRetry, onMaxRetriesReached]
  );

  /**
   * Cancel any ongoing retry operation
   */
  const cancelRetry = useCallback(() => {
    abortControllerRef.current?.abort();
    stateRef.current.isRetrying = false;
  }, []);

  /**
   * Get current retry state
   */
  const getState = useCallback(() => ({ ...stateRef.current }), []);

  return {
    executeWithRetry,
    cancelRetry,
    getState,
  };
};

/**
 * Standalone retry function for use outside React components
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      if (retryCount >= maxRetries) {
        onMaxRetriesReached?.(err);
        throw err;
      }

      const delay = calculateDelay(retryCount, initialDelay, maxDelay, backoffMultiplier);
      onRetry?.(retryCount + 1, err);

      console.warn(
        `[Retry] Operation failed (attempt ${retryCount + 1}/${maxRetries + 1}). ` +
        `Retrying in ${delay}ms...`,
        err.message
      );

      await sleep(delay);
      retryCount++;
    }
  }

  throw lastError || new Error('Unknown error');
};

export default useRetry;
