/**
 * ProductsHeroWithFilters - Mobile-first header with filters
 * WCAG 2.1 AA compliant with 44px touch targets
 * PinkNeonDesignSystem consistent styling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, X, ChevronDown } from 'lucide-react';
import { PNContainer } from '../ui/PinkNeonDesignSystem';
import { Tier, GameTitle } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { useDebounce } from '../../hooks/useDebounce';

interface ProductsHeroWithFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalProducts: number;
  currentPage?: number;
  totalPages?: number;
  showBackNav?: boolean;
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
  selectedCategory,
  onCategoryChange
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const { categories, loading: categoriesLoading } = useCategories();
  
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, onSearchChange]);
  
  useEffect(() => {
    if (searchTerm === '') setLocalSearchTerm('');
  }, [searchTerm]);
  
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  }, []);

  const hasActiveFilters = activeFilters.length > 0;

  // Shared select styles - 44px min touch target, WCAG compliant
  const selectClass = "appearance-none w-full h-11 min-h-[44px] pl-3 pr-9 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white hover:bg-white/10 hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer";
  
  // Active select styling for filters with values
  const getSelectClass = (hasValue: boolean) => 
    `${selectClass} ${hasValue ? 'border-pink-500/50 bg-pink-500/10' : ''}`;

  return (
    <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-white/5">
      <PNContainer className="py-3 space-y-3">
        {/* Row 1: Back + Title + Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackNav && (
              <Link 
                to="/" 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-pink-300 hover:bg-white/10 transition-colors"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeft size={20} />
              </Link>
            )}
            <h1 className="text-lg font-bold text-white">Katalog</h1>
          </div>
          <p className="text-xs text-gray-400">
            {totalProducts} produk
            {currentPage && totalPages && totalPages > 1 && ` • ${currentPage}/${totalPages}`}
          </p>
        </div>

        {/* Row 2: Full-width Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={localSearchTerm}
            onChange={handleSearchInput}
            className="w-full h-11 min-h-[44px] pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          />
          {localSearchTerm && (
            <button 
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Row 3: Filters - 2x2 grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Category Select */}
          <div className="relative">
            <select
              value={selectedCategory || ''}
              onChange={(e) => onCategoryChange?.(e.target.value)}
              className={getSelectClass(!!selectedCategory)}
              disabled={categoriesLoading}
              aria-label="Pilih kategori produk"
            >
              <option value="" className="bg-gray-900">Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} className="bg-gray-900">
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none transition-colors" />
          </div>

          {/* Tier Select */}
          <div className="relative">
            <select
              value={selectedTier || ''}
              onChange={(e) => onTierChange?.(e.target.value)}
              className={getSelectClass(!!selectedTier)}
              aria-label="Pilih tier produk"
            >
              <option value="" className="bg-gray-900">Tier</option>
              {(tiers || []).map((tier) => (
                <option key={tier.id} value={tier.slug} className="bg-gray-900">
                  {tier.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none transition-colors" />
          </div>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className={selectClass}
              aria-label="Urutkan produk"
            >
              <option value="newest" className="bg-gray-900">Terbaru</option>
              <option value="price-low" className="bg-gray-900">Termurah</option>
              <option value="price-high" className="bg-gray-900">Termahal</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none transition-colors" />
          </div>

          {/* Rental Toggle Button */}
          <button
            onClick={onToggleRental}
            className={`h-11 min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${rentalOnly ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/25' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
          >
            <span className="text-base">🏠</span>
            <span>Lihat Akun Rental</span>
          </button>
        </div>

        {/* Active Filters Tags - WCAG 2.1 AA Compliant */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
            {activeFilters.map((filter) => (
              <div
                key={filter.key}
                className="inline-flex items-center gap-1.5 h-8 min-h-[32px] pl-3 pr-1.5 bg-pink-500/15 text-pink-300 rounded-full text-xs font-medium"
              >
                <span>{filter.value}</span>
                <button 
                  onClick={() => onRemoveFilter(filter.key)} 
                  className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-pink-500/30 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  aria-label={`Hapus filter ${filter.label}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={onClearAllFilters}
              className="h-8 min-h-[32px] px-3 text-xs font-medium text-gray-400 hover:text-pink-300 underline underline-offset-2 hover:no-underline transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded"
              aria-label="Hapus semua filter"
            >
              Hapus semua
            </button>
          </div>
        )}
      </PNContainer>
    </div>
  );
};

export default ProductsHeroWithFilters;
