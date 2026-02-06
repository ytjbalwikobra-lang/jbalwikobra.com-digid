import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Edit } from 'lucide-react';
import { BannerFormProps, BannerFormData } from './types';
import { useModalForm } from '../../../../hooks/useModalForm';
import { bannerValidation } from '../../../../utils/adminValidation';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminImageUpload } from '../ui/AdminImageUpload';
import { deletePublicUrls } from '../../../../services/storageService';

export const BannerForm: React.FC<BannerFormProps> = ({
  isOpen,
  onClose,
  editingBanner,
  onSubmit,
  submitting
}) => {
  const [imageUploading, setImageUploading] = useState(false);
  
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

  // Handle image changes from AdminImageUpload
  const handleImageChange = async (newImages: string[]) => {
    const newUrl = newImages[0] || '';
    const oldUrl = formData.image_url;
    
    // Delete old image if replaced (but not original for edit mode)
    if (oldUrl && oldUrl !== originalImageUrl && oldUrl !== newUrl) {
      try {
        await deletePublicUrls([oldUrl]);
      } catch (err) {
        console.warn('Failed to delete replaced image:', err);
      }
    }
    
    updateField('image_url', newUrl);
  };

  const title = editingBanner ? 'Edit Banner' : 'Create New Banner';

  // Modal actions
  const modalActions = (
    <>
      <AdminButton
        type="button"
        onClick={onClose}
        variant="secondary"
        disabled={submitting || imageUploading}
      >
        Cancel
      </AdminButton>
      <AdminButton
        type="submit"
        form="banner-form"
        variant="primary"
        disabled={submitting || imageUploading || !formData.title || !formData.image_url}
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
      <form id="banner-form" onSubmit={handleSubmit} className="space-y-3">
          {validationError && (
            <div className="admin-form-error" style={{padding: 'var(--admin-space-3)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--admin-error)', borderRadius: 'var(--admin-radius-md)'}}>
              {validationError}
            </div>
          )}
          {/* Title */}
          <div>
            <label className="admin-label">
              Title <span className="text-[var(--admin-error)]">*</span>
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

          {/* Image Upload - Using Compact AdminImageUpload */}
          <AdminImageUpload
            images={formData.image_url ? [formData.image_url] : []}
            onChange={handleImageChange}
            onUploadingChange={setImageUploading}
            bucket="banners"
            maxImages={1}
            maxSizeMB={5}
            accept="image/jpeg,image/png,image/webp"
            disabled={submitting}
            label="Banner Image *"
            helpText="Upload 1 banner image (JPG, PNG, WebP). Max 5MB."
            tileSize="lg"
            showPrimaryBadge={false}
          />

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
                  ? 'bg-[var(--admin-success)]/20 border-[var(--admin-success)]/30 text-[var(--admin-success)]'
                  : 'bg-[var(--admin-bg-surface)] border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-elevated)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${formData.is_active ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-text-muted)]'}`} />
              {formData.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </form>
      </AdminModal>
    );
};
