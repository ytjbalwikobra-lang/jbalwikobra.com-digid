import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, RefreshCw, Plus, Edit, Trash2, Eye, Archive, Check, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/Toast';
import ProductModal from './components/ProductModal';
import { AdminButton } from './components/ui/AdminButton';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
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
  // Joined data
  tier_name?: string;
  category_name?: string;
  game_title_name?: string;
}

const formatPrice = (price: number | null | undefined): string => {
  if (price == null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const AdminProductsSimple: React.FC = () => {
  // Core state - MINIMAL
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline editing - SIMPLE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
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

  // ============================================
  // LOAD PRODUCTS - DIRECT FROM DATABASE, NO CACHE
  // ============================================
  const loadProducts = useCallback(async () => {
    if (!supabase) {
      push('Database not available', 'error');
      return;
    }

    setLoading(true);
    console.log('🔄 Loading products directly from database...');

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, original_price, stock, is_active, 
          image, images, tier_id, category_id, game_title_id,
          created_at, updated_at, archived_at, has_rental,
          tiers(name),
          categories(name),
          game_titles(name)
        `)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the joined data
      const mapped = (data || []).map((row: any) => ({
        ...row,
        tier_name: row.tiers?.name || null,
        category_name: row.categories?.name || null,
        game_title_name: row.game_titles?.name || null,
      }));

      console.log('✅ Loaded', mapped.length, 'products');
      setProducts(mapped);
    } catch (err: any) {
      console.error('❌ Load error:', err);
      push(`Failed to load: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  // Load on mount - ONLY ONCE
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filter products by search
  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || 
           p.description?.toLowerCase().includes(term);
  });

  // ============================================
  // INLINE EDITING - SIMPLE AND DIRECT
  // ============================================
  const startEditing = (product: Product) => {
    console.log('✏️ Start editing:', product.id, product.name);
    setEditingId(product.id);
    setEditPrice(String(product.price || 0));
    setEditStock(String(product.stock || 0));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPrice('');
    setEditStock('');
  };

  const saveEdit = async () => {
    if (!editingId || !supabase) return;

    const newPrice = parseFloat(editPrice) || 0;
    const newStock = parseInt(editStock) || 0;

    if (newPrice < 0 || newStock < 0) {
      push('Price and stock must be positive', 'error');
      return;
    }

    setSaving(true);
    console.log('💾 Saving:', { id: editingId, price: newPrice, stock: newStock });

    try {
      // STEP 1: Update in database
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          price: newPrice, 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      // STEP 2: Verify by reading back
      const { data: verifyData, error: verifyError } = await supabase
        .from('products')
        .select('id, price, stock')
        .eq('id', editingId)
        .single();

      if (verifyError) {
        console.error('❌ Verify error:', verifyError);
        throw verifyError;
      }

      console.log('🔍 Verification:', verifyData);

      if (verifyData.price !== newPrice || verifyData.stock !== newStock) {
        console.error('❌ MISMATCH!', {
          expected: { price: newPrice, stock: newStock },
          actual: { price: verifyData.price, stock: verifyData.stock }
        });
        push('Update blocked by database! Check RLS policies.', 'error');
        return;
      }

      // STEP 3: Update local state
      setProducts(prev => prev.map(p => 
        p.id === editingId 
          ? { ...p, price: newPrice, stock: newStock }
          : p
      ));

      push('✅ Updated successfully!', 'success');
      cancelEditing();

    } catch (err: any) {
      console.error('❌ Save error:', err);
      push(`Failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // TOGGLE ACTIVE STATUS
  // ============================================
  const toggleActive = async (product: Product) => {
    if (!supabase) return;

    const newStatus = !product.is_active;
    console.log('🔄 Toggle active:', product.id, newStatus);

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_active: newStatus } : p
      ));

      push(newStatus ? 'Product activated' : 'Product deactivated', 'success');
    } catch (err: any) {
      push(`Failed: ${err.message}`, 'error');
    }
  };

  // ============================================
  // ARCHIVE PRODUCT
  // ============================================
  const archiveProduct = async (product: Product) => {
    const confirmed = await showConfirm({
      title: 'Archive Product',
      message: `Archive "${product.name}"? It will be hidden from admin and public.`,
      type: 'warning',
      confirmText: 'Archive',
      cancelText: 'Cancel'
    });

    if (!confirmed || !supabase) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          archived_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== product.id));
      push('Product archived', 'success');
    } catch (err: any) {
      push(`Failed: ${err.message}`, 'error');
    }
  };

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const handleCreateProduct = () => {
    setModalState({ isOpen: true, mode: 'create', product: null });
  };

  const handleEditProduct = (product: Product) => {
    setModalState({ isOpen: true, mode: 'edit', product });
  };

  const handleViewProduct = (product: Product) => {
    setModalState({ isOpen: true, mode: 'view', product });
  };

  const handleModalSuccess = async (savedProduct?: any) => {
    // Reload all products to get fresh data
    await loadProducts();
    setModalState({ isOpen: false, mode: 'create', product: null });
    push(modalState.mode === 'create' ? 'Product created!' : 'Product updated!', 'success');
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="p-6 space-y-6">
      <ConfirmModal />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-pink-400" />
            Products Management
          </h1>
          <p className="text-gray-400 mt-1">
            {filteredProducts.length} products • Click on price to edit inline
          </p>
        </div>
        <div className="flex gap-2">
          <AdminButton
            variant="secondary"
            onClick={loadProducts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleCreateProduct}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </AdminButton>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Price / Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-800/30">
                    {/* Product Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
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

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">
                        {product.tier_name || 'No tier'}
                      </span>
                    </td>

                    {/* Price / Stock - INLINE EDITABLE */}
                    <td className="px-4 py-3">
                      {editingId === product.id ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="w-28 px-2 py-1 bg-gray-700 border border-pink-500 rounded text-white text-sm"
                            placeholder="Price"
                            autoFocus
                            disabled={saving}
                          />
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="w-28 px-2 py-1 bg-gray-700 border border-pink-500 rounded text-white text-sm"
                            placeholder="Stock"
                            disabled={saving}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="p-1 bg-green-600 hover:bg-green-700 rounded text-white disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="p-1 bg-gray-600 hover:bg-gray-700 rounded text-white disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-700/50 rounded p-1 transition-colors"
                          onClick={() => startEditing(product)}
                          title="Click to edit"
                        >
                          <div className="font-bold text-white">
                            {formatPrice(product.price)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Stock: {product.stock || 0}
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

export default AdminProductsSimple;
