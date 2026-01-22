/**
 * FlashSalesPage - Refactored Flash Sales Display
 * 
 * Key Features:
 * - Modular component structure
 * - Shared FlashSaleCard component
 * - Consistent homepage-style design
 * - Enhanced search and pagination
 */

import React from 'react';
import { useFlashSalesData } from '../hooks/useFlashSalesData';
import {
  ProductsLoadingSkeleton,
  ProductsErrorState,
  PaginationBar
} from '../components/products';
import { PNContainer } from '../components/ui/PinkNeonDesignSystem';
import FlashSalesPageHeader from '../components/flash-sales/FlashSalesPageHeader';
import FlashSalesProductGrid from '../components/flash-sales/FlashSalesProductGrid';
import FlashSalesEmptyState from '../components/flash-sales/FlashSalesEmptyState';

const FlashSalesPage: React.FC = () => {
  const {
    // State
    loading,
    error,
    currentProducts,
    totalPages,
    filteredFlashSales: filteredProducts,
    currentPage,
    filterState,
    
    // Actions
    handlePageChange,
    handleSearch,
    resetFilters,
    refetch
  } = useFlashSalesData();

  if (loading) {
    return <ProductsLoadingSkeleton />;
  }

  if (error) {
    return (
      <ProductsErrorState
        error={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with Navigation, Title, Search, and Stats */}
      <FlashSalesPageHeader
        searchTerm={filterState.searchTerm}
        onSearchChange={handleSearch}
        totalProducts={filteredProducts.length}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <section className="py-8">
        <PNContainer className="px-4 sm:px-6">
          {/* Products Grid or Empty State */}
          {currentProducts.length > 0 ? (
            <FlashSalesProductGrid products={currentProducts} />
          ) : (
            <FlashSalesEmptyState
              searchTerm={filterState.searchTerm}
              onResetSearch={resetFilters}
            />
          )}
          
          {/* Pagination */}
          {currentProducts.length > 0 && totalPages > 1 && (
            <div className="mt-12">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </PNContainer>
      </section>
    </div>
  );
};

export default FlashSalesPage;
