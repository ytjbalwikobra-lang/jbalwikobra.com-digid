import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Zap, ImageOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/helpers';

/**
 * Cyber-Compact Bento Grid Product Card
 * 
 * High-density product display for gaming e-commerce:
 * - Compact 2-column grid on mobile
 * - Product image with lazy loading
 * - Price display with original/sale price
 * - Quick Buy button for instant add-to-cart
 * - Stock/Sale/New badges
 * - Touch-optimized with haptic feedback visual cues
 */

export interface BentoProductProps {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  isNew?: boolean;
  isFlashSale?: boolean;
  flashSaleDiscount?: number;
  onQuickBuy?: (productId: string) => void;
}

const BentoProductCard: React.FC<BentoProductProps> = memo(({
  id,
  name,
  slug,
  imageUrl,
  price,
  originalPrice,
  stock,
  isNew,
  isFlashSale,
  flashSaleDiscount,
  onQuickBuy,
}) => {
  const isOutOfStock = stock <= 0;
  const hasDiscount = originalPrice && originalPrice > price;
  
  const handleQuickBuy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock && onQuickBuy) {
      onQuickBuy(id);
    }
  }, [id, isOutOfStock, onQuickBuy]);

  const discountPercent = hasDiscount 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : flashSaleDiscount || 0;

  return (
    <Link
      to={`/product/${slug}`}
      className={cn(
        'cyber-bento-card group',
        isOutOfStock && 'opacity-60'
      )}
      aria-label={`${name} - ${formatCurrency(price)}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[var(--cyber-bg-surface)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            className={cn(
              'w-full h-full object-cover transition-transform duration-200',
              'group-hover:scale-105',
              isOutOfStock && 'grayscale'
            )}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback Image */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          imageUrl && 'hidden'
        )}>
          <ImageOff size={32} className="text-[var(--cyber-text-muted)]" />
        </div>

        {/* Badges Container */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {isFlashSale && (
            <span className="cyber-badge cyber-badge-sale flex items-center gap-0.5">
              <Zap size={10} strokeWidth={3} />
              -{discountPercent}%
            </span>
          )}
          {isNew && !isFlashSale && (
            <span className="cyber-badge cyber-badge-new">NEW</span>
          )}
          {isOutOfStock && (
            <span className="cyber-badge cyber-badge-out">HABIS</span>
          )}
        </div>

        {/* Quick Buy Button */}
        {!isOutOfStock && onQuickBuy && (
          <button
            onClick={handleQuickBuy}
            className={cn(
              'cyber-quick-buy absolute bottom-1.5 right-1.5',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
              'sm:opacity-100' // Always visible on touch devices
            )}
            aria-label={`Add ${name} to cart`}
          >
            <ShoppingCart size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2 space-y-1">
        {/* Product Name - 2 lines max */}
        <h3 className="text-[var(--cyber-text-primary)] text-[13px] font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>

        {/* Price Row */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="cyber-price">
            {formatCurrency(price)}
          </span>
          {hasDiscount && (
            <span className="cyber-price-original">
              {formatCurrency(originalPrice)}
            </span>
          )}
        </div>

        {/* Stock Indicator (low stock warning) */}
        {stock > 0 && stock <= 5 && (
          <p className="text-[10px] text-[var(--cyber-orange)] font-medium">
            Sisa {stock} unit
          </p>
        )}
      </div>
    </Link>
  );
});

BentoProductCard.displayName = 'BentoProductCard';

export default BentoProductCard;
