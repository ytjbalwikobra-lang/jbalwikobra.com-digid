/**
 * ProductsHeroWithFilters - Integrated hero section with filters
 * Matches Flash Sales design with embedded filter controls
 * 
 * Features:
 * - Page title with animated icons  
 * - Search functionality
 * - Integrated filter controls in hero style
 * - Results statistics
 * - Back navigation link
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, Package, Gamepad2, ChevronDown, Filter } from 'lucide-react';
import { PNContainer, PNHeading, PNText } from '../ui/PinkNeonDesignSystem';
import { IOSButton } from '../ios/IOSDesignSystemV2';
import { Tier, GameTitle } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { useDebounce } from '../../hooks/useDebounce';
import { FilterDropdown } from './FilterDropdown';

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'price-low', label: 'Harga Terendah' },
  { value: 'price-high', label: 'Harga Tertinggi' },
  { value: 'name-az', label: 'Nama A-Z' },
  { value: 'name-za', label: 'Nama Z-A' }
];

interface ProductsHeroWithFiltersProps {
  /** Current search term */
  searchTerm: string;
  /** Search change handler */
  onSearchChange: (term: string) => void;
  /** Total number of filtered products */
  totalProducts: number;
  /** Current page number */
  currentPage?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Show back navigation */
  showBackNav?: boolean;
  
  // Filter props
  sortBy: string;
  onSortChange: (v: string) => void;
  activeFilters: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter: (k: string) => void;
  onClearAllFilters: () => void;
  rentalOnly: boolean;
  onToggleRental: () => void;
  tiers?: Tier[];
  selectedTier?: string;
  onTierChange?: (slug: string) => void;
  gameTitles?: GameTitle[];
  selectedGame?: string;
  onGameChange?: (name: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (name: string) => void;
}

const ProductsHeroWithFilters: React.FC<ProductsHeroWithFiltersProps> = ({
  searchTerm,
  onSearchChange,
  totalProducts,
  currentPage,
  totalPages,
  showBackNav = true,
  sortBy,
  onSortChange,
  activeFilters,
  onRemoveFilter,
  onClearAllFilters,
  rentalOnly,
  onToggleRental,
  tiers,
  selectedTier,
  onTierChange,
  gameTitles,
  selectedGame,
  onGameChange,
  selectedCategory,
  onCategoryChange
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  
  // Debounce search input (300ms delay for better UX)
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  
  // Sync debounced search term to parent
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, onSearchChange]);
  
  // Sync local state when parent changes (e.g., clear filters)
  // NOTE: Only depend on searchTerm, not localSearchTerm, to avoid race conditions
  useEffect(() => {
    if (searchTerm === '') {
      setLocalSearchTerm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);
  
  // Handle search input change
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  }, []);
  
  // Categories data
  const { categories, loading: categoriesLoading } = useCategories();

  // Memoize dropdown options
  const gameOptions = useMemo(() => [
    { value: '', label: 'Semua Game' },
    ...(gameTitles?.map(g => ({ value: g.name, label: g.name })) || [])
  ], [gameTitles]);

  const tierOptions = useMemo(() => [
    { value: '', label: 'Semua Tier' },
    ...(tiers?.map(t => ({ value: t.slug, label: t.name })) || [])
  ], [tiers]);

  const sortOptions = useMemo(() => 
    SORT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
    []
  );

  return (
    <>
      {/* Back Navigation */}
      {showBackNav && (
        <div className="px-4 pt-4 pb-2">
          <PNContainer>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors text-sm"
            >
              <ChevronLeft size={16} />
              Kembali ke Beranda
            </Link>
          </PNContainer>
        </div>
      )}

      <div className="px-4 pb-6">
        <PNContainer>
          {/* Hero Section */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gamepad2 className="text-pink-400 animate-pulse" size={32} />
              <PNHeading level={1} gradient className="!mb-0">
                Catalog Akun Game
              </PNHeading>
              <Package className="text-pink-400 animate-pulse" size={32} />
            </div>
            <PNText className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              🎮 Jelajahi koleksi akun game kami yang terkurasi dengan kualitas terbaik 🎮
            </PNText>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="max-w-md mx-auto relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari akun game..."
                value={localSearchTerm}
                onChange={handleSearchInput}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Categories Filter */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <h3 className="text-sm font-medium text-white">Kategori</h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categoriesLoading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 w-16 rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                ))
              ) : (
                <>
                  <IOSButton
                    onClick={() => onCategoryChange?.('')}
                    variant={selectedCategory === '' || !selectedCategory ? 'primary' : 'ghost'}
                    size="sm"
                    className="h-8 px-3 rounded-lg font-medium text-xs whitespace-nowrap"
                  >
                    Semua
                  </IOSButton>
                  {categories.slice(0, 5).map((category) => (
                    <IOSButton
                      key={category.id}
                      onClick={() => onCategoryChange?.(category.name)}
                      variant={selectedCategory === category.name ? 'primary' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-lg font-medium text-xs whitespace-nowrap"
                    >
                      {category.name}
                    </IOSButton>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="text-center mb-4">
            <IOSButton
              onClick={() => setShowFilters(!showFilters)}
              variant="ghost"
              size="sm"
              className="inline-flex items-center gap-2 text-pink-300 hover:text-pink-200"
            >
              <Filter size={16} />
              {showFilters ? 'Sembunyikan Filter' : 'Filter Lanjutan'}
              <ChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
            </IOSButton>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Game Selection */}
                {gameOptions.length > 1 && (
                  <FilterDropdown
                    id="game-filter"
                    label="Game"
                    value={selectedGame || ''}
                    options={gameOptions}
                    placeholder="Semua Game"
                    onChange={(v) => onGameChange?.(v)}
                  />
                )}

                {/* Tier Selection */}
                {tierOptions.length > 1 && (
                  <FilterDropdown
                    id="tier-filter"
                    label="Tier"
                    value={selectedTier || ''}
                    options={tierOptions}
                    placeholder="Semua Tier"
                    onChange={(v) => onTierChange?.(v)}
                  />
                )}

                {/* Sort Selection */}
                <FilterDropdown
                  id="sort-filter"
                  label="Urutkan"
                  value={sortBy}
                  options={sortOptions}
                  placeholder="Terbaru"
                  onChange={onSortChange}
                />
              </div>

              {/* Rental Toggle */}
              <div className="mt-4 flex items-center justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rentalOnly}
                    onChange={onToggleRental}
                    className="w-4 h-4 text-pink-500 bg-white/5 border-white/20 rounded focus:ring-pink-500"
                  />
                  <span className="text-sm text-white">Hanya akun rental</span>
                </label>
              </div>

              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">Filter Aktif:</span>
                    <IOSButton
                      onClick={onClearAllFilters}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-pink-300 hover:text-pink-200"
                    >
                      Hapus Semua
                    </IOSButton>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <span
                        key={filter.key}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-pink-500/20 text-pink-300 rounded-md text-xs"
                      >
                        {filter.label}: {filter.value}
                        <button
                          onClick={() => onRemoveFilter(filter.key)}
                          className="hover:text-pink-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Stats */}
          <div className="text-center">
            <PNText className="text-sm text-gray-500 dark:text-gray-400">
              {totalProducts} akun game ditemukan
              {currentPage && totalPages && totalPages > 1 && (
                <span className="ml-2">• Halaman {currentPage} dari {totalPages}</span>
              )}
            </PNText>
          </div>
        </PNContainer>
      </div>
    </>
  );
};

export default ProductsHeroWithFilters;
