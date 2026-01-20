import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, RefreshCw, Plus, ShoppingCart, MessageCircle, DollarSign } from 'lucide-react';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { useSoldViaWAModal } from './components/ui/SoldViaWAModal';
import { AdminFilter } from './components/AdminFilter';
import { AdminPagination } from './components/AdminPagination';
import { adminService } from '../../services/adminService';
import { formatNumberID, parseNumberID, formatCurrency } from '../../utils/helpers';
import { usePriceInput } from '../../hooks/usePriceInput';
import { useAbortController } from '../../hooks/useAbortController';
import { useKeyboardShortcuts, createListShortcuts } from '../../hooks/useKeyboardShortcuts';
import { formatAnalyticsValue } from '../../utils/adminUtils';
import '../../styles/admin-design-system-v3.css';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
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
  const { showConfirm, ConfirmModal } = useAdminConfirm();
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
      setTotalCount(result.count || 0);
      setTotalPages(result.totalPages || 1);
      setStats(statsResult);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      push(`Failed to load: ${err.message}`, 'error');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, debouncedSearch, mapProduct, push, getSignal]);

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    shortcuts: createListShortcuts({
      onCreate: () => setModalState({ isOpen: true, mode: 'create', product: null }),
      onRefresh: loadProducts,
      onSearch: () => searchInputRef.current?.focus()
    })
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
        push(`Gagal menyimpan: ${result.error || 'Unknown error'}`, 'error');
        return;
      }

      // Update price in local state - PRESERVE tier_name!
      setProducts(prev => prev.map(p => 
        p.id === editingId 
          ? { 
              ...p, // Keep ALL existing fields including tier_name
              price: newPrice
            }
          : p
      ));

      push('Perubahan berhasil disimpan!', 'success');
      cancelEditing();

    } catch (err: any) {
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
    if (product.sold_channel === 'wa') return 'bg-purple-500/20 text-purple-300';
    if (product.sold_channel === 'web') return 'bg-blue-500/20 text-blue-300';
    if (!product.is_active) return 'bg-gray-500/20 text-gray-400';
    return 'bg-green-500/20 text-green-300';
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
    push(modalState.mode === 'create' ? 'Produk berhasil dibuat!' : 'Produk berhasil diperbarui!', 'success');
  };

  // Analytics cards config - memoized to prevent unnecessary re-renders
  const analyticsCards = useMemo(() => [
    {
      label: 'Total Produk',
      value: stats.total,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      format: 'number'
    },
    {
      label: 'Terjual via Web',
      value: stats.soldViaWeb,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      format: 'number'
    },
    {
      label: 'Terjual via WA',
      value: stats.soldViaWA,
      icon: MessageCircle,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      format: 'number'
    },
    {
      label: 'Total Nilai Produk',
      value: stats.totalValue,
      icon: DollarSign,
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-500/10',
      format: 'currency'
    }
  ], [stats]);

  return (
    <div className="admin-page space-y-8">
      <ConfirmModal />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Manajemen Produk
          </h1>
          <p className="text-gray-400 mt-1">
            {stats.active} produk aktif • {stats.soldViaWeb + stats.soldViaWA} terjual
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton variant="secondary" onClick={loadProducts} disabled={loading} icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}>
            Refresh
          </AdminButton>
          <AdminButton variant="primary" onClick={handleCreateProduct} icon={<Plus size={18} />}>
            Add Product
          </AdminButton>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {analyticsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className={`${card.bgColor} rounded-xl p-4 border border-gray-800 transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-bold text-white">
                    {loading ? (
                      <span className="inline-block w-16 h-6 bg-gray-700 rounded animate-pulse" />
                    ) : card.format === 'currency' ? (
                      formatCurrency(card.value)
                    ) : (
                      formatAnalyticsValue(card.value)
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search - Using shared AdminFilter */}
      <AdminFilter
        ref={searchInputRef}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search products..."
        loading={loading}
      />

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <AdminLoadingState variant="skeleton-table" rows={5} columns={5} />
              ) : products.length === 0 ? (
                <AdminEmptyState 
                  icon={<Package className="w-16 h-16" />}
                  title={debouncedSearch ? "No Products Found" : "No Products Yet"}
                  description={debouncedSearch ? undefined : "No products have been created yet."}
                  hasFilters={!!debouncedSearch}
                  variant="table-row"
                  colSpan={5}
                  action={!debouncedSearch ? {
                    label: "Add Product",
                    onClick: handleCreateProduct,
                    icon: <Plus size={18} />
                  } : undefined}
                />
              ) : (
                products.map(product => {
                  const term = debouncedSearch.toLowerCase();
                  const isMatch = !!debouncedSearch && (
                    product.name?.toLowerCase().includes(term) ||
                    product.description?.toLowerCase().includes(term)
                  );

                  return (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-800/30 transition-all duration-300 ${
                      saving && editingId === product.id 
                        ? 'bg-pink-500/10 animate-pulse' 
                        : ''
                    }`}
                    style={{
                      background: isMatch ? 'rgba(236, 72, 153, 0.08)' : undefined
                    }}
                  >
                    {/* Product Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{product.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {product.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tier - Display tier_name which is preserved */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">
                        {product.tier_name || 'No tier'}
                      </span>
                    </td>

                    {/* Price - INLINE EDITABLE */}
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
                              // Only cancel if save wasn't triggered by Enter key
                              if (!saving && !saveTriggeredRef.current) {
                                cancelEditing();
                              }
                            }}
                            className={`w-32 px-2 py-1 bg-gray-700 border rounded text-white text-sm transition-all ${
                              saving 
                                ? 'border-pink-400 opacity-50 cursor-not-allowed' 
                                : 'border-pink-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400'
                            }`}
                            placeholder="Rp 0"
                            autoFocus
                            disabled={saving}
                          />
                          {saving && (
                            <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 animate-spin" />
                          )}
                          <div className="text-xs text-gray-500 mt-1">Enter to save, Esc to cancel</div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-700/50 rounded p-1 transition-colors"
                          onClick={() => startEditing(product)}
                          title="Click to edit price"
                        >
                          <div className="font-bold text-white">
                            {formatCurrency(product.price ?? 0)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(product)}`}
                      >
                        {getStatusLabel(product)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                          Lihat
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        >
                          Edit
                        </button>
                        {/* Disable "Terjual via WA" button if product is already sold */}
                        <button
                          onClick={() => markSoldViaWA(product)}
                          disabled={!!product.sold_channel || !product.is_active}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            product.sold_channel || !product.is_active
                              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                          }`}
                          title={
                            product.sold_channel === 'web' 
                              ? 'Produk sudah terjual via Web' 
                              : product.sold_channel === 'wa'
                                ? 'Produk sudah terjual via WA'
                                : !product.is_active
                                  ? 'Produk tidak aktif'
                                  : 'Tandai sebagai terjual via WhatsApp'
                          }
                        >
                          {product.sold_channel === 'web' 
                            ? 'Terjual Web' 
                            : product.sold_channel === 'wa' 
                              ? 'Terjual WA'
                              : 'Terjual via WA'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
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
