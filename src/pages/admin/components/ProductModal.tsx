import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader, Save } from 'lucide-react';
import { adminService, Product } from '../../../services/adminService';
import { deletePublicUrls } from '../../../services/storageService';
import { useToast } from '../../../components/Toast';
import { useAdminConfirm } from './ui/AdminConfirmModal';
import { AdminModal } from './ui/AdminModal';
import { AdminButton } from './ui/AdminButton';
import { AdminImageUpload } from './ui/AdminImageUpload';
import { formatNumberID, parseNumberID, formatCurrency } from '../../../utils/helpers';
import { supabase } from '../../../services/supabase';
import { useAdminData } from '../../../contexts/AdminDataContext';
import { useKeyboardShortcuts, createModalShortcuts } from '../../../hooks/useKeyboardShortcuts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  mode: 'view' | 'edit' | 'create';
  onSuccess?: (savedProduct?: Product) => void;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id: string;
  game_title_id: string;
  tier_id: string;
  image: string;
  images: string[];
  stock: number;
  is_active: boolean;
  has_rental: boolean;
  rental_options: Array<{
    id?: string;
    duration: string;
    price: number;
    description?: string;
  }>;
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  mode,
  onSuccess
}) => {
  const { push } = useToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();
  const [loading, setLoading] = useState(false);
  
  // Track original images for cleanup on save
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  
  // Use AdminDataContext instead of local state
  const { 
    categories, 
    gameTitles, 
    tiers,
    categoriesLoading,
    gameTitlesLoading,
    tiersLoading
  } = useAdminData();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    category_id: '',
    game_title_id: '',
    tier_id: '',
    image: '',
    images: [],
    stock: 1,
    is_active: true,
    has_rental: false,
    rental_options: []
  });

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    enabled: isOpen && mode !== 'view',
    shortcuts: createModalShortcuts({
      onSave: () => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },
      onCancel: onClose
    })
  });

  // Load dropdown data and populate form
  useEffect(() => {
    if (isOpen) {
      const initializeModal = async () => {
        try {
          // Dropdown data already available from context - no API calls needed!
          
          // Small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Then populate form data if editing/viewing
          if (product && (mode === 'edit' || mode === 'view')) {
            // Handle different category field names
            const categoryId = product.category_id || (product as any).category || (product as any).categoryId || '';
            
            const productImages = product.images || (product.image ? [product.image] : []);
            
            // Fetch rental options if editing and product has rental flag
            let existingRentalOptions: any[] = [];
            if (product.has_rental && supabase) {
              try {
                const { data: rentalOptions } = await supabase
                  .from('rental_options')
                  .select('id, product_id, duration_days, display_label, price_modifier, created_at')
                  .eq('product_id', product.id)
                  .order('id');
                existingRentalOptions = rentalOptions || [];
              } catch (error) {
                console.warn('Failed to fetch rental options:', error);
              }
            }
            
            setFormData({
              name: product.name || '',
              description: product.description || '',
              price: product.price || 0,
              original_price: product.original_price || 0,
              category_id: categoryId,
              game_title_id: product.game_title_id || '',
              tier_id: product.tier_id || '',
              image: product.image || '',
              images: productImages,
              stock: product.stock || 1,
              is_active: product.is_active ?? true,
              has_rental: product.has_rental || false,
              rental_options: existingRentalOptions
            });
            
            // Track original images for cleanup
            setOriginalImages(productImages);
          } else if (mode === 'create') {
            // Reset form for new product
            setFormData({
              name: '',
              description: '',
              price: 0,
              original_price: 0,
              category_id: '',
              game_title_id: '',
              tier_id: '',
              image: '',
              images: [],
              stock: 1,
              is_active: true,
              has_rental: false,
              rental_options: []
            });
            setOriginalImages([]);
          }
        } catch (error) {
          console.error('Error initializing modal:', error);
        }
      };
      
      initializeModal();
    }
  }, [isOpen, product, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    // Validation
    if (!formData.name.trim()) {
      push('Nama produk harus diisi', 'error');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      push('Harga produk harus lebih dari 0', 'error');
      return;
    }
    if (formData.images.length === 0 && !formData.image) {
      push('Minimal satu gambar produk diperlukan', 'error');
      return;
    }

    // Show confirmation dialog
    const actionText = mode === 'create' ? 'membuat' : 'menyimpan perubahan';
    const confirmed = await showConfirm({
      title: mode === 'create' ? 'Konfirmasi Buat Produk' : 'Konfirmasi Simpan Perubahan',
      message: `Anda akan ${actionText} produk "${formData.name}".\n\nHarga: ${formatCurrency(formData.price)}\n\nLanjutkan?`,
      type: 'info',
      confirmText: mode === 'create' ? 'Buat Produk' : 'Simpan',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      // Delete removed images from storage (cleanup)
      const removedImages = originalImages.filter(url => !formData.images.includes(url));
      if (removedImages.length > 0) {
        try {
          await deletePublicUrls(removedImages);
        } catch (err) {
          console.warn('Failed to delete removed images:', err);
        }
      }

      // Prepare data with current images
      const images = formData.images;
      const submitData = {
        ...formData,
        images,
        image: images.length > 0 ? images[0] : (formData.image || undefined),
      };

      // Remove the rentalOptions field to avoid database schema errors
      delete (submitData as any).rentalOptions;
      delete (submitData as any).rental_options;

      let savedProduct: any;
      if (mode === 'create') {
        savedProduct = await adminService.createProduct(submitData);
        push('Produk berhasil dibuat!', 'success');
      } else if (mode === 'edit' && product) {
        savedProduct = await adminService.updateProduct(product.id, submitData);
        push('Produk berhasil diperbarui!', 'success');
      }

      // Save rental options if provided
      if (savedProduct && formData.rental_options?.length && supabase) {
        try {
          const productId = savedProduct.id || product?.id;
          
          // First, delete existing rental options if editing
          if (mode === 'edit' && productId) {
            const { error: deleteError } = await supabase.from('rental_options').delete().eq('product_id', productId);
            if (deleteError) {
              console.warn('Failed to delete existing rentals:', deleteError);
            }
          }
          
          // Filter valid rental options
          const validRentals = formData.rental_options.filter(r => r.duration?.trim() && r.price > 0);
          
          if (validRentals.length > 0) {
            const rentalData = validRentals.map(r => ({
              product_id: productId,
              duration: r.duration.trim(),
              price: Number(r.price) || 0,
              description: r.description?.trim() || null
            }));

            const { error: rentalError } = await supabase.from('rental_options').insert(rentalData);
            if (rentalError) {
              console.warn('Failed to save rental options:', rentalError);
              push('Product saved, but failed to save rental options', 'info');
            }
          }
        } catch (rentalError) {
          console.warn('Failed to save rental options:', rentalError);
          push('Product saved, but failed to save rental options', 'info');
        }
      }
      
      onSuccess?.(savedProduct);
      onClose();
    } catch (error: any) {
      push(`Failed to ${mode} product: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Image handling functions
  // Handle image changes from AdminImageUpload
  const handleImagesChange = useCallback((newImages: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: newImages,
      image: newImages.length > 0 ? newImages[0] : ''
    }));
  }, []);

  // Helper functions for thousand separator in inputs
  const formatNumberWithSeparator = (num: number | string) => {
    if (!num && num !== 0) return '';
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(numValue)) return '';
    return formatNumberID(numValue);
  };

  const handlePriceChange = (value: string, field: 'price' | 'original_price') => {
    const numericValue = parseNumberID(value);
    
    if (field === 'original_price') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value === '' || numericValue === 0 ? undefined : numericValue 
      }));
    } else {
      // Handle main price field
      setFormData(prev => {
        const updatedData = { ...prev, [field]: numericValue };
        
        // Auto-fill original_price if it's empty/zero and main price has a value
        if (numericValue > 0 && (!prev.original_price || prev.original_price === 0)) {
          updatedData.original_price = numericValue;
        }
        
        return updatedData;
      });
    }
  };

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Tambah Produk Baru' : mode === 'edit' ? 'Edit Produk' : 'Detail Produk';

  // Modal actions
  const modalActions = !isReadOnly ? (
    <>
      <AdminButton
        type="button"
        onClick={onClose}
        variant="secondary"
        disabled={loading}
      >
        Cancel
      </AdminButton>
      <AdminButton
        type="submit"
        form="product-form"
        variant="primary"
        disabled={loading}
        icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      >
        {loading ? 'Saving...' : mode === 'create' ? 'Buat Produk' : 'Simpan'}
      </AdminButton>
    </>
  ) : undefined;

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
        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="admin-label">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="admin-input"
                placeholder="Enter product name"
                required
                disabled={isReadOnly}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="admin-label">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="admin-input"
                placeholder="Enter product description"
                disabled={isReadOnly}
              />
            </div>

            {/* Price */}
            <div>
              <label className="admin-label">
                Price <span className="text-red-500">*</span>
              </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.price ? `Rp ${formatNumberWithSeparator(formData.price)}` : ''}
                  onChange={(e) => handlePriceChange(e.target.value, 'price')}
                  className="admin-input"
                  placeholder="Rp 0"
                  required
                  disabled={isReadOnly}
                />
                {isReadOnly && (
                  <p className="text-sm text-[var(--cyber-text-muted)] mt-1">{formatCurrency(formData.price)}</p>
                )}
              </div>

              {/* Original Price */}
              <div>
                <label className="admin-label">
                  Original Price
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.original_price ? `Rp ${formatNumberWithSeparator(formData.original_price)}` : ''}
                  onChange={(e) => handlePriceChange(e.target.value, 'original_price')}
                  className="admin-input"
                  placeholder="Rp 0"
                  disabled={isReadOnly}
                />
                {isReadOnly && formData.original_price && (
                  <p className="text-sm text-[var(--cyber-text-muted)] mt-1">{formatCurrency(formData.original_price)}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="admin-label">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="admin-select"
                  disabled={isReadOnly || categoriesLoading}
                >
                  <option value="">{categoriesLoading ? 'Loading...' : 'Select Category'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Game Title */}
              <div>
                <label className="admin-label">
                  Game Title
                </label>
                <select
                  value={formData.game_title_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, game_title_id: e.target.value }))}
                  className="admin-select"
                  disabled={isReadOnly || gameTitlesLoading}
                >
                  <option value="">{gameTitlesLoading ? 'Loading...' : 'Select Game Title'}</option>
                  {gameTitles.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>

              {/* Tier */}
              <div>
                <label className="admin-label">
                  Tier
                </label>
                <select
                  value={formData.tier_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tier_id: e.target.value }))}
                  className="admin-select"
                  disabled={isReadOnly || tiersLoading}
                >
                  <option value="">{tiersLoading ? 'Loading...' : 'Select Tier'}</option>
                  {tiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>

              {/* Rental Options */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="has_rental" className="text-sm font-medium text-[var(--cyber-text-secondary)]">
                    Enable Rental Options
                  </label>
                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, has_rental: !prev.has_rental }))}
                    disabled={isReadOnly}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:ring-offset-2 focus:ring-offset-[var(--cyber-bg-surface)] ${
                      formData.has_rental 
                        ? 'bg-[var(--cyber-pink-primary)]' 
                        : 'bg-[var(--cyber-border)]'
                    } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        formData.has_rental ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {formData.has_rental && (
                  <div className="space-y-4 p-4 bg-[var(--cyber-bg-elevated)] rounded-cyber-lg border border-[var(--cyber-border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[var(--cyber-text-secondary)]">Rental Options</h4>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              rental_options: [...prev.rental_options, { duration: '', price: 0, description: '' }]
                            }));
                          }}
                          className="cyber-btn cyber-btn-primary cyber-btn-sm"
                        >
                          <Plus className="w-4 h-4 inline mr-1" />
                          Add Option
                        </button>
                      )}
                    </div>

                    {formData.rental_options.length === 0 ? (
                      <p className="text-[var(--cyber-text-muted)] text-sm">No rental options configured</p>
                    ) : (
                      <div className="space-y-3">
                        {formData.rental_options.map((option, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={option.duration}
                                onChange={(e) => {
                                  const newOptions = [...formData.rental_options];
                                  newOptions[index] = { ...newOptions[index], duration: e.target.value };
                                  setFormData(prev => ({ ...prev, rental_options: newOptions }));
                                }}
                                placeholder="Duration (e.g., 1 day, 1 week)"
                                className="w-full px-2 py-1 bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
                                disabled={isReadOnly}
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={option.price ? `Rp ${formatNumberID(option.price)}` : ''}
                                onChange={(e) => {
                                  const newOptions = [...formData.rental_options];
                                  newOptions[index] = { ...newOptions[index], price: parseNumberID(e.target.value) };
                                  setFormData(prev => ({ ...prev, rental_options: newOptions }));
                                }}
                                placeholder="Rp 0"
                                className="w-full px-2 py-1 bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded text-[var(--cyber-text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
                                disabled={isReadOnly}
                              />
                            </div>
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={option.description || ''}
                                onChange={(e) => {
                                  const newOptions = [...formData.rental_options];
                                  newOptions[index] = { ...newOptions[index], description: e.target.value };
                                  setFormData(prev => ({ ...prev, rental_options: newOptions }));
                                }}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1 bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] rounded text-[var(--cyber-text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--cyber-pink-primary)]"
                                disabled={isReadOnly}
                              />
                            </div>
                            {!isReadOnly && (
                              <div className="col-span-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = formData.rental_options.filter((_, i) => i !== index);
                                    setFormData(prev => ({ ...prev, rental_options: newOptions }));
                                  }}
                                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                  title="Remove rental option"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Image Management */}
              <div className="md:col-span-2">
                <AdminImageUpload
                  images={formData.images}
                  onChange={handleImagesChange}
                  bucket="products"
                  maxImages={15}
                  maxSizeMB={5}
                  readOnly={isReadOnly}
                  showPrimaryBadge={true}
                  gridCols={5}
                  label={`Product Images ${isReadOnly && formData.images.length > 0 ? `(${formData.images.length})` : ''}`}
                  helpText="Upload up to 15 images. First image is primary. Drag to reorder."
                  disabled={loading}
                />
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-[var(--cyber-accent)] bg-[var(--cyber-bg-surface)] border-[var(--cyber-border)] rounded focus:ring-[var(--cyber-accent)] focus:ring-2"
                    disabled={isReadOnly}
                  />
                  <span className="text-sm font-medium text-[var(--cyber-text-muted)]">Active Product</span>
                </label>
              </div>
            </div>
        </form>
      </AdminModal>
    </>
  );
};

export default ProductModal;
