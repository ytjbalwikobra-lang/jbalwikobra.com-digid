// React Performance Optimization Configuration
// This file contains critical performance improvements for mobile devices

// Note: keep this file side-effect free and browser-safe

// Preload critical chunks for better perceived performance
export const preloadCriticalChunks = () => {
  // Preload the most commonly visited pages after HomePage
  const criticalChunks = [
    () => import('../pages/ProductsPage'),
    () => import('../pages/TraditionalAuthPage'),
  ];
  
  // Use requestIdleCallback for better performance
  try {
    const loadAll = () => {
      // Load all critical chunks; log failures in dev for visibility
      criticalChunks.forEach(chunk => {
        void chunk().catch((e: any) => {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('prefetch chunk failed (non-fatal):', e?.message || e);
          }
        });
      });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const cb = () => { loadAll(); return undefined; };
      (window as any).requestIdleCallback(cb);
    } else {
      // Fallback for browsers without requestIdleCallback
      const cb = () => { loadAll(); return undefined; };
      setTimeout(cb, 2000);
    }
  } catch (e) {
    // ignore in non-browser environments - explicit no-op
    if (process.env.NODE_ENV !== 'production') { /* noop */ }
    return;
  }
};

// Image loading optimization
export const optimizeImages = () => {
  // Enable modern image formats
  const supportsWebP = () => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').includes('webp');
  };

  const supportsAVIF = () => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').includes('avif');
  };

  // Store in sessionStorage to avoid recalculating
  try {
    if (!sessionStorage.getItem('imageFormats')) {
      sessionStorage.setItem('imageFormats', JSON.stringify({
        webp: supportsWebP(),
        avif: supportsAVIF()
      }));
    }
  } catch (_e) {
    // ignore storage errors
  }
};

// Critical CSS inlining (for above-the-fold content)
export const inlineCriticalCSS = () => {
  const criticalCSS = `
    /* Critical CSS for immediate rendering */
    .bg-app-dark { background-color: #0f0f0f; }
    .text-gray-200 { color: #e5e7eb; }
    .min-h-screen { min-height: 100vh; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  // Only inject if not already present
  try {
    if (typeof document !== 'undefined' && !document.querySelector('#critical-css')) {
      const style = document.createElement('style');
      style.id = 'critical-css';
      style.textContent = criticalCSS;
      document.head.insertBefore(style, document.head.firstChild);
    }
  } catch (_e) {
    // ignore DOM errors
  }
};

// Service Worker registration for caching
export const registerServiceWorker = async () => {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
    }
  }
};

// Performance monitoring
export const initPerformanceMonitoring = () => {
  // Measure Core Web Vitals
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const _entry of list.getEntries() as PerformanceEntry[]) {
              }
    }).observe({ type: 'largest-contentful-paint', buffered: true } as any);

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const _entry of list.getEntries() as PerformanceEntry[]) {
              }
    }).observe({ type: 'first-input', buffered: true } as any);

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[]) {
        const e: any = entry;
        if (!e.hadRecentInput) {
        }
      }
    }).observe({ type: 'layout-shift', buffered: true } as any);
  }
};

// Memory management for long-running sessions
export const optimizeMemoryUsage = () => {
  // Clear unnecessary caches periodically
  const clearCaches = () => {
    // Clear image caches that are too large
    const imageCache = sessionStorage.getItem('imageCache');
    if (imageCache && imageCache.length > 50000) { // 50KB limit
      sessionStorage.removeItem('imageCache');
    }

    // Clear old logs
    const logs = localStorage.getItem('appLogs');
    if (logs && logs.length > 100000) { // 100KB limit
      localStorage.removeItem('appLogs');
    }
  };

  // Run cleanup every 5 minutes
  if (typeof window !== 'undefined') {
    setInterval(clearCaches, 5 * 60 * 1000);
  }
};

// Initialize all optimizations
export const initializePerformanceOptimizations = () => {
  // Run critical optimizations immediately
  inlineCriticalCSS();
  optimizeImages();
  
  // Run after DOM load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        preloadCriticalChunks();
        registerServiceWorker();
        initPerformanceMonitoring();
        optimizeMemoryUsage();
      });
    } else {
      preloadCriticalChunks();
      registerServiceWorker();
      initPerformanceMonitoring();
      optimizeMemoryUsage();
    }
  }
};
