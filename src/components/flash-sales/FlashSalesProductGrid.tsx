/**
 * FlashSalesProductGrid - Grid component for displaying flash sale products
 * 
 * Features:
 * - Responsive grid layout matching homepage style
 * - Horizontal scroll on mobile, column grid on desktop
 * - Uses shared FlashSaleCard component
 * - Handles FlashSaleWithProduct data from useFlashSalesData hook
 */

import React from 'react';
import { Product, FlashSale } from '../../types';
import FlashSaleCard from '../shared/FlashSaleCard';

interface FlashSaleWithProduct extends FlashSale {
  product: Product;
}

interface FlashSalesProductGridProps {
  /** Array of flash sale products to display from useFlashSalesData hook */
  products: FlashSaleWithProduct[];
  /** Additional CSS classes */
  className?: string;
}

const FlashSalesProductGrid: React.FC<FlashSalesProductGridProps> = ({ 
  products, 
  className = "" 
}) => {
  return (
    <div 
      className={`grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${className}`}
      style={{ pointerEvents: 'auto' }}
    >
      {products.map(flashSale => {
        // Convert flash sale data to FlashSale type for the card
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
            className="w-full"
          />
        );
      })}
    </div>
  );
};

export default FlashSalesProductGrid;
