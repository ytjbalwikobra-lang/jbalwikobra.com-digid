import React from 'react';
import { Clock, Tag, Zap } from 'lucide-react';
import FlashSaleTimer from '../../../components/FlashSaleTimer';
import { PNCard, PNHeading, PNText } from '../../../components/ui/CyberDesignSystem';
import { formatCurrency } from '../../../utils/helpers';

type Props = {
  isActive: boolean;
  endTime?: string | null;
  effectivePrice: number;
  originalPrice?: number | null;
  discountPercentage: number;
};

export const PriceAndTimer: React.FC<Props> = ({
  isActive,
  endTime,
  effectivePrice,
  originalPrice,
  discountPercentage,
}) => {
  return (
    <div className="space-y-6">
      {/* Flash Sale Timer */}
      {isActive && endTime && (
        <PNCard className="bg-gradient-to-r from-pink-500 to-red-500 border-pink-500 rounded-cyber-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-white/20 rounded-full flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <PNHeading level={3} className="text-white font-bold text-base sm:text-lg lg:text-xl">
                Flash Sale Berakhir Dalam:
              </PNHeading>
            </div>
            <div className="w-full overflow-hidden">
              <FlashSaleTimer
                endTime={endTime}
                variant="detail"
                className="text-white text-center w-full text-xl sm:text-2xl lg:text-3xl font-bold"
              />
            </div>
          </div>
        </PNCard>
      )}

      {/* Price Block */}
      <PNCard className="bg-[var(--cyber-bg-pure)] border-[var(--cyber-border)] rounded-cyber-2xl overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {isActive && originalPrice && originalPrice > effectivePrice ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <PNHeading level={2} className="text-pink-500 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold break-words">
                      {formatCurrency(effectivePrice)}
                    </PNHeading>
                    {discountPercentage > 0 && (
                      <div className="bg-red-500 text-white px-3 py-2 rounded-full text-sm sm:text-base font-bold flex items-center gap-1 w-fit">
                        <Zap className="w-4 h-4" />
                        -{discountPercentage}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--cyber-border)] pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PNText className="text-[var(--cyber-text-muted)] line-through text-lg sm:text-xl lg:text-2xl break-words">
                    {formatCurrency(originalPrice)}
                  </PNText>
                  <div className="bg-green-600 text-white px-4 py-2 rounded-cyber-lg text-sm sm:text-base font-semibold inline-flex items-center gap-2 w-fit">
                    <Tag className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words">Hemat {formatCurrency(originalPrice - effectivePrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <PNHeading level={2} className="text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold break-words">
                {formatCurrency(effectivePrice)}
              </PNHeading>
            </div>
          )}
        </div>
      </PNCard>
    </div>
  );
};

export default PriceAndTimer;
