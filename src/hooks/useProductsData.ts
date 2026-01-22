/**
 * useProductsData - Custom hook for products data management
 * Handles data fetching, filtering, sorting, and pagination logic
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Product, Tier, GameTitle } from '../types';
import { scrollToPaginationContent } from '../utils/scrollUtils';
import { excludeActiveFlashSales } from '../utils/flashSaleUtils';

// Mobile-first constants
const MOBILE_CONSTANTS = {
  PRODUCTS_PER_PAGE: 16, // Increased for desktop to show more products
  PRODUCTS_PER_PAGE_MOBILE: 12, // Increased for mobile to show more products (was 8)
} as const;

interface ProductsPageState {
  products: Product[];
  tiers: Tier[];
  gameTitles: GameTitle[];
  loading: boolean;
  error: string | null;
}

interface FilterState {
  searchTerm: string;
  selectedCategory: string; // category by name (from categories hook)
  selectedGame: string; // single select (pills)
  selectedTier: string; // single select (pills)
  selectedGames: string[]; // desktop multi-select
  selectedTiers: string[]; // desktop multi-select
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string;
  rentalOnly: boolean;
}

type LayoutDensity = 'comfortable' | 'compact';

// Default filter state constant (moved outside hook for reuse)
const DEFAULT_FILTER_STATE: FilterState = {
  searchTerm: '',
  selectedCategory: '',
  selectedGame: '',
  selectedTier: '',
  selectedGames: [],
  selectedTiers: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'newest',
  rentalOnly: false,
};

export const useProductsData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  const [state, setState] = useState<ProductsPageState>({
    products: [],
    tiers: [],
    gameTitles: [],
    loading: true,
    error: null
  });

  const [filterState, setFilterState] = useState<FilterState>(() => {
    // Load from sessionStorage if available
    let stored: Partial<FilterState> = {};
    try {
      const savedState = sessionStorage.getItem('productsPageState');
      if (savedState) stored = JSON.parse(savedState);
    } catch {/* ignore */}

    const urlSelectedGames = searchParams.get('games');
    const urlSelectedTiers = searchParams.get('tiers');
    const urlMin = searchParams.get('minPrice');
    const urlMax = searchParams.get('maxPrice');
    const urlRental = searchParams.get('rental');

    return {
      searchTerm: searchParams.get('search') ?? (stored.searchTerm ?? ''),
      selectedCategory: (() => {
        const c = searchParams.get('category');
        if (!c || c.toLowerCase() === 'all') return stored.selectedCategory ?? '';
        return c;
      })(),
      selectedGame: searchParams.get('game') ?? (stored.selectedGame ?? ''),
      selectedTier: searchParams.get('tier') ?? (stored.selectedTier ?? ''),
      selectedGames: urlSelectedGames ? urlSelectedGames.split(',').filter(Boolean) : (stored.selectedGames ?? []),
      selectedTiers: urlSelectedTiers ? urlSelectedTiers.split(',').filter(Boolean) : (stored.selectedTiers ?? []),
      minPrice: urlMin !== null ? Number(urlMin) : (stored.minPrice ?? null),
      maxPrice: urlMax !== null ? Number(urlMax) : (stored.maxPrice ?? null),
      sortBy: searchParams.get('sortBy') ?? (stored.sortBy ?? 'newest'),
      rentalOnly: urlRental ? (urlRental === '1' || urlRental === 'true') : (stored.rentalOnly ?? false),
    };
  });

  // Layout density - read from localStorage once on mount
  const layoutDensity: LayoutDensity = (() => {
    if (typeof window === 'undefined') return 'comfortable';
    try {
      const stored = localStorage.getItem('catalog_layout_density');
      return stored === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  })();

  const [currentPage, setCurrentPage] = useState(() => {
    const savedState = sessionStorage.getItem('productsPageState');
    if (savedState && location.state?.fromProductDetail) {
      try {
        const parsedState = JSON.parse(savedState);
        return parsedState.currentPage || 1;
      } catch {
        return 1;
      }
    }
    return 1;
  });

  // Products per page - determine once on mount (mobile: 12, desktop: 16)
  const productsPerPage = typeof window !== 'undefined' && window.innerWidth < 768 
    ? MOBILE_CONSTANTS.PRODUCTS_PER_PAGE_MOBILE 
    : MOBILE_CONSTANTS.PRODUCTS_PER_PAGE;

  // Optimized data fetching
  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [
        { ProductService },
        { OptimizedProductService }
      ] = await Promise.all([
        import('../services/productService'),
        import('../services/optimizedProductService')
      ]);

      // Clear cache to ensure fresh data
      OptimizedProductService.clearProductsCache();

      const [productsResponse, tiersData, gameTitlesData] = await Promise.all([
        OptimizedProductService.getProductsPaginated({
          status: 'public' // Show all non-archived products including sold ones
        }, {
          page: 1,
          limit: 200 // Increased to get all products
        }),
        ProductService.getTiers(),
        ProductService.getGameTitles()
      ]);

      // Sort tiers: Pelajar → Reguler → Premium
      const sortedTiers = [...tiersData].sort((a, b) => {
        const order = { 'pelajar': 1, 'reguler': 2, 'premium': 3 };
        const aOrder = order[a.slug] || 999;
        const bOrder = order[b.slug] || 999;
        return aOrder - bOrder;
      });

      setState({
        products: productsResponse.data,
        tiers: sortedTiers,
        gameTitles: gameTitlesData,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Gagal memuat produk. Silakan coba lagi.'
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized filtered and sorted products
  const filteredProducts = useMemo(() => {
    // Exclude products with active flash sales (they should only appear in flash sales section)
    let filtered = excludeActiveFlashSales(state.products);

    // Search filter
    if (filterState.searchTerm) {
      const searchLower = filterState.searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.gameTitleData?.name?.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
      );
    }

    // Category filter (by name)
    if (filterState.selectedCategory) {
      const target = filterState.selectedCategory.toLowerCase();
      filtered = filtered.filter(p => p.categoryData?.name?.toLowerCase() === target);
    }

    // Game filter (multi-select has priority)
    if (filterState.selectedGames?.length) {
      const setGames = new Set(filterState.selectedGames.map(g => g.toLowerCase()));
      filtered = filtered.filter(p => p.gameTitleData?.name && setGames.has(p.gameTitleData.name.toLowerCase()));
    } else if (filterState.selectedGame) {
      const gameLower = filterState.selectedGame.toLowerCase();
      filtered = filtered.filter(p => p.gameTitleData?.name?.toLowerCase() === gameLower);
    }

    // Tier filter (multi-select has priority)
    if (filterState.selectedTiers?.length) {
      const setTiers = new Set(filterState.selectedTiers.map(t => t.toLowerCase()));
      filtered = filtered.filter(p => p.tierData?.slug && setTiers.has(p.tierData.slug.toLowerCase()));
    } else if (filterState.selectedTier) {
      const tierLower = filterState.selectedTier.toLowerCase();
      filtered = filtered.filter(p => p.tierData?.slug?.toLowerCase() === tierLower);
    }

    // Rental filter
    if (filterState.rentalOnly) {
      filtered = filtered.filter(p => p.hasRental === true);
    }

    // Price range filter
    const { minPrice, maxPrice } = filterState;
    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
      filtered = filtered.filter(p => p.price >= minPrice);
    }
    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
      filtered = filtered.filter(p => p.price <= maxPrice);
    }

    // Sort (create copy to avoid mutating)
    const sorted = [...filtered];
    switch (filterState.sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name-az':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-za':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return sorted;
  }, [
    state.products,
    filterState.searchTerm,
    filterState.selectedCategory,
    filterState.selectedGame,
    filterState.selectedTier,
    filterState.selectedGames,
    filterState.selectedTiers,
    filterState.rentalOnly,
    filterState.minPrice,
    filterState.maxPrice,
    filterState.sortBy
  ]);

  // Reset page when filters change
  const filterDepsString = JSON.stringify([
    filterState.searchTerm,
    filterState.selectedCategory,
    filterState.selectedGame,
    filterState.selectedTier,
    filterState.selectedGames,
    filterState.selectedTiers,
    filterState.rentalOnly,
    filterState.minPrice,
    filterState.maxPrice,
    filterState.sortBy
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepsString]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterState.searchTerm) params.set('search', filterState.searchTerm);
  if (filterState.selectedCategory) params.set('category', filterState.selectedCategory);
    if (filterState.selectedGame) params.set('game', filterState.selectedGame);
    if (filterState.selectedTier) params.set('tier', filterState.selectedTier);
    if (filterState.selectedGames?.length) params.set('games', filterState.selectedGames.join(','));
    if (filterState.selectedTiers?.length) params.set('tiers', filterState.selectedTiers.join(','));
    if (typeof filterState.minPrice === 'number' && !Number.isNaN(filterState.minPrice)) params.set('minPrice', String(filterState.minPrice));
    if (typeof filterState.maxPrice === 'number' && !Number.isNaN(filterState.maxPrice)) params.set('maxPrice', String(filterState.maxPrice));
    if (filterState.sortBy !== 'newest') params.set('sortBy', filterState.sortBy);
  if (filterState.rentalOnly) params.set('rental', '1');
    setSearchParams(params);
  }, [filterState, setSearchParams]);

  // Save state for navigation back
  useEffect(() => {
    const stateToSave = {
      currentPage,
      ...filterState
    };
    sessionStorage.setItem('productsPageState', JSON.stringify(stateToSave));
  }, [currentPage, filterState]);

  const handleFilterChange = useCallback((key: string, value: string | boolean | string[] | number | null) => {
    setFilterState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    scrollToPaginationContent();
  }, []);

  // Active filters derivation (memo)
  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string; value: string }> = [];
  if (filterState.searchTerm) items.push({ key: 'searchTerm', label: 'Pencarian', value: filterState.searchTerm });
  if (filterState.selectedCategory) items.push({ key: 'selectedCategory', label: 'Kategori', value: filterState.selectedCategory });
    if (filterState.selectedGames?.length) items.push({ key: 'selectedGames', label: 'Game', value: filterState.selectedGames.join(', ') });
    else if (filterState.selectedGame) items.push({ key: 'selectedGame', label: 'Game', value: filterState.selectedGame });
    if (filterState.selectedTiers?.length) items.push({ key: 'selectedTiers', label: 'Tier', value: filterState.selectedTiers.join(', ') });
    else if (filterState.selectedTier) items.push({ key: 'selectedTier', label: 'Tier', value: filterState.selectedTier });
    if (typeof filterState.minPrice === 'number' || typeof filterState.maxPrice === 'number') {
      const min = (typeof filterState.minPrice === 'number') ? `Min ${filterState.minPrice}` : '';
      const max = (typeof filterState.maxPrice === 'number') ? `Max ${filterState.maxPrice}` : '';
      const label = [min, max].filter(Boolean).join(' · ');
      if (label) items.push({ key: 'priceRange', label: 'Harga', value: label });
    }
  if (filterState.rentalOnly) items.push({ key: 'rentalOnly', label: 'Rental', value: 'Ya' });
    return items;
  }, [filterState.searchTerm, filterState.selectedCategory, filterState.selectedGame, filterState.selectedTier, filterState.selectedGames, filterState.selectedTiers, filterState.minPrice, filterState.maxPrice, filterState.rentalOnly]);

  const clearFilter = useCallback((key: string) => {
  if (key === 'searchTerm' || key === 'selectedCategory' || key === 'selectedGame' || key === 'selectedTier') {
      handleFilterChange(key, '');
    } else if (key === 'selectedGames') {
      handleFilterChange('selectedGames', []);
    } else if (key === 'selectedTiers') {
      handleFilterChange('selectedTiers', []);
    } else if (key === 'rentalOnly') {
      handleFilterChange('rentalOnly', false);
    } else if (key === 'priceRange') {
      // Batch update for price range
      setFilterState(prev => ({ ...prev, minPrice: null, maxPrice: null }));
    }
  }, [handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    // Single state update instead of 10 separate calls
    setFilterState(DEFAULT_FILTER_STATE);
  }, []);

  // Pagination calculations using memoized filteredProducts
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  return {
    // State
    ...state,
    filteredProducts, // Use memoized filteredProducts
    filterState,
    currentPage,
    currentProducts,
    totalPages,
    layoutDensity,
    activeFilters,
    
    // Actions
    fetchData,
    handleFilterChange,
    handlePageChange,
    clearFilter,
    clearAllFilters
  };
};
