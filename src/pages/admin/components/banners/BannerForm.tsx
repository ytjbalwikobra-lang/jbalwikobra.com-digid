import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Plus, Edit, Upload, Loader } from 'lucide-react';
import { BannerFormProps, BannerFormData } from './types';
import { useModalForm } from '../../../../hooks/useModalForm';
import { useKeyboardShortcuts, createModalShortcuts } from '../../../../hooks/useKeyboardShortcuts';
import { bannerValidation } from '../../../../utils/adminValidation';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { uploadFiles, deletePublicUrls } from '../../../../services/storageService';

export const BannerForm: React.FC<BannerFormProps> = ({
  isOpen,
  onClose,
  editingBanner,
  onSubmit,
  submitting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Track original image URL for cleanup when replacing
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
  // Update original image when editing banner changes
  useEffect(() => {
    if (editingBanner?.image_url) {
      setOriginalImageUrl(editingBanner.image_url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [editingBanner]);

  // Use useModalForm hook - eliminates ~40 lines of form state management
  const { formData, updateField, validationError, validate } = useModalForm<BannerFormData>(
    {
      title: '',
      subtitle: '',
      image_url: '',
      link_url: '',
      cta_text: '',
      sort_order: 1,
      is_active: true
    },
    {
      isOpen,
      editData: editingBanner as BannerFormData | null,
      transformEditData: (banner) => ({
        title: banner.title,
        subtitle: banner.subtitle || '',
        image_url: banner.image_url,
        link_url: banner.link_url || '',
        cta_text: banner.cta_text || '',
        sort_order: banner.sort_order,
        is_active: banner.is_active
      }),
      validate: (data) => {
        const validator = bannerValidation<BannerFormData>();
        const result = validator.validate(data);
        return result.isValid ? null : Object.values(result.errors)[0];
      }
    }
  );

  // Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
  useKeyboardShortcuts({
    enabled: isOpen && !submitting,
    shortcuts: createModalShortcuts({
      onSave: () => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },
      onCancel: onClose
    })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use centralized validation
    if (!validate()) {
      return;
    }
    
    // If image changed and there was an original image, delete the old one from storage
    if (originalImageUrl && formData.image_url !== originalImageUrl) {
      console.log('[BannerForm] Image changed, deleting old image from storage:', originalImageUrl);
      try {
        await deletePublicUrls([originalImageUrl]);
        console.log('[BannerForm] Successfully deleted old image from storage');
      } catch (err) {
        // Don't block submit on delete failure, just log
        console.warn('[BannerForm] Failed to delete old banner image:', err);
      }
    }
    
    onSubmit(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    
    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setUploading(true);
    try {
      console.log('[BannerForm] Starting upload for:', file.name, file.type, file.size);
      const results = await uploadFiles([file], 'banners');
      console.log('[BannerForm] Upload results:', results);
      
      if (results.length > 0 && results[0].url) {
        // Delete old image if this is a replacement (not the original)
        const currentUrl = formData.image_url;
        if (currentUrl && currentUrl !== originalImageUrl) {
          try {
            await deletePublicUrls([currentUrl]);
          } catch (err) {
            console.warn('Failed to delete replaced image:', err);
          }
        }
        updateField('image_url', results[0].url);
      } else {
        setUploadError('Upload succeeded but no URL returned. Please try again.');
      }
    } catch (error: any) {
      console.error('Banner image upload failed:', error);
      setUploadError(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const title = editingBanner ? 'Edit Banner' : 'Create New Banner';

  // Modal actions
  const modalActions = (
    <>
      <AdminButton
        type="button"
        onClick={onClose}
        variant="secondary"
        disabled={submitting}
      >
        Cancel
      </AdminButton>
      <AdminButton
        type="submit"
        form="banner-form"
        variant="primary"
        disabled={submitting || !formData.title || !formData.image_url}
        icon={submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingBanner ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      >
        {submitting ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
      </AdminButton>
    </>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      actions={modalActions}
    >
      <form id="banner-form" onSubmit={handleSubmit} className="space-y-6">
          {validationError && (
            <div className="admin-form-error" style={{padding: 'var(--admin-space-3)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--admin-error)', borderRadius: 'var(--admin-radius-md)'}}>
              {validationError}
            </div>
          )}
          {/* Title */}
          <div>
            <label className="admin-label">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="admin-input"
              placeholder="Enter banner title..."
              required
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="admin-label">
              Subtitle
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => updateField('subtitle', e.target.value)}
              className="admin-input"
              placeholder="Enter banner subtitle..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="admin-label">
              Banner Image <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => updateField('image_url', e.target.value)}
                className="admin-input"
                placeholder="Enter image URL or upload file..."
                required
              />
              <div className="flex items-center gap-3">
                <span className="text-[var(--cyber-text-muted)] text-sm">or</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 border text-[var(--cyber-text-secondary)] rounded-cyber-lg hover:text-white transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--admin-primary-light)', borderColor: 'var(--admin-border)' }}
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </>
                  )}
                </button>
              </div>
              {uploadError && (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-cyber-lg border border-red-500/30">
                  {uploadError}
                </div>
              )}
              {formData.image_url && (
                <div className="rounded-cyber-lg overflow-hidden border border-[var(--cyber-border)]">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Link URL */}
          <div>
            <label className="admin-label">
              Link URL
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => updateField('link_url', e.target.value)}
              className="admin-input"
              placeholder="https://example.com"
            />
          </div>

          {/* CTA Text */}
          <div>
            <label className="admin-label">
              Call to Action Text
            </label>
            <input
              type="text"
              value={formData.cta_text}
              onChange={(e) => updateField('cta_text', e.target.value)}
              className="admin-input"
              placeholder="Click here to learn more"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="admin-label">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 1)}
              className="admin-input"
              min="1"
            />
          </div>

          {/* Active Status */}
          <div>
            <label className="admin-label">
              Status
            </label>
            <button
              type="button"
              onClick={() => updateField('is_active', !formData.is_active)}
              className={`flex items-center gap-3 px-4 py-3 rounded-cyber-lg border transition-all duration-200 ${
                formData.is_active 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-[var(--cyber-bg-surface)] border-[var(--cyber-border)] text-[var(--cyber-text-muted)] hover:bg-[var(--cyber-bg-elevated)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${formData.is_active ? 'bg-emerald-400' : 'bg-[var(--cyber-text-muted)]'}`} />
              {formData.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </form>
      </AdminModal>
    );
};
