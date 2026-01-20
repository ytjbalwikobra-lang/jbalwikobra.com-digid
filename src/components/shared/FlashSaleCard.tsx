/**
 * FlashSaleCard - Unified flash sale product card component
 * Used both on homepage and flash sales page for consistency
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Handles both Product and FlashSale data types
 * - Consistent styling matching homepage design
 * - Timer for flash sales
 * - Discount badges
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PNCard, PNButton } from '../ui/PinkNeonDesignSystem';
import { Product, FlashSale } from '../../types';
import FlashSaleTimer from '../FlashSaleTimer';

interface FlashSaleCardProps {
  /** The product data */
  product: Product;
  /** Optional flash sale data - if provided, will override product pricing */
  flashSale?: FlashSale;
  /** Additional CSS classes */
  className?: string;
  /** Disable the link wrapper (useful when card is already inside a link) */
  disableLink?: boolean;
  /** Layout variant - affects spacing and sizing */
  variant?: 'homepage' | 'page';
}

const FlashSaleCard: React.FC<FlashSaleCardProps> = ({ 
  product, 
  flashSale, 
  className = "",
  disableLink = false,
  variant = 'homepage'
}) => {
  const navigate = useNavigate();
  
  // Determine pricing - flash sale data takes precedence
  const originalPrice = flashSale?.originalPrice || product.originalPrice;
  const currentPrice = flashSale?.salePrice || product.price;
  const endTime = flashSale?.endTime || product.flashSaleEndTime;
  const isFlashSale = !!flashSale || product.isFlashSale;

  // Calculate discount percentage
  const discountPercentage = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Determine layout classes based on variant
  const cardClasses = variant === 'homepage' 
    ? "p-3 md:p-4 hover:bg-white/10 transition-colors h-full min-w-[190px] md:min-w-0 cursor-pointer"
    : "p-2.5 md:p-3 hover:bg-white/10 transition-colors h-full w-full cursor-pointer";

  // Handle card click navigation
  const handleCardClick = (e: React.MouseEvent) => {
    
    if (!disableLink) {
      e.preventDefault();
      e.stopPropagation();
      
      // Navigate to different pages based on flash sale data availability
      if (flashSale && flashSale.salePrice && flashSale.originalPrice && flashSale.endTime) {
        // Validate product ID before navigation
        if (!product.id || product.id.trim() === '' || product.id === 'undefined') {
          console.error('[FlashSaleCard] Cannot navigate: invalid product ID:', product.id);
          return;
        }
        // Has complete flash sale data - go to flash sale detail page
        navigate(`/flash-sales/${product.id}`, {
          state: {
            fromFlashSaleCard: true,
            flashSaleData: flashSale
          }
        });
      } else {
        // No complete flash sale data - go to regular product page
        if (!product.id || product.id.trim() === '' || product.id === 'undefined') {
          console.error('[FlashSaleCard] Cannot navigate: invalid product ID:', product.id);
          return;
        }
        navigate(`/products/${product.id}`, {
          state: {
            fromFlashSaleCard: true
          }
        });
      }
    }
  };

  // Handle button click to prevent navigation
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate product ID before navigation
    if (!product.id || product.id.trim() === '' || product.id === 'undefined') {
      console.error('[FlashSaleCard] Cannot navigate: invalid product ID:', product.id);
      return;
    }
    
    // Use the same logic as card click for consistent navigation
    if (flashSale && flashSale.salePrice && flashSale.originalPrice && flashSale.endTime) {
      // Has complete flash sale data - go to flash sale detail page
      navigate(`/flash-sales/${product.id}`, {
        state: {
          fromFlashSaleCard: true,
          flashSaleData: flashSale,
          openCheckoutModal: true // Flag to open checkout modal immediately
        }
      });
    } else {
      // No complete flash sale data - go to regular product page
      navigate(`/products/${product.id}`, {
        state: {
          fromFlashSaleCard: true,
          openCheckoutModal: true // Flag to open checkout modal immediately
        }
      });
    }
  };

  return (
    <PNCard 
      className={`${cardClasses} ${className}`}
      onClick={handleCardClick}
      style={{ pointerEvents: 'auto' }}
      data-testid="flash-sale-card"
    >
      {/* Product Image */}
      <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-pink-600/60 via-pink-600/40 to-fuchsia-600/60 border border-pink-500/30 mb-2 md:mb-3 overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 tracking-wider">
            NO IMAGE
          </div>
        )}
      </div>
      
      {/* Product Name */}
      <div className="text-sm font-semibold text-white line-clamp-2 mb-2 md:mb-2">
        {product.name}
      </div>
      
      {/* Price Section */}
      <div className="flex items-end justify-between gap-2 mb-2">
        <div className="flex flex-col leading-tight flex-1 min-w-0">
          {/* Original Price (strikethrough) */}
          {originalPrice && originalPrice > currentPrice && (
            <div className="text-[10px] md:text-[11px] text-gray-400 line-through truncate">
              Rp {originalPrice.toLocaleString('id-ID')}
            </div>
          )}
          {/* Current Price */}
          <div className="text-pink-300 font-extrabold text-[13px] md:text-[14px] truncate">
            Rp {currentPrice.toLocaleString('id-ID')}
          </div>
        </div>
        
        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="shrink-0 px-1.5 py-0.5 rounded-md bg-pink-600/20 border border-pink-500/40 text-pink-300 text-[10px] md:text-[11px] font-bold whitespace-nowrap">
            -{discountPercentage}%
          </div>
        )}
      </div>
      
      {/* Flash Sale Timer */}
      {isFlashSale && endTime && (
        <div className="mb-1.5 md:mb-2">
          <FlashSaleTimer endTime={endTime} variant="card" />
        </div>
      )}
      
      {/* Buy Button - prevent event propagation to allow card navigation */}
      <PNButton 
        variant="primary" 
        size="sm" 
        fullWidth
        onClick={handleButtonClick}
      >
        Beli
      </PNButton>
    </PNCard>
  );
};

export default React.memo(FlashSaleCard);
