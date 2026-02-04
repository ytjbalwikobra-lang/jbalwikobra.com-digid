import React from 'react';
import { Star, Eye, Edit, Trash2, Calendar, User, Package, MessageSquare } from 'lucide-react';
import { Review } from '../../../services/adminService';

interface ReviewsTableProps {
  reviews: Review[];
  loading?: boolean;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void;
  onView: (review: Review) => void;
}

export const ReviewsTable: React.FC<ReviewsTableProps> = ({
  reviews,
  loading = false,
  onEdit,
  onDelete,
  onView
}) => {
  const handleDelete = (review: Review) => {
    if (!review.id) return;
    if (window.confirm(`Delete review from ${review.user_name || 'Unknown User'}?`)) {
      onDelete(review.id);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-400">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-2xl p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className="bg-black border border-gray-800 rounded-2xl p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800/50 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Reviews Found</h3>
          <p className="text-gray-400">No customer reviews match your current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rating</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Review</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-800/30 transition-colors duration-200">
                  {/* Customer */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {review.user_name || 'Unknown User'}
                        </div>
                        {review.is_verified && (
                          <div className="text-xs text-green-400">✓ Verified</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-white font-medium">
                        {review.product_name || 'produk akun game'}
                      </span>
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="px-6 py-4">
                    {renderStars(review.rating)}
                  </td>

                  {/* Review */}
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm text-gray-300 truncate">
                        {review.comment}
                      </p>
                      {review.helpful_count && review.helpful_count > 0 && (
                        <div className="text-xs text-blue-400 mt-1">
                          {review.helpful_count} found helpful
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {formatDate(review.created_at)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(review)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(review)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(review)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
            {/* Mobile Review Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {review.user_name || 'Unknown User'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(review.created_at)}
                  </div>
                  {review.is_verified && (
                    <div className="text-xs text-green-400">✓ Verified</div>
                  )}
                </div>
              </div>
              {renderStars(review.rating)}
            </div>

            {/* Product Info */}
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-white font-medium">
                {review.product_name || 'produk akun game'}
              </span>
            </div>

            {/* Review Text */}
            <div className="mb-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                {review.comment}
              </p>
              {review.helpful_count && review.helpful_count > 0 && (
                <div className="text-xs text-blue-400 mt-2">
                  {review.helpful_count} found helpful
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onView(review)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all duration-200"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => onEdit(review)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(review)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
