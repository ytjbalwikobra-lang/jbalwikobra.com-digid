import React, { useState, useEffect } from 'react';
import { X, Save, Star, User, Package, MessageSquare, Shield } from 'lucide-react';
import { Review } from '../../../services/adminService';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: Review) => void | Promise<void>;
  review?: Review | null;
  loading?: boolean;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  review,
  loading = false
}) => {
  const [formData, setFormData] = useState<Partial<Review>>({
    rating: 5,
    comment: '',
    user_name: '',
    product_name: '',
    is_verified: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (review) {
      setFormData({
        ...review,
        rating: review.rating || 5,
        comment: review.comment || '',
        user_name: review.user_name || '',
        product_name: review.product_name || '',
        is_verified: review.is_verified || false
      });
    } else {
      setFormData({
        rating: 5,
        comment: '',
        user_name: '',
        product_name: '',
        is_verified: false
      });
    }
    setErrors({});
  }, [review, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.user_name?.trim()) {
      newErrors.user_name = 'Customer name is required';
    }

    if (!formData.product_name?.trim()) {
      newErrors.product_name = 'Product name is required';
    }

    if (!formData.comment?.trim()) {
      newErrors.comment = 'Review comment is required';
    } else if (formData.comment.trim().length < 10) {
      newErrors.comment = 'Review comment must be at least 10 characters';
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5 stars';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData as Review);
  };

  const handleInputChange = (field: keyof Review, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-[var(--admin-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[var(--admin-accent)] to-[var(--admin-accent-hover)] rounded-cyber-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {review ? 'Edit Review' : 'Add New Review'}
              </h2>
              <p className="text-sm text-[var(--admin-text-muted)]">
                {review ? 'Update customer review details' : 'Create a new customer review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 text-[var(--admin-text-muted)] hover:text-white hover:bg-[var(--admin-tertiary)] rounded-xl flex items-center justify-center transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Customer Info */}
          <div className="bg-[var(--admin-tertiary)]/30 rounded-xl p-4 border border-[var(--admin-border)]">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-[var(--admin-accent)]" />
              <h3 className="text-lg font-semibold text-white">Customer Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.user_name || ''}
                  onChange={(e) => handleInputChange('user_name', e.target.value)}
                  className={`w-full px-4 py-3 bg-[var(--admin-tertiary)] border ${
                    errors.user_name ? 'border-red-500' : 'border-[var(--admin-border)]'
                  } rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] transition-all duration-200`}
                  placeholder="Enter customer name"
                />
                {errors.user_name && (
                  <p className="text-red-400 text-sm mt-1">{errors.user_name}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_verified"
                  checked={formData.is_verified || false}
                  onChange={(e) => handleInputChange('is_verified', e.target.checked)}
                  className="w-4 h-4 text-[var(--admin-accent)] bg-[var(--admin-tertiary)] border-[var(--admin-border)] rounded focus:ring-[var(--admin-accent)]"
                />
                <label htmlFor="is_verified" className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                  <Shield className="w-4 h-4 text-green-400" />
                  Verified Purchase
                </label>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-[var(--admin-tertiary)]/30 rounded-xl p-4 border border-[var(--admin-border)]">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[var(--admin-accent)]" />
              <h3 className="text-lg font-semibold text-white">Product Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.product_name || ''}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--admin-tertiary)] border ${
                  errors.product_name ? 'border-red-500' : 'border-[var(--admin-border)]'
                } rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] transition-all duration-200`}
                placeholder="Enter product name"
              />
              {errors.product_name && (
                <p className="text-red-400 text-sm mt-1">{errors.product_name}</p>
              )}
            </div>
          </div>

          {/* Review Content */}
          <div className="bg-[var(--admin-tertiary)]/30 rounded-xl p-4 border border-[var(--admin-border)]">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-[var(--admin-accent)]" />
              <h3 className="text-lg font-semibold text-white">Review Details</h3>
            </div>
            
            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-3">
                  Rating *
                </label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInputChange('rating', i + 1)}
                      className="transition-all duration-200 hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          i < (formData.rating ?? 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-3 text-[var(--admin-text-secondary)]">
                    {formData.rating ?? 0} star{(formData.rating ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                {errors.rating && (
                  <p className="text-red-400 text-sm mt-1">{errors.rating}</p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-2">
                  Review Comment *
                </label>
                <textarea
                  value={formData.comment || ''}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 bg-[var(--admin-tertiary)] border ${
                    errors.comment ? 'border-red-500' : 'border-[var(--admin-border)]'
                  } rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] transition-all duration-200 resize-none`}
                  placeholder="Enter detailed review comment..."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.comment ? (
                    <p className="text-red-400 text-sm">{errors.comment}</p>
                  ) : (
                    <p className="text-[var(--admin-text-muted)] text-sm">
                      Minimum 10 characters required
                    </p>
                  )}
                  <span className="text-[var(--admin-text-muted)] text-sm">
                    {formData.comment?.length || 0} characters
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--admin-border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[var(--admin-tertiary)] text-[var(--admin-text-secondary)] rounded-cyber-lg hover:bg-[var(--admin-primary-lighter)] transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[var(--admin-accent)] to-[var(--admin-accent-hover)] text-[var(--admin-text)] rounded-cyber-lg hover:opacity-90 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--admin-border)] border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {review ? 'Update Review' : 'Create Review'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
