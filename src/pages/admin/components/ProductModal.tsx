import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Move, Loader, ImageIcon, Save } from 'lucide-react';
import { adminService, Product } from '../../../services/adminService';
import { uploadFiles, deletePublicUrls, UploadResult } from '../../../services/storageService';
import { useToast } from '../../../components/Toast';
import { formatNumberID, parseNumberID } from '../../../utils/helpers';
import { supabase } from '../../../services/supabase';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  mode: 'view' | 'edit' | 'create';
  onSuccess?: () => void;
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

interface DropdownData {
  categories: Array<{ id: string; name: string }>;
  gameTitles: Array<{ id: string; name: string }>;
  tiers: Array<{ id: string; name: string }>;
}

interface ImageItem {
  id: string;
  url: string;
  isUploading?: boolean;
  error?: string;
}

const MAX_IMAGES = 15;

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  mode,
  onSuccess
}) => {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [dropdownData, setDropdownData] = useState<DropdownData>({
    categories: [],
    gameTitles: [],
    tiers: []
  });
  
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

  const [imageItems, setImageItems] = useState<ImageItem[]>([]);

  // Load dropdown data and populate form
  useEffect(() => {
    if (isOpen) {
      const initializeModal = async () => {
        try {
          // First load dropdown data
          await loadDropdownData();
          
          // Small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));
          
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
            
            // Initialize image items for display
            setImageItems(productImages.map((url, index) => ({
              id: `existing-${index}`,
              url
            })));
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
            setImageItems([]);
          }
        } catch (error) {
          console.error('Error initializing modal:', error);
        }
      };
      
      initializeModal();
    }
  }, [isOpen, product, mode]);

  const loadDropdownData = async () => {
    try {
      const [categories, gameTitles, tiers] = await Promise.all([
        adminService.getCategories(),
        adminService.getGameTitles(),
        adminService.getTiers()
      ]);
      
      setDropdownData({ categories, gameTitles, tiers });
    } catch (error: any) {
      console.error('Error loading dropdown data:', error);
      push(`Failed to load dropdown data: ${error.message}`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setLoading(true);
    try {
      // Prepare data with current images
      const submitData = {
        ...formData,
        images: imageItems.map(item => item.url),
        image: imageItems.length > 0 ? imageItems[0].url : formData.image,
      };

      // Remove the rentalOptions field to avoid database schema errors
      delete (submitData as any).rentalOptions;
      delete (submitData as any).rental_options;

      let savedProduct: any;
      if (mode === 'create') {
        savedProduct = await adminService.createProduct(submitData);
        push('Product created successfully!', 'success');
      } else if (mode === 'edit' && product) {
        savedProduct = await adminService.updateProduct(product.id, submitData);
        push('Product updated successfully!', 'success');
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
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      push(`Failed to ${mode} product: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Image handling functions
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || imageItems.length >= MAX_IMAGES) return;

    const filesArray = Array.from(files);
    const remainingSlots = MAX_IMAGES - imageItems.length;
    const filesToUpload = filesArray.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      push(`Maximum ${MAX_IMAGES} images allowed`, 'info');
      return;
    }

    // Add uploading placeholders
    const newItems: ImageItem[] = filesToUpload.map((file, index) => ({
      id: `uploading-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      isUploading: true
    }));

    setImageItems(prev => [...prev, ...newItems]);

    try {
      const results = await uploadFiles(
        filesToUpload,
        'products',
        (done, total) => setUploadProgress({ done, total })
      );

      // Update the items with actual URLs
      setImageItems(prev => 
        prev.map(item => {
          const uploadIndex = newItems.findIndex(newItem => newItem.id === item.id);
          if (uploadIndex !== -1 && results[uploadIndex]) {
            return {
              ...item,
              url: results[uploadIndex].url,
              isUploading: false
            };
          }
          return item;
        })
      );

      push(`Uploaded ${results.length} image(s) successfully!`, 'success');
    } catch (error: any) {
      // Remove failed uploads
      setImageItems(prev => 
        prev.filter(item => !newItems.some(newItem => newItem.id === item.id))
      );
      push(`Failed to upload images: ${error.message}`, 'error');
    } finally {
      setUploadProgress({ done: 0, total: 0 });
    }
  }, [imageItems.length, push]);

  const handleRemoveImage = useCallback(async (index: number) => {
    const item = imageItems[index];
    if (!item) return;

    // If it's an uploaded image (not existing), try to delete from storage
    if (item.id.startsWith('uploading-') && !item.isUploading) {
      try {
        await deletePublicUrls([item.url]);
      } catch (error) {
        console.warn('Failed to delete image from storage:', error);
      }
    }

    setImageItems(prev => prev.filter((_, i) => i !== index));
  }, [imageItems]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setImageItems(prev => {
      const newItems = [...prev];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      return newItems;
    });

    setDraggedIndex(null);
  }, [draggedIndex]);

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

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

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Add New Product' : mode === 'edit' ? 'Edit Product' : 'Product Details';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-black border border-gray-800 shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter product name"
                  required
                  disabled={isReadOnly}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter product description"
                  disabled={isReadOnly}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.price ? `Rp ${formatNumberWithSeparator(formData.price)}` : ''}
                  onChange={(e) => handlePriceChange(e.target.value, 'price')}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Rp 0"
                  required
                  disabled={isReadOnly}
                />
                {isReadOnly && (
                  <p className="text-sm text-gray-400 mt-1">{formatPrice(formData.price)}</p>
                )}
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Original Price
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.original_price ? `Rp ${formatNumberWithSeparator(formData.original_price)}` : ''}
                  onChange={(e) => handlePriceChange(e.target.value, 'original_price')}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Rp 0"
                  disabled={isReadOnly}
                />
                {isReadOnly && formData.original_price && (
                  <p className="text-sm text-gray-400 mt-1">{formatPrice(formData.original_price)}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={isReadOnly}
                >
                  <option value="">Select Category</option>
                  {dropdownData.categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Game Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Title
                </label>
                <select
                  value={formData.game_title_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, game_title_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={isReadOnly}
                >
                  <option value="">Select Game Title</option>
                  {dropdownData.gameTitles.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>

              {/* Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tier
                </label>
                <select
                  value={formData.tier_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tier_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={isReadOnly}
                >
                  <option value="">Select Tier</option>
                  {dropdownData.tiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stock
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="1"
                  min="0"
                  disabled={isReadOnly}
                />
              </div>

              {/* Rental Options */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="has_rental" className="text-sm font-medium text-gray-300">
                    Enable Rental Options
                  </label>
                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, has_rental: !prev.has_rental }))}
                    disabled={isReadOnly}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      formData.has_rental 
                        ? 'bg-pink-500' 
                        : 'bg-gray-600'
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
                  <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-300">Rental Options</h4>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              rental_options: [...prev.rental_options, { duration: '', price: 0, description: '' }]
                            }));
                          }}
                          className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 inline mr-1" />
                          Add Option
                        </button>
                      )}
                    </div>

                    {formData.rental_options.length === 0 ? (
                      <p className="text-gray-400 text-sm">No rental options configured</p>
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
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Product Images {isReadOnly && imageItems.length > 0 && `(${imageItems.length})`}
                </label>
                
                {/* View Mode: Image Gallery */}
                {isReadOnly && imageItems.length > 0 && (
                  <div className="space-y-4">
                    {/* Main image */}
                    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={imageItems[0]?.url}
                        alt="Primary product image"
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                        Primary Image
                      </div>
                    </div>
                    
                    {/* Additional images grid - 5 columns */}
                    {imageItems.length > 1 && (
                      <div className="grid grid-cols-5 gap-2">
                        {imageItems.slice(1).map((item, index) => (
                          <div key={item.id} className="relative bg-gray-800 rounded overflow-hidden">
                            <img
                              src={item.url}
                              alt={`Product image ${index + 2}`}
                              className="w-full aspect-square object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Edit/Create Mode: Upload Interface */}
                {!isReadOnly && (
                  <>
                    {/* Upload Progress */}
                    {uploadProgress.total > 0 && (
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                          <span>Uploading images...</span>
                          <span>{uploadProgress.done}/{uploadProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Image Grid - 5 columns, more compact */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {imageItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative group bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            draggedIndex === index ? 'border-pink-500 scale-95 opacity-50' : 'border-gray-700 hover:border-pink-500'
                          }`}
                          draggable={!item.isUploading}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <div className="aspect-square">
                            {item.isUploading ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <Loader className="w-8 h-8 text-pink-500 animate-spin" />
                              </div>
                            ) : (
                              <img
                                src={item.url}
                                alt={`Product image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjNEI1NTYzIi8+CjxwYXRoIGQ9Ik0xMiA4QzEzLjEgOCAxNCA4LjkgMTQgMTBDMTQgMTEuMSAxMy4xIDEyIDEyIDEyQzEwLjkgMTIgMTAgMTEuMSAxMCAxMEMxMCA4LjkgMTAuOSA4IDEyIDhaIiBmaWxsPSIjOUM5Q0E0Ii8+CjxwYXRoIGQ9Ik01IDEyTDE5IDEyTDE1IDE2TDkgMTBMNSAxMloiIGZpbGw9IiM5QzlDQTQiLz4KPC9zdmc+';
                                }}
                              />
                            )}
                          </div>
                          
                          {/* Image overlay controls */}
                          {!item.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index)}
                                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                  title="Remove image"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="p-2 bg-gray-700 text-white rounded-lg cursor-grab">
                                  <Move className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Primary image indicator */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Add new image button */}
                      {imageItems.length < MAX_IMAGES && (
                        <div
                          className="aspect-square border-2 border-dashed border-gray-600 hover:border-pink-500 rounded-lg flex items-center justify-center cursor-pointer transition-colors group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center">
                            <Plus className="w-8 h-8 text-gray-400 group-hover:text-pink-500 mx-auto mb-2" />
                            <span className="text-sm text-gray-400 group-hover:text-pink-500">Add Image</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />

                    {/* Upload instructions */}
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>• Upload up to {MAX_IMAGES} images (JPEG, PNG, GIF, WebP)</p>
                      <p>• First image will be used as primary</p>
                      <p>• Drag images to reorder them</p>
                      <p>• Maximum file size: 10MB per image</p>
                    </div>
                  </>
                )}
                
                {/* No images state */}
                {imageItems.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No images uploaded</p>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-pink-600 bg-gray-800 border-gray-700 rounded focus:ring-pink-500 focus:ring-2"
                    disabled={isReadOnly}
                  />
                  <span className="text-sm font-medium text-gray-300">Active Product</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            {!isReadOnly && (
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{mode === 'create' ? 'Create Product' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
