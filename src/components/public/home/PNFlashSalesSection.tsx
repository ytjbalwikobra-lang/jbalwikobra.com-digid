import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';
import { PNSection, PNSectionHeader, PNContainer } from '../../ui/CyberDesignSystem';
import { Product, FlashSale } from '../../../types';
import FlashSaleCard from '../../shared/FlashSaleCard';

interface FlashSaleWithProduct extends FlashSale {
  product: Product;
}

interface Props { 
  products: FlashSaleWithProduct[]; 
  limit?: number;
}

const PNFlashSalesSection: React.FC<Props> = ({ products, limit = 8 }) => {
  if (!products || products.length === 0) return null;
  const list = products.slice(0, limit);
  return (
    <PNSection padding="md" aria-label="Flash sale produk">
      <PNContainer>
      <PNSectionHeader
        title={
          <span className="flex items-center gap-2">
            <Zap size={20} className="text-[var(--cyber-warning)]" aria-hidden="true" />
            Flash Sale
          </span>
        }
        subtitle="Diskon hingga 70% - Terbatas!"
        action={
          <Link 
            to="/flash-sales" 
            className="text-sm text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] transition-colors flex items-center gap-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cyber-bg-pure)] rounded-md"
            aria-label="Lihat semua flash sale"
          >
            Lihat Semua <ChevronRight size={16} aria-hidden="true" />
          </Link>
        }
      />
      {/* Responsive grid: horizontal scroll on mobile, columns on md+ */}
      <div 
        className="grid gap-4 px-1 pb-2 auto-cols-[180px] grid-flow-col overflow-x-auto snap-x snap-mandatory scrollbar-hide md:auto-cols-auto md:grid-flow-row md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-x-visible md:px-0"
        role="list"
        aria-label="Daftar produk flash sale"
      >
        {list.map((flashSale) => {
          // Convert flash sale data to FlashSale type for the card (same as FlashSalesProductGrid)
          const flashSaleData: FlashSale = {
            id: flashSale.id,
            productId: flashSale.productId,
            originalPrice: flashSale.originalPrice,
            salePrice: flashSale.salePrice,
            endTime: flashSale.endTime,
            startTime: flashSale.startTime,
            isActive: flashSale.isActive,
            stock: flashSale.stock
          };

          return (
            <FlashSaleCard
              key={flashSale.id}
              product={flashSale.product}
              flashSale={flashSaleData}
            />
          );
        })}
      </div>
      </PNContainer>
    </PNSection>
  );
};

export default React.memo(PNFlashSalesSection);
