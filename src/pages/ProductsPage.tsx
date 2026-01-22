/**
 * ProductsPage - Mobile-First Refactored Version
 * Modular architecture with separated components for better scalability
 * 
 * Key Improvements:
 * - Modular component architecture
 * - Custom hooks for data management
 * - Better separation of concerns
 * - Improved maintainability and scalability
 * - Touch-optimized filtering and search
 * - Native-like product browsing experience  
 */

import React, { useCallback } from 'react';
import { useProductsData } from '../hooks/useProductsData';
import {
  ProductsLoadingSkeleton,
  ProductsErrorState,
  ProductsGrid,
  PaginationBar,
  ProductsHeroWithFilters
} from '../components/products';

const ProductsPage: React.FC = () => {
  const {
    loading,
    error,
    filterState,
    currentPage,
    currentProducts,
    totalPages,
    filteredProducts,
    tiers,
    gameTitles,
    activeFilters,
    fetchData,
    handleFilterChange,
    handlePageChange,
    clearFilter,
    clearAllFilters
  } = useProductsData();

  // Stable callbacks to prevent unnecessary re-renders (ISO 9241-210 performance optimization)
  const handleSearchChange = useCallback((term: string) => {
    handleFilterChange('searchTerm', term);
  }, [handleFilterChange]);
  
  const handleSortChange = useCallback((v: string) => {
    handleFilterChange('sortBy', v);
  }, [handleFilterChange]);
  
  const handleRentalToggle = useCallback(() => {
    handleFilterChange('rentalOnly', !filterState.rentalOnly);
  }, [handleFilterChange, filterState.rentalOnly]);
  
  const handleTierChange = useCallback((slug: string) => {
    handleFilterChange('selectedTier', slug);
  }, [handleFilterChange]);
  
  const handleGameChange = useCallback((name: string) => {
    handleFilterChange('selectedGame', name);
  }, [handleFilterChange]);
  
  const handleCategoryChange = useCallback((name: string) => {
    handleFilterChange('selectedCategory', name);
  }, [handleFilterChange]);

  // Show loading skeleton
  if (loading) {
    return <ProductsLoadingSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ProductsErrorState 
        error={error} 
        onRetry={fetchData} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Integrated Hero with Filters */}
      <ProductsHeroWithFilters
        searchTerm={filterState.searchTerm}
        onSearchChange={handleSearchChange}
        totalProducts={filteredProducts.length}
        currentPage={currentPage}
        totalPages={totalPages}
        showBackNav={true}
        sortBy={filterState.sortBy}
        onSortChange={handleSortChange}
        rentalOnly={filterState.rentalOnly}
        onToggleRental={handleRentalToggle}
        tiers={tiers}
        selectedTier={filterState.selectedTier}
        onTierChange={handleTierChange}
        gameTitles={gameTitles}
        selectedGame={filterState.selectedGame}
        onGameChange={handleGameChange}
        selectedCategory={filterState.selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Products Grid */}
      <ProductsGrid
        products={currentProducts}
        onResetFilters={clearAllFilters}
        loading={loading}
      />
      
      {/* Pagination */}
      <div className="max-w-7xl mx-auto px-4">
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <div className="h-6" />
    </div>
  );
};

export default ProductsPage;
