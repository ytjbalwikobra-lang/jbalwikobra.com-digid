import React from 'react';
import { Banner } from '../../../../services/adminService';
import { BannerCard } from './BannerCard';
import { Image as ImageIcon } from 'lucide-react';

interface BannersGridProps {
  banners: Banner[];
  loading?: boolean;
  onBannerView?: (banner: Banner) => void;
  onBannerEdit?: (banner: Banner) => void;
  onBannerDelete?: (banner: Banner) => void;
  className?: string;
}

export const BannersGrid: React.FC<BannersGridProps> = ({
  banners,
  loading = false,
  onBannerView,
  onBannerEdit,
  onBannerDelete,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-600/20"
          >
            <div className="aspect-video bg-gray-700/50 rounded-t-2xl" />
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                <div className="h-3 bg-gray-700/30 rounded w-full" />
                <div className="h-3 bg-gray-700/30 rounded w-5/6" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700/30 rounded w-2/3" />
                <div className="h-3 bg-gray-700/30 rounded w-1/2" />
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-700/30">
                <div className="flex-1 h-8 bg-gray-700/30 rounded-xl" />
                <div className="w-8 h-8 bg-gray-700/30 rounded-xl" />
                <div className="w-8 h-8 bg-gray-700/30 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Banners Found</h3>
        <p className="text-gray-400 max-w-md">
          No banners match your current criteria. Try adjusting your filters or add a new banner.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {banners.map((banner) => (
        <BannerCard
          key={banner.id}
          banner={banner}
          onView={onBannerView}
          onEdit={onBannerEdit}
          onDelete={onBannerDelete}
        />
      ))}
    </div>
  );
};

export default BannersGrid;
