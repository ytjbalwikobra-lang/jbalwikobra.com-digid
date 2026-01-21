/**
 * PNProductCard - Clean product card with square image and overlay badge
 * WCAG 2.1 AA compliant, PinkNeon design system
 */

import React from 'react';
import { TIER_DOT_COLORS } from '../../utils/tierStyles';

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
  tierSlug
}) => {
  return (
    <article 
      onClick={onClick} 
      className={`group rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer transition-all hover:border-pink-500/30 hover:bg-white/[0.07] ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Image Container - 4:5 ratio */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-900/30 to-fuchsia-900/30">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
            No Image
          </div>
        )}
        
        {/* Discount Badge - Top Right */}
        {discountPercent && discountPercent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold shadow-lg">
            -{discountPercent}%
          </div>
        )}
        
        {/* Rental Badge - Top Left */}
        {rentalAvailable && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-semibold">
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
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur-sm text-white text-[10px] font-medium ${TIER_DOT_COLORS[tierSlug || ''] || 'bg-gray-600'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {tierName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 mb-1.5">
          {title}
        </h3>
        
        {price && (
          <div className="text-pink-300 font-bold text-sm sm:text-base mb-2">
            {price}
          </div>
        )}
        
        {children}
      </div>
    </article>
  );
};

export default PNProductCard;
