/**
 * useLinkPrefetch Hook
 * 
 * Prefetches route chunks and data when links are hovered or focused.
 * This improves perceived performance by loading content before the user clicks.
 * 
 * Features:
 * - Respects user's data saver preferences
 * - Uses Intersection Observer for viewport-based prefetching
 * - Prevents duplicate prefetches
 * - Works with React Router lazy-loaded routes
 */

import { useCallback, useRef, useEffect } from 'react';
import { warmImport, shouldPrefetch } from './prefetch';

// Track prefetched routes to avoid duplicates
const prefetchedRoutes = new Set<string>();

// Route to import function mapping
const routeImports: Record<string, () => Promise<any>> = {
  '/': () => import('../pages/HomePage'),
  '/products': () => import('../pages/ProductsPage'),
  '/flash-sales': () => import('../pages/FlashSalesPage'),
  '/help': () => import('../pages/HelpPage'),
  '/terms': () => import('../pages/TermsPage'),
  '/feed': () => import('../pages/FeedPage'),
  '/profile': () => import('../pages/ProfilePage'),
  '/wishlist': () => import('../pages/WishlistPage'),
  '/settings': () => import('../pages/SettingsPage'),
  '/order-history': () => import('../pages/OrderHistoryPage'),
};

/**
 * Prefetch a route's JavaScript chunk
 */
export function prefetchRoute(path: string): void {
  // Don't prefetch if already done or user has data saver enabled
  if (prefetchedRoutes.has(path) || !shouldPrefetch()) return;

  // Get base path (without query params or fragments)
  const basePath = path.split('?')[0].split('#')[0];

  // Check for dynamic routes
  let importer = routeImports[basePath];

  // Handle dynamic product routes
  if (!importer && basePath.startsWith('/products/')) {
    importer = () => import('../pages/ProductDetailPage');
  }

  // Handle dynamic flash sale routes
  if (!importer && basePath.startsWith('/flash-sales/')) {
    importer = () => import('../pages/FlashSaleProductDetailPage');
  }

  if (importer) {
    warmImport(importer);
    prefetchedRoutes.add(path);
  }
}

/**
 * Hook for prefetching on link hover/focus
 * 
 * Usage:
 * ```tsx
 * function NavLink({ to, children }) {
 *   const prefetch = useLinkPrefetch(to);
 *   return (
 *     <Link to={to} onMouseEnter={prefetch} onFocus={prefetch}>
 *       {children}
 *     </Link>
 *   );
 * }
 * ```
 */
export function useLinkPrefetch(to: string): () => void {
  const prefetched = useRef(false);

  return useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    prefetchRoute(to);
  }, [to]);
}

/**
 * Hook for prefetching visible links in viewport
 * 
 * Usage:
 * ```tsx
 * function ProductCard({ id, ...props }) {
 *   const ref = useViewportPrefetch(`/products/${id}`);
 *   return <div ref={ref}>...</div>;
 * }
 * ```
 */
export function useViewportPrefetch(to: string): React.RefCallback<HTMLElement> {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetched = useRef(false);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return useCallback((element: HTMLElement | null) => {
    if (!element || prefetched.current || !shouldPrefetch()) return;

    // Use Intersection Observer for viewport detection
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !prefetched.current) {
              prefetched.current = true;
              prefetchRoute(to);
              observerRef.current?.disconnect();
            }
          });
        },
        {
          rootMargin: '100px', // Prefetch slightly before entering viewport
          threshold: 0,
        }
      );
      observerRef.current.observe(element);
    }
  }, [to]);
}

/**
 * Prefetch multiple routes at once (for navigation menus)
 */
export function prefetchRoutes(paths: string[]): void {
  if (!shouldPrefetch()) return;

  // Use requestIdleCallback for batch prefetching
  const ri = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void);
  const prefetchAll = () => {
    paths.forEach((path) => prefetchRoute(path));
  };

  if (ri) {
    ri(prefetchAll);
  } else {
    setTimeout(prefetchAll, 100);
  }
}

export default {
  prefetchRoute,
  useLinkPrefetch,
  useViewportPrefetch,
  prefetchRoutes,
};
