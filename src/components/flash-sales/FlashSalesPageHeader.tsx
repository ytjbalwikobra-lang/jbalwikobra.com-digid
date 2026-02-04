/**
 * FlashSalesPageHeader - Header section for Flash Sales page
 * 
 * Features:
 * - Page title with animated icons
 * - Subtitle text
 * - Search functionality with debounce
 * - Results statistics
 * - Back navigation link
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, Zap, X } from 'lucide-react';
import { PNContainer } from '../ui/CyberDesignSystem';
import { useDebounce } from '../../hooks/useDebounce';

interface FlashSalesPageHeaderProps {
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
}

const FlashSalesPageHeader: React.FC<FlashSalesPageHeaderProps> = ({
  searchTerm,
  onSearchChange,
  totalProducts,
  currentPage,
  totalPages,
  showBackNav = true
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);

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

  return (
    <div className="sticky top-0 z-20 bg-[var(--cyber-bg-pure)]/95 backdrop-blur-xl border-b border-[var(--cyber-border)] shadow-lg shadow-[var(--cyber-bg-pure)]/20">
      <PNContainer className="px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Back Navigation + Title */}
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
            <div className="flex items-center gap-2">
              <Zap className="text-[var(--cyber-warning)] animate-pulse" size={20} aria-hidden="true" />
              <h1 className="text-xl font-bold text-white">Flash Sales</h1>
            </div>
          </div>
          <p className="text-sm text-[var(--cyber-text-muted)] font-medium">
            {totalProducts} produk
            {currentPage && totalPages && totalPages > 1 && ` • ${currentPage}/${totalPages}`}
          </p>
        </div>

        <div>
          {/* Row 2: Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--cyber-text-muted)]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari flash sale..."
              value={localSearchTerm}
              onChange={handleSearchInput}
              className="w-full h-12 min-h-[48px] pl-11 pr-11 rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-primary)] text-sm placeholder-[var(--cyber-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)]/50 focus:border-[var(--cyber-pink-primary)]/30 hover:bg-white/[0.07] transition-all duration-200"
              aria-label="Cari produk flash sale"
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

          {/* Subtitle hint */}
          <p className="text-xs text-center text-[var(--cyber-text-muted)] mt-2.5">
            ⚡ Diskon hingga 70% - Stok dan waktu terbatas! ⚡
          </p>
        </div>
      </PNContainer>
    </div>
  );
};

export default FlashSalesPageHeader;
