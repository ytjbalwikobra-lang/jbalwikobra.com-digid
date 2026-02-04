/**
 * Admin Performance Monitor
 * Tracks and logs performance metrics for admin panel operations
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class AdminPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Disable in production by default
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.enabled = false;
    }
  }

  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string) {
    if (!this.enabled) return;
    
    const markName = `${name}_start`;
    this.marks.set(markName, performance.now());
    
    // Use native Performance API if available
    if (performance.mark) {
      performance.mark(markName);
    }
  }

  /**
   * End measuring a performance metric
   */
  endMeasure(name: string, metadata?: Record<string, any>) {
    if (!this.enabled) return;
    
    const markName = `${name}_start`;
    const startTime = this.marks.get(markName);
    
    if (startTime === undefined) {
      console.warn(`Performance measure "${name}" was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(markName);

    // Record metric
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };
    
    this.metrics.push(metric);

    // Use native Performance API
    if (performance.mark && performance.measure) {
      const endMarkName = `${name}_end`;
      performance.mark(endMarkName);
      
      try {
        performance.measure(name, markName, endMarkName);
      } catch (e) {
        // Silently fail if marks don't exist
      }
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary by operation name
   */
  getSummary(name?: string): Record<string, { count: number; avgDuration: number; maxDuration: number; minDuration: number }> {
    const filtered = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    const grouped = filtered.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    const summary: Record<string, any> = {};
    
    for (const key in grouped) {
      if (Object.prototype.hasOwnProperty.call(grouped, key)) {
        const durations = grouped[key];
        summary[key] = {
          count: durations.length,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          maxDuration: Math.max(...durations),
          minDuration: Math.min(...durations),
        };
      }
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.marks.clear();
    
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    if (!this.enabled) return;
    
    const summary = this.getSummary();
    console.table(summary);
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton instance
export const performanceMonitor = new AdminPerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const measureName = `component_render_${componentName}`;
  
  // Start measure on mount
  React.useEffect(() => {
    performanceMonitor.startMeasure(measureName);
    
    return () => {
      // End measure on unmount
      performanceMonitor.endMeasure(measureName);
    };
  }, [measureName]);
}

/**
 * Higher-order function to measure async function performance
 */
export function measureAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    performanceMonitor.startMeasure(name);
    
    try {
      const result = await fn(...args);
      performanceMonitor.endMeasure(name, { success: true });
      return result;
    } catch (error: any) {
      performanceMonitor.endMeasure(name, { success: false, error: error.message });
      throw error;
    }
  }) as T;
}

// Export for global access in dev tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__adminPerformanceMonitor = performanceMonitor;
}

export default performanceMonitor;
