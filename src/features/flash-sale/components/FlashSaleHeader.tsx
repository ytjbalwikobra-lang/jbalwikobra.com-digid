import React from 'react';
import { ArrowLeft, Heart, Share2, Zap } from 'lucide-react';
import { PNText } from '../../../components/ui/CyberDesignSystem';

type Props = {
  onBack: () => void;
  onWishlistToggle: () => void;
  onShare: () => void;
  inWishlist: boolean;
};

const MOBILE = { HEADER_HEIGHT: 64, MIN_TOUCH: 48 } as const;

export const FlashSaleHeader: React.FC<Props> = ({ onBack, onWishlistToggle, onShare, inWishlist }) => {
  return (
    <div className="bg-[var(--cyber-bg-pure)] border-b border-[var(--cyber-border)] sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3" style={{ height: MOBILE.HEADER_HEIGHT }}>
        <button
          onClick={onBack}
          className="p-3 hover:bg-[var(--cyber-bg-surface)] rounded-cyber-lg transition-colors active:scale-95"
          style={{ minHeight: MOBILE.MIN_TOUCH, minWidth: MOBILE.MIN_TOUCH }}
          aria-label="Kembali"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-pink-500" />
          <PNText className="font-semibold text-white text-lg truncate max-w-[120px] sm:max-w-none">Flash Sale</PNText>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onWishlistToggle}
            className="p-3 hover:bg-[var(--cyber-bg-surface)] rounded-cyber-lg transition-colors active:scale-95"
            style={{ minHeight: MOBILE.MIN_TOUCH, minWidth: MOBILE.MIN_TOUCH }}
            aria-label={inWishlist ? 'Hapus dari Wishlist' : 'Tambahkan ke Wishlist'}
          >
            <Heart className={`w-6 h-6 ${inWishlist ? 'fill-pink-500 text-pink-500' : 'text-[var(--cyber-text-muted)]'}`} />
          </button>
          <button
            onClick={onShare}
            className="p-3 hover:bg-[var(--cyber-bg-surface)] rounded-cyber-lg transition-colors active:scale-95"
            style={{ minHeight: MOBILE.MIN_TOUCH, minWidth: MOBILE.MIN_TOUCH }}
            aria-label="Bagikan"
          >
            <Share2 className="w-6 h-6 text-[var(--cyber-text-muted)]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashSaleHeader;
