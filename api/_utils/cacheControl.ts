// API Response Caching Utility
// Provides consistent cache headers across all API routes

export interface CacheOptions {
  maxAge?: number;           // Cache duration in seconds (default: 60)
  staleWhileRevalidate?: number;  // SWR duration (default: equal to maxAge)
  public?: boolean;          // Whether cache is public (default: true)
  noCache?: boolean;         // Disable caching completely (default: false)
}

/**
 * Generate Cache-Control header value
 * @param options Cache configuration options
 * @returns Cache-Control header string
 */
export function getCacheControl(options: CacheOptions = {}): string {
  const {
    maxAge = 60,
    staleWhileRevalidate = maxAge,
    public: isPublic = true,
    noCache = false
  } = options;

  if (noCache) {
    return 'no-cache, no-store, must-revalidate';
  }

  const parts: string[] = [];
  
  if (isPublic) {
    parts.push('public');
  } else {
    parts.push('private');
  }

  parts.push(`s-maxage=${maxAge}`);
  parts.push(`max-age=${maxAge}`);
  
  if (staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

/**
 * Set cache headers on Vercel response
 * @param res Vercel response object
 * @param options Cache configuration options
 */
export function setCacheHeaders(res: any, options: CacheOptions = {}) {
  const cacheControl = getCacheControl(options);
  
  res.setHeader('Cache-Control', cacheControl);
  
  // Also set CDN-specific headers for better edge caching
  if (!options.noCache) {
    res.setHeader('CDN-Cache-Control', `public, s-maxage=${options.maxAge || 60}`);
    res.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${options.maxAge || 60}`);
  }
}

/**
 * Predefined cache strategies for common use cases
 */
export const CacheStrategies = {
  // No caching - for sensitive or frequently changing data
  NoCache: { noCache: true },
  
  // Short cache - for moderately dynamic data (30 seconds)
  Short: { maxAge: 30, staleWhileRevalidate: 60 },
  
  // Standard cache - for typical API responses (60 seconds)
  Standard: { maxAge: 60, staleWhileRevalidate: 120 },
  
  // Medium cache - for less frequently changing data (5 minutes)
  Medium: { maxAge: 300, staleWhileRevalidate: 600 },
  
  // Long cache - for static or rarely changing data (10 minutes)
  Long: { maxAge: 600, staleWhileRevalidate: 1200 },
  
  // Extended cache - for very stable data (1 hour)
  Extended: { maxAge: 3600, staleWhileRevalidate: 7200 },
} as const;

/**
 * Example usage in API routes:
 * 
 * import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl';
 * 
 * // Use predefined strategy
 * setCacheHeaders(res, CacheStrategies.Standard);
 * 
 * // Or custom configuration
 * setCacheHeaders(res, { maxAge: 120, staleWhileRevalidate: 240 });
 * 
 * // Disable caching for sensitive data
 * setCacheHeaders(res, CacheStrategies.NoCache);
 */
