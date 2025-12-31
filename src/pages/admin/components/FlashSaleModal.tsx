/**
 * Flash Sale Modal Component
 * WCAG 2.1 AA Compliant Modal for Create/Edit Flash Sales
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { ProductService } from '../../../services/productService';
import { OptimizedProductService } from '../../../services/optimizedProductService';
import { useToast } from '../../../components/Toast';
import { Product } from '../../../types';
import { AdminButton } from './ui/AdminButton';

interface FlashSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  flashSale?: {
    id: string;
    productId: string;
    salePrice: number;
    originalPrice: number;
    startTime: string;
    endTime: string;
    stock: number;
    isActive: boolean;
  } | null;
}

interface FormData {
  productId: string;
  salePrice: number;
  originalPrice: number;
  startTime: string;
  endTime: string;
  stock: number;
  isActive: boolean;
}

export const FlashSaleModal: React.FC<FlashSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  flashSale
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const { push } = useToast();

  const [formData, setFormData] = useState<FormData>({
    productId: '',
    salePrice: 0,
    originalPrice: 0,
    startTime: '',
    endTime: '',
    stock: 0,
    isActive: true
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (flashSale) {
        // Edit mode - populate form
        setFormData({
          productId: flashSale.productId,
          salePrice: flashSale.salePrice,
          originalPrice: flashSale.originalPrice,
          startTime: flashSale.startTime,
          endTime: flashSale.endTime,
          stock: flashSale.stock,
          isActive: flashSale.isActive
        });
      } else {
        // Create mode - reset form
        setFormData({
          productId: '',
          salePrice: 0,
          originalPrice: 0,
          startTime: '',
          endTime: '',
          stock: 0,
          isActive: true
        });
      }
      setErrors({});
    }
  }, [isOpen, flashSale]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const result = await OptimizedProductService.getProductsPaginated({}, { limit: 500 });
      setProducts(result.data);
    } catch (error) {
      push('Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.productId) {
      newErrors.productId = 'Please select a product';
    }
    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'Sale price must be greater than 0';
    }
    if (formData.originalPrice <= 0) {
      newErrors.originalPrice = 'Original price must be greater than 0';
    }
    if (formData.salePrice >= formData.originalPrice) {
      newErrors.salePrice = 'Sale price must be less than original price';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      newErrors.endTime = 'End time must be after start time';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      push('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);

      // Convert camelCase to snake_case for API
      const apiData = {
        product_id: formData.productId,
        sale_price: formData.salePrice,
        original_price: formData.originalPrice,
        start_time: formData.startTime,
        end_time: formData.endTime,
        stock: formData.stock,
        is_active: formData.isActive
      };

      if (flashSale) {
        // Update existing flash sale
        await ProductService.updateFlashSale(flashSale.id, apiData);
        push('Flash sale updated successfully', 'success');
      } else {
        // Create new flash sale
        await ProductService.createFlashSale(apiData);
        push('Flash sale created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      push(error.message || 'Failed to save flash sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-populate original price when product is selected
    if (field === 'productId' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct && selectedProduct.price) {
        setFormData(prev => ({
          ...prev,
          productId: value,
          originalPrice: selectedProduct.price
        }));
      }
    }
  };

  if (!isOpen) return null;

  const discount = formData.originalPrice > 0 && formData.salePrice > 0
    ? Math.round(((formData.originalPrice - formData.salePrice) / formData.originalPrice) * 100)
    : 0;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content max-w-2xl">
        {/* Header */}
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {flashSale ? 'Edit Flash Sale' : 'Create Flash Sale'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="admin-modal-body space-y-6">
          {/* Product Selection */}
          <div>
            <label className="admin-label">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.productId}
              onChange={(e) => handleChange('productId', e.target.value)}
              className={`admin-select ${errors.productId ? 'border-red-500' : ''}`}
              disabled={loadingProducts || !!flashSale}
            >
              <option value="">Select a product...</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - Rp {product.price?.toLocaleString()}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="text-sm text-red-600 mt-1">{errors.productId}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                Original Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', parseFloat(e.target.value) || 0)}
                className={`admin-input ${errors.originalPrice ? 'border-red-500' : ''}`}
                placeholder="100000"
              />
              {errors.originalPrice && (
                <p className="text-sm text-red-600 mt-1">{errors.originalPrice}</p>
              )}
            </div>

            <div>
              <label className="admin-label">
                Sale Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.salePrice}
                onChange={(e) => handleChange('salePrice', parseFloat(e.target.value) || 0)}
                className={`admin-input ${errors.salePrice ? 'border-red-500' : ''}`}
                placeholder="75000"
              />
              {errors.salePrice && (
                <p className="text-sm text-red-600 mt-1">{errors.salePrice}</p>
              )}
              {discount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  💰 {discount}% discount
                </p>
              )}
            </div>
          </div>

          {/* Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className={`admin-input ${errors.startTime ? 'border-red-500' : ''}`}
              />
              {errors.startTime && (
                <p className="text-sm text-red-600 mt-1">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="admin-label">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className={`admin-input ${errors.endTime ? 'border-red-500' : ''}`}
              />
              {errors.endTime && (
                <p className="text-sm text-red-600 mt-1">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="admin-label">Stock Quantity</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
              className={`admin-input ${errors.stock ? 'border-red-500' : ''}`}
              placeholder="100"
              min="0"
            />
            {errors.stock && (
              <p className="text-sm text-red-600 mt-1">{errors.stock}</p>
            )}
            <p className="text-sm text-slate-400 mt-1">
              Leave as 0 for unlimited stock
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-5 h-5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-300">
              Active (Flash sale will be visible to customers)
            </label>
          </div>

          {/* Actions */}
          <div className="admin-modal-footer">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              variant="primary"
              disabled={loading || loadingProducts}
              icon={loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
            >
              {loading ? 'Saving...' : flashSale ? 'Update' : 'Create'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlashSaleModal;
