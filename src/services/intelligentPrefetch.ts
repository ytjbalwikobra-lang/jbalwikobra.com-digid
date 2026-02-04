/**
 * Intelligent Prefetch Strategy for Admin Panel
 * 
 * Strategi pintar untuk prefetch data berdasarkan:
 * - User navigation patterns
 * - Time-based prefetching
 * - Priority-based loading
 * - Background data refreshing
 */

import { adminClient } from './unifiedAdminClient';

interface PrefetchConfig {
  enabled: boolean;
  aggressiveMode: boolean;
  backgroundRefreshInterval: number;
  prefetchOnHover: boolean;
  prefetchOnIdle: boolean;
}

interface NavigationPattern {
  path: string;
  frequency: number;
  lastVisited: number;
  averageStayTime: number;
  nextLikelyPages: string[];
}

class IntelligentPrefetchManager {
  private config: PrefetchConfig = {
    enabled: true,
    aggressiveMode: false,
    backgroundRefreshInterval: 30000, // 30 seconds
    prefetchOnHover: true,
    prefetchOnIdle: true,
  };

  private navigationPatterns: Map<string, NavigationPattern> = new Map();
  private currentPage: string = '';
  private idleTimeout: NodeJS.Timeout | null = null;
  private backgroundRefreshInterval: NodeJS.Timeout | null = null;
  private isUserIdle: boolean = false;
  private lastActivity: number = Date.now();

  // Prefetch priorities (higher = more important)
  private readonly PREFETCH_PRIORITIES = {
    'dashboard': 10,
    'orders': 9,
    'users': 7,
    'products': 6,
    'analytics': 5,
    'settings': 3,
  };

  constructor() {
    this.loadNavigationPatterns();
    this.setupEventListeners();
    this.startBackgroundRefresh();
  }

  /**
   * Set current page and trigger intelligent prefetching
   */
  setCurrentPage(page: string): void {
    const previousPage = this.currentPage;
    this.currentPage = page;
    
    // Update navigation patterns
    this.updateNavigationPattern(page, previousPage);
    
    // Trigger prefetch based on page
    this.prefetchForPage(page);
    
    // Save patterns to localStorage
    this.saveNavigationPatterns();
  }

  /**
   * Prefetch data based on current page and patterns
   */
  private async prefetchForPage(page: string): Promise<void> {
    if (!this.config.enabled) return;

    const prefetchActions: Array<Promise<void>> = [];

    switch (page) {
      case 'dashboard':
        prefetchActions.push(
          this.prefetchWithPriority('dashboard-stats', 10),
          this.prefetchWithPriority('recent-orders', 9),
          this.prefetchWithPriority('recent-notifications', 8),
          this.prefetchWithPriority('orders-overview', 7)
        );
        break;

      case 'orders':
        prefetchActions.push(
          this.prefetchWithPriority('orders-list', 10),
          this.prefetchWithPriority('dashboard-stats', 7),
          // Prefetch order details for recent orders
          this.prefetchRecentOrderDetails()
        );
        break;

      case 'users':
        prefetchActions.push(
          this.prefetchWithPriority('users-list', 10),
          this.prefetchWithPriority('user-stats', 8)
        );
        break;

      case 'products':
        prefetchActions.push(
          this.prefetchWithPriority('products-list', 10),
          this.prefetchWithPriority('product-stats', 8)
        );
        break;
    }

    // Add pattern-based prefetching
    const pattern = this.navigationPatterns.get(page);
    if (pattern) {
      const priorities = this.PREFETCH_PRIORITIES;
      pattern.nextLikelyPages.forEach((nextPage) => {
        const priority = priorities[nextPage as keyof typeof priorities] || 5;
        prefetchActions.push(
          this.prefetchWithPriority(nextPage, priority)
        );
      });
    }

    // Execute prefetch actions
    await Promise.allSettled(prefetchActions);
  }

  /**
   * Prefetch with priority queue
   */
  private async prefetchWithPriority(action: string, priority: number): Promise<void> {
    // Simple priority-based delay
    const delay = Math.max(0, (10 - priority) * 100);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.executePrefetchAction(action)
          .then(() => resolve())
          .catch((error) => {
            console.warn(`Prefetch failed for ${action}:`, error);
            resolve();
          });
      }, delay);
    });
  }

  /**
   * Execute specific prefetch action
   */
  private async executePrefetchAction(action: string): Promise<void> {
    switch (action) {
      case 'dashboard-stats':
        await adminClient.getDashboardStats({ skipCache: false });
        break;
      case 'recent-orders':
        await adminClient.getOrders(1, 10);
        break;
      case 'recent-notifications':
        await adminClient.getNotifications(1, 10);
        break;
      case 'orders-list':
        await adminClient.getOrders(1, 20);
        break;
      case 'orders-overview':
        await adminClient.getOrders(1, 5);
        break;
      case 'users-list':
        await adminClient.getUsers(1, 20);
        break;
      case 'user-stats':
        // Could add specific user stats endpoint
        break;
      case 'products-list':
        await adminClient.getProducts(1, 20);
        break;
      case 'product-stats':
        // Could add specific product stats endpoint
        break;
    }
  }

  /**
   * Prefetch recent order details
   */
  private async prefetchRecentOrderDetails(): Promise<void> {
    try {
      // Get recent orders and prefetch their details
      const { data: _orders } = await adminClient.getOrders(1, 5, undefined, { skipCache: true });
      
      // Here you could prefetch individual order details if you had that endpoint
      // For now, this just ensures recent orders are cached
    } catch (error) {
      console.warn('Failed to prefetch recent order details:', error);
    }
  }

  /**
   * Handle hover prefetching
   */
  onPageLinkHover(targetPage: string): void {
    if (!this.config.prefetchOnHover) return;
    
    // Debounce hover prefetching
    setTimeout(() => {
      this.prefetchForPage(targetPage);
    }, 500);
  }

  /**
   * Handle idle prefetching
   */
  private onUserIdle(): void {
    if (!this.config.prefetchOnIdle || this.isUserIdle) return;
    
    this.isUserIdle = true;
    
    // Prefetch low-priority data during idle time
    this.prefetchIdleData();
  }

  /**
   * Prefetch data during idle time
   */
  private async prefetchIdleData(): Promise<void> {
    const idlePrefetchActions = [
      this.prefetchWithPriority('user-stats', 3),
      this.prefetchWithPriority('product-stats', 3),
      // Prefetch next likely page based on patterns
      ...this.getPredictedNextPages().map(page => 
        this.prefetchWithPriority(page, 2)
      )
    ];

    await Promise.allSettled(idlePrefetchActions);
  }

  /**
   * Get predicted next pages based on navigation patterns
   */
  private getPredictedNextPages(): string[] {
    const currentPattern = this.navigationPatterns.get(this.currentPage);
    if (!currentPattern) return [];
    
    return currentPattern.nextLikelyPages.slice(0, 2); // Top 2 most likely
  }

  /**
   * Update navigation patterns
   */
  private updateNavigationPattern(currentPage: string, previousPage?: string): void {
    const now = Date.now();
    
    // Update current page pattern
    const existing = this.navigationPatterns.get(currentPage);
    if (existing) {
      existing.frequency += 1;
      existing.lastVisited = now;
      existing.averageStayTime = (existing.averageStayTime + (now - this.lastActivity)) / 2;
    } else {
      this.navigationPatterns.set(currentPage, {
        path: currentPage,
        frequency: 1,
        lastVisited: now,
        averageStayTime: 0,
        nextLikelyPages: []
      });
    }

    // Update previous page's next likely pages
    if (previousPage) {
      const previousPattern = this.navigationPatterns.get(previousPage);
      if (previousPattern) {
        const nextPages = previousPattern.nextLikelyPages;
        const existingIndex = nextPages.indexOf(currentPage);
        
        if (existingIndex > -1) {
          // Move to front (increase priority)
          nextPages.splice(existingIndex, 1);
          nextPages.unshift(currentPage);
        } else {
          // Add to front, keep only top 3
          nextPages.unshift(currentPage);
          if (nextPages.length > 3) {
            nextPages.pop();
          }
        }
      }
    }
  }

  /**
   * Setup event listeners for activity tracking
   */
  private setupEventListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, this.onUserActivity.bind(this), { passive: true });
    });
  }

  /**
   * Handle user activity
   */
  private onUserActivity(): void {
    this.lastActivity = Date.now();
    this.isUserIdle = false;
    
    // Reset idle timeout
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    
    this.idleTimeout = setTimeout(() => {
      this.onUserIdle();
    }, 30000); // 30 seconds idle time
  }

  /**
   * Start background refresh for hot data
   */
  private startBackgroundRefresh(): void {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }
    
    this.backgroundRefreshInterval = setInterval(async () => {
      if (this.isUserIdle && this.config.enabled) {
        // Refresh hot data in background
        try {
          await adminClient.getDashboardStats({ backgroundRefresh: true });
          await adminClient.getNotifications(1, 5, { backgroundRefresh: true });
        } catch (error) {
          console.warn('Background refresh failed:', error);
        }
      }
    }, this.config.backgroundRefreshInterval);
  }

  /**
   * Load navigation patterns from localStorage
   */
  private loadNavigationPatterns(): void {
    try {
      const stored = localStorage.getItem('admin-nav-patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        Object.entries(patterns).forEach(([key, value]) => {
          this.navigationPatterns.set(key, value as NavigationPattern);
        });
      }
    } catch (error) {
      console.warn('Failed to load navigation patterns:', error);
    }
  }

  /**
   * Save navigation patterns to localStorage
   */
  private saveNavigationPatterns(): void {
    try {
      const patterns = Object.fromEntries(this.navigationPatterns);
      localStorage.setItem('admin-nav-patterns', JSON.stringify(patterns));
    } catch (error) {
      console.warn('Failed to save navigation patterns:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PrefetchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart background refresh if interval changed
    if (newConfig.backgroundRefreshInterval) {
      this.startBackgroundRefresh();
    }
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    navigationPatterns: NavigationPattern[];
    currentPage: string;
    isUserIdle: boolean;
    config: PrefetchConfig;
  } {
    return {
      navigationPatterns: Array.from(this.navigationPatterns.values()),
      currentPage: this.currentPage,
      isUserIdle: this.isUserIdle,
      config: { ...this.config }
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }
    
    // Remove event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, this.onUserActivity.bind(this));
    });
  }
}

// Global instance
export const prefetchManager = new IntelligentPrefetchManager();

// Export for debugging in development
if (process.env.NODE_ENV === 'development') {
  (globalThis as any).prefetchManager = prefetchManager;
}

export default prefetchManager;
