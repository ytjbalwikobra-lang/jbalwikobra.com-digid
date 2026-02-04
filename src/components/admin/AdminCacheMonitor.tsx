import React, { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { adminCache } from '../../services/adminCache';
import { PNCard, PNButton } from '../ui/CyberDesignSystem';

// Use the CacheStats from adminCache.ts
interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

export const AdminCacheMonitor: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(adminCache.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    adminCache.clear();
    setStats(adminCache.getStats());
  };

  if (!stats) return null;

  return (
    <div className={className}>
      <PNCard className="surface-glass-md">
        <div className="p-stack-md">
          <div className="flex items-center justify-between mb-stack-md">
            <h4 className="fs-sm font-medium text-white flex items-center gap-cluster-xs">
              <Database className="w-4 h-4" />
              Cache Performance
            </h4>
            <PNButton
              variant="secondary"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="fs-xs"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </PNButton>
          </div>

          <div className="grid grid-cols-3 gap-stack-md text-center">
            <div>
              <div className="heading-md text-white">{stats.totalEntries}</div>
              <div className="fs-xs text-surface-tint-gray">Entries</div>
            </div>
            <div>
              <div className="heading-md text-white">{Math.round(stats.totalSize / 1024)}KB</div>
              <div className="fs-xs text-surface-tint-gray">Size</div>
            </div>
            <div>
              <div className="heading-md text-surface-tint-green">
                {stats.hitRate ? `${(stats.hitRate * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="fs-xs text-surface-tint-gray">Hit Rate</div>
            </div>
          </div>

          {showDetails && (
            <div className="mt-stack-md pt-stack-md border-t border-surface-tint-gray/20">
              <div className="flex justify-between items-center mb-stack-sm">
                <span className="fs-xs font-medium text-surface-tint-gray">Cache Entries</span>
                <PNButton
                  variant="secondary"
                  size="sm"
                  onClick={handleClearCache}
                  className="flex items-center gap-cluster-xs fs-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear Cache
                </PNButton>
              </div>
              
              <div className="space-y-stack-xs max-h-40 overflow-y-auto">
                {stats.totalEntries === 0 ? (
                  <div className="fs-xs text-surface-tint-gray text-center py-2">No cache entries</div>
                ) : (
                  <div className="fs-xs text-surface-tint-gray text-center py-2">
                    {stats.totalEntries} cached items (detailed view coming soon)
                  </div>
                )}
              </div>
            </div>
          )}

          {stats.totalEntries > 0 && (
            <div className="mt-stack-sm fs-xs text-surface-tint-gray text-center">
              💡 Cache reduces API calls by storing frequently accessed data
            </div>
          )}
        </div>
      </PNCard>
    </div>
  );
};

export default AdminCacheMonitor;
