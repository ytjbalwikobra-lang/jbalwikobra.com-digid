import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, RefreshCw, Plus, ShoppingCart, MessageCircle, DollarSign, Eye, Edit2, CheckCircle, Search, List, Grid3x3 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { useSoldViaWAModal } from './components/ui/SoldViaWAModal';
import { adminService } from '../../services/adminService';
import { adminCache } from '../../services/adminCache';
import { formatCurrency } from '../../utils/helpers';
import { usePriceInput } from '../../hooks/usePriceInput';
import { useAbortController } from '../../hooks/useAbortController';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminBentoCard } from './components/ui/AdminBentoCard';
import { AdminPagination } from './components/AdminPagination';
// Design system: cyber-compact.css (loaded via index.css)

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  stock: number;
  is_active: boolean;
  image?: string;
  images?: string[];
  tier_id?: string;
  category_id?: string;
  game_title_id?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
  has_rental?: boolean;
  sold_channel?: 'web' | 'wa' | null;
  tiers?: { name?: string | null } | null;
  game_titles?: { name?: string | null } | null;
  categoryData?: { name?: string | null } | null;
  tier_name?: string;
  category_name?: string;
  game_title_name?: string;
}

const AdminProductsDirect: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Pagination enabled
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default to list view
  
  // Analytics stats
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    soldViaWeb: number;
    soldViaWA: number;
    totalValue: number;
    activeValue: number;
  }>({ total: 0, active: 0, soldViaWeb: 0, soldViaWA: 0, totalValue: 0, activeValue: 0 });
  
  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const priceInput = usePriceInput(0);
  const [saving, setSaving] = useState(false);
  const saveTriggeredRef = useRef(false);
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
  const { showSoldViaWAModal, SoldViaWAModalComponent } = useSoldViaWAModal();
  const { getSignal } = useAbortController(); // Request deduplication
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search to reduce requests
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const mapProduct = useCallback((row: any): Product => {
    return {
      ...row,
      category_id: row.categoryId || row.category_id || null,
      tier_name: row.tiers?.name || null,
      category_name: row.categoryData?.name || null,
      game_title_name: row.game_titles?.name || null,
      sold_channel: row.sold_channel || null
    };
  }, []);

  // LOAD PRODUCTS - PAGINATED VIA ADMIN SERVICE
  const loadProducts = useCallback(async () => {
    const signal = getSignal(); // Cancel previous requests (TODO: Pass signal to adminService)
    setLoading(true);
    setError(null);

    try {
      // Fetch products and stats in parallel for efficiency
      const [result, statsResult] = await Promise.all([
        adminService.getProducts(currentPage, itemsPerPage, debouncedSearch),
        adminService.getProductStats()
      ]);
      
      // Check if request was aborted
      if (signal.aborted) return;
      
      const mapped = (result.data || []).map(mapProduct);

      setProducts(mapped);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.count || 0);
      setStats(statsResult);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      const message = err?.message || 'Failed to load products';
      setError(message);
      push(message, 'error');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, debouncedSearch, mapProduct, push, getSignal]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset page to 1 when search or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  // START EDITING - store raw numeric value but will display formatted
  const startEditing = (product: Product) => {
    setEditingId(product.id);
    priceInput.setValue(product.price || 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    priceInput.reset();
    saveTriggeredRef.current = false;
  };

  // SAVE EDIT - USE API ENDPOINT (has service role to bypass RLS)
  const saveEdit = async () => {
    if (!editingId || saving) return;

    const newPrice = priceInput.value;
    const originalProduct = products.find(p => p.id === editingId);

    if (!originalProduct) {
      push('Product not found', 'error');
      return;
    }

    if (newPrice < 0) {
      push('Harga harus positif', 'error');
      return;
    }

    // Check if values actually changed
    const priceChanged = originalProduct.price !== newPrice;

    if (!priceChanged) {
      cancelEditing();
      return;
    }

    // Set saving first to prevent blur from canceling
    setSaving(true);

    // OPTIMISTIC UPDATE: Update UI immediately for instant feel
    const previousPrice = products.find(p => p.id === editingId)?.price;
    setProducts(prev => prev.map(p => 
      p.id === editingId ? { ...p, price: newPrice } : p
    ));
    cancelEditing(); // Exit edit mode instantly

    try {
      // Use API endpoint which has service role (bypasses RLS)
      const sessionToken = localStorage.getItem('session_token') || '';
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'updateProduct',
          id: editingId,
          fields: {
            price: newPrice,
            updated_at: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // ROLLBACK on error
        setProducts(prev => prev.map(p => 
          p.id === editingId ? { ...p, price: previousPrice || p.price } : p
        ));
        push(`Gagal menyimpan: ${result.error || 'Unknown error'}`, 'error');
        return;
      }

      // Invalidate product cache to ensure fresh data on next load
      adminCache.invalidatePattern('admin:products');

      push('Perubahan berhasil disimpan!', 'success');

    } catch (err: any) {
      // ROLLBACK on error
      setProducts(prev => prev.map(p => 
        p.id === editingId ? { ...p, price: previousPrice || p.price } : p
      ));
      push(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [markingSoldId, setMarkingSoldId] = useState<string | null>(null);

  const markSoldViaWA = async (product: Product) => {
    if (markingSoldId) return; // Prevent multiple clicks
    
    // Guard: Prevent marking if already sold or inactive
    if (product.sold_channel) {
      push(`Produk sudah terjual via ${product.sold_channel === 'web' ? 'Web' : 'WA'}`, 'info');
      return;
    }
    if (!product.is_active) {
      push('Produk tidak aktif', 'info');
      return;
    }

    // Show modal with price input
    const result = await showSoldViaWAModal(product);
    
    if (!result) return; // User cancelled

    const { soldPrice } = result;

    setMarkingSoldId(product.id);
    try {
      const sessionToken = localStorage.getItem('session_token') || '';
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'updateProduct',
          id: product.id,
          fields: {
            sold_channel: 'wa',
            is_active: false,
            price: soldPrice, // Use the confirmed price from modal
            updated_at: new Date().toISOString()
          }
        })
      });

      const resultData = await response.json();
      if (!response.ok || !resultData.success) {
        throw new Error(resultData.error || 'update_failed');
      }

      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, sold_channel: 'wa', is_active: false, price: soldPrice } : p
      ));
      push('Produk ditandai terjual via WA', 'success');
    } catch (err: any) {
      push(`Gagal: ${err.message}`, 'error');
    } finally {
      setMarkingSoldId(null);
    }
  };

  const getStatusLabel = (product: Product) => {
    if (product.sold_channel === 'wa') return 'Terjual via WA';
    if (product.sold_channel === 'web') return 'Terjual via Web';
    if (!product.is_active) return 'Tidak Aktif';
    return 'Aktif';
  };

  const getStatusStyle = (product: Product) => {
    if (product.sold_channel === 'wa') return 'bg-[var(--admin-purple)]/20 text-[var(--admin-purple)]';
    if (product.sold_channel === 'web') return 'bg-[var(--admin-info)]/20 text-[var(--admin-info)]';
    if (!product.is_active) return 'bg-[var(--admin-bg-elevated)]/20 text-[var(--admin-text-muted)]';
    return 'bg-[var(--admin-success)]/20 text-[var(--admin-success)]';
  };

  // Modal handlers
  const handleCreateProduct = () => {
    setModalState({ isOpen: true, mode: 'create', product: null });
  };

  const handleEditProduct = (product: Product) => {
    setModalState({ isOpen: true, mode: 'edit', product });
  };

  const handleViewProduct = (product: Product) => {
    setModalState({ isOpen: true, mode: 'view', product });
  };

  const handleModalSuccess = async () => {
    await loadProducts();
    setModalState({ isOpen: false, mode: 'create', product: null });
    // Note: Toast is already shown by ProductModal, no need to show duplicate
  };

  // Analytics cards config - memoized to prevent unnecessary re-renders
  return (
    <div className="space-y-4">
      
      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="Manajemen Produk"
        badge={`${stats.active} Aktif • ${stats.soldViaWeb + stats.soldViaWA} Terjual`}
        badgeColor="success"
      >
        {/* Search, View Toggle, and Actions Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mt-4">
          {/* Inline Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-xs text-white placeholder-white/40 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-all touch-manipulation ${
                viewMode === 'list'
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <List size={14} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-all touch-manipulation ${
                viewMode === 'grid'
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Grid3x3 size={14} />
              <span>Grid</span>
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton 
              variant="secondary" 
              onClick={loadProducts} 
              disabled={loading}
              size="sm"
              icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={14} />}
            >
              Refresh
            </AdminButton>
            <AdminButton 
              variant="primary" 
              onClick={handleCreateProduct}
              size="sm"
              icon={<Plus size={14} />}
            >
              Tambah Produk
            </AdminButton>
          </div>
        </div>
      </AdminHeroSection>

      {/* Error Banner */}
      {error && (
        <AdminErrorState
          variant="banner"
          title="Error Loading Products"
          message={error}
          onRetry={loadProducts}
          retryLabel="Try Again"
        />
      )}

      {/* Compact Metrics - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminBentoCard>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Total Produk</p>
              <p className="text-lg font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </AdminBentoCard>

        <AdminBentoCard>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={16} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Terjual via Web</p>
              <p className="text-lg font-bold text-white">{stats.soldViaWeb}</p>
            </div>
          </div>
        </AdminBentoCard>

        <AdminBentoCard>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={16} className="text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Terjual via WA</p>
              <p className="text-lg font-bold text-white">{stats.soldViaWA}</p>
            </div>
          </div>
        </AdminBentoCard>

        <AdminBentoCard>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign size={16} className="text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Total Nilai</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </AdminBentoCard>
      </div>

      {/* Products View - List or Grid */}
      {loading ? (
        <AdminLoadingState variant={viewMode === 'grid' ? "skeleton-cards" : "skeleton-table"} columns={viewMode === 'grid' ? 4 : 5} rows={5} />
      ) : products.length === 0 ? (
        <AdminEmptyState 
          icon={<Package className="w-16 h-16" />}
          title={debouncedSearch ? "Produk Tidak Ditemukan" : "Belum Ada Produk"}
          description={debouncedSearch ? "Coba kata kunci lain" : "Belum ada produk yang dibuat."}
          hasFilters={!!debouncedSearch}
          variant="centered"
          action={!debouncedSearch ? {
            label: "Tambah Produk",
            onClick: handleCreateProduct,
            icon: <Plus size={18} />
          } : undefined}
        />
      ) : viewMode === 'list' ? (
        /* LIST VIEW - Compact table-style layout */
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-white/60 uppercase tracking-wide">Produk</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-white/60 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-white/60 uppercase tracking-wide">Harga</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-white/60 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-white/60 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const term = debouncedSearch.toLowerCase();
                  const isMatch = !!debouncedSearch && (
                    product.name?.toLowerCase().includes(term) ||
                    product.description?.toLowerCase().includes(term)
                  );

                  return (
                    <tr 
                      key={product.id}
                      className={`border-b border-white/5 transition-all duration-300 hover:bg-white/5 ${
                        isMatch ? 'bg-pink-500/10' : ''
                      } ${
                        saving && editingId === product.id ? 'animate-pulse' : ''
                      }`}
                    >
                      {/* Product Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-white/20" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                            <p className="text-[10px] text-white/40 truncate max-w-[200px]">{product.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/60">{product.tier_name || 'No tier'}</span>
                      </td>

                      {/* Price - Inline Editable */}
                      <td className="px-4 py-3">
                        {editingId === product.id ? (
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={priceInput.formatted ? `Rp ${priceInput.formatted}` : ''}
                              onChange={(e) => priceInput.handleChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveEdit();
                                }
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              onBlur={() => {
                                if (!saving && !saveTriggeredRef.current) {
                                  cancelEditing();
                                }
                              }}
                              className={`w-32 px-3 py-2 bg-white/5 border rounded-lg text-white text-base sm:text-sm ${
                                saving 
                                  ? 'border-pink-500 opacity-50 cursor-not-allowed' 
                                  : 'border-pink-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                              }`}
                              placeholder="Rp 0"
                              autoFocus
                              disabled={saving}
                            />
                            {saving && (
                              <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-pink-400 animate-spin" />
                            )}
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-colors inline-block"
                            onClick={() => startEditing(product)}
                            title="Klik untuk edit harga"
                          >
                            <p className="text-sm font-bold text-pink-400">{formatCurrency(product.price ?? 0)}</p>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${getStatusStyle(product)}`}>
                          {getStatusLabel(product)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white/70 hover:bg-white/10 active:bg-white/15 active:scale-95 transition-colors touch-manipulation"
                          >
                            <Eye size={14} className="sm:w-3 sm:h-3" />
                            <span>Lihat</span>
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 active:bg-pink-500/40 active:scale-95 transition-colors touch-manipulation"
                          >
                            <Edit2 size={14} className="sm:w-3 sm:h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => markSoldViaWA(product)}
                            disabled={!!product.sold_channel || !product.is_active}
                            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors touch-manipulation active:scale-95 ${
                              product.sold_channel || !product.is_active
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30'
                            }`}
                            title={
                              product.sold_channel === 'web'
                                ? 'Sudah terjual via Web'
                                : product.sold_channel === 'wa'
                                  ? 'Sudah terjual via WA'
                                  : !product.is_active
                                    ? 'Produk tidak aktif'
                                    : 'Tandai terjual via WhatsApp'
                            }
                          >
                            <CheckCircle size={12} />
                            <span>WA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW - Responsive bento grid with 4:5 aspect ratio images */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map(product => {
            const term = debouncedSearch.toLowerCase();
            const isMatch = !!debouncedSearch && (
              product.name?.toLowerCase().includes(term) ||
              product.description?.toLowerCase().includes(term)
            );

            return (
              <AdminBentoCard
                key={product.id}
                className={isMatch ? 'ring-2 ring-pink-500/50' : ''}
              >
                {/* Product Image - 4:5 aspect ratio */}
                <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-white/5">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} className="text-white/20" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${getStatusStyle(product)}`}>
                      {getStatusLabel(product)}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                    <p className="text-[10px] text-white/40 truncate">
                      {product.tier_name || 'No tier'} • {product.description || 'No description'}
                    </p>
                  </div>

                  {/* Price - Inline Editable */}
                  {editingId === product.id ? (
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceInput.formatted ? `Rp ${priceInput.formatted}` : ''}
                        onChange={(e) => priceInput.handleChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit();
                          }
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        onBlur={() => {
                          if (!saving && !saveTriggeredRef.current) {
                            cancelEditing();
                          }
                        }}
                        className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white text-base sm:text-sm ${
                          saving 
                            ? 'border-pink-500 opacity-50 cursor-not-allowed' 
                            : 'border-pink-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                        }`}
                        placeholder="Rp 0"
                        autoFocus
                        disabled={saving}
                      />
                      {saving && (
                        <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-pink-400 animate-spin" />
                      )}
                      <p className="text-[9px] text-white/40 mt-0.5">Enter = simpan, Esc = batal</p>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-white/5 rounded p-1 transition-colors"
                      onClick={() => startEditing(product)}
                      title="Klik untuk edit harga"
                    >
                      <p className="text-lg font-bold text-pink-400">
                        {formatCurrency(product.price ?? 0)}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => handleViewProduct(product)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white/70 hover:bg-white/10 active:bg-white/15 active:scale-95 transition-colors touch-manipulation"
                    >
                      <Eye size={12} />
                      <span>Lihat</span>
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 active:bg-pink-500/40 active:scale-95 transition-colors touch-manipulation"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => markSoldViaWA(product)}
                      disabled={!!product.sold_channel || !product.is_active}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors touch-manipulation active:scale-95 ${
                        product.sold_channel || !product.is_active
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30'
                      }`}
                      title={
                        product.sold_channel === 'web'
                          ? 'Sudah terjual via Web'
                          : product.sold_channel === 'wa'
                            ? 'Sudah terjual via WA'
                            : !product.is_active
                              ? 'Produk tidak aktif'
                              : 'Tandai terjual via WhatsApp'
                      }
                    >
                      <CheckCircle size={12} />
                      <span>
                        {product.sold_channel === 'web'
                          ? 'Web'
                          : product.sold_channel === 'wa'
                            ? 'WA'
                            : 'WA'}
                      </span>
                    </button>
                  </div>
                </div>
              </AdminBentoCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && totalPages > 1 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          loading={loading}
        />
      )}

      {/* Modal */}
      {modalState.isOpen && (
        <ProductModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, mode: 'create', product: null })}
          onSuccess={handleModalSuccess}
          mode={modalState.mode}
          product={modalState.product as any}
        />
      )}

      {/* Sold Via WA Modal */}
      <SoldViaWAModalComponent />
    </div>
  );
};

export default AdminProductsDirect;
