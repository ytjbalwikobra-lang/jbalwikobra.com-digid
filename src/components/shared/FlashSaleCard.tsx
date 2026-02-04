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
  // FlashSaleCard is ALWAYS used for flash sale products - route to /flash-sales
  const isFlashSale = true; // This component is specifically for flash sales
  const discountPercentage = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Check sold status
  const soldChannel = (product as any).soldChannel || (product as any).sold_channel || null;
  const isSold = !!soldChannel || product.stock === 0;
  const soldLabel = soldChannel === 'web' ? 'Terjual via Web' 
    : soldChannel === 'wa' ? 'Terjual via WA' 
    : product.stock === 0 ? 'Stok Habis' : null;

  // Navigation handlers - ALWAYS route to flash-sales for this component
  const handleClick = () => {
    if (!product.id) return;
    
    // FlashSaleCard always navigates to flash sale detail page
    navigate(`/flash-sales/${product.id}`, {
      state: { 
        fromFlashSaleCard: true, 
        ...(flashSale && { flashSaleData: flashSale })
      }
    });
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.id) return;
    
    // FlashSaleCard always navigates to flash sale detail page
    navigate(`/flash-sales/${product.id}`, {
      state: { 
        fromFlashSaleCard: true,
        openCheckoutModal: true,
        ...(flashSale && { flashSaleData: flashSale })
      }
    });
  };

  return (
    <article
      className={`group rounded-cyber-2xl bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] overflow-hidden transition-all h-full flex flex-col ${
        isSold 
          ? 'cursor-not-allowed opacity-75' 
          : 'cursor-pointer hover:border-[var(--cyber-pink-muted)] hover:bg-white/[0.07]'
      } ${className}`}
      role="button"
      tabIndex={isSold ? -1 : 0}
      onClick={isSold ? undefined : handleClick}
      onKeyDown={(e) => {
        if (!isSold && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={isSold ? `Flash sale: ${product.name} - ${soldLabel}` : `Flash sale: ${product.name} - Rp ${currentPrice.toLocaleString('id-ID')}`}
      aria-disabled={isSold}
    >
      {/* Product Image - 4:5 ratio (Edge-to-Edge) */}
      <div className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[var(--cyber-pink-muted)] to-[var(--cyber-bg-elevated)] ${isSold ? 'grayscale' : ''}`}>
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-300 ${isSold ? '' : 'group-hover:scale-105'}`} 
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[var(--cyber-text-muted)]">
            NO IMAGE
          </div>
        )}
        
        {/* SOLD Banner - Full width overlay */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-red-600 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-cyber-lg shadow-lg transform -rotate-12">
              {soldLabel}
            </div>
          </div>
        )}
        
        {/* Discount Badge - Top Right (hide when sold) */}
        {!isSold && discountPercentage > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-cyber-lg bg-[var(--cyber-pink-primary)] text-white text-xs font-bold shadow-lg">
            -{discountPercentage}%
          </div>
        )}

        {/* Rental Badge - Top Left (hide when sold) */}
        {!isSold && product.hasRental && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-cyber-lg bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-semibold">
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
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur-sm text-white text-[10px] font-medium ${TIER_DOT_COLORS[product.tierData.slug || ''] || 'bg-[var(--cyber-bg-elevated)]'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyber-text-primary)]/80" />
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
            <p className="text-xs text-[var(--cyber-text-muted)] line-through mb-0.5">
              Rp {originalPrice.toLocaleString('id-ID')}
            </p>
          )}
          <p className="text-[var(--cyber-pink-secondary)] font-bold text-sm sm:text-base">
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
          onClick={isSold ? undefined : handleBuyClick}
          disabled={isSold}
          className={`cyber-btn w-full h-9 min-h-[36px] mt-auto text-xs sm:text-sm ${
            isSold 
              ? 'bg-[var(--cyber-bg-elevated)] cursor-not-allowed opacity-50' 
              : 'cyber-btn-primary'
          }`}
          aria-label={isSold ? `${product.name} tidak tersedia` : `Beli ${product.name} sekarang`}
        >
          {isSold ? 'Tidak Tersedia' : 'Beli Sekarang'}
        </button>
      </div>
    </article>
  );
};

export default React.memo(FlashSaleCard);
