/**
 * Flash Sale Modal Component
 * WCAG 2.1 AA Compliant Modal for Create/Edit Flash Sales
 * Using unified AdminModal design system
 */

import React, { useState, useEffect } from 'react';
import { Save, Loader } from 'lucide-react';
import { ProductService } from '../../../services/productService';
import { useToast } from '../../../components/Toast';
import { useAdminConfirm } from './ui/AdminConfirmModal';
import { AdminModal } from './ui/AdminModal';
import { AdminButton } from './ui/AdminButton';
import { formatCurrency } from '../../../utils/helpers';
import { usePriceInput } from '../../../hooks/usePriceInput';
import { useKeyboardShortcuts, createModalShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { flashSaleValidation } from '../../../utils/adminValidation';
import { useAdminProducts } from '../../../contexts/AdminDataContext';

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
    isActive: boolean;
  } | null;
}

interface FormData {
  productId: string;
  salePrice: number;
  originalPrice: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export const FlashSaleModal: React.FC<FlashSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  flashSale
}) => {
  // Use AdminDataContext for products instead of loading individually
  const { products, productsLoading } = useAdminProducts();
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  // Use price input hooks for better formatting
  const salePriceInput = usePriceInput(0, { prefix: true });
  const originalPriceInput = usePriceInput(0, { prefix: true });

  const [formData, setFormData] = useState<FormData>({
    productId: '',
    salePrice: 0,
    originalPrice: 0,
    startTime: '',
    endTime: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    enabled: isOpen,
    shortcuts: createModalShortcuts({
      onSave: () => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },
      onCancel: onClose
    })
  });

  useEffect(() => {
    if (isOpen) {
      // Products already loaded from context - no API call needed!
      if (flashSale) {
        // Edit mode - populate form (handle both camelCase and snake_case)
        const sale = flashSale as any;
        const salePrice = sale.salePrice ?? sale.sale_price ?? 0;
        const originalPrice = sale.originalPrice ?? sale.original_price ?? 0;
        
        setFormData({
          productId: sale.productId ?? sale.product_id ?? '',
          salePrice,
          originalPrice,
          startTime: sale.startTime ?? sale.start_time ?? '',
          endTime: sale.endTime ?? sale.end_time ?? '',
          isActive: sale.isActive ?? sale.is_active ?? true
        });
        
        // Update price inputs
        salePriceInput.setValue(salePrice);
        originalPriceInput.setValue(originalPrice);
      } else {
        // Create mode - reset form
        setFormData({
          productId: '',
          salePrice: 0,
          originalPrice: 0,
          startTime: '',
          endTime: '',
          isActive: true
        });
      }
      setErrors({});
    }
  }, [isOpen, flashSale]);

  const validateForm = (): boolean => {
    // Use centralized validation utility
    const validator = flashSaleValidation<FormData>();
    const result = validator.validate(formData);
    
    setErrors(result.errors);
    return result.isValid;
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
        stock: 1,
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
        const price = selectedProduct.price;
        setFormData(prev => ({
          ...prev,
          productId: value,
          originalPrice: price
        }));
        originalPriceInput.setValue(price);
      }
    }
  };

  const discount = formData.originalPrice > 0 && formData.salePrice > 0
    ? Math.round(((formData.originalPrice - formData.salePrice) / formData.originalPrice) * 100)
    : 0;

  const title = flashSale ? 'Edit Flash Sale' : 'Buat Flash Sale Baru';

  // Modal actions
  const modalActions = (
    <>
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
        form="flash-sale-form"
        variant="primary"
        disabled={loading || productsLoading}
        icon={loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
      >
        {loading ? 'Menyimpan...' : flashSale ? 'Simpan' : 'Buat'}
      </AdminButton>
    </>
  );

  return (
    <>
      <ConfirmModal />
      <AdminModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="lg"
        actions={modalActions}
      >
        {/* Form */}
        <form id="flash-sale-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div>
            <label className="admin-label">
              Produk <span className="text-red-500">*</span>
            </label>
            {flashSale ? (
              // Edit mode - show selected product as read-only
              <div className="admin-input" style={{opacity: 0.7, cursor: 'not-allowed'}}>
                {(flashSale as any).product?.name || 
                 products.find(p => p.id === formData.productId)?.name || 
                 `Product ID: ${formData.productId.slice(0, 8)}...`}
              </div>
            ) : (
              // Create mode - show dropdown
              <select
                value={formData.productId}
                onChange={(e) => handleChange('productId', e.target.value)}
                className={`admin-select ${errors.productId ? 'admin-input-error' : ''}`}
                disabled={productsLoading}
              >
                <option value="">{productsLoading ? 'Memuat produk...' : 'Pilih produk...'}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price || 0)}
                  </option>
                ))}
              </select>
            )}
            {errors.productId && (
              <p className="admin-form-error">{errors.productId}</p>
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
                value={originalPriceInput.formatted}
                onChange={(e) => {
                  originalPriceInput.handleChange(e.target.value);
                  handleChange('originalPrice', originalPriceInput.value);
                }}
                className={`admin-input ${errors.originalPrice ? 'admin-input-error' : ''}`}
                placeholder="Rp 0"
              />
              {errors.originalPrice && (
                <p className="admin-form-error">{errors.originalPrice}</p>
              )}
            </div>

            <div>
              <label className="admin-label">
                Harga Sale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={salePriceInput.formatted}
                onChange={(e) => {
                  salePriceInput.handleChange(e.target.value);
                  handleChange('salePrice', salePriceInput.value);
                }}
                className={`admin-input ${errors.salePrice ? 'admin-input-error' : ''}`}
                placeholder="Rp 0"
              />
              {errors.salePrice && (
                <p className="admin-form-error">{errors.salePrice}</p>
              )}
              {discount > 0 && (
                <p className="admin-form-hint" style={{color: 'var(--admin-success)'}}>
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
                className={`admin-input ${errors.startTime ? 'admin-input-error' : ''}`}
              />
              {errors.startTime && (
                <p className="admin-form-error">{errors.startTime}</p>
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
                className={`admin-input ${errors.endTime ? 'admin-input-error' : ''}`}
              />
              {errors.endTime && (
                <p className="admin-form-error">{errors.endTime}</p>
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
            <label htmlFor="isActive" className="admin-label" style={{marginBottom: 0}}>
              Aktif (Flash sale akan ditampilkan ke pelanggan)
            </label>
          </div>
        </form>
      </AdminModal>
    </>
  );
};

export default FlashSaleModal;
