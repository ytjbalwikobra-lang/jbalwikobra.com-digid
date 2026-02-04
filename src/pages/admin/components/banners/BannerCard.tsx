import React from 'react';
import { Banner } from '../../../../services/adminService';
import { PNCard, PNButton } from '../../../../components/ui/CyberDesignSystem';
import { Image as ImageIcon, ExternalLink, Calendar, Activity, Eye, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface BannerCardProps {
  banner: Banner;
  onView?: (banner: Banner) => void;
  onEdit?: (banner: Banner) => void;
  onDelete?: (banner: Banner) => void;
  className?: string;
}

export const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  onView,
  onEdit,
  onDelete,
  className = ''
}) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/placeholder-banner.jpg';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-[var(--cyber-bg-elevated)]/20 text-[var(--cyber-text-muted)] border-[var(--cyber-border)]';
  };

  return (
    <PNCard className={cn(
      'group bg-gradient-to-br from-black/60 to-[var(--cyber-bg-pure)]/60 border-[var(--cyber-border)]',
      'hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/10',
      'transition-all duration-300',
      className
    )}>
      <div className="relative">
        {/* Banner Image */}
        <div className="relative aspect-video bg-[var(--cyber-bg-surface)]/50 rounded-t-cyber-2xl overflow-hidden">
          {banner.image_url ? (
            <img
              src={banner.image_url}
              alt={banner.title || 'Banner'}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-[var(--cyber-text-muted)]" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm',
              getStatusColor(banner.is_active)
            )}>
              {banner.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Order Badge */}
          {banner.sort_order !== undefined && (
            <div className="absolute top-3 right-3">
              <span className="bg-black/70 text-white px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                #{banner.sort_order}
              </span>
            </div>
          )}
        </div>

        {/* Banner Content */}
        <div className="p-6">
          {/* Title & Description */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
              {banner.title || 'Untitled Banner'}
            </h3>
            {banner.subtitle && (
              <p className="text-sm text-[var(--cyber-text-muted)] line-clamp-2">
                {banner.subtitle}
              </p>
            )}
          </div>

          {/* Banner Details */}
          <div className="space-y-3 mb-6">
            {/* Link */}
            {banner.link_url && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="w-4 h-4 text-pink-500" />
                <span className="text-[var(--cyber-text-muted)] truncate">
                  {banner.link_url}
                </span>
              </div>
            )}

            {/* Created Date */}
            {banner.created_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-[var(--cyber-text-muted)]">
                  {new Date(banner.created_at).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-[var(--cyber-text-muted)]">
                  Order: {banner.sort_order || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {/* View Button */}
            <PNButton
              variant="ghost"
              size="sm"
              onClick={() => onView?.(banner)}
              className="flex-1 mr-2 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </PNButton>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Edit */}
              <PNButton
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(banner)}
                className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-400"
              >
                <Edit2 className="w-4 h-4" />
              </PNButton>

              {/* Delete */}
              <PNButton
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(banner)}
                className="border-red-500/30 hover:bg-red-500/20 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </PNButton>
            </div>
          </div>
        </div>
      </div>
    </PNCard>
  );
};

export default BannerCard;
