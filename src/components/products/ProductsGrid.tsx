/**
 * ProductsGrid - Product grid display component
 * Features responsive grid layout with empty state and Quick Buy
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { PNProductCard } from '../catalog';
import { PNButton } from '../ui/PinkNeonDesignSystem';
import { formatCurrency } from '../../utils/helpers';
import { EmptyState } from './EmptyState';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { useCart } from '../../contexts/CartContext';

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
  const { quickBuy } = useCart();

  const handleNavigate = (product: Product) => {
    if (!product.id) return;
    
    // If product has active flash sale, route to flash sales page
    const hasActiveFlashSale = product.isFlashSale && 
      product.flashSaleEndTime && 
      new Date(product.flashSaleEndTime).getTime() > Date.now();
    
    const path = hasActiveFlashSale 
      ? `/flash-sales/${product.id}` 
      : `/products/${product.id}`;
    
    navigate(path, { state: { fromCatalogPage: true } });
  };

  // Quick Buy handler - adds to cart and opens cart sheet
  const handleQuickBuy = useCallback((product: Product) => {
    if (!product.id || product.stock === 0) return;
    
    const mainImage = product.images?.[0] || product.image;
    quickBuy(String(product.id), {
      name: product.name,
      price: product.price,
      imageUrl: mainImage,
      slug: String(product.id),
      stock: product.stock,
    });
  }, [quickBuy]);

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
              
              // Check sold status
              const soldChannel = (product as any).soldChannel || (product as any).sold_channel || null;
              const isSold = !!soldChannel || product.stock === 0;

              return (
                <PNProductCard
                  key={product.id}
                  id={String(product.id)}
                  title={product.name}
                  image={mainImage}
                  price={formatCurrency(product.price)}
                  onClick={() => handleNavigate(product)}
                  rentalAvailable={Boolean(product.hasRental || product.rentalOptions?.length)}
                  discountPercent={discountPercent}
                  gameName={product.gameTitleData?.name}
                  tierName={product.tierData?.name}
                  tierSlug={product.tierData?.slug}
                  soldChannel={soldChannel}
                  stock={product.stock}
                >
                  <PNButton 
                    variant={isSold ? "secondary" : "primary"} 
                    size="sm" 
                    fullWidth
                    disabled={isSold}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSold) handleQuickBuy(product);
                    }}
                    className={isSold ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {isSold ? 'Tidak Tersedia' : '+ Keranjang'}
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

