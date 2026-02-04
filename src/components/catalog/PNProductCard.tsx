/**
 * PNProductCard - Clean product card using Cyber-Compact design tokens
 * WCAG 2.1 AA compliant, consistent with cyber-compact.css
 */

import React, { useCallback } from 'react';
import { TIER_DOT_COLORS } from '../../utils/tierStyles';
import { prefetchRoute } from '../../utils/linkPrefetch';

interface PNProductCardProps {
  id: string;
  title: string;
  image?: string;
  price?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  rentalAvailable?: boolean;
  className?: string;
  discountPercent?: number | null;
  gameName?: string;
  tierName?: string;
  tierSlug?: string;
  /** Product sold status - 'web' | 'wa' | null */
  soldChannel?: 'web' | 'wa' | null;
  /** Product stock count */
  stock?: number;
}

const PNProductCard: React.FC<PNProductCardProps> = ({ 
  id, 
  title, 
  image, 
  price, 
  children, 
  onClick, 
  rentalAvailable,
  className = '',
  discountPercent,
  gameName,
  tierName,
  tierSlug,
  soldChannel,
  stock
}) => {
  // Check if product is sold or out of stock
  const isSold = !!soldChannel || stock === 0;
  const soldLabel = soldChannel === 'web' ? 'Telah Terjual' 
    : soldChannel === 'wa' ? 'Telah Terjual' 
    : stock === 0 ? 'Stok Habis' : null;

  // Prefetch product detail on hover
  const handlePrefetch = useCallback(() => {
    if (!isSold && id) {
      prefetchRoute(`/products/${id}`);
    }
  }, [id, isSold]);

  return (
    <article 
      onClick={isSold ? undefined : onClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      className={`group rounded-cyber-2xl bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] overflow-hidden transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cyber-bg-pure)] ${
        isSold 
          ? 'cursor-not-allowed opacity-75' 
          : 'cursor-pointer hover:border-[var(--cyber-border-active)] hover:bg-[var(--cyber-bg-elevated)]'
      } ${className}`}
      role="button"
      tabIndex={isSold ? -1 : 0}
      aria-label={isSold ? `${title} - ${soldLabel}` : `Lihat detail ${title}`}
      aria-disabled={isSold}
      onKeyDown={(e) => !isSold && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.())}
    >
      {/* Image Container - 4:5 ratio */}
      <div className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[var(--cyber-pink-muted)] to-[var(--cyber-bg-elevated)] ${isSold ? 'grayscale' : ''}`}>
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className={`w-full h-full object-cover transition-transform duration-150 ${isSold ? '' : 'group-hover:scale-105'}`} 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--cyber-text-muted)] text-xs">
            No Image
          </div>
        )}
        
        {/* SOLD Banner - Full width diagonal overlay */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--cyber-bg-pure)]/50">
            <div className="bg-[var(--cyber-error)] text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-cyber-lg shadow-lg transform -rotate-12">
              {soldLabel}
            </div>
          </div>
        )}
        
        {/* Discount Badge - Top Right (hide when sold) */}
        {!isSold && discountPercent && discountPercent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-cyber-lg bg-[var(--cyber-pink-primary)] text-white text-xs font-bold shadow-lg">
            -{discountPercent}%
          </div>
        )}
        
        {/* Rental Badge - Top Left (hide when sold) */}
        {!isSold && rentalAvailable && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-cyber-lg bg-[var(--cyber-success)]/90 backdrop-blur-sm text-white text-[10px] font-semibold">
            Rental
          </div>
        )}

        {/* Badges - Bottom */}
        {(gameName || tierName) && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
            {gameName && (
              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium">
                {gameName}
              </span>
            )}
            {tierName && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur-sm text-white text-[10px] font-medium ${TIER_DOT_COLORS[tierSlug || ''] || 'bg-[var(--cyber-bg-elevated)]'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {tierName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-xs sm:text-sm font-semibold text-[var(--cyber-text-primary)] line-clamp-2 mb-1.5">
          {title}
        </h3>
        
        {price && (
          <div className="text-[var(--cyber-pink-secondary)] font-bold text-sm sm:text-base mb-2">
            {price}
          </div>
        )}
        
        {children}
      </div>
    </article>
  );
};

export default React.memo(PNProductCard);
