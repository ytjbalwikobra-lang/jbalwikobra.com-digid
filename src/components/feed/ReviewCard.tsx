import React from 'react';
import { PNCard, PNText, PNButton } from '../ui/PinkNeonDesignSystem';
import { Star, Edit2, Save, X, MessageSquare, Clock, User, Package } from 'lucide-react';

export interface ReviewData {
  id: string;
  user_id?: string;
  user_name?: string | null;
  user_avatar?: string | null;
  rating: number;
  created_at: string;
  product_name?: string | null;
  product_image?: string | null;
  comment: string;
  canEdit?: boolean;
}

interface ReviewCardProps {
  review: ReviewData;
  currentUserId?: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (review: ReviewData) => void;
  onChangeEdit: (val: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onImageClick?: (src: string) => void;
}

const Stars: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({ rating, size = 'sm' }) => {
  const starSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star 
          key={i} 
          className={`
            ${starSizes[size]} transition-all duration-200
            ${i < rating 
              ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' 
              : 'text-gray-400 hover:text-gray-400'
            }
          `} 
        />
      ))}
    </div>
  );
};

const timeAgo = (date: string) => {
  const now = new Date();
  const created = new Date(date);
  const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  if (diff < 1) return 'Baru saja';
  if (diff < 60) return `${diff} menit lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return `${Math.floor(diff / 1440)} hari lalu`;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  currentUserId,
  isEditing,
  editValue,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  onImageClick
}) => {
  const canEdit = review.user_id === currentUserId && review.canEdit;

  return (
    <PNCard className="p-6 lg:p-8 hover:shadow-2xl hover:shadow-purple-500/10 group transition-all duration-300">
      {/* Content */}
      <div className="relative">
        {/* Header with enhanced user info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Enhanced avatar */}
            <div className="relative">
              {review.user_avatar ? (
                <img 
                  src={review.user_avatar} 
                  alt={review.user_name || 'User'} 
                  className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl object-cover border-2 border-purple-500/30 shadow-lg"
                  loading="lazy" 
                />
              ) : (
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white border-2 border-purple-500/30 shadow-lg">
                  {(review.user_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div className="text-lg font-semibold text-white group-hover:text-gray-100 transition-colors">
                  {review.user_name || 'Anonymous'}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Stars rating={review.rating} size="md" />
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(review.created_at)}</span>
                </div>
              </div>
              
              {review.product_name && (
                <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                  <Package className="w-3 h-3" />
                  <span>Review untuk: <span className="font-medium">{review.product_name}</span></span>
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced edit button */}
          {canEdit && (
            <button 
              onClick={() => onStartEdit(review)} 
              className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-purple-500/30 text-white/70 hover:text-white transition-all duration-300 rounded-xl gap-2 px-3 py-2 flex items-center"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        
        {/* Content section with improved layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Product image section */}
          {review.product_image && (
            <div className="lg:w-40 flex-shrink-0">
              <button 
                onClick={() => onImageClick?.(review.product_image!)} 
                className="group/image relative block w-full"
                aria-label="Lihat gambar produk"
              >
                <img 
                  src={review.product_image} 
                  alt={review.product_name || 'Product'} 
                  className="w-full aspect-square lg:aspect-[4/3] rounded-2xl object-cover border border-white/10 shadow-lg group-hover/image:scale-105 transition-transform duration-300"
                  loading="lazy" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 rounded-2xl transition-colors duration-300 flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                </div>
              </button>
            </div>
          )}
          
          {/* Review content */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <textarea 
                  value={editValue} 
                  onChange={(e) => onChangeEdit(e.target.value)} 
                  placeholder="Tulis review Anda..." 
                  className="w-full min-h-[120px] p-4 bg-black/40 border border-white/20 rounded-2xl resize-none 
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           text-white placeholder-gray-400 text-base leading-relaxed
                           backdrop-blur-sm"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => onSaveEdit(review.id)} 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-transparent text-white shadow-lg shadow-purple-500/30 gap-2 px-4 py-2 rounded-xl flex items-center"
                  >
                    <Save className="h-4 w-4" />
                    Simpan
                  </button>
                  <button 
                    onClick={onCancelEdit} 
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white gap-2 px-4 py-2 rounded-xl flex items-center"
                  >
                    <X className="h-4 w-4" />
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-100 text-base lg:text-lg leading-relaxed">
                  {review.comment}
                </p>
                
                {canEdit && (
                  <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 px-3 py-2 rounded-xl border border-purple-500/20 w-fit">
                    <Clock className="w-3 h-3" />
                    <span>Review dapat diedit dalam 5 menit</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PNCard>
  );
};

export default ReviewCard;
