/**
 * FlashSalesEmptyState - Empty state component for Flash Sales page
 * 
 * Features:
 * - Different messages for search vs general empty state
 * - Call-to-action buttons
 * - Consistent styling with design system
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { PNCard, PNButton } from '../ui/PinkNeonDesignSystem';

interface FlashSalesEmptyStateProps {
  /** Current search term - if provided, shows search-specific empty state */
  searchTerm?: string;
  /** Handler for resetting search/filters */
  onResetSearch?: () => void;
}

const FlashSalesEmptyState: React.FC<FlashSalesEmptyStateProps> = ({
  searchTerm,
  onResetSearch
}) => {
  const navigate = useNavigate();
  const isSearchEmpty = !!searchTerm;

  return (
    <div className="py-8" role="status" aria-live="polite">
      <PNCard className="text-center p-8 max-w-md mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 bg-pink-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center" aria-hidden="true">
          <Zap className="text-pink-400" size={32} />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">
          {isSearchEmpty ? 
            'Tidak ada flash sale yang cocok' : 
            'Belum ada flash sale tersedia'
          }
        </h3>
        
        {/* Description */}
        <p className="text-gray-300 mb-6 text-sm">
          {isSearchEmpty ? 
            'Coba gunakan kata kunci lain atau lihat semua produk.' : 
            'Flash sale akan segera hadir. Pantau terus untuk penawaran terbaik!'
          }
        </p>
        
        {/* Action Buttons - WCAG Compliant */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isSearchEmpty && onResetSearch && (
            <PNButton
              variant="secondary"
              onClick={onResetSearch}
              aria-label="Reset pencarian flash sale"
            >
              Reset Pencarian
            </PNButton>
          )}
          
          <PNButton 
            variant="primary" 
            onClick={() => navigate('/products')}
            aria-label="Lihat semua produk tersedia"
          >
            Lihat Semua Produk
          </PNButton>
        </div>
      </PNCard>
    </div>
  );
};

export default FlashSalesEmptyState;
