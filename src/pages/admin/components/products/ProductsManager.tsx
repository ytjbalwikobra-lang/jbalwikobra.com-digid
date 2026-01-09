import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { adminService, Product } from '../../../../services/adminService';
import { ProductService } from '../../../../services/productService';
import { useCategories } from '../../../../hooks/useCategories';
import { Search, Filter, Plus, Package, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../../../components/Toast';
const cn = (...c: any[]) => c.filter(Boolean).join(' ');
// Use the newer ProductFilters if needed; legacy ProductsFilters retained but not re-exported
// import { ProductFilters } from './ProductFilters';
// Removed card/list/grid UI in favor of unified table view
import { ProductTable } from './ProductTable';
import { t } from '../../../../i18n/strings';

interface ProductsManagerProps {
  className?: string;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  className = ''
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProductsState, setFilteredProductsState] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(deferredSearch), 250);
    return () => clearTimeout(id);
  }, [deferredSearch]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState(''); // holds category_id

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const { categories } = useCategories();

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getProducts(1, 100); // Get more products for local filtering
      setProducts(response.data);
  setFilteredProductsState(response.data);
  // categories handled by hook
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Apply search filter
  if (debouncedSearch) {
      filtered = filtered.filter(product =>
    product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    product.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
  (product as any).categoryData?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => 
        statusFilter === 'active' ? product.is_active : !product.is_active
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(product => (product as any).category_id === categoryFilter);
    }

    // Always sort by created_at desc (newest first) - no sorting controls
    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0);
      const bDate = new Date(b.created_at || 0);
      return bDate.getTime() - aDate.getTime(); // desc order
    });

    return filtered;
  }, [products, debouncedSearch, statusFilter, categoryFilter]);

  // keep filteredProducts state for existing pagination logic (optional)
  useEffect(() => { setFilteredProductsState(filteredProducts); }, [filteredProducts]);

  // Apply pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedProducts(filteredProductsState.slice(startIndex, endIndex));
  }, [filteredProductsState, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('');
  };

  // Handle product actions
  const handleViewProduct = async (product: { id: string }) => {
    // TODO: Implement view modal or navigation
    console.log('View product:', product.id);
  };

  const handleEditProduct = async (product: { id: string }) => {
    // TODO: Implement edit modal or navigation
    console.log('Edit product:', product.id);
  };

  const handleDeleteProduct = async (product: { id: string }) => {
    if (!window.confirm('Apakah Anda yakin ingin mengarsipkan produk ini? Produk akan disembunyikan dari panel admin dan halaman publik.')) {
      return;
    }

    try {
      // TODO: Implement archive product
      console.log('Archive product:', product.id);
      await loadProducts(); // Refresh after archiving
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleQuickUpdate = async (id: string, fields: Partial<Pick<Product,'price'|'stock'|'is_active'>>) => {
    // CRITICAL DEBUG - This should always show
    alert(`🔧 DEBUG: Updating product ${id} with price: ${fields.price}`);
    console.log('[ProductsManager.handleQuickUpdate] Starting update for product:', id, 'fields:', fields);
    
    // Store original values for rollback
    const originalProduct = products.find(p => p.id === id);
    if (!originalProduct) {
      push('Product not found', 'error');
      return;
    }
    
    console.log('[ProductsManager.handleQuickUpdate] Original product data:', {
      id: originalProduct.id,
      name: originalProduct.name,
      price: originalProduct.price,
      stock: originalProduct.stock,
      is_active: originalProduct.is_active
    });
    
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    console.log('[ProductsManager.handleQuickUpdate] Applied optimistic update with:', fields);
    
    try {
      const updated = await adminService.updateProductFields(id, fields);
      
      console.log('[ProductsManager.handleQuickUpdate] API returned:', updated);
      console.log('[ProductsManager.handleQuickUpdate] Type:', typeof updated, 'Is null?', updated === null);
      
      if (!updated) {
        console.error('[ProductsManager.handleQuickUpdate] ❌ Update returned NULL');
        
        // Rollback optimistic update
        setProducts(prev => prev.map(p => p.id === id ? originalProduct : p));
        push('❌ Failed to update product. Check console for details.', 'error');
        
        return;
      }
      
      // Log what we're about to set
      console.log('[ProductsManager.handleQuickUpdate] ✅ Setting updated product:', {
        id: updated.id,
        name: updated.name,
        price: updated.price,
        stock: updated.stock,
        is_active: updated.is_active
      });
      
      console.log('[ProductsManager.handleQuickUpdate] Requested price:', fields.price, 'Returned price:', updated.price);
      
      // Verify the data matches
      if (fields.price !== undefined && updated.price !== fields.price) {
        console.error('[ProductsManager.handleQuickUpdate] ⚠️ WARNING: Price mismatch!');
        console.error('  Requested:', fields.price);
        console.error('  Returned:', updated.price);
        alert(`⚠️ PRICE MISMATCH! Requested: ${fields.price}, Got back: ${updated.price}`);
      }
      
      // Success - update with actual data from database
      setProducts(prev => {
        const newList = prev.map(p => p.id === id ? { ...p, ...updated } : p);
        console.log('[ProductsManager.handleQuickUpdate] Updated products list');
        return newList;
      });
      
      // Verify it was set correctly
      setTimeout(() => {
        const checkProduct = products.find(p => p.id === id);
        console.log('[ProductsManager.handleQuickUpdate] After setState - product in list:', checkProduct?.price);
        alert(`✅ Final check: Price in state is now ${checkProduct?.price}`);
      }, 100);
      
      push('✅ Product updated successfully', 'success');
      
    } catch (error: any) {
      console.error('[ProductsManager.handleQuickUpdate] Update threw error:', error);
      setProducts(prev => prev.map(p => p.id === id ? originalProduct : p));
      push(`❌ Failed to update product: ${error?.message}`, 'error');
    }
  };

  const handleAddProduct = () => {
    // TODO: Implement add product modal or navigation
    console.log('Add new product');
  };

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-pink-500" />
          <p className="text-gray-300">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
  <div className="dashboard-data-panel padded rounded-xl border border-red-500/20 bg-red-900/10">
        <div className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h3 className="text-xl font-bold text-white">Error Loading Products</h3>
          <p className="text-gray-300">{error}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('common.productsManagement')}</h2>
          <p className="text-gray-300">
            {filteredProducts.length} / {products.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn btn-secondary flex items-center gap-2',
              showFilters && 'ring-1 ring-pink-500/60'
            )}
          >
            <Filter className="w-4 h-4" />
            {t('common.filters')}
          </button>

          <button
            type="button"
            onClick={handleAddProduct}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('common.addProduct')}
          </button>
        </div>
      </div>

      {/* Filters */}
          {showFilters && (
            <div className="bg-[var(--bg-secondary)] border border-token rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-ds-text-secondary mb-1">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name or description..."
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-token rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ds-text-secondary mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-token rounded-lg"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ds-text-secondary mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-token rounded-lg"
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearAllFilters}>Clear</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddProduct}>Add Product</button>
              </div>
            </div>
          )}

      {/* Products Table (Design System) */}
      <ProductTable
        products={paginatedProducts}
        loading={loading}
        currentPage={currentPage}
        totalPages={Math.ceil(filteredProducts.length / itemsPerPage) || 1}
        itemsPerPage={itemsPerPage}
        totalProducts={filteredProducts.length}
        onPageChange={(page) => setCurrentPage(page)}
        onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
        onEdit={handleEditProduct}
        onArchive={(p)=> handleQuickUpdate(p.id, { is_active: false })}
        onRestore={(p)=> handleQuickUpdate(p.id, { is_active: true })}
        onDelete={handleDeleteProduct}
      />

  {/* Pagination moved into ProductTable footer */}

  {/* Empty state handled inside ProductTable */}
    </div>
  );
};

export default ProductsManager;
