/**
 * Admin Flash Sales Management Page
 * WCAG 2.1 AA Compliant - Redesigned with Admin V3 Design System
 */

import React, { useState, useEffect } from 'react';
import { ProductService } from '../../services/productService';
import { useToast } from '../../components/Toast';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { Zap, TrendingUp, Clock, Package, Plus, Trash2, RefreshCw } from 'lucide-react';
import '../../styles/admin-design-system-v3.css';
import { Product, FlashSale } from '../../types';

type FlashSaleWithProduct = FlashSale & { product: Product };

const AdminFlashSales: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    loadFlashSales();
  }, []);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getFlashSales();
      setFlashSales(data || []);
    } catch (error) {
      push('Failed to load flash sales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeStatus = (sale: FlashSaleWithProduct): 'ongoing' | 'upcoming' | 'expired' => {
    const now = new Date();
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    return 'ongoing';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this flash sale?')) return;
    
    try {
      await ProductService.deleteFlashSale(id);
      push('Flash sale deleted successfully', 'success');
      loadFlashSales();
    } catch (error) {
      push('Failed to delete flash sale', 'error');
    }
  };

  const stats = {
    total: flashSales.length,
    active: flashSales.filter(s => s.isActive).length,
    ongoing: flashSales.filter(s => getTimeStatus(s) === 'ongoing').length,
    upcoming: flashSales.filter(s => getTimeStatus(s) === 'upcoming').length,
  };

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Zap className="inline-block mr-2" size={28} />
            Flash Sales Management
          </h1>
          <p className="admin-page-subtitle">
            Manage special limited-time product offers
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton
            variant="secondary"
            onClick={loadFlashSales}
            disabled={loading}
            icon={<RefreshCw size={18} />}
          >
            Refresh
          </AdminButton>
          <AdminButton
            variant="primary"
            icon={<Plus size={18} />}
          >
            Create Flash Sale
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Flash Sales</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
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
                <p className="text-sm text-slate-600 mb-1">Active Sales</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="text-green-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Ongoing</p>
                <p className="text-3xl font-bold text-pink-600">{stats.ongoing}</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-pink-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>

        <AdminCard hover>
          <AdminCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Upcoming</p>
                <p className="text-3xl font-bold text-orange-600">{stats.upcoming}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
          </AdminCardBody>
        </AdminCard>
      </div>

      {/* Flash Sales List */}
      <AdminCard>
        <AdminCardHeader
          title="Flash Sales"
          subtitle={`${flashSales.length} total sales`}
        />
        <AdminCardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <p className="mt-4 text-slate-600">Loading flash sales...</p>
            </div>
          ) : flashSales.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto text-slate-300" size={48} />
              <p className="mt-4 text-slate-600">No flash sales found</p>
              <p className="text-sm text-slate-500 mt-2">Create your first flash sale to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Time Period</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flashSales.map((sale) => {
                    const timeStatus = getTimeStatus(sale);
                    const discount = sale.originalPrice > 0
                      ? Math.round(((sale.originalPrice - sale.salePrice) / sale.originalPrice) * 100)
                      : 0;

                    return (
                      <tr key={sale.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-900">
                              {sale.product?.name || 'Unknown Product'}
                            </p>
                            <p className="text-sm text-slate-500">
                              ID: {sale.productId}
                            </p>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="font-bold text-pink-600">
                              Rp {sale.salePrice.toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500 line-through">
                              Rp {sale.originalPrice.toLocaleString()}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-semibold rounded">
                              {discount}% OFF
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <p className="text-slate-700">
                              <span className="font-medium">Start:</span>{' '}
                              {new Date(sale.startTime).toLocaleString()}
                            </p>
                            <p className="text-slate-700 mt-1">
                              <span className="font-medium">End:</span>{' '}
                              {new Date(sale.endTime).toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-slate-900">
                            {sale.stock || 0} units
                          </span>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <AdminStatusBadge
                              status={sale.isActive ? 'active' : 'inactive'}
                              label={sale.isActive ? 'Active' : 'Inactive'}
                            />
                            <AdminStatusBadge
                              status={timeStatus === 'ongoing' ? 'active' : timeStatus === 'upcoming' ? 'pending' : 'inactive'}
                              label={timeStatus.charAt(0).toUpperCase() + timeStatus.slice(1)}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <AdminButton
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(sale.id)}
                              icon={<Trash2 size={16} />}
                              aria-label="Delete flash sale"
                            >
                              Delete
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCardBody>
      </AdminCard>
    </div>
  );
};

export default AdminFlashSales;
