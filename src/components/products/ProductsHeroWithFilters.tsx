/**
 * ProductsHeroWithFilters - Mobile-first header with filters
 * WCAG 2.1 AA compliant with 44px touch targets
 * CyberDesignSystem consistent styling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, X, ChevronDown } from 'lucide-react';
import { PNContainer } from '../ui/CyberDesignSystem';
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

  // Shared select styles - 44px min touch target, WCAG compliant
  const selectClass = "appearance-none w-full h-11 min-h-[44px] pl-3.5 pr-9 rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-sm text-[var(--cyber-text-primary)] hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)] focus-visible:border-[var(--cyber-pink-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer";
  
  // Active select styling for filters with values
  const getSelectClass = (hasValue: boolean) => 
    `${selectClass} ${hasValue ? 'border-pink-500/40 bg-pink-500/10 text-white' : ''}`;

  return (
    <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20">
      <PNContainer className="px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Back + Title + Count */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showBackNav && (
              <Link 
                to="/" 
                className="flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-pink-300 hover:bg-white/10 hover:border-pink-500/30 transition-all duration-200"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeft size={20} />
              </Link>
            )}
            <h1 className="text-xl font-bold text-white">Katalog</h1>
          </div>
          <p className="text-sm text-[var(--cyber-text-muted)] font-medium">
            {totalProducts} produk
            {currentPage && totalPages && totalPages > 1 && ` • ${currentPage}/${totalPages}`}
          </p>
        </div>

        {/* Row 2: Full-width Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--cyber-text-muted)]" />
          <input
            type="text"
            placeholder="Cari produk, game, atau kategori..."
            value={localSearchTerm}
            onChange={handleSearchInput}
            className="w-full h-12 min-h-[48px] pl-11 pr-11 rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-primary)] text-sm placeholder-[var(--cyber-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)]/50 focus:border-[var(--cyber-pink-primary)]/30 hover:bg-white/[0.07] transition-all duration-200"
          />
          {localSearchTerm && (
            <button 
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] rounded-full hover:bg-white/10 transition-colors"
              aria-label="Hapus pencarian"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Row 3: Game Filter - Horizontal Scroll */}
        {gameTitles && gameTitles.length > 0 && (
          <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
              <button
                onClick={() => onGameChange?.('')}
                className={`flex-shrink-0 h-11 min-h-[44px] px-5 rounded-cyber-lg text-sm font-semibold transition-all duration-200 snap-start ${!selectedGame ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-[var(--cyber-text-primary)] shadow-lg shadow-pink-500/30' : 'bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:bg-white/10 hover:border-white/20'}`}
              >
                Semua Game
              </button>
              {gameTitles.map((game) => (
                <button
                  key={game.id}
                  onClick={() => onGameChange?.(game.name)}
                  className={`flex-shrink-0 h-11 min-h-[44px] px-5 rounded-cyber-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start ${selectedGame === game.name ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-[var(--cyber-text-primary)] shadow-lg shadow-pink-500/30' : 'bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:bg-white/10 hover:border-white/20'}`}
                >
                  {game.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 4: Filters - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Category Select */}
          <div className="relative">
            <select
              value={selectedCategory || ''}
              onChange={(e) => onCategoryChange?.(e.target.value)}
              className={getSelectClass(!!selectedCategory)}
              disabled={categoriesLoading}
              aria-label="Pilih kategori produk"
            >
              <option value="" className="bg-[var(--cyber-bg-pure)]">Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} className="bg-[var(--cyber-bg-pure)]">
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-secondary)] pointer-events-none transition-colors" />
          </div>

          {/* Tier Select */}
          <div className="relative">
            <select
              value={selectedTier || ''}
              onChange={(e) => onTierChange?.(e.target.value)}
              className={getSelectClass(!!selectedTier)}
              aria-label="Pilih tier produk"
            >
              <option value="" className="bg-[var(--cyber-bg-pure)]">Tier</option>
              {(tiers || []).map((tier) => (
                <option key={tier.id} value={tier.slug} className="bg-[var(--cyber-bg-pure)]">
                  {tier.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-secondary)] pointer-events-none transition-colors" />
          </div>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className={selectClass}
              aria-label="Urutkan produk"
            >
              <option value="newest" className="bg-[var(--cyber-bg-pure)]">Terbaru</option>
              <option value="price-low" className="bg-[var(--cyber-bg-pure)]">Termurah</option>
              <option value="price-high" className="bg-[var(--cyber-bg-pure)]">Termahal</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-secondary)] pointer-events-none transition-colors" />
          </div>

          {/* Rental Toggle Button */}
          <button
            onClick={onToggleRental}
            className={`h-11 min-h-[44px] px-4 rounded-cyber-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${rentalOnly ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-[var(--cyber-text-primary)] shadow-lg shadow-emerald-500/25' : 'bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:bg-white/[0.07] hover:border-white/20'}`}
          >
            <span className="text-base">🏠</span>
            <span>Rental</span>
          </button>
        </div>
      </PNContainer>
    </div>
  );
};

export default ProductsHeroWithFilters;
