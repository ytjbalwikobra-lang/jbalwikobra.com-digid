/**
 * World-Class Global Cache Manager
 * Advanced caching system with intelligent prefetching, invalidation, and synchronization
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  lastAccessed: number;
  accessCount: number;
  key: string;
  tags: string[];
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
  prefetch?: boolean;
  syncAcrossTabs?: boolean;
}

export interface CacheStats {
  entries: number;
  hitRate: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; accessCount: number }>;
}

class GlobalCacheManager {
  private static instance: GlobalCacheManager;
  private cache = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>();
  private prefetchQueue = new Set<string>();
  private maxSize = 1000; // Maximum cache entries
  private hitCount = 0;
  private missCount = 0;

  // Singleton pattern for global cache consistency
  static getInstance(): GlobalCacheManager {
    if (!GlobalCacheManager.instance) {
      GlobalCacheManager.instance = new GlobalCacheManager();
    }
    return GlobalCacheManager.instance;
  }

  private constructor() {
    this.setupCleanupInterval();
    this.setupTabSynchronization();
    this.setupMemoryPressureHandling();
  }

  /**
   * Get cached data with intelligent access tracking
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check TTL expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hitCount++;

    return entry.data;
  }

  /**
   * Set cached data with advanced options
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      tags = [],
      syncAcrossTabs = false
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      lastAccessed: Date.now(),
      accessCount: 1,
      key,
      tags
    };

    // Enforce cache size limits with intelligent eviction
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);

    // Update tag index for fast invalidation
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });

    // Cross-tab synchronization if enabled
    if (syncAcrossTabs && typeof window !== 'undefined') {
      this.broadcastUpdate(key, entry);
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Remove from tag index
    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });

    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries with specific tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidatedCount = 0;
    
    tags.forEach(tag => {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.forEach(key => {
          if (this.delete(key)) {
            invalidatedCount++;
          }
        });
      }
    });

    return invalidatedCount;
  }

  /**
   * Get or set with automatic cache management
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      // Prefetch if TTL is expiring soon and prefetch is enabled
      if (options.prefetch && this.shouldPrefetch(key)) {
        this.scheduleRefresh(key, fetcher, options);
      }
      return cached;
    }

    // Fetch new data
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Bulk operations for better performance
   */
  setMany<T>(entries: Array<{ key: string; data: T; options?: CacheOptions }>): void {
    entries.forEach(({ key, data, options }) => {
      this.set(key, data, options);
    });
  }

  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({ key, data: this.get<T>(key) }));
  }

  /**
   * Cache statistics for monitoring
   */
  getStats(): CacheStats {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    
    const topKeys = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({ key: entry.key, accessCount: entry.accessCount }));

    return {
      entries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.estimateMemoryUsage(),
      topKeys
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Preload data into cache
   */
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    if (!this.cache.has(key)) {
      try {
        const data = await fetcher();
        this.set(key, data, { ...options, priority: 'low' });
      } catch (error) {
        console.warn(`Cache preload failed for key ${key}:`, error);
      }
    }
  }

  // Private methods for internal cache management

  private setupCleanupInterval(): void {
    // Clean expired entries every 2 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 2 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.delete(key));
  }

  private evictLeastUsed(): void {
    // Find least recently used entry
    let oldestKey = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      const score = entry.lastAccessed + (entry.accessCount * 1000); // Favor frequently accessed
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private shouldPrefetch(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const timeUntilExpiry = entry.ttl - age;
    
    // Prefetch if 80% of TTL has passed
    return timeUntilExpiry < (entry.ttl * 0.2);
  }

  private scheduleRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): void {
    if (this.prefetchQueue.has(key)) return;

    this.prefetchQueue.add(key);
    
    // Use requestIdleCallback for better performance
    const callback = () => {
      this.prefetchQueue.delete(key);
      fetcher()
        .then(data => this.set(key, data, options))
        .catch(error => console.warn(`Prefetch failed for ${key}:`, error));
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(callback, 0);
    }
  }

  private setupTabSynchronization(): void {
    if (typeof window === 'undefined') return;

    // Listen for cache updates from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('cache_sync_')) {
        const key = event.key.replace('cache_sync_', '');
        if (event.newValue) {
          try {
            const entry = JSON.parse(event.newValue);
            this.cache.set(key, entry);
          } catch (error) {
            console.warn('Failed to sync cache from other tab:', error);
          }
        } else {
          this.delete(key);
        }
      }
    });
  }

  private broadcastUpdate(key: string, entry: CacheEntry): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`cache_sync_${key}`, JSON.stringify(entry));
      // Clean up immediately to avoid localStorage bloat
      setTimeout(() => {
        localStorage.removeItem(`cache_sync_${key}`);
      }, 1000);
    } catch (error) {
      console.warn('Failed to broadcast cache update:', error);
    }
  }

  private setupMemoryPressureHandling(): void {
    if (typeof window === 'undefined') return;

    // Handle memory pressure by reducing cache size
    if ('memory' in performance && 'onchange' in (performance as any).memory) {
      (performance as any).memory.onchange = () => {
        const memoryInfo = (performance as any).memory;
        const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        
        if (usageRatio > 0.8) {
          // Aggressively clean cache when memory is low
          const keysToRemove = Math.floor(this.cache.size * 0.3);
          const sortedEntries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
          
          sortedEntries.slice(0, keysToRemove).forEach(([key]) => {
            this.delete(key);
          });
        }
      };
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate in bytes
    });
    return Math.round(totalSize / 1024); // Return in KB
  }
}

// Export singleton instance
export const globalCache = GlobalCacheManager.getInstance();

// Export utility functions for common cache patterns
export const cacheUtils = {
  // Generate cache keys with consistent formatting
  generateKey: (prefix: string, params: Record<string, any> = {}): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  },

  // Common TTL values
  TTL: {
    SHORT: 1 * 60 * 1000,      // 1 minute
    MEDIUM: 5 * 60 * 1000,     // 5 minutes
    LONG: 30 * 60 * 1000,      // 30 minutes
    VERY_LONG: 2 * 60 * 60 * 1000, // 2 hours
  },

  // Common tag patterns
  TAGS: {
    USER_DATA: 'user',
    PRODUCT_DATA: 'products',
    SETTINGS: 'settings',
    BANNERS: 'banners',
    FEED: 'feed',
    FLASH_SALES: 'flash_sales',
    AUTH: 'auth',
  },
} as const;
