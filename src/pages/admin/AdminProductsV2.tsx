import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, RefreshCw, Plus, Edit, Trash2, Eye, ShoppingCart, DollarSign, Archive, Calendar, Tag, ArrowUpRight, ArrowDownRight, Activity, FileDown, TrendingUp } from 'lucide-react';
import { adminService, Product } from '../../services/adminService';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminFilter } from './components/AdminFilter';
import { AdminPagination } from './components/AdminPagination';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
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
  const { showConfirm, ConfirmModal } = useAdminConfirm();

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
    const confirmed = await showConfirm({
      title: 'Archive Product',
      message: `Are you sure you want to archive "${product.name}"?\n\nThis will hide the product from both admin panel and public pages. You can restore it later if needed.`,
      type: 'warning',
      confirmText: 'Archive',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-gray-400 mt-1">Manage your products and inventory</p>
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
                  <p className="text-sm text-slate-400 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-white">{loading ? '...' : stats.total}</p>
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
                  <p className="text-sm text-slate-400 mb-1">Active Products</p>
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
                  <p className="text-sm text-slate-400 mb-1">Archived Products</p>
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
                  <p className="text-sm text-slate-400 mb-1">Total Value</p>
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
        <AdminFilter
          searchTerm={filters.search}
          onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
          searchPlaceholder="Search products by name or description..."
          filters={[
            {
              label: 'Status',
              value: filters.status,
              onChange: (value) => setFilters(prev => ({ ...prev, status: value as any })),
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Only' },
                { value: 'archived', label: 'Archived Only' }
              ]
            },
            {
              label: 'Price Range',
              value: filters.priceRange,
              onChange: (value) => setFilters(prev => ({ ...prev, priceRange: value as any })),
              options: [
                { value: 'all', label: 'All Prices' },
                { value: 'under-100k', label: 'Under Rp 100K' },
                { value: '100k-500k', label: 'Rp 100K - 500K' },
                { value: 'above-500k', label: 'Above Rp 500K' }
              ]
            },
            {
              label: 'Category',
              value: filters.category,
              onChange: (value) => setFilters(prev => ({ ...prev, category: value })),
              options: [
                { value: 'all', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]
            },
            {
              label: 'Game Title',
              value: filters.gameTitle,
              onChange: (value) => setFilters(prev => ({ ...prev, gameTitle: value })),
              options: [
                { value: 'all', label: 'All Games' },
                ...gameTitles.map(game => ({ value: game.id, label: game.name }))
              ]
            },
            {
              label: 'Tier',
              value: filters.tier,
              onChange: (value) => setFilters(prev => ({ ...prev, tier: value })),
              options: [
                { value: 'all', label: 'All Tiers' },
                ...tiers.map(tier => ({ value: tier.id, label: tier.name }))
              ]
            }
          ]}
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* Products Table */}
        <div className="admin-table-wrapper">
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

        {/* Pagination */}
        {filteredProducts.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            loading={loading}
          />
        )}

      {/* Product Modal */}
      <ProductModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        product={modalState.product}
        mode={modalState.mode}
        onSuccess={handleModalSuccess}
      />
      
      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
};

export default AdminProductsV2;
