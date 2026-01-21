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
import { PNContainer } from '../ui/PinkNeonDesignSystem';
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
    <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-white/5">
      <PNContainer className="py-3 space-y-4">
        {/* Row 1: Back Navigation + Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackNav && (
              <Link 
                to="/" 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-pink-300 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeft size={20} />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-400 animate-pulse" size={20} aria-hidden="true" />
              <h1 className="text-lg font-bold text-white">Flash Sales</h1>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {totalProducts} produk
            {currentPage && totalPages && totalPages > 1 && ` • ${currentPage}/${totalPages}`}
          </p>
        </div>

        <div>
          {/* Row 2: Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari flash sale..."
              value={localSearchTerm}
              onChange={handleSearchInput}
              className="w-full h-11 min-h-[44px] pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 transition-all duration-200"
              aria-label="Cari produk flash sale"
            />
            {localSearchTerm && (
              <button 
                onClick={() => setLocalSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                aria-label="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Subtitle hint */}
          <p className="text-xs text-center text-gray-400 mt-2">
            ⚡ Diskon hingga 70% - Stok dan waktu terbatas! ⚡
          </p>
        </div>
      </PNContainer>
    </div>
  );
};

export default FlashSalesPageHeader;
