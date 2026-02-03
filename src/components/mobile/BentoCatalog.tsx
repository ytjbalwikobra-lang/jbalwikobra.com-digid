import React, { memo, useMemo, useCallback } from 'react';
import BentoProductCard, { BentoProductProps } from './BentoProductCard';
import { cn } from '../../utils/cn';

/**
 * Cyber-Compact Bento Grid Catalog
 * 
 * High-density product grid optimized for gaming e-commerce:
 * - 2 columns on mobile (< 640px)
 * - 3 columns on tablet (640px - 1023px)
 * - 4 columns on desktop (>= 1024px)
 * - Compact 8px gap between cards
 * - Virtualization-ready structure
 */

interface BentoCatalogProps {
  products: BentoProductProps[];
  onQuickBuy?: (productId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

// Skeleton Loader for Products
const SkeletonCard: React.FC = memo(() => (
  <div className="cyber-bento-card animate-pulse">
    <div className="aspect-square bg-[var(--cyber-bg-surface)]" />
    <div className="p-2 space-y-2">
      <div className="h-3 bg-[var(--cyber-bg-surface)] rounded w-full" />
      <div className="h-3 bg-[var(--cyber-bg-surface)] rounded w-3/4" />
      <div className="h-3 bg-[var(--cyber-bg-surface)] rounded w-1/2" />
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

const BentoCatalog: React.FC<BentoCatalogProps> = memo(({
  products,
  onQuickBuy,
  loading = false,
  emptyMessage = 'Tidak ada produk ditemukan',
  className,
}) => {
  // Generate skeleton count based on viewport
  const skeletonCount = useMemo(() => 8, []);

  const handleQuickBuy = useCallback((productId: string) => {
    onQuickBuy?.(productId);
  }, [onQuickBuy]);

  // Loading State
  if (loading) {
    return (
      <div className={cn('cyber-bento-grid', className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  // Empty State
  if (!products || products.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        'text-center',
        className
      )}>
        <div className="w-16 h-16 rounded-full bg-[var(--cyber-bg-card)] flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-[var(--cyber-text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <p className="text-[var(--cyber-text-muted)] text-sm">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn('cyber-bento-grid', className)}
      role="list"
      aria-label="Product catalog"
    >
      {products.map((product) => (
        <BentoProductCard
          key={product.id}
          {...product}
          onQuickBuy={handleQuickBuy}
        />
      ))}
    </div>
  );
});

BentoCatalog.displayName = 'BentoCatalog';

export default BentoCatalog;
