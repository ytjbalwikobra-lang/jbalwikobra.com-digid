/**
 * ProductsPage - Mobile-First Refactored Version with Infinite Scroll
 * Modular architecture with separated components for better scalability
 * 
 * Key Improvements:
 * - Infinite scroll for better UX and cache efficiency
 * - ISO 9241-210 compliant accessibility features
 * - Progressive loading to reduce initial egress
 * - Modular component architecture
 * - Custom hooks for data management
 * - Better separation of concerns
 * - Improved maintainability and scalability
 * - Touch-optimized filtering and search
 * - Native-like product browsing experience  
 */

import React, { useCallback } from 'react';
import { useProductsData } from '../hooks/useProductsData';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import {
  ProductsLoadingSkeleton,
  ProductsErrorState,
  ProductsGrid,
  InfiniteScrollTrigger,
  ProductsHeroWithFilters
} from '../components/products';
import { SEOHead, Breadcrumb, ItemListSchema } from '../components/seo';

const ProductsPage: React.FC = () => {
  const {
    loading,
    error,
    filterState,
    currentProducts,
    filteredProducts,
    tiers,
    gameTitles,
    hasMore,
    totalItems,
    displayedItemsCount,
    fetchData,
    handleFilterChange,
    loadMoreItems,
    clearAllFilters
  } = useProductsData({ mode: 'infinite', itemsPerLoad: 20 });

  // Infinite scroll hook
  const { observerTarget } = useInfiniteScroll({
    onLoadMore: loadMoreItems,
    hasMore: hasMore ?? false,
    isLoading: loading,
    threshold: 0.5,
    rootMargin: '300px' // Start loading 300px before reaching the trigger
  });

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
    <div className="min-h-screen bg-[var(--cyber-bg-pure)]">
      {/* SEO Head with Products page meta tags */}
      <SEOHead
        title="Katalog Akun Game"
        description="Jelajahi koleksi akun game premium kami. Mobile Legends, PUBG Mobile, Free Fire, Genshin Impact dan banyak lagi dengan harga terbaik."
        keywords="katalog akun game, jual akun mobile legends, akun pubg murah, akun genshin impact, akun ff"
        url="/products"
      />
      <ItemListSchema
        name="Katalog Akun Game JB Alwikobra"
        description="Koleksi akun game premium terpercaya"
        items={currentProducts.slice(0, 10).map((p, i) => ({
          name: p.name,
          url: `/products/${p.id}`,
          image: p.image,
          position: i + 1
        }))}
      />
      
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Katalog', href: '/products' }]} />
      </div>

      {/* Integrated Hero with Filters */}
      <ProductsHeroWithFilters
        searchTerm={filterState.searchTerm}
        onSearchChange={handleSearchChange}
        totalProducts={filteredProducts.length}
        currentPage={1}
        totalPages={1}
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
      
      {/* Infinite Scroll Trigger - ISO Compliant with manual fallback */}
      {!loading && currentProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InfiniteScrollTrigger
            observerRef={observerTarget}
            isLoading={loading}
            hasMore={hasMore ?? false}
            onLoadMore={loadMoreItems}
            totalDisplayed={displayedItemsCount ?? 0}
            totalItems={totalItems ?? 0}
          />
        </div>
      )}

      <div className="h-6" />
    </div>
  );
};

export default ProductsPage;
