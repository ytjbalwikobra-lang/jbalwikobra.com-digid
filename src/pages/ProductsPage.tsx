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

import React from 'react';
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
    // State
    loading,
    error,
    filterState,
    currentPage,
    currentProducts,
    totalPages,
    filteredProducts,
    tiers,
    gameTitles,
    layoutDensity,
    activeFilters,
    
    // Actions
  fetchData,
  handleFilterChange,
  handlePageChange,
  clearFilter,
  clearAllFilters
  } = useProductsData();

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
        onSearchChange={(term) => handleFilterChange('searchTerm', term)}
        totalProducts={filteredProducts.length}
        currentPage={currentPage}
        totalPages={totalPages}
        showBackNav={true}
        sortBy={filterState.sortBy}
        onSortChange={(v) => handleFilterChange('sortBy', v)}
        activeFilters={activeFilters}
        onRemoveFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
        rentalOnly={filterState.rentalOnly}
        onToggleRental={() => handleFilterChange('rentalOnly', !filterState.rentalOnly)}
        tiers={tiers}
        selectedTier={filterState.selectedTier}
        onTierChange={(slug) => handleFilterChange('selectedTier', slug)}
        gameTitles={gameTitles}
        selectedGame={filterState.selectedGame}
        onGameChange={(name) => handleFilterChange('selectedGame', name)}
  selectedCategory={filterState.selectedCategory}
  onCategoryChange={(name) => handleFilterChange('selectedCategory', name)}
      />

      {/* Products Grid */}
      <div className="px-4">
        <div className="max-w-7xl mx-auto">
          <ProductsGrid
            products={currentProducts}
            onResetFilters={clearAllFilters}
            density={layoutDensity}
            loading={loading}
          />
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
};

export default ProductsPage;
