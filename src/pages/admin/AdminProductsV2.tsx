import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, RefreshCw, Plus, Edit, Trash2, Eye, ShoppingCart, DollarSign, Archive, Calendar, Tag, ArrowUpRight, ArrowDownRight, Activity, FileDown, TrendingUp } from 'lucide-react';
import { adminService, Product } from '../../services/adminService';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import '../../styles/admin-design-system-v3.css';

interface ProductStats {
  total: number;
  active: number;
  archived: number;
  totalValue: number;
}

interface ProductFilters {
  status: 'all' | 'active' | 'archived';
  category: string;
  gameTitle: string;
  tier: string;
  search: string;
  priceRange: 'all' | 'under-100k' | '100k-500k' | 'above-500k';
}

const AdminProductsV2: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    status: 'all',
    category: 'all',
    gameTitle: 'all',
    tier: 'all',
    search: '',
    priceRange: 'all'
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Product stats state
  const [productStats, setProductStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    archived: 0,
    totalValue: 0
  });

  // Dropdown data states
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [gameTitles, setGameTitles] = useState<Array<{ id: string; name: string }>>([]);
  const [tiers, setTiers] = useState<Array<{ id: string; name: string }>>([]);

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    product: Product | null;
  }>({
    isOpen: false,
    mode: 'create',
    product: null
  });

  const { push } = useToast();
  const navigate = useNavigate();

  // Use actual stats from database instead of calculated from visible data
  const stats = productStats;

  // Client-side filtering for all products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = product.name?.toLowerCase().includes(searchLower);
        const matchesDescription = product.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription) return false;
      }

      // Status filter
      if (filters.status === 'active' && (!product.is_active || product.archived_at)) return false;
      if (filters.status === 'archived' && (product.is_active && !product.archived_at)) return false;

      // Category filter
      if (filters.category !== 'all') {
        if (product.category_id !== filters.category) return false;
      }

      // Game Title filter
      if (filters.gameTitle !== 'all') {
        if (product.game_title_id !== filters.gameTitle) return false;
      }

      // Tier filter
      if (filters.tier !== 'all') {
        if (product.tier_id !== filters.tier) return false;
      }

      // Price range filter
      if (filters.priceRange !== 'all') {
        const price = product.price || 0;
        if (filters.priceRange === 'under-100k' && price >= 100000) return false;
        if (filters.priceRange === '100k-500k' && (price < 100000 || price >= 500000)) return false;
        if (filters.priceRange === 'above-500k' && price < 500000) return false;
      }

      return true;
    });
  }, [products, filters]);

  // Client-side pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentPageProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when non-search filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.status,
    filters.category,
    filters.gameTitle,
    filters.tier,
    filters.priceRange,
    itemsPerPage
  ]);

  // Add cache for filtered results to avoid repeated server calls
  const [cachedResults, setCachedResults] = useState<Map<string, { data: Product[], count: number, timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Generate cache key from current filters
  const getCacheKey = (filters: ProductFilters) => {
    return `${filters.status}-${filters.category}-${filters.gameTitle}-${filters.tier}-${filters.priceRange}-${filters.search}`;
  };

  const loadProducts = async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    
    try {
      const cacheKey = getCacheKey(filters);
      const cachedResult = cachedResults.get(cacheKey);
      const now = Date.now();
      
      // Use cache if available and not expired (unless forced refresh)
      if (!forceRefresh && cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
        setProducts(cachedResult.data);
        setTotalCount(cachedResult.count);
        setLoading(false);
        return;
      }

      // Build optimized query parameters for server-side filtering
      const queryParams: any = {
        page: 1,
        limit: 500, // Reasonable limit to avoid huge payloads
      };

      // Add search term if present
      if (filters.search.trim()) {
        queryParams.search = filters.search.trim();
      }

      // For now, load with search only - we'll extend the API later for other filters
      const [productsResult, statsResult] = await Promise.all([
        adminService.getProducts(queryParams.page, queryParams.limit, queryParams.search),
        adminService.getProductStats()
      ]);

      // Cache the result
      const newCachedResults = new Map(cachedResults);
      newCachedResults.set(cacheKey, {
        data: productsResult.data,
        count: productsResult.count,
        timestamp: now
      });
      setCachedResults(newCachedResults);

      setProducts(productsResult.data);
      setTotalCount(productsResult.count);
      setProductStats(statsResult);
    } catch (err: any) {
      const message = err?.message || 'Failed to load products';
      setError(message);
      push(`Failed to load products: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [categoriesData, gameTitlesData, tiersData] = await Promise.all([
        adminService.getCategories(),
        adminService.getGameTitles(),
        adminService.getTiers()
      ]);
      
      setCategories(categoriesData);
      setGameTitles(gameTitlesData);
      setTiers(tiersData);
    } catch (error: any) {
      console.warn('Failed to load dropdown data:', error.message);
    }
  };

  useEffect(() => {
    loadProducts();
    loadDropdownData();
  }, []); // Load products only once on component mount

  // Reload when search or major filters change (with caching)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(); // This will use cache if available
    }, 300); // Debounce to avoid too many requests while typing

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.status]); // Only reload for search and status changes

  // Reset to first page when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleRefresh = () => {
    // Clear cache and force refresh
    setRefreshing(true);
    setCachedResults(new Map());
    loadProducts(true).finally(() => setRefreshing(false));
  };

  const handleEditProduct = (product: Product) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      product
    });
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = !product.is_active;
      await adminService.updateProductFields(product.id, { 
        is_active: newStatus 
      });
      
      push(`Product ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
      setCachedResults(new Map()); // Clear cache
      loadProducts(true); // Force reload to see changes
    } catch (error: any) {
      push(`Failed to update product status: ${error.message}`, 'error');
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to archive product: ${product.name}?\n\nThis will hide the product from both admin panel and public pages. You can restore it later if needed.`)) {
      return;
    }
    // Optimistic UI: update immediately in local state
    const prev = products;
    setProducts(prev.map(p => p.id === product.id ? { ...p, archived_at: new Date().toISOString(), is_active: false } : p));
    try {
      const ok = await adminService.deleteProduct(product.id);
      if (!ok) throw new Error('Archive failed');
      push(`Product "${product.name}" has been archived successfully`, 'success');
      // Invalidate cache and hard refresh from server bypassing cache
      setCachedResults(new Map());
      await loadProducts(true);
    } catch (error: any) {
      // Rollback UI on failure
      setProducts(prev);
      push(`Failed to archive product: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleAddProduct = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      product: null
    });
  };

  const handleModalClose = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
      product: null
    });
  };

  const handleModalSuccess = () => {
    // Clear cache and reload products after successful create/edit
    setCachedResults(new Map());
    loadProducts(true);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Rp 0';
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (product: Product) => {
    if (product.archived_at || !product.is_active) {
      return 'bg-gray-500/20 text-gray-300';
    }
    return 'bg-green-500/20 text-green-300';
  };

  const getStatusText = (product: Product) => {
    if (product.archived_at) return 'Archived';
    if (!product.is_active) return 'Inactive';
    return 'Active';
  };

  const getTierRowColor = (product: Product) => {
    const tierName = ((product as any).tiers?.name || product.tier || '').toLowerCase();
    
    switch (tierName) {
      case 'pelajar':
        return 'hover:bg-blue-900/30 bg-blue-950/20 border-blue-800/30';
      case 'reguler':
        return 'hover:bg-gray-700/50 bg-gray-900/30 border-gray-600/30';
      case 'premium':
        return 'hover:bg-yellow-900/30 bg-yellow-950/20 border-yellow-800/30';
      default:
        return 'hover:bg-gray-900/50 bg-black border-gray-800';
    }
  };

  const getTierTextColor = (product: Product) => {
    const tierName = ((product as any).tiers?.name || product.tier || '').toLowerCase();
    
    switch (tierName) {
      case 'pelajar':
        return 'text-blue-300';
      case 'reguler':
        return 'text-gray-300';
      case 'premium':
        return 'text-yellow-300';
      default:
        return 'text-purple-300';
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Package className="inline-block mr-2" size={28} />
            Product Management
          </h1>
          <p className="admin-page-subtitle">Manage your products and inventory</p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            icon={<RefreshCw className={(loading || refreshing) ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleAddProduct}
            icon={<Plus size={18} />}
          >
            Add Product
          </AdminButton>
        </div>
      </div>

        {/* Cache Status Indicator */}
        {(() => {
          const cacheKey = getCacheKey(filters);
          const cachedResult = cachedResults.get(cacheKey);
          const isUsingCache = cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION;
          
          return isUsingCache && !loading ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                Showing cached data • Click refresh for latest
              </div>
            </div>
          ) : null;
        })()}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-slate-900">{loading ? '...' : stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Products</p>
                  <p className="text-3xl font-bold text-green-600">{loading ? '...' : stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="text-green-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Archived Products</p>
                  <p className="text-3xl font-bold text-slate-500">{loading ? '...' : stats.archived}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Archive className="text-slate-500" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Value</p>
                  <p className="text-3xl font-bold text-pink-600">{loading ? '...' : formatPrice(stats.totalValue)}</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-pink-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>
        </div>

        {/* Filters */}
        <div className="bg-black border border-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>

            {/* Price Range Filter */}
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value as any }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Prices</option>
              <option value="under-100k">Under Rp 100K</option>
              <option value="100k-500k">Rp 100K - 500K</option>
              <option value="above-500k">Above Rp 500K</option>
            </select>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            {/* Game Title Filter */}
            <select
              value={filters.gameTitle}
              onChange={(e) => setFilters(prev => ({ ...prev, gameTitle: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Games</option>
              {gameTitles.map(gameTitle => (
                <option key={gameTitle.id} value={gameTitle.id}>{gameTitle.name}</option>
              ))}
            </select>

            {/* Tier Filter */}
            <select
              value={filters.tier}
              onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value }))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Tiers</option>
              {tiers.map(tier => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg transition-all duration-200 font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-96">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Game Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-24">Tier</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-36">Price</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  // Loading skeleton
                  [...Array(itemsPerPage)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-700 rounded w-32"></div>
                            <div className="h-3 bg-gray-800 rounded w-48"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-700 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                          <div className="h-8 w-8 bg-gray-700 rounded"></div>
                          <div className="h-8 w-8 bg-gray-700 rounded"></div>
                          <div className="h-8 w-8 bg-gray-700 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : currentPageProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No Products Found</h3>
                      <p className="text-gray-500">
                        {filters.search || filters.status !== 'all' || filters.priceRange !== 'all' || 
                         filters.category !== 'all' || filters.gameTitle !== 'all' || filters.tier !== 'all'
                          ? 'Try adjusting your filters to see more results.'
                          : 'No products have been added yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentPageProducts.map((product) => (
                    <tr key={product.id} className={`transition-all duration-200 border-l-4 ${getTierRowColor(product)}`}>
                      <td className="px-6 py-4 w-96">
                        <div className="flex items-center space-x-3">
                          <div className="relative flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <div className="relative">
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjNEI1NTYzIi8+CjxwYXRoIGQ9Ik0xMiA4QzEzLjEgOCAxNCA4LjkgMTQgMTBDMTQgMTEuMSAxMy4xIDEyIDEyIDEyQzEwLjkgMTIgMTAgMTEuMSAxMCAxMEMxMCA4LjkgMTAuOSA4IDEyIDhaIiBmaWxsPSIjOUM5Q0E0Ii8+CjxwYXRoIGQ9Ik01IDEyTDE5IDEyTDE1IDE2TDkgMTBMNSAxMloiIGZpbGw9IiM5QzlDQTQiLz4KPC9zdmc+';
                                  }}
                                />
                                {product.images.length > 1 && (
                                  <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                    +{product.images.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjNEI1NTYzIi8+CjxwYXRoIGQ9Ik0xMiA4QzEzLjEgOCAxNCA4LjkgMTQgMTBDMTQgMTEuMSAxMy4xIDEyIDEyIDEyQzEwLjkgMTIgMTAgMTEuMSAxMCAxMEMxMCA4LjkgMTAuOSA4IDEyIDhaIiBmaWxsPSIjOUM5Q0E0Ii8+CjxwYXRoIGQ9Ik01IDEyTDE5IDEyTDE1IDE2TDkgMTBMNSAxMloiIGZpbGw9IiM5QzlDQTQiLz4KPC9zdmc+';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="font-semibold text-white truncate">{product.name}</div>
                            <div className="text-sm text-gray-400 truncate">
                              {product.description || 'No description available'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {product.images && product.images.length > 1 && (
                                <div className="text-xs text-pink-300">
                                  {product.images.length} images
                                </div>
                              )}
                              {/* Rental Status Tag */}
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.has_rental 
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {product.has_rental ? 'Rental Active' : 'Rental Inactive'}
                              </div>
                              {/* Variant Count Tag */}
                              {product.has_rental && (
                                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {(product as any).rentalOptions?.length || 0} variants
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-blue-300">
                          {(product as any).game_titles?.name || product.game_title || 'No game title'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-green-300">
                          {product.categoryData?.name || 'No category'}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-24">
                        <div className={`text-sm font-medium ${getTierTextColor(product)}`}>
                          {(product as any).tiers?.name || product.tier || 'No tier'}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-36">
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-white whitespace-nowrap">
                            {formatPrice(product.price)}
                          </div>
                          {product.original_price && product.original_price > (product.price || 0) && (
                            <div className="text-sm text-gray-400 line-through whitespace-nowrap">
                              {formatPrice(product.original_price)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${getStatusColor(product)} hover:opacity-80`}
                          title={`Click to ${product.is_active ? 'deactivate' : 'activate'} product`}
                        >
                          {getStatusText(product)}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {formatDate(product.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewProduct(product)}
                            className="p-2 text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all duration-200"
                            title="View Product"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleArchiveProduct(product)}
                            className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                            title="Archive Product"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Pagination */}
        {filteredProducts.length > 0 && (
          <div className="bg-black border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              {/* Items per page selector */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-300">Items per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all duration-200 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page info - Center */}
              <div className="text-sm text-gray-400 text-center">
                Showing <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of{' '}
                <span className="font-medium text-white">{filteredProducts.length}</span> products
                {filteredProducts.length !== totalCount && (
                  <span className="text-gray-500 ml-2">
                    (filtered from {totalCount} total)
                  </span>
                )}
              </div>

              {/* Page navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {/* First page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        1
                      </button>
                      {currentPage > 4 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                    </>
                  )}

                  {/* Page numbers around current page */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page >= Math.max(1, currentPage - 2) && page <= Math.min(totalPages, currentPage + 2))
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          page === currentPage
                            ? 'bg-pink-500 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  {/* Last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Product Modal */}
      <ProductModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        product={modalState.product}
        mode={modalState.mode}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default AdminProductsV2;
