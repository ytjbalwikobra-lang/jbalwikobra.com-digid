/**
 * Core Web Vitals Monitoring
 * 
 * Tracks and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial render
 * - TTFB (Time to First Byte) - Server response
 * - INP (Interaction to Next Paint) - Responsiveness
 * 
 * Reports to Google Analytics 4 for SEO ranking signals
 */

import { trackEvent } from './analyticsService';

// Web Vitals types
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metric to console and GA4
 */
function reportMetric(metric: WebVitalMetric): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const rating = getRating(metric.name, metric.value);
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(`${color} ${metric.name}: ${metric.value.toFixed(2)} (${rating})`);
  }

  // Report to GA4
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_rating: getRating(metric.name, metric.value),
    metric_delta: Math.round(metric.delta),
    metric_id: metric.id,
  });
}

/**
 * Observe Largest Contentful Paint (LCP)
 */
function observeLCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      if (lastEntry) {
        reportMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating('LCP', lastEntry.startTime),
          delta: lastEntry.startTime,
          id: `lcp-${Date.now()}`,
          entries: entries,
        });
      }
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('LCP observation not supported');
  }
}

/**
 * Observe First Input Delay (FID)
 */
function observeFID(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const firstEntry = entries[0] as any;
      
      if (firstEntry) {
        const fid = firstEntry.processingStart - firstEntry.startTime;
        reportMetric({
          name: 'FID',
          value: fid,
          rating: getRating('FID', fid),
          delta: fid,
          id: `fid-${Date.now()}`,
          entries: entries,
        });
      }
    });
    
    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    console.warn('FID observation not supported');
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 */
function observeCLS(): void {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    // Report CLS when page is hidden (user navigates away)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && clsValue > 0) {
        reportMetric({
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          delta: clsValue,
          id: `cls-${Date.now()}`,
          entries: clsEntries,
        });
      }
    });
  } catch (e) {
    console.warn('CLS observation not supported');
  }
}

/**
 * Observe First Contentful Paint (FCP)
 */
function observeFCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        reportMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: getRating('FCP', fcpEntry.startTime),
          delta: fcpEntry.startTime,
          id: `fcp-${Date.now()}`,
          entries: entries,
        });
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('FCP observation not supported');
  }
}

/**
 * Observe Time to First Byte (TTFB)
 */
function observeTTFB(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as PerformanceNavigationTiming[];
      const navigationEntry = entries[0];
      
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        reportMetric({
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
          delta: ttfb,
          id: `ttfb-${Date.now()}`,
          entries: entries,
        });
      }
    });

    observer.observe({ type: 'navigation', buffered: true });
  } catch (e) {
    console.warn('TTFB observation not supported');
  }
}

/**
 * Observe Interaction to Next Paint (INP) - New metric replacing FID
 */
function observeINP(): void {
  if (!('PerformanceObserver' in window)) return;

  let maxINP = 0;

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        const duration = entry.duration;
        if (duration > maxINP) {
          maxINP = duration;
        }
      }
    });

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });

    // Report INP when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && maxINP > 0) {
        reportMetric({
          name: 'INP',
          value: maxINP,
          rating: getRating('INP', maxINP),
          delta: maxINP,
          id: `inp-${Date.now()}`,
          entries: [],
        });
      }
    });
  } catch (e) {
    console.warn('INP observation not supported');
  }
}

/**
 * Initialize all Web Vitals observers
 * Should be called once when the app loads
 */
export function initWebVitals(): void {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Wait for page load to ensure accurate measurements
  if (document.readyState === 'complete') {
    startObserving();
  } else {
    window.addEventListener('load', startObserving);
  }
}

function startObserving(): void {
  observeLCP();
  observeFID();
  observeCLS();
  observeFCP();
  observeTTFB();
  observeINP();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vitals monitoring initialized');
  }
}

/**
 * Get current Web Vitals summary (for debugging)
 */
export function getWebVitalsSummary(): void {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation) {
    console.group('📊 Web Vitals Summary');
    console.log('DNS Lookup:', Math.round(navigation.domainLookupEnd - navigation.domainLookupStart), 'ms');
    console.log('TCP Connection:', Math.round(navigation.connectEnd - navigation.connectStart), 'ms');
    console.log('TTFB:', Math.round(navigation.responseStart - navigation.requestStart), 'ms');
    console.log('DOM Interactive:', Math.round(navigation.domInteractive), 'ms');
    console.log('DOM Complete:', Math.round(navigation.domComplete), 'ms');
    console.log('Load Complete:', Math.round(navigation.loadEventEnd), 'ms');
    console.groupEnd();
  }
}

export default { init: initWebVitals, getSummary: getWebVitalsSummary };
