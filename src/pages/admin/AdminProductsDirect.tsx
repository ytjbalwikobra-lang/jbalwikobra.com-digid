import React, { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Plus, Edit, Archive, Eye } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminFilter } from './components/AdminFilter';
import { formatNumberID, parseNumberID, formatCurrency } from '../../utils/helpers';
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
  tier_name?: string;
  category_name?: string;
  game_title_name?: string;
}

// Use formatCurrency from utils/helpers (aliased as formatPrice for backward compatibility)
const formatPrice = (price: number | null | undefined): string => {
  return formatCurrency(price ?? 0);
};

const AdminProductsDirect: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);

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

  // LOAD PRODUCTS - DIRECT FROM DATABASE
  const loadProducts = useCallback(async () => {
    if (!supabase) {
      push('Database not available', 'error');
      return;
    }

    setLoading(true);
    console.log('🔄 [DIRECT] Loading products from database...');

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, original_price, stock, is_active, 
          image, images, tier_id, category_id, game_title_id,
          created_at, updated_at, archived_at, has_rental,
          tiers(id, name),
          game_titles(id, name)
        `)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch categories separately to avoid ambiguous relationship
      const categoryIds = [...new Set((data || []).filter(p => p.category_id).map(p => p.category_id))];
      let categoriesMap = new Map();
      
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);
        
        if (categories) {
          categories.forEach((cat: any) => categoriesMap.set(cat.id, cat.name));
        }
      }

      const mapped = (data || []).map((row: any) => ({
        ...row,
        tier_name: row.tiers?.name || null,
        category_name: categoriesMap.get(row.category_id) || null,
        game_title_name: row.game_titles?.name || null,
      }));

      console.log('✅ [DIRECT] Loaded', mapped.length, 'products');
      setProducts(mapped);
    } catch (err: any) {
      console.error('❌ [DIRECT] Load error:', err);
      push(`Failed to load: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || 
           p.description?.toLowerCase().includes(term);
  });

  // START EDITING - store raw numeric value but will display formatted
  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price ? formatNumberID(product.price) : '0');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPrice('');
  };

  // Handle price input with thousand separator
  const handleEditPriceChange = (value: string) => {
    // Parse the input to get numeric value, then format it back
    const numericValue = parseNumberID(value);
    setEditPrice(numericValue > 0 ? formatNumberID(numericValue) : '');
  };

  // SAVE EDIT - USE API ENDPOINT (has service role to bypass RLS)
  const saveEdit = async () => {
    if (!editingId || saving) return;

    const newPrice = parseNumberID(editPrice) || 0;
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

      // Verify by reading back from DB
      if (supabase) {
        const { data: verifyData } = await supabase
          .from('products')
          .select('id, price')
          .eq('id', editingId)
          .single();

        if (verifyData && verifyData.price !== newPrice) {
          push('Database tidak cocok! Perubahan mungkin diblokir.', 'error');
          return;
        }
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

  // Toggle active status
  const toggleActive = async (product: Product) => {
    if (!supabase) return;

    const newStatus = !product.is_active;
    const action = newStatus ? 'mengaktifkan' : 'menonaktifkan';

    const confirmed = await showConfirm({
      title: `Konfirmasi ${newStatus ? 'Aktifkan' : 'Nonaktifkan'}`,
      message: `Anda akan ${action} produk "${product.name}".\n\nLanjutkan?`,
      type: 'info',
      confirmText: newStatus ? 'Aktifkan' : 'Nonaktifkan',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_active: newStatus } : p
      ));

      push(newStatus ? 'Produk diaktifkan' : 'Produk dinonaktifkan', 'success');
    } catch (err: any) {
      push(`Gagal: ${err.message}`, 'error');
    }
  };

  // Archive product
  const archiveProduct = async (product: Product) => {
    const confirmed = await showConfirm({
      title: 'Arsipkan Produk',
      message: `Anda akan mengarsipkan produk "${product.name}".\n\nProduk yang diarsipkan tidak akan ditampilkan di katalog.\n\nLanjutkan?`,
      type: 'warning',
      confirmText: 'Arsipkan',
      cancelText: 'Batal'
    });

    if (!confirmed || !supabase) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          archived_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== product.id));
      push('Produk berhasil diarsipkan', 'success');
    } catch (err: any) {
      push(`Gagal: ${err.message}`, 'error');
    }
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
            {filteredProducts.length} produk tersedia
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

      {/* Search - Using shared AdminFilter */}
      <AdminFilter
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
              ) : filteredProducts.length === 0 ? (
                <AdminEmptyState 
                  icon={<Package className="w-16 h-16" />}
                  title="No Products Found"
                  description={searchTerm ? undefined : "No products have been created yet."}
                  hasFilters={!!searchTerm}
                  variant="table-row"
                  colSpan={5}
                  action={!searchTerm ? {
                    label: "Add Product",
                    onClick: handleCreateProduct,
                    icon: <Plus size={18} />
                  } : undefined}
                />
              ) : (
                filteredProducts.map(product => (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-800/30 transition-all duration-300 ${
                      saving && editingId === product.id 
                        ? 'bg-pink-500/10 animate-pulse' 
                        : ''
                    }`}
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
                            value={editPrice ? `Rp ${editPrice}` : ''}
                            onChange={(e) => handleEditPriceChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit();
                              }
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            onBlur={() => {
                              // Small delay to allow Enter key to process first
                              if (!saving) {
                                setTimeout(() => cancelEditing(), 100);
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
                            {formatPrice(product.price)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => archiveProduct(product)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                          title="Archive"
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
    </div>
  );
};

export default AdminProductsDirect;
