/**
 * FlashSaleCard - Unified flash sale product card
 * Features: Clean layout, WCAG 2.1 AA compliant, optimized for performance
 * Used on homepage and flash sales page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, FlashSale } from '../../types';
import FlashSaleTimer from '../FlashSaleTimer';
import { TIER_DOT_COLORS } from '../../utils/tierStyles';

interface FlashSaleCardProps {
  product: Product;
  flashSale?: FlashSale;
  className?: string;
}

const FlashSaleCard: React.FC<FlashSaleCardProps> = ({ 
  product, 
  flashSale, 
  className = ""
}) => {
  const navigate = useNavigate();
  
  // Pricing logic
  const originalPrice = flashSale?.originalPrice || product.originalPrice;
  const currentPrice = flashSale?.salePrice || product.price;
  const endTime = flashSale?.endTime || product.flashSaleEndTime;
  const isFlashSale = !!flashSale || product.isFlashSale;
  const discountPercentage = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Navigation handlers - route to flash-sales if product is a flash sale or has flashSale prop
  const shouldUseFlashSaleRoute = !!flashSale || isFlashSale;
  
  const handleClick = () => {
    if (!product.id) return;
    
    const path = shouldUseFlashSaleRoute ? `/flash-sales/${product.id}` : `/products/${product.id}`;
    navigate(path, {
      state: { 
        fromFlashSaleCard: true, 
        ...(flashSale && { flashSaleData: flashSale })
      }
    });
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.id) return;
    
    const path = shouldUseFlashSaleRoute ? `/flash-sales/${product.id}` : `/products/${product.id}`;
    navigate(path, {
      state: { 
        fromFlashSaleCard: true,
        openCheckoutModal: true,
        ...(flashSale && { flashSaleData: flashSale })
      }
    });
  };

  return (
    <article
      className={`group rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer transition-all hover:border-pink-500/30 hover:bg-white/[0.07] h-full flex flex-col ${className}`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Flash sale: ${product.name} - Rp ${currentPrice.toLocaleString('id-ID')}`}
    >
      {/* Product Image - 4:5 ratio (Edge-to-Edge) */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-900/30 to-fuchsia-900/30">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
            NO IMAGE
          </div>
        )}
        
        {/* Discount Badge - Top Right */}
        {discountPercentage > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold shadow-lg">
            -{discountPercentage}%
          </div>
        )}

        {/* Rental Badge - Top Left */}
        {product.hasRental && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-semibold">
            Rental
          </div>
        )}

        {/* Badges - Bottom: Game name + Tier */}
        {(product.gameTitleData?.name || product.tierData?.name) && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
            {product.gameTitleData?.name && (
              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium">
                {product.gameTitleData.name}
              </span>
            )}
            {product.tierData?.name && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur-sm text-white text-[10px] font-medium ${TIER_DOT_COLORS[product.tierData.slug || ''] || 'bg-gray-600'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {product.tierData.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content - Matches padding of PNProductCard */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 mb-1.5">
          {product.name}
        </h3>
        
        <div className="mb-2">
          {originalPrice && originalPrice > currentPrice && (
            <p className="text-xs text-gray-400 line-through mb-0.5">
              Rp {originalPrice.toLocaleString('id-ID')}
            </p>
          )}
          <p className="text-pink-300 font-bold text-sm sm:text-base">
            Rp {currentPrice.toLocaleString('id-ID')}
          </p>
        </div>
        
        {/* Flash Sale Timer */}
        {isFlashSale && endTime && (
          <div className="mb-3">
            <FlashSaleTimer endTime={endTime} variant="card" />
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuyClick}
          className="w-full h-9 min-h-[36px] mt-auto bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label={`Beli ${product.name} sekarang`}
        >
          Beli Sekarang
        </button>
      </div>
    </article>
  );
};

export default React.memo(FlashSaleCard);
