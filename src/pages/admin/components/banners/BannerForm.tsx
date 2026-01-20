import React, { useRef } from 'react';
import { RefreshCw, Plus, Edit, Upload } from 'lucide-react';
import { BannerFormProps, BannerFormData } from './types';
import { useModalForm } from '../../../../hooks/useModalForm';
import { useKeyboardShortcuts, createModalShortcuts } from '../../../../hooks/useKeyboardShortcuts';
import { bannerValidation } from '../../../../utils/adminValidation';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';

export const BannerForm: React.FC<BannerFormProps> = ({
  isOpen,
  onClose,
  editingBanner,
  onSubmit,
  submitting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use centralized validation
    if (!validate()) {
      return;
    }
    
    onSubmit(formData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, just use a placeholder URL
    // TODO: Implement actual upload using uploadFiles from storageService
    const mockImageUrl = `https://via.placeholder.com/800x400?text=${encodeURIComponent(file.name)}`;
    updateField('image_url', mockImageUrl);
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
                <span className="text-gray-400 text-sm">or</span>
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-all duration-200"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              </div>
              {formData.image_url && (
                <div className="rounded-lg overflow-hidden border border-gray-700">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                formData.is_active 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${formData.is_active ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              {formData.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </form>
      </AdminModal>
    );
};
