/**
 * ProductsGrid - Product grid display component
 * Features responsive grid layout with empty state
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { PNProductCard } from '../catalog';
import { PNButton } from '../ui/PinkNeonDesignSystem';
import { formatCurrency } from '../../utils/helpers';
import { getTierStyles } from '../../utils/tierStyles';
import { IOSGrid } from '../ios/IOSDesignSystemV2';
import { PNContainer } from '../ui/PinkNeonDesignSystem';
import { EmptyState } from './EmptyState';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductsGridProps {
  products: Product[];
  onResetFilters: () => void;
  density?: 'comfortable' | 'compact';
  loading?: boolean;
  skeletonCount?: number;
}

export const ProductsGrid = React.memo(({ products, onResetFilters, density = 'comfortable', loading = false, skeletonCount = 8 }: ProductsGridProps) => {
  const navigate = useNavigate();
  const gap = density === 'compact' ? 'sm' : 'md';

  const handleNavigate = (productId: string) => {
    if (!productId || productId.trim() === '' || productId === 'undefined') {
      console.error('[ProductsGrid] Cannot navigate: invalid product ID:', productId);
      return;
    }
    navigate(`/products/${productId}`, { state: { fromCatalogPage: true } });
  };

  return (
    <section className="mb-8">
      <PNContainer>
        {loading ? (
          <IOSGrid cols={4} gap={gap} className="mb-6">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardSkeleton key={i} density={density} />
            ))}
          </IOSGrid>
        ) : products.length > 0 ? (
          <IOSGrid cols={4} gap={gap} className="mb-6">
            {products.map(product => {
              const tierSlug = product.tierData?.slug;
              const styles = getTierStyles(tierSlug);
              const basePrice = product.originalPrice && product.originalPrice > 0 ? product.originalPrice : product.price;
              const mainImage = product.images?.[0] || product.image;
              const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
              const discountPercent = hasDiscount && product.originalPrice
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : null;

              return (
                <PNProductCard
                  key={product.id}
                  id={String(product.id)}
                  title={product.name}
                  image={mainImage}
                  price={formatCurrency(basePrice)}
                  density={density}
                  onClick={() => handleNavigate(product.id)}
                  rentalAvailable={Boolean(product.hasRental || product.rentalOptions?.length)}
                  imageFrameClassName={styles.imageFrame}
                  className={styles.wrapper}
                  rentalBadgeClassName="bg-black/80 text-white border border-white/15"
                  tierAccentClassName={styles.accent}
                >
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {product.gameTitleData?.name && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9px] font-medium border ${styles.badge}`}>
                        {product.gameTitleData.name}
                      </span>
                    )}
                    {(tierSlug || product.tierData?.name) && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9px] font-medium border ${styles.badge}`}>
                        {product.tierData?.name || tierSlug?.toUpperCase() || 'REGULER'}
                      </span>
                    )}
                  </div>

                  {hasDiscount && (
                    <div className="mt-2 flex items-center gap-2">
                      {discountPercent !== null && (
                        <span className="px-2 py-1 rounded-lg bg-white text-red-600 text-[10px] font-bold shadow-sm">-{discountPercent}%</span>
                      )}
                      <span className="text-[11px] text-white/60 line-through">
                        {formatCurrency(product.originalPrice as number)}
                      </span>
                    </div>
                  )}
                  
                  <PNButton 
                    variant="primary" 
                    size="sm" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(product.id);
                    }}
                    className="mt-3"
                  >
                    Beli Sekarang
                  </PNButton>
                </PNProductCard>
              );
            })}
          </IOSGrid>
        ) : (
          <EmptyState onReset={onResetFilters} />
        )}
      </PNContainer>
    </section>
  );
});

ProductsGrid.displayName = 'ProductsGrid';

