import React from 'react';
import { ShoppingCart, MessageCircle } from 'lucide-react';
import { PNButton } from '../../../components/ui/CyberDesignSystem';

type Props = {
  onPurchase: () => void;
  onRental?: () => void;
  onWhatsAppRental?: () => void;
  showRental: boolean;
  isFlashSaleActive: boolean;
};

const MOBILE = { BOTTOM_SAFE: 140, MIN_TOUCH: 48 } as const;

export const BottomActions: React.FC<Props> = ({ onPurchase, onRental, onWhatsAppRental, showRental, isFlashSaleActive }) => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-[var(--cyber-bg-pure)] border-t border-[var(--cyber-border)] p-4 space-y-3 safe-area-inset-bottom backdrop-blur-sm bg-opacity-95"
      style={{ paddingBottom: `max(16px, env(safe-area-inset-bottom))`, minHeight: MOBILE.BOTTOM_SAFE }}
    >
      <PNButton
        onClick={onPurchase}
        variant="primary"
        className="w-full py-4 px-6 text-base sm:text-lg font-bold flex items-center justify-center gap-3 rounded-cyber-2xl shadow-lg active:scale-[0.98] transition-transform"
        style={{ minHeight: MOBILE.MIN_TOUCH + 8 }}
      >
        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
        <span className="text-base sm:text-lg truncate">{isFlashSaleActive ? 'Beli Flash Sale Sekarang' : 'Beli Sekarang'}</span>
      </PNButton>

      {showRental && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <PNButton
            onClick={onRental}
            variant="secondary"
            className="flex-1 py-3 sm:py-4 px-4 font-semibold text-sm sm:text-base rounded-cyber-2xl active:scale-[0.98] transition-transform"
            style={{ minHeight: MOBILE.MIN_TOUCH }}
          >
            Sewa Sekarang
          </PNButton>
          <PNButton
            onClick={onWhatsAppRental}
            className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 sm:py-4 px-4 font-semibold flex items-center justify-center gap-2 sm:gap-3 rounded-cyber-2xl text-sm sm:text-base active:scale-[0.98] transition-all"
            style={{ minHeight: MOBILE.MIN_TOUCH }}
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="truncate">WhatsApp</span>
          </PNButton>
        </div>
      )}
    </div>
  );
};

export default BottomActions;
