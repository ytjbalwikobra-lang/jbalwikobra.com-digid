/**
 * Flash Sale Modal Component
 * WCAG 2.1 AA Compliant Modal for Create/Edit Flash Sales
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { ProductService } from '../../../services/productService';
import { OptimizedProductService } from '../../../services/optimizedProductService';
import { useToast } from '../../../components/Toast';
import { useAdminConfirm } from './ui/AdminConfirmModal';
import { Product } from '../../../types';
import { AdminButton } from './ui/AdminButton';
import { formatNumberID, parseNumberID, formatCurrency } from '../../../utils/helpers';

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
  const { showConfirm, ConfirmModal } = useAdminConfirm();

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
        // Edit mode - populate form (handle both camelCase and snake_case)
        const sale = flashSale as any;
        setFormData({
          productId: sale.productId ?? sale.product_id ?? '',
          salePrice: sale.salePrice ?? sale.sale_price ?? 0,
          originalPrice: sale.originalPrice ?? sale.original_price ?? 0,
          startTime: sale.startTime ?? sale.start_time ?? '',
          endTime: sale.endTime ?? sale.end_time ?? '',
          stock: sale.stock ?? 0,
          isActive: sale.isActive ?? sale.is_active ?? true
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
      push('Gagal memuat produk', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.productId) {
      newErrors.productId = 'Pilih produk terlebih dahulu';
    }
    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'Harga sale harus lebih dari 0';
    }
    if (formData.originalPrice <= 0) {
      newErrors.originalPrice = 'Harga asli harus lebih dari 0';
    }
    if (formData.salePrice >= formData.originalPrice) {
      newErrors.salePrice = 'Harga sale harus lebih kecil dari harga asli';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Waktu mulai harus diisi';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'Waktu selesai harus diisi';
    }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      newErrors.endTime = 'Waktu selesai harus setelah waktu mulai';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stok tidak boleh negatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      push('Mohon perbaiki error pada form', 'error');
      return;
    }

    // Get selected product name for confirmation
    const selectedProduct = products.find(p => p.id === formData.productId);
    const productName = selectedProduct?.name || 'Unknown';
    const actionText = flashSale ? 'menyimpan perubahan' : 'membuat';

    const confirmed = await showConfirm({
      title: flashSale ? 'Konfirmasi Perubahan' : 'Konfirmasi Buat Flash Sale',
      message: `Anda akan ${actionText} flash sale untuk produk "${productName}".\n\nHarga Sale: ${formatCurrency(formData.salePrice)}\nDiskon: ${discount}%\n\nLanjutkan?`,
      type: 'info',
      confirmText: flashSale ? 'Simpan' : 'Buat Flash Sale',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

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
        push('Flash sale berhasil diperbarui', 'success');
      } else {
        // Create new flash sale
        await ProductService.createFlashSale(apiData);
        push('Flash sale berhasil dibuat', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      push(error.message || 'Gagal menyimpan flash sale', 'error');
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

  // Helper to handle price input with thousand separator
  const handlePriceInputChange = (field: 'salePrice' | 'originalPrice', inputValue: string) => {
    const numericValue = parseNumberID(inputValue);
    handleChange(field, numericValue);
  };

  // Format price for display in input
  const formatPriceForInput = (value: number): string => {
    if (!value || value === 0) return '';
    return `Rp ${formatNumberID(value)}`;
  };

  if (!isOpen) return null;

  const discount = formData.originalPrice > 0 && formData.salePrice > 0
    ? Math.round(((formData.originalPrice - formData.salePrice) / formData.originalPrice) * 100)
    : 0;

  return (
    <>
      <ConfirmModal />
      <div className="admin-modal-overlay">
        <div className="admin-modal-content max-w-2xl">
          {/* Header */}
          <div className="admin-modal-header">
            <h2 className="admin-modal-title">
              {flashSale ? 'Edit Flash Sale' : 'Buat Flash Sale Baru'}
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
              Produk <span className="text-red-500">*</span>
            </label>
            {flashSale ? (
              // Edit mode - show selected product as read-only
              <div className="admin-input bg-slate-700/50 cursor-not-allowed">
                {(flashSale as any).product?.name || 
                 products.find(p => p.id === formData.productId)?.name || 
                 `Product ID: ${formData.productId.slice(0, 8)}...`}
              </div>
            ) : (
              // Create mode - show dropdown
              <select
                value={formData.productId}
                onChange={(e) => handleChange('productId', e.target.value)}
                className={`admin-select ${errors.productId ? 'border-red-500' : ''}`}
                disabled={loadingProducts}
              >
                <option value="">Pilih produk...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price || 0)}
                  </option>
                ))}
              </select>
            )}
            {errors.productId && (
              <p className="text-sm text-red-600 mt-1">{errors.productId}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                Harga Asli <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceForInput(formData.originalPrice)}
                onChange={(e) => handlePriceInputChange('originalPrice', e.target.value)}
                className={`admin-input ${errors.originalPrice ? 'border-red-500' : ''}`}
                placeholder="Rp 0"
              />
              {errors.originalPrice && (
                <p className="text-sm text-red-600 mt-1">{errors.originalPrice}</p>
              )}
            </div>

            <div>
              <label className="admin-label">
                Harga Sale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceForInput(formData.salePrice)}
                onChange={(e) => handlePriceInputChange('salePrice', e.target.value)}
                className={`admin-input ${errors.salePrice ? 'border-red-500' : ''}`}
                placeholder="Rp 0"
              />
              {errors.salePrice && (
                <p className="text-sm text-red-600 mt-1">{errors.salePrice}</p>
              )}
              {discount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  💰 Diskon {discount}%
                </p>
              )}
            </div>
          </div>

          {/* Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                Waktu Mulai <span className="text-red-500">*</span>
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
                Waktu Selesai <span className="text-red-500">*</span>
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
              Aktif (Flash sale akan ditampilkan ke pelanggan)
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
              Batal
            </AdminButton>
            <AdminButton
              type="submit"
              variant="primary"
              disabled={loading || loadingProducts}
              icon={loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
            >
              {loading ? 'Menyimpan...' : flashSale ? 'Simpan' : 'Buat'}
            </AdminButton>
          </div>
        </form>
        </div>
      </div>
    </>
  );
};

export default FlashSaleModal;
