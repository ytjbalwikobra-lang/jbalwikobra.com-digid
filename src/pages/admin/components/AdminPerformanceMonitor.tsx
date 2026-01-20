/**
 * Admin Performance Monitor
 * 
 * Komponen untuk monitoring dan analisis performa:
 * - API call metrics
 * - Cache hit rates
 * - Data transfer monitoring
 * - Response times
 * - Egress optimization tracking
 */

import React, { useState, useEffect } from 'react';
import { adminClient } from '../../../services/unifiedAdminClient';
import { adminCache } from '../../../services/adminCache';
import { prefetchManager } from '../../../services/intelligentPrefetch';
import { DataPanel } from '../layout/DashboardPrimitives';
import { Activity, Database, Clock, TrendingDown, TrendingUp, Server } from 'lucide-react';

interface PerformanceMetrics {
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  totalBytes: number;
  errors: number;
  averageResponseTime: number;
  egressSavings: number;
}

interface CacheMetrics {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

export const AdminPerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalBytes: 0,
    errors: 0,
    averageResponseTime: 0,
    egressSavings: 0,
  });

  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({
    totalEntries: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    totalSize: 0,
    oldestEntry: 0,
    newestEntry: 0,
  });

  const [prefetchStats, setPrefetchStats] = useState<any>({
    navigationPatterns: [],
    currentPage: '',
    isUserIdle: false,
    config: { enabled: true }
  });

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      // Get unified client stats
      const clientStats = adminClient.getStats();
      const cacheStats = adminCache.getStats();
      const prefetchStatsData = prefetchManager.getStats();
      
      setMetrics({
        apiCalls: clientStats.apiCalls,
        cacheHits: clientStats.cacheHits,
        cacheMisses: clientStats.cacheMisses,
        totalBytes: clientStats.totalBytes,
        errors: clientStats.errors,
        averageResponseTime: clientStats.apiCalls > 0 ? 
          (clientStats.totalBytes / clientStats.apiCalls / 1000) : 0, // Rough estimate
        egressSavings: calculateEgressSavings(clientStats.cacheHits, clientStats.totalBytes, clientStats.apiCalls),
      });

      setCacheMetrics({
        totalEntries: cacheStats.totalEntries,
        totalHits: cacheStats.totalHits,
        totalMisses: cacheStats.totalMisses,
        hitRate: cacheStats.hitRate,
        totalSize: cacheStats.totalSize,
        oldestEntry: cacheStats.oldestEntry,
        newestEntry: cacheStats.newestEntry,
      });

      setPrefetchStats(prefetchStatsData);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const calculateEgressSavings = (cacheHits: number, totalBytes: number, apiCalls: number): number => {
    if (apiCalls === 0) return 0;
    const averageResponseSize = totalBytes / apiCalls;
    return cacheHits * averageResponseSize;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHitRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const resetStats = () => {
    adminClient.resetStats();
    setMetrics({
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalBytes: 0,
      errors: 0,
      averageResponseTime: 0,
      egressSavings: 0,
    });
  };

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setExpanded(true)}
          className="bg-black/80 backdrop-blur-md text-white p-3 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200"
          title="Show Performance Monitor"
        >
          <Activity className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <DataPanel className="bg-black/95 backdrop-blur-md text-white border border-gray-700 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-white font-semibold">Performance Monitor</span>
            <span className="text-xs text-gray-400">API & Cache Metrics</span>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* API Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">API Calls</span>
              </div>
              <span className="text-xl font-semibold text-blue-400">{metrics.apiCalls}</span>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Cache Hits</span>
              </div>
              <span className="text-xl font-semibold text-green-400">{metrics.cacheHits}</span>
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Cache Hit Rate</span>
              <span className={`font-semibold ${getHitRateColor(cacheMetrics.hitRate)}`}>
                {cacheMetrics.hitRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${cacheMetrics.hitRate}%` }}
              />
            </div>
          </div>

          {/* Data Transfer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">Data Transfer</span>
              </div>
              <span className="text-lg font-semibold text-purple-400">
                {formatBytes(metrics.totalBytes)}
              </span>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-gray-300">Egress Saved</span>
              </div>
              <span className="text-lg font-semibold text-orange-400">
                {formatBytes(metrics.egressSavings)}
              </span>
            </div>
          </div>

          {/* Cache Details */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-300 mb-2">Cache Statistics</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Entries</div>
                <div className="text-white font-medium">{cacheMetrics.totalEntries}</div>
              </div>
              <div>
                <div className="text-gray-400">Size</div>
                <div className="text-white font-medium">{formatBytes(cacheMetrics.totalSize)}</div>
              </div>
              <div>
                <div className="text-gray-400">Errors</div>
                <div className="text-red-400 font-medium">{metrics.errors}</div>
              </div>
            </div>
          </div>

          {/* Prefetch Status */}
          {prefetchStats.config.enabled && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-gray-300 mb-2">Prefetch Status</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Current Page</span>
                <span className="text-white font-medium">{prefetchStats.currentPage || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-400">User Status</span>
                <span className={`font-medium ${prefetchStats.isUserIdle ? 'text-yellow-400' : 'text-green-400'}`}>
                  {prefetchStats.isUserIdle ? 'Idle' : 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-400">Patterns</span>
                <span className="text-white font-medium">{prefetchStats.navigationPatterns.length}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={resetStats}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
            >
              Reset Stats
            </button>
            <button
              onClick={() => {
              }}
              className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
            >
              Log Details
            </button>
          </div>

          {/* Performance Score */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Performance Score</span>
              <span className="text-2xl font-bold text-green-400">
                {calculatePerformanceScore(metrics, cacheMetrics)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Based on cache hit rate, error rate, and data efficiency
            </div>
          </div>
        </div>
  </DataPanel>
    </div>
  );
};

// Calculate performance score (0-100)
function calculatePerformanceScore(metrics: PerformanceMetrics, cache: CacheMetrics): number {
  if (metrics.apiCalls === 0) return 100;
  
  const hitRateScore = cache.hitRate * 0.4; // 40% weight
  const errorRateScore = Math.max(0, (1 - metrics.errors / metrics.apiCalls) * 100) * 0.3; // 30% weight
  const efficiencyScore = Math.min(100, (metrics.egressSavings / metrics.totalBytes) * 100) * 0.3; // 30% weight
  
  return Math.round(hitRateScore + errorRateScore + efficiencyScore);
}

export default AdminPerformanceMonitor;
