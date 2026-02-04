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
            className="animate-pulse bg-gradient-to-br from-[var(--cyber-bg-surface)]/50 to-[var(--cyber-bg-pure)]/50 rounded-cyber-3xl border border-[var(--cyber-border)]"
          >
            <div className="aspect-video bg-[var(--cyber-bg-elevated)]/50 rounded-t-cyber-2xl" />
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-4 bg-[var(--cyber-bg-elevated)]/50 rounded w-3/4" />
                <div className="h-3 bg-[var(--cyber-bg-card)]/30 rounded w-full" />
                <div className="h-3 bg-[var(--cyber-bg-card)]/30 rounded w-5/6" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--cyber-bg-card)]/30 rounded w-2/3" />
                <div className="h-3 bg-[var(--cyber-bg-card)]/30 rounded w-1/2" />
              </div>
              <div className="flex gap-2 pt-4 border-t border-[var(--cyber-border)]/30">
                <div className="flex-1 h-8 bg-[var(--cyber-bg-card)]/30 rounded-cyber-lg" />
                <div className="w-8 h-8 bg-[var(--cyber-bg-card)]/30 rounded-cyber-lg" />
                <div className="w-8 h-8 bg-[var(--cyber-bg-card)]/30 rounded-cyber-lg" />
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
        <div className="w-24 h-24 bg-[var(--cyber-bg-surface)]/50 rounded-cyber-3xl flex items-center justify-center mb-6">
          <ImageIcon className="w-12 h-12 text-[var(--cyber-text-muted)]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Banners Found</h3>
        <p className="text-[var(--cyber-text-muted)] max-w-md">
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
