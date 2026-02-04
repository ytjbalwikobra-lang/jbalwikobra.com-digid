// Simple in-flight request deduplication utility
// Prevents multiple concurrent identical API calls

export class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private inflightRequests = new Map<string, Promise<any>>();
  
  static getInstance(): RequestDeduplicator {
    if (!this.instance) {
      this.instance = new RequestDeduplicator();
    }
    return this.instance;
  }

  /**
   * Deduplicate concurrent requests with the same key
   * @param key Unique identifier for the request
   * @param requestFn Function that performs the actual request
   * @returns Promise that resolves with the request result
   */
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    if (this.inflightRequests.has(key)) {
      return this.inflightRequests.get(key) as Promise<T>;
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.inflightRequests.delete(key);
      });

    // Store in-flight request
    this.inflightRequests.set(key, promise);
    
    return promise;
  }

  /**
   * Clear all in-flight requests (useful for cleanup)
   */
  clear(): void {
    this.inflightRequests.clear();
  }

  /**
   * Get count of in-flight requests (for debugging)
   */
  getInflightCount(): number {
    return this.inflightRequests.size;
  }
}

export const requestDeduplicator = RequestDeduplicator.getInstance();

/**
 * Utility function to wrap service calls with deduplication
 * @param key Unique key for the request
 * @param requestFn Function that performs the API call
 */
export function dedupeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  return requestDeduplicator.dedupe(key, requestFn);
}

/**
 * Generate a cache key from function name and parameters
 */
export function generateCacheKey(functionName: string, params?: any): string {
  if (!params) return functionName;
  
  try {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as any);
    
    return `${functionName}:${JSON.stringify(sortedParams)}`;
  } catch {
    return `${functionName}:${Date.now()}`;
  }
}
