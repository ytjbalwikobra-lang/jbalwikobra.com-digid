import React from 'react';
import { Search, Filter, SortAsc, SortDesc, Star, Calendar, TrendingDown, X } from 'lucide-react';

interface ReviewsFilters {
  searchTerm: string;
  ratingFilter: 'all' | '5' | '4' | '3' | '2' | '1' | 'high' | 'low';
  dateFilter: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
  sortBy: 'created_at' | 'rating' | 'user_name' | 'product_name';
  sortOrder: 'asc' | 'desc';
}

interface ReviewsFiltersComponentProps {
  filters: ReviewsFilters;
  onFiltersChange: (filters: ReviewsFilters) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  resultCount?: number;
}

export const ReviewsFiltersComponent: React.FC<ReviewsFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  resultCount
}) => {
  const handleFilterChange = (key: keyof ReviewsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      ratingFilter: 'all',
      dateFilter: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.searchTerm || filters.ratingFilter !== 'all' || filters.dateFilter !== 'all';

  return (
    <div className="bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-2xl p-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--cyber-bg-card)]">
            <Filter className="w-5 h-5 text-[var(--cyber-pink-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-white">Search & Filters</h3>
          {hasActiveFilters && (
            <div className="px-2 py-1 bg-[var(--cyber-pink-muted)] border border-[var(--cyber-pink-muted)] rounded-xl text-xs text-[var(--cyber-pink-primary)]">
              Filtered
            </div>
          )}
        </div>
        <button
          onClick={onToggleFilters}
          className="p-2 text-[var(--cyber-text-muted)] hover:text-white hover:bg-[var(--cyber-bg-elevated)] rounded-xl transition-all duration-200"
        >
          <TrendingDown className={`w-5 h-5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--cyber-text-muted)]" />
        <input
          type="text"
          placeholder="Search reviews by customer name, product, or content..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[var(--cyber-bg-surface)]/50 border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="space-y-6 border-t border-[var(--cyber-border)] pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-3">Rating</label>
              <select
                value={filters.ratingFilter}
                onChange={(e) => handleFilterChange('ratingFilter', e.target.value as any)}
                className="w-full px-4 py-3 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)] transition-all duration-200"
              >
                <option value="all">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                <option value="3">⭐⭐⭐ (3 stars)</option>
                <option value="2">⭐⭐ (2 stars)</option>
                <option value="1">⭐ (1 star)</option>
                <option value="high">High Rated (4-5★)</option>
                <option value="low">Low Rated (1-2★)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-3">Time Period</label>
              <select
                value={filters.dateFilter}
                onChange={(e) => handleFilterChange('dateFilter', e.target.value as any)}
                className="w-full px-4 py-3 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)] transition-all duration-200"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-3">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                  className="flex-1 px-4 py-3 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)] transition-all duration-200"
                >
                  <option value="created_at">Date Created</option>
                  <option value="rating">Rating</option>
                  <option value="user_name">Customer Name</option>
                  <option value="product_name">Product Name</option>
                </select>
                <button
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-3 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-elevated)] transition-all duration-200 flex items-center gap-2"
                >
                  {filters.sortOrder === 'asc' ? (
                    <>
                      <SortAsc className="w-4 h-4" />
                      A-Z
                    </>
                  ) : (
                    <>
                      <SortDesc className="w-4 h-4" />
                      Z-A
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Count and Clear Filters */}
          {typeof resultCount === 'number' && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--cyber-border)]">
              <div className="text-sm text-[var(--cyber-text-muted)]">
                {resultCount === 0 ? (
                  'No reviews match the current filters'
                ) : (
                  `Found ${resultCount} reviews`
                )}
              </div>
              
              {/* Active Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {filters.searchTerm && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-[var(--cyber-pink-muted)] border border-[var(--cyber-pink-muted)] rounded-xl text-sm text-[var(--cyber-pink-primary)]">
                    <span>Search: "{filters.searchTerm}"</span>
                    <button
                      onClick={() => handleFilterChange('searchTerm', '')}
                      className="text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {filters.ratingFilter !== 'all' && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl text-sm text-blue-400">
                    <Star className="w-3 h-3" />
                    <span>Rating: {filters.ratingFilter}</span>
                    <button
                      onClick={() => handleFilterChange('ratingFilter', 'all')}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {filters.dateFilter !== 'all' && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-xl text-sm text-green-400">
                    <Calendar className="w-3 h-3" />
                    <span>Date: {filters.dateFilter}</span>
                    <button
                      onClick={() => handleFilterChange('dateFilter', 'all')}
                      className="text-green-400 hover:text-green-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1 bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:text-white hover:bg-gray-600 rounded-xl text-sm transition-all duration-200"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
