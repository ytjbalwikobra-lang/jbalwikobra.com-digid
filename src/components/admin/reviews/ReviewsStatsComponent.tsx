import React from 'react';
import { Star, ThumbsUp, ThumbsDown, TrendingUp, MessageSquare } from 'lucide-react';

interface ReviewsStats {
  totalReviews: number;
  averageRating: number;
  highRatedReviews: number;
  lowRatedReviews: number;
  recentReviews: number;
}

interface ReviewsStatsComponentProps {
  stats: ReviewsStats;
  loading?: boolean;
}

export const ReviewsStatsComponent: React.FC<ReviewsStatsComponentProps> = ({
  stats,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--admin-tertiary)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Total Reviews */}
      <div className="group relative overflow-hidden bg-[var(--admin-primary)] border border-[var(--admin-border)] rounded-cyber-2xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{stats.totalReviews.toLocaleString()}</p>
            <p className="text-sm text-[var(--admin-text-muted)] font-medium">Total Reviews</p>
          </div>
        </div>
      </div>

      {/* Average Rating */}
      <div className="group relative overflow-hidden bg-[var(--admin-primary)] border border-[var(--admin-border)] rounded-cyber-2xl p-6 hover:border-yellow-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{stats.averageRating.toFixed(1)}</p>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(stats.averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-[var(--admin-text-muted)] font-medium">Average Rating</p>
          </div>
        </div>
      </div>

      {/* High Rated Reviews */}
      <div className="group relative overflow-hidden bg-[var(--admin-primary)] border border-[var(--admin-border)] rounded-cyber-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <ThumbsUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{stats.highRatedReviews.toLocaleString()}</p>
            <p className="text-sm text-[var(--admin-text-muted)] font-medium">High Rated (4-5★)</p>
          </div>
        </div>
      </div>

      {/* Low Rated Reviews */}
      <div className="group relative overflow-hidden bg-[var(--admin-primary)] border border-[var(--admin-border)] rounded-cyber-2xl p-6 hover:border-red-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <ThumbsDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{stats.lowRatedReviews.toLocaleString()}</p>
            <p className="text-sm text-[var(--admin-text-muted)] font-medium">Low Rated (1-2★)</p>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="group relative overflow-hidden bg-[var(--admin-primary)] border border-[var(--admin-border)] rounded-cyber-2xl p-6 hover:border-[var(--admin-accent-muted)] transition-all duration-300 hover:transform hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--admin-accent-subtle)] to-[var(--admin-accent-subtle)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-hover)] shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{stats.recentReviews.toLocaleString()}</p>
            <p className="text-sm text-[var(--admin-text-muted)] font-medium">Recent (This Week)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
