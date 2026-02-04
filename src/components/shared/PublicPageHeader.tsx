/**
 * PublicPageHeader - Consistent header component for all public pages
 * Matches ProductsHeroWithFilters styling exactly for visual consistency
 * 
 * Features:
 * - Back navigation button (circle icon matching catalog)
 * - Product title next to back button (truncates on overflow)
 * - Wishlist and share actions (circle icons, fixed right)
 * - Consistent PN styling
 * - Responsive design
 */

import React from 'react';
import { ChevronLeft, Heart, Share2 } from 'lucide-react';

interface PublicPageHeaderProps {
  /** Page/product title displayed next to back button */
  title: string;
  /** Back button click handler */
  onBack: () => void;
  /** Aria label for back button (e.g., "Kembali ke Katalog") */
  backAriaLabel?: string;
  /** Show wishlist button */
  showWishlist?: boolean;
  /** Wishlist click handler */
  onWishlistToggle?: () => void;
  /** Is item in wishlist */
  isInWishlist?: boolean;
  /** Show share button */
  showShare?: boolean;
  /** Share click handler */
  onShare?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const PublicPageHeader: React.FC<PublicPageHeaderProps> = ({
  title,
  onBack,
  backAriaLabel = "Kembali",
  showWishlist = false,
  onWishlistToggle,
  isInWishlist = false,
  showShare = false,
  onShare,
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-between gap-4 mb-8 ${className}`}>
      {/* Left: Back + Title (truncates if needed) */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onBack}
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-pink-secondary)] hover:bg-[var(--cyber-bg-elevated)] hover:border-[var(--cyber-pink-muted)] transition-all duration-200"
          aria-label={backAriaLabel}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white truncate">{title}</h1>
      </div>
      
      {/* Right: Action Buttons (fixed width, never pushed off) */}
      {(showWishlist || showShare) && (
        <div className="flex-shrink-0 flex items-center gap-2.5">
          {showWishlist && onWishlistToggle && (
            <button
              onClick={onWishlistToggle}
              className={`flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-cyber-lg bg-[var(--cyber-bg-card)] border transition-all duration-200 ${
                isInWishlist 
                  ? 'border-[var(--cyber-pink-muted)] text-[var(--cyber-pink-primary)] bg-[var(--cyber-pink-subtle)] hover:bg-[var(--cyber-pink-subtle)]' 
                  : 'border-[var(--cyber-border)] text-[var(--cyber-text-muted)] hover:bg-[var(--cyber-bg-elevated)] hover:text-[var(--cyber-pink-secondary)] hover:border-[var(--cyber-border)]'
              }`}
              aria-label={isInWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
            >
              <Heart size={18} className={isInWishlist ? 'fill-current' : ''} />
            </button>
          )}
          {showShare && onShare && (
            <button
              onClick={onShare}
              className="flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-[var(--cyber-text-muted)] hover:bg-[var(--cyber-bg-elevated)] hover:text-[var(--cyber-pink-secondary)] hover:border-[var(--cyber-border)] transition-all duration-200"
              aria-label="Bagikan produk"
            >
              <Share2 size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicPageHeader;
