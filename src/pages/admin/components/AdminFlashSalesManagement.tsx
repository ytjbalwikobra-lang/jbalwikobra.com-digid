/**
 * Refactored Admin Flash Sales Management
 * 
 * This component has been completely refactored into smaller, maintainable components
 * following the iOS Design System V2 patterns and the CSV schema structure.
 * 
 * Components included:
 * - FlashSaleStatsComponent: Dashboard stats and metrics
 * - FlashSaleFiltersComponent: Search and filtering functionality  
 * - FlashSaleTable: Responsive table/card view for flash sales
 * - FlashSaleForm: Create/edit form with validation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Zap } from 'lucide-react';
import { FlashSaleStatsComponent } from '../../../components/admin/flash-sales/FlashSaleStatsComponent';
import { FlashSaleFiltersComponent } from '../../../components/admin/flash-sales/FlashSaleFiltersComponent';
import { FlashSaleTable } from '../../../components/admin/flash-sales/FlashSaleTable';
import { FlashSaleForm } from '../../../components/admin/flash-sales/FlashSaleForm';
import { 
  FlashSaleData, 
  FlashSaleStats, 
  FlashSaleFilters, 
  FlashSaleFormData, 
  FlashSaleProduct 
} from '../../../types/flashSales';
import { adminService } from '../../../services/adminService';
import { supabase } from '../../../services/supabase';
import { useAdminProducts } from '../../../contexts/AdminDataContext';

interface AdminFlashSalesManagementProps {
  onRefresh?: () => void;
}

export const AdminFlashSalesManagement: React.FC<AdminFlashSalesManagementProps> = ({ 
  onRefresh 
}) => {
  // Core state
  const [flashSales, setFlashSales] = useState<FlashSaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use AdminDataContext for products instead of loading separately
  const { products: contextProducts, productsLoading } = useAdminProducts();
  
  // Transform context products to match FlashSaleProduct type
  const products = useMemo<FlashSaleProduct[]>(() => {
    return contextProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price || 0,
      stock: p.stock || 0,
      image: p.image || ''
    }));
  }, [contextProducts]);

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSaleData | undefined>();
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FlashSaleFilters>({
    searchTerm: '',
    statusFilter: 'all',
    discountFilter: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Only load flash sales - products come from context
      await loadFlashSales();
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadFlashSales = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Use direct Supabase query with explicit JOIN to get product data
      const { data, error } = await supabase
        .from('flash_sales')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            stock
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match our schema
      const transformedData: FlashSaleData[] = (data || []).map(sale => ({
        id: sale.id,
        product_id: sale.product_id,
        product: sale.products ? {
          id: sale.products.id,
          name: sale.products.name,
          image: sale.products.image,
          price: sale.products.price || sale.original_price || 0,
          stock: sale.products.stock || 0
        } : undefined,
        sale_price: sale.sale_price,
        original_price: sale.original_price || 0,
        discount_percentage: sale.discount_percentage || 
          (sale.original_price > 0 ? ((sale.original_price - sale.sale_price) / sale.original_price * 100) : 0),
        start_time: sale.start_time,
        end_time: sale.end_time,
        stock: sale.stock || 0,
        is_active: sale.is_active,
        created_at: sale.created_at
      }));
      
      setFlashSales(transformedData);
    } catch (error) {
      console.error('Error loading flash sales:', error);
      setFlashSales([]);
    }
  };

  // Calculate statistics
  const stats: FlashSaleStats = useMemo(() => {
    const now = new Date();
    
    const totalFlashSales = flashSales.length;
    const activeFlashSales = flashSales.filter(sale => {
      const startTime = new Date(sale.start_time);
      const endTime = new Date(sale.end_time);
      return sale.is_active && now >= startTime && now <= endTime;
    }).length;
    
    const scheduledFlashSales = flashSales.filter(sale => {
      const startTime = new Date(sale.start_time);
      return sale.is_active && now < startTime;
    }).length;
    
    const expiredFlashSales = flashSales.filter(sale => {
      const endTime = new Date(sale.end_time);
      return now > endTime;
    }).length;
    
    const averageDiscount = flashSales.length > 0 
      ? flashSales.reduce((sum, sale) => sum + sale.discount_percentage, 0) / flashSales.length
      : 0;

    return {
      totalFlashSales,
      activeFlashSales,
      scheduledFlashSales,
      expiredFlashSales,
      averageDiscount
    };
  }, [flashSales]);

  // Filter and sort flash sales
  const filteredAndSortedFlashSales = useMemo(() => {
    let filtered = [...flashSales];

    // Apply search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.product?.name.toLowerCase().includes(term) ||
        sale.id.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filters.statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(sale => {
        const startTime = new Date(sale.start_time);
        const endTime = new Date(sale.end_time);
        
        switch (filters.statusFilter) {
          case 'active':
            return sale.is_active && now >= startTime && now <= endTime;
          case 'scheduled':
            return sale.is_active && now < startTime;
          case 'expired':
            return now > endTime;
          case 'inactive':
            return !sale.is_active;
          default:
            return true;
        }
      });
    }

    // Apply discount filter
    if (filters.discountFilter !== 'all') {
      filtered = filtered.filter(sale => {
        const discount = sale.discount_percentage;
        switch (filters.discountFilter) {
          case 'low':
            return discount >= 1 && discount <= 25;
          case 'medium':
            return discount > 25 && discount <= 50;
          case 'high':
            return discount > 50 && discount <= 75;
          case 'super':
            return discount > 75;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'start_time':
          aValue = new Date(a.start_time);
          bValue = new Date(b.start_time);
          break;
        case 'end_time':
          aValue = new Date(a.end_time);
          bValue = new Date(b.end_time);
          break;
        case 'discount_percentage':
          aValue = a.discount_percentage;
          bValue = b.discount_percentage;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [flashSales, filters]);

  // Event handlers
  const handleCreateNew = () => {
    setEditingFlashSale(undefined);
    setShowForm(true);
  };

  const handleEdit = (flashSale: FlashSaleData) => {
    setEditingFlashSale(flashSale);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Direct Supabase call since adminService.deleteFlashSale doesn't exist yet
      const { error } = await supabase
        .from('flash_sales')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadFlashSales();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting flash sale:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete flash sale');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Direct Supabase call since adminService.updateFlashSale doesn't exist yet
      const { error } = await supabase
        .from('flash_sales')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      await loadFlashSales();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating flash sale status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleFormSubmit = async (data: FlashSaleFormData) => {
    try {
      setSaving(true);
      setError(null);

      const selectedProduct = products.find(p => p.id === data.product_id);
      if (!selectedProduct) {
        throw new Error('Selected product not found');
      }

      // Calculate final prices
      let salePrice = 0;
      let discountPercentage = 0;
      
      if (data.discount_type === 'percentage') {
        discountPercentage = data.discount_percentage;
        salePrice = selectedProduct.price * (1 - discountPercentage / 100);
      } else {
        salePrice = selectedProduct.price - data.discount_amount;
        discountPercentage = ((selectedProduct.price - salePrice) / selectedProduct.price) * 100;
      }

      const startDateTime = `${data.start_date}T${data.start_time}:00.000Z`;
      const endDateTime = `${data.end_date}T${data.end_time}:00.000Z`;

      const flashSaleData = {
        product_id: data.product_id,
        original_price: selectedProduct.price,
        sale_price: Math.round(salePrice),
        discount_percentage: Math.round(discountPercentage * 10) / 10,
        start_time: startDateTime,
        end_time: endDateTime,
        stock: data.stock || 1,
        is_active: data.is_active ?? true
      };

      if (data.id) {
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Direct Supabase call since adminService.updateFlashSale doesn't exist yet
        const { error } = await supabase
          .from('flash_sales')
          .update(flashSaleData)
          .eq('id', data.id);
        
        if (error) throw error;
      } else {
        await adminService.createFlashSale(flashSaleData);
      }

      setShowForm(false);
      setEditingFlashSale(undefined);
      await loadFlashSales();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving flash sale:', error);
      setError(error instanceof Error ? error.message : 'Failed to save flash sale');
    } finally {
      setSaving(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingFlashSale(undefined);
    setError(null);
  };

  const handleRefresh = async () => {
    await loadData();
    if (onRefresh) onRefresh();
  };

  if (error && flashSales.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Flash Sales</h2>
              <p className="text-red-400 mb-6">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all duration-200 shadow-lg hover:shadow-pink-500/25"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
              Flash Sales Management
            </h1>
            <p className="text-gray-400 mt-1">Create and manage flash sale campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 hover:bg-pink-500/20 transition-all duration-200"
              >
                <Clock className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            )}
            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all duration-200 shadow-lg hover:shadow-pink-500/25"
            >
              <Zap className="w-4 h-4" />
              <span>Create Flash Sale</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="group relative overflow-hidden bg-black border border-red-500/30 rounded-2xl p-6 hover:border-red-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <FlashSaleStatsComponent
          stats={stats}
          loading={loading}
        />

        {/* Filters Section */}
        <FlashSaleFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          resultCount={filteredAndSortedFlashSales.length}
        />

        {/* Flash Sales Table */}
        <FlashSaleTable
          flashSales={filteredAndSortedFlashSales}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />

        {/* Form Modal */}
        {showForm && (
          <FlashSaleForm
            initialData={editingFlashSale}
            products={products}
            productsLoading={productsLoading}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

export default AdminFlashSalesManagement;
