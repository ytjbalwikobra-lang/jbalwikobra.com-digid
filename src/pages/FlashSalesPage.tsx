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
import { PNContainer } from '../components/ui/CyberDesignSystem';
import FlashSalesPageHeader from '../components/flash-sales/FlashSalesPageHeader';
import FlashSalesProductGrid from '../components/flash-sales/FlashSalesProductGrid';
import FlashSalesEmptyState from '../components/flash-sales/FlashSalesEmptyState';
import { SEOHead, Breadcrumb, ItemListSchema } from '../components/seo';

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
    <div className="min-h-screen bg-[var(--cyber-bg-pure)]">
      <SEOHead
        title="Flash Sale - Diskon Terbatas"
        description="Promo flash sale terbatas! Dapatkan diskon hingga 70% untuk top up game, voucher digital, dan produk gaming populer. Penawaran terbatas, buruan sebelum kehabisan!"
        keywords="flash sale, promo game, diskon top up, voucher murah, game promo, penawaran terbatas"
        url="/flash-sales"
        page={currentPage}
        totalPages={totalPages}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Breadcrumb
          items={[
            { label: 'Flash Sale', href: '/flash-sales' }
          ]}
        />
      </div>
      <ItemListSchema
        name="Flash Sale - Promo Terbatas"
        description="Penawaran flash sale terbatas untuk produk gaming dan digital"
        items={currentProducts.slice(0, 10).map((flashSale, index) => ({
          position: index + 1,
          name: flashSale.product?.name || 'Flash Sale Product',
          url: `https://jbalwikobra.com/flash-sales/${flashSale.id}`
        }))}
      />

      {/* Header with Navigation, Title, Search, and Stats */}
      <FlashSalesPageHeader
        searchTerm={filterState.searchTerm}
        onSearchChange={handleSearch}
        totalProducts={filteredProducts.length}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <section className="py-6 sm:py-8 lg:py-10">
        <PNContainer className="px-4 sm:px-6 lg:px-8">
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
