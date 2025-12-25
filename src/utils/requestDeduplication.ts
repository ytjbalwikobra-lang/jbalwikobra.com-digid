/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent API calls by caching pending requests.
 * Useful for preventing race conditions and reducing unnecessary API calls.
 */

// Cache for pending requests
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Execute a request with deduplication
 * If the same key is requested while a previous request is still pending,
 * returns the pending request instead of making a new one.
 * 
 * @param key - Unique identifier for the request
 * @param requestFn - Function that executes the actual request
 * @returns Promise with the request result
 * 
 * @example
 * ```typescript
 * // Multiple concurrent calls will only make one actual request
 * const products1 = dedupedRequest('products', () => fetchProducts());
 * const products2 = dedupedRequest('products', () => fetchProducts());
 * // products1 and products2 will be the same Promise
 * ```
 */
export async function dedupedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request for this key
  if (pendingRequests.has(key)) {
    console.log(`[Request Dedup] Reusing pending request: ${key}`);
    return pendingRequests.get(key) as Promise<T>;
  }
  
  console.log(`[Request Dedup] Starting new request: ${key}`);
  
  // Create new request and cache it
  const promise = requestFn().finally(() => {
    // Remove from cache when done (success or error)
    pendingRequests.delete(key);
    console.log(`[Request Dedup] Request completed: ${key}`);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Clear a specific request from the cache
 * Useful when you want to force a fresh request
 * 
 * @param key - The request key to clear
 */
export function clearRequestCache(key: string): void {
  pendingRequests.delete(key);
  console.log(`[Request Dedup] Cache cleared: ${key}`);
}

/**
 * Clear all pending requests from the cache
 * Useful for testing or when logging out
 */
export function clearAllRequestCache(): void {
  pendingRequests.clear();
  console.log('[Request Dedup] All cache cleared');
}

/**
 * Get the number of pending requests
 * Useful for debugging and monitoring
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Get all pending request keys
 * Useful for debugging
 */
export function getPendingRequestKeys(): string[] {
  return Array.from(pendingRequests.keys());
}

/**
 * Advanced: Create a deduped request wrapper for a specific service
 * 
 * @example
 * ```typescript
 * // In productService.ts
 * const dedupedProductRequest = createDedupedRequestWrapper('products');
 * 
 * export async function getProducts() {
 *   return dedupedProductRequest('list', async () => {
 *     const { data } = await supabase.from('products').select('...');
 *     return data;
 *   });
 * }
 * ```
 */
export function createDedupedRequestWrapper(prefix: string) {
  return <T>(subKey: string, requestFn: () => Promise<T>): Promise<T> => {
    return dedupedRequest(`${prefix}:${subKey}`, requestFn);
  };
}

// Export for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).__requestCache = {
    clear: clearRequestCache,
    clearAll: clearAllRequestCache,
    getPending: getPendingRequestCount,
    getKeys: getPendingRequestKeys,
  };
}
