import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, RefreshCw, Plus, Edit, Trash2, Eye, ShoppingCart, DollarSign, Archive, Calendar, Tag, ArrowUpRight, ArrowDownRight, Activity, FileDown, TrendingUp } from 'lucide-react';
import { adminService, Product } from '../../services/adminService';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminFilter } from './components/AdminFilter';
import { AdminPagination } from './components/AdminPagination';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { formatNumberID, parseNumberID } from '../../utils/helpers';
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

  // Inline editing states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [editingStock, setEditingStock] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

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
  
  // Active rental tracking
  const [activeRentals, setActiveRentals] = useState<Map<string, boolean>>(new Map());
  const [expiredRentals, setExpiredRentals] = useState<Map<string, { productName: string; expiredDate: Date }>>(new Map());
  const [shownExpiredNotifications, setShownExpiredNotifications] = useState<Set<string>>(new Set());

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

  // Client-side filtering for additional filters not handled by server
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Status filter (applied client-side for now)
      if (filters.status === 'all' && product.archived_at) return false;
      if (filters.status === 'active' && (!product.is_active || product.archived_at)) return false;
      if (filters.status === 'archived' && !product.archived_at) return false;

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

  // Server-side pagination - totalCount comes from API
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  // Products already paginated from server, just use filtered results
  const currentPageProducts = filteredProducts;

  // Reset to first page when filters change (not pagination-related)
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.status,
    filters.category,
    filters.gameTitle,
    filters.tier,
    filters.priceRange
  ]);

  // Add cache for paginated results to avoid repeated server calls
  const [cachedResults, setCachedResults] = useState<Map<string, { data: Product[], count: number, timestamp: number }>>(new Map());
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for pagination

  // Generate cache key from current filters and pagination
  const getCacheKey = (filters: ProductFilters, page: number, limit: number) => {
    return `${page}-${limit}-${filters.search}-${filters.status}`;
  };

  const loadProducts = async (forceRefresh = false) => {
    // CRITICAL: Don't reload if we're currently updating
    if (isUpdating && !forceRefresh) {
      console.log('🛑 [AdminProductsV2] loadProducts BLOCKED - isUpdating is true');
      return;
    }
    
    console.log('📦 [AdminProductsV2] loadProducts starting...', { forceRefresh, isUpdating, currentPage, itemsPerPage });
    setLoading(true);
    setError('');
    
    try {
      const cacheKey = getCacheKey(filters, currentPage, itemsPerPage);
      const cachedResult = cachedResults.get(cacheKey);
      const now = Date.now();
      
      // Use cache if available and not expired (unless forced refresh)
      if (!forceRefresh && cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
        console.log('📦 [AdminProductsV2] Using cached data, count:', cachedResult.data.length);
        setProducts(cachedResult.data);
        setTotalCount(cachedResult.count);
        setLoading(false);
        return;
      }

      console.log('📦 [AdminProductsV2] Fetching fresh data from server...', { currentPage, itemsPerPage });

      // Build optimized query parameters for server-side pagination
      const searchTerm = filters.search.trim() || undefined;

      // Use server-side pagination with current page and items per page
      const [productsResult, statsResult] = await Promise.all([
        adminService.getProducts(currentPage, itemsPerPage, searchTerm),
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

      console.log('📦 [AdminProductsV2] Setting products from server, count:', productsResult.data.length);
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

  // Load active rentals from orders
  const loadActiveRentals = async () => {
    try {
      if (!supabase) return;
      
      // Get all rental orders that are paid or completed, with product info
      const { data: rentalOrders } = await supabase
        .from('orders')
        .select('product_id, created_at, rental_duration, products(name)')
        .eq('order_type', 'rental')
        .in('status', ['paid', 'completed'])
        .not('product_id', 'is', null);
      
      if (!rentalOrders || rentalOrders.length === 0) {
        setActiveRentals(new Map());
        setExpiredRentals(new Map());
        return;
      }
      
      // Calculate which products are currently being rented and which have expired
      const now = new Date();
      const activeRentalMap = new Map<string, boolean>();
      const expiredRentalMap = new Map<string, { productName: string; expiredDate: Date }>();
      const newExpiredProducts: string[] = [];
      
      for (const order of rentalOrders) {
        if (!order.product_id || !order.rental_duration) continue;
        
        // Parse rental duration (e.g., "3 HARI", "1 MINGGU")
        const duration = order.rental_duration.toLowerCase();
        let daysToAdd = 0;
        
        if (duration.includes('hari')) {
          const match = duration.match(/(\d+)\s*hari/);
          daysToAdd = match ? parseInt(match[1]) : 0;
        } else if (duration.includes('minggu')) {
          const match = duration.match(/(\d+)\s*minggu/);
          daysToAdd = match ? parseInt(match[1]) * 7 : 0;
        } else if (duration.includes('bulan')) {
          const match = duration.match(/(\d+)\s*bulan/);
          daysToAdd = match ? parseInt(match[1]) * 30 : 0;
        }
        
        // Calculate rental end date
        const orderDate = new Date(order.created_at);
        const rentalEndDate = new Date(orderDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        
        // Check if rental is still active or expired
        if (now <= rentalEndDate) {
          activeRentalMap.set(order.product_id, true);
        } else {
          // Rental has expired
          const productName = (order as any).products?.name || 'Unknown Product';
          expiredRentalMap.set(order.product_id, {
            productName,
            expiredDate: rentalEndDate
          });
          
          // Check if we haven't shown notification for this expired rental yet
          if (!shownExpiredNotifications.has(order.product_id)) {
            newExpiredProducts.push(productName);
          }
        }
      }
      
      setActiveRentals(activeRentalMap);
      setExpiredRentals(expiredRentalMap);
      
      // Show notifications for newly expired rentals
      if (newExpiredProducts.length > 0) {
        const expiredCount = newExpiredProducts.length;
        const productList = newExpiredProducts.slice(0, 3).join(', ');
        const more = expiredCount > 3 ? ` dan ${expiredCount - 3} lainnya` : '';
        
        push(
          `⚠️ ${expiredCount} produk masa rental habis: ${productList}${more}. Silakan ubah status ke Active.`,
          'error'
        );
        
        // Mark these as shown
        const newShownSet = new Set(shownExpiredNotifications);
        expiredRentalMap.forEach((_, productId) => newShownSet.add(productId));
        setShownExpiredNotifications(newShownSet);
      }
    } catch (error) {
      console.error('Error loading active rentals:', error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadDropdownData();
    loadActiveRentals(); // Load active rentals on mount
    
    // Set up periodic check for expired rentals (every 5 minutes)
    const intervalId = setInterval(() => {
      loadActiveRentals();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, []); // Load products only once on component mount

  // Reload when search, page, or items per page change (with caching)
  useEffect(() => {
    // Don't reload if we're currently updating a product
    if (isUpdating) {
      console.log('🛑 [AdminProductsV2] Blocking auto-reload during update');
      return;
    }
    
    const timeoutId = setTimeout(() => {
      loadProducts(); // This will use cache if available
    }, 300); // Debounce to avoid too many requests while typing

    return () => clearTimeout(timeoutId);
  }, [filters.search, currentPage, itemsPerPage, isUpdating]); // Reload for search and pagination changes

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
    const newStatus = !product.is_active;
    
    // Optimistic UI update
    const prev = products;
    setProducts(prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
    
    // Show success immediately
    push(`Product ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
    
    try {
      await adminService.updateProductFields(product.id, { 
        is_active: newStatus 
      });
      
      // Clear cache for consistency
      setCachedResults(new Map());
    } catch (error: any) {
      // Rollback on failure
      setProducts(prev);
      push(`Failed to update product status: ${error.message}`, 'error');
    }
  };

  // Inline editing handlers
  const startEditingPrice = (product: Product) => {
    console.log('🖊️ [AdminProductsV2] Starting edit for product:', {
      id: product.id,
      name: product.name,
      currentPrice: product.price,
      currentStock: product.stock
    });
    setEditingProductId(product.id);
    setEditingPrice(product.price ? formatNumberID(product.price) : '0');
    setEditingStock(String(product.stock || 0));
  };

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditingPrice('');
    setEditingStock('');
  };

  // Handle price input with thousand separator
  const handleEditingPriceChange = (value: string) => {
    const numericValue = parseNumberID(value);
    setEditingPrice(numericValue > 0 ? formatNumberID(numericValue) : '');
  };

  const saveInlineEdit = async (productId: string) => {
    // VERSION CHECK - Remove this after confirming new code is running
    const VERSION = 'V2-2026-01-09-FIX';
    console.error('🚀🚀🚀 SAVE INLINE EDIT CALLED - VERSION:', VERSION);
    alert(`SAVE CALLED - Version ${VERSION}\nProduct: ${productId}\nPrice: ${editingPrice}\nStock: ${editingStock}`);
    
    console.log('💾 [AdminProductsV2] saveInlineEdit called:', {
      productId,
      editingPrice,
      editingStock
    });
    
    setIsUpdating(true); // Block any auto-reloads
    
    const priceNum = parseNumberID(editingPrice) || 0;
    const stockNum = parseInt(editingStock) || 0;

    console.log('💾 [AdminProductsV2] Parsed values:', { priceNum, stockNum });

    // Find original product for rollback
    const originalProduct = products.find(p => p.id === productId);
    if (!originalProduct) {
      push('Product not found', 'error');
      setIsUpdating(false);
      return;
    }

    // Optimistic update
    console.log('⚡ [AdminProductsV2] Applying optimistic update...');
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, price: priceNum, stock: stockNum } : p
    ));
    cancelEditing();

    console.log('📡 [AdminProductsV2] Calling adminService.updateProductFields...');
    try {
      const updated = await adminService.updateProductFields(productId, {
        price: priceNum,
        stock: stockNum
      });

      console.log('📡 [AdminProductsV2] API response:', updated);

      if (!updated) {
        // Rollback
        setProducts(prev => prev.map(p => 
          p.id === productId ? originalProduct : p
        ));
        push('❌ Failed to update. Database update was blocked.', 'error');
        setIsUpdating(false);
        return;
      }

      // Update with ONLY price and stock from DB - preserve other fields like tier
      console.log('✅ [AdminProductsV2] Updating state with price/stock only:', { price: updated.price, stock: updated.stock });
      setProducts(prev => prev.map(p => 
        p.id === productId ? { 
          ...p, 
          price: updated.price, 
          stock: updated.stock,
          updated_at: updated.updated_at 
        } : p
      ));
      
      // Update cache instead of clearing it to prevent reload from overwriting
      console.log('💾 [AdminProductsV2] Updating cache...');
      const cacheKey = getCacheKey(filters, currentPage, itemsPerPage);
      const cachedResult = cachedResults.get(cacheKey);
      if (cachedResult) {
        const updatedCache = new Map(cachedResults);
        updatedCache.set(cacheKey, {
          ...cachedResult,
          data: cachedResult.data.map(p => p.id === productId ? { 
            ...p, 
            price: updated.price, 
            stock: updated.stock,
            updated_at: updated.updated_at 
          } : p),
          timestamp: Date.now() // Refresh timestamp
        });
        setCachedResults(updatedCache);
      }
      
      // VERIFY: Query database directly to check actual value
      console.log('🔍 [AdminProductsV2] Verifying database value...');
      setTimeout(async () => {
        try {
          if (!supabase) {
            console.warn('🔍 [AdminProductsV2] Supabase not available for verification');
            return;
          }
          const { data: dbProduct } = await supabase
            .from('products')
            .select('id, price, stock')
            .eq('id', productId)
            .single();
          console.log('🔍 [AdminProductsV2] Database verification:', {
            expected: { price: priceNum, stock: stockNum },
            actual: dbProduct,
            match: dbProduct?.price === priceNum && dbProduct?.stock === stockNum
          });
          if (dbProduct && (dbProduct.price !== priceNum || dbProduct.stock !== stockNum)) {
            console.error('❌ [AdminProductsV2] DATABASE MISMATCH DETECTED!');
            push('⚠️ Warning: Database value differs from expected!', 'error');
          }
        } catch (err) {
          console.error('🔍 [AdminProductsV2] Verification failed:', err);
        }
      }, 500);
      
      push('✅ Product updated successfully', 'success');
      
      // Verify the update persisted in DB (but don't overwrite local state with all fields)
      console.log('🔄 [AdminProductsV2] Verifying DB update...');
      setTimeout(async () => {
        try {
          if (!supabase) return;
          const { data: freshProduct, error } = await supabase
            .from('products')
            .select('id, price, stock')
            .eq('id', productId)
            .single();
          
          if (error) throw error;
          
          console.log('🔄 [AdminProductsV2] Fresh DB values:', freshProduct);
          
          if (freshProduct) {
            // Verify values match - if they do, just update price/stock without touching other fields
            if (freshProduct.price !== priceNum || freshProduct.stock !== stockNum) {
              console.error('❌ [AdminProductsV2] MISMATCH after save!', {
                expected: { price: priceNum, stock: stockNum },
                actual: { price: freshProduct.price, stock: freshProduct.stock }
              });
              push('⚠️ Database shows different values! Update may have been blocked.', 'error');
              // Rollback to original
              setProducts(prev => prev.map(p => 
                p.id === productId ? originalProduct : p
              ));
            } else {
              console.log('✅ [AdminProductsV2] Values verified in database!');
            }
          }
        } catch (err) {
          console.error('🔄 [AdminProductsV2] Verification failed:', err);
        }
      }, 1000);
      
      // Keep blocking reloads for 3 seconds after successful update
      setTimeout(() => {
        console.log('✅ [AdminProductsV2] Allowing auto-reload again');
        setIsUpdating(false);
      }, 3000);
    } catch (error: any) {
      // Rollback on error
      setProducts(prev => prev.map(p => 
        p.id === productId ? originalProduct : p
      ));
      push(`❌ Failed: ${error.message}`, 'error');
      setIsUpdating(false);
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    const confirmed = await showConfirm({
      title: 'Arsipkan Produk',
      message: `Apakah Anda yakin ingin mengarsipkan "${product.name}"?\n\nProduk akan disembunyikan dari panel admin dan halaman publik. Anda bisa mengembalikannya nanti jika diperlukan.`,
      type: 'warning',
      confirmText: 'Arsipkan',
      cancelText: 'Batal'
    });
    
    if (!confirmed) return;
    
    // Optimistic UI: update immediately in local state with archived timestamp
    const prev = products;
    const archivedProduct = { ...product, archived_at: new Date().toISOString(), is_active: false };
    setProducts(prev.map(p => p.id === product.id ? archivedProduct : p));
    
    // Show success immediately for instant feedback
    push(`Product "${product.name}" has been archived successfully`, 'success');
    
    try {
      const ok = await adminService.deleteProduct(product.id);
      if (!ok) throw new Error('Archive failed');
      
      // Clear cache for instant update
      setCachedResults(new Map());
      
      // No need to reload - filter will handle hiding archived products
    } catch (error: any) {
      // Rollback UI on failure
      setProducts(prev);
      push(`Failed to archive product: ${error.message || 'Unknown error'}. Reverting changes.`, 'error');
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

  const handleModalSuccess = (savedProduct?: Product) => {
    // Clear cache
    setCachedResults(new Map());
    
    if (modalState.mode === 'create' && savedProduct) {
      // Add new product to the list instantly
      setProducts(prev => [savedProduct, ...prev]);
      push('Product created and added to list!', 'success');
    } else if (modalState.mode === 'edit' && savedProduct) {
      // Update existing product in the list instantly
      setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
      push('Product updated in list!', 'success');
    } else {
      // Fallback: reload if savedProduct not provided
      loadProducts(true);
    }
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
    // Check if rental has expired (highest priority for admin attention)
    if (expiredRentals.get(product.id)) {
      return 'bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse';
    }
    // Check if product is currently being rented
    if (activeRentals.get(product.id)) {
      return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    }
    if (product.archived_at || !product.is_active) {
      return 'bg-gray-500/20 text-gray-300';
    }
    return 'bg-green-500/20 text-green-300';
  };

  const getStatusText = (product: Product) => {
    // Check if rental has expired
    const expiredInfo = expiredRentals.get(product.id);
    if (expiredInfo) {
      const daysSinceExpired = Math.floor((new Date().getTime() - expiredInfo.expiredDate.getTime()) / (1000 * 60 * 60 * 24));
      return `Rental Expired (${daysSinceExpired}d ago)`;
    }
    // Check if product is currently being rented
    if (activeRentals.get(product.id)) {
      return 'Renting';
    }
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
    <div className="admin-page space-y-8">
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
          const cacheKey = getCacheKey(filters, currentPage, itemsPerPage);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
          
          {/* Expired Rentals Card */}
          <AdminCard hover className={expiredRentals.size > 0 ? 'border-orange-500/50 animate-pulse' : ''}>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Rental Expired</p>
                  <p className={`text-3xl font-bold ${expiredRentals.size > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                    {loading ? '...' : expiredRentals.size}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${expiredRentals.size > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
                  <Calendar className={expiredRentals.size > 0 ? 'text-orange-600' : 'text-slate-500'} size={24} />
                </div>
              </div>
              {expiredRentals.size > 0 && (
                <div className="mt-2 text-xs text-orange-300">
                  ⚠️ Perlu diaktifkan kembali
                </div>
              )}
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
                        {editingProductId === product.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingPrice ? `Rp ${editingPrice}` : ''}
                              onChange={(e) => handleEditingPriceChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(product.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-pink-500 rounded text-white text-sm"
                              placeholder="Rp 0"
                              autoFocus
                            />
                            <input
                              type="number"
                              value={editingStock}
                              onChange={(e) => setEditingStock(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(product.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-pink-500 rounded text-white text-sm"
                              placeholder="Stock"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveInlineEdit(product.id)}
                                className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="space-y-1 cursor-pointer hover:bg-gray-800/50 rounded p-1 transition-colors"
                            onClick={() => startEditingPrice(product)}
                            title="Click to edit price and stock"
                          >
                            <div className="text-lg font-bold text-white whitespace-nowrap">
                              {formatPrice(product.price)}
                            </div>
                            {product.original_price && product.original_price > (product.price || 0) && (
                              <div className="text-sm text-gray-400 line-through whitespace-nowrap">
                                {formatPrice(product.original_price)}
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              Stock: {product.stock || 0}
                            </div>
                            <div className="text-xs text-pink-400 opacity-0 group-hover:opacity-100">
                              Click to edit
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggleStatus(product)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${getStatusColor(product)} hover:opacity-80`}
                            title={`Click to ${product.is_active ? 'deactivate' : 'activate'} product`}
                          >
                            {getStatusText(product)}
                          </button>
                          {/* Quick action for expired rentals */}
                          {expiredRentals.get(product.id) && (
                            <button
                              onClick={async () => {
                                try {
                                  // Mark product as active and remove from expired list
                                  await adminService.updateProductFields(product.id, { is_active: true });
                                  
                                  // Remove from expired rentals map
                                  const newExpiredMap = new Map(expiredRentals);
                                  newExpiredMap.delete(product.id);
                                  setExpiredRentals(newExpiredMap);
                                  
                                  // Update product in list
                                  setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: true } : p));
                                  
                                  push(`Produk "${product.name}" diaktifkan kembali`, 'success');
                                } catch (error: any) {
                                  push(`Gagal mengaktifkan produk: ${error.message}`, 'error');
                                }
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 rounded text-xs font-medium transition-all duration-200"
                              title="Aktifkan produk kembali"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Aktifkan
                            </button>
                          )}
                        </div>
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
        {totalCount > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newLimit) => {
              setItemsPerPage(newLimit);
              setCurrentPage(1); // Reset to first page when changing items per page
            }}
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
