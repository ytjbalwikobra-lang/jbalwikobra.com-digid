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
import { EmptyState } from './EmptyState';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductsGridProps {
  products: Product[];
  onResetFilters: () => void;
  loading?: boolean;
  skeletonCount?: number;
}

export const ProductsGrid = React.memo(({ 
  products, 
  onResetFilters, 
  loading = false, 
  skeletonCount = 8 
}: ProductsGridProps) => {
  const navigate = useNavigate();

  const handleNavigate = (productId: string) => {
    if (!productId) return;
    navigate(`/products/${productId}`, { state: { fromCatalogPage: true } });
  };

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map(product => {
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
                  price={formatCurrency(product.price)}
                  onClick={() => handleNavigate(product.id)}
                  rentalAvailable={Boolean(product.hasRental || product.rentalOptions?.length)}
                  discountPercent={discountPercent}
                  gameName={product.gameTitleData?.name}
                  tierName={product.tierData?.name}
                  tierSlug={product.tierData?.slug}
                >
                  <PNButton 
                    variant="primary" 
                    size="sm" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(product.id);
                    }}
                  >
                    Beli Sekarang
                  </PNButton>
                </PNProductCard>
              );
            })}
          </div>
        ) : (
          <EmptyState onReset={onResetFilters} />
        )}
      </div>
    </section>
  );
});

ProductsGrid.displayName = 'ProductsGrid';

