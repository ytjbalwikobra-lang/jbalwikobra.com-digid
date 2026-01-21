/**
 * FlashSaleCard - Unified flash sale product card
 * Features: Clean layout, WCAG 2.1 AA compliant, optimized for performance
 * Used on homepage and flash sales page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PNCard, PNButton } from '../ui/PinkNeonDesignSystem';
import { Product, FlashSale } from '../../types';
import FlashSaleTimer from '../FlashSaleTimer';

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

  // Navigation handlers
  const handleClick = () => {
    if (!product.id) return;
    
    const path = flashSale ? `/flash-sales/${product.id}` : `/products/${product.id}`;
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
    
    const path = flashSale ? `/flash-sales/${product.id}` : `/products/${product.id}`;
    navigate(path, {
      state: { 
        fromFlashSaleCard: true,
        openCheckoutModal: true,
        ...(flashSale && { flashSaleData: flashSale })
      }
    });
  };

  return (
    <PNCard 
      className={`p-3 md:p-4 hover:bg-white/10 transition-colors h-full cursor-pointer ${className}`}
      onClick={handleClick}
      aria-label={`${product.name} - Rp ${currentPrice.toLocaleString('id-ID')}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square rounded-xl bg-gradient-to-br from-pink-600/50 via-pink-600/30 to-fuchsia-600/50 border border-pink-500/30 mb-3 overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
            NO IMAGE
          </div>
        )}
        
        {/* Discount Badge - Overlay on image */}
        {discountPercentage > 0 && (
          <div 
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-pink-600/90 backdrop-blur-sm border border-pink-500/50 text-white text-xs font-bold"
            aria-label={`Diskon ${discountPercentage}%`}
          >
            -{discountPercentage}%
          </div>
        )}
      </div>
      
      {/* Product Name */}
      <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2">
        {product.name}
      </h3>
      
      {/* Price Section */}
      <div className="flex flex-col gap-1 mb-2">
        {originalPrice && originalPrice > currentPrice && (
          <div className="text-xs text-gray-300 line-through">
            Rp {originalPrice.toLocaleString('id-ID')}
          </div>
        )}
        <div className="text-base font-bold text-pink-300">
          Rp {currentPrice.toLocaleString('id-ID')}
        </div>
      </div>
      
      {/* Flash Sale Timer */}
      {isFlashSale && endTime && (
        <div className="mb-3">
          <FlashSaleTimer endTime={endTime} variant="card" />
        </div>
      )}
      
      {/* Buy Button */}
      <PNButton 
        variant="primary" 
        size="sm" 
        fullWidth
        onClick={handleBuyClick}
        aria-label={`Beli ${product.name}`}
      >
        Beli Sekarang
      </PNButton>
    </PNCard>
  );
};

export default React.memo(FlashSaleCard);
