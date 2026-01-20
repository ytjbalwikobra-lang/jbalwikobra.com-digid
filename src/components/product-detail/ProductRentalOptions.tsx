/**
 * ProductRentalOptions - Rental selection component
 * Displays available rental durations and pricing
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { RentalOption } from '../../types';
import { PNHeading, PNCard, PNText } from '../ui/PinkNeonDesignSystem';

interface ProductRentalOptionsProps {
  rentalOptions: RentalOption[];
  selectedRental: RentalOption | null;
  onRentalSelect: (rental: RentalOption) => void;
  cameFromFlashSaleCard: boolean;
  hasRental: boolean;
  isFlashSaleActive?: boolean; // Add flash sale active flag
}

export const ProductRentalOptions = React.memo(({
  rentalOptions,
  selectedRental,
  onRentalSelect,
  cameFromFlashSaleCard,
  hasRental,
  isFlashSaleActive = false
}: ProductRentalOptionsProps) => {
  // Debug logging

  // Don't show rental options if:
  // 1. No rental data is available
  // 2. Product is from flash sale card
  // 3. Flash sale is currently active (prioritize flash sale over rentals)
  if (!hasRental || !rentalOptions || rentalOptions.length === 0 || cameFromFlashSaleCard || isFlashSaleActive) {
    return null;
  }

  return (
    <div className="mb-6">
      <PNHeading level={3} className="mb-3 flex items-center space-x-2">
        <Calendar className="text-pink-400" size={16} />
        <span>Opsi Rental</span>
      </PNHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rentalOptions.map((option) => (
          <PNCard
            key={option.id}
            onClick={() => onRentalSelect(option)}
            className={`p-3 cursor-pointer text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              selectedRental?.id === option.id
                ? 'border-2 border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                : 'border border-white/10 hover:bg-white/5 hover:border-pink-400/30'
            }`}
          >
            <div className="font-medium text-white">{option.duration}</div>
            <div className="text-pink-400 font-semibold">
              {formatCurrency(option.price)}
            </div>
            {option.description && (
              <PNText color="muted" className="mt-1 text-sm">{option.description}</PNText>
            )}
          </PNCard>
        ))}
      </div>
    </div>
  );
});

ProductRentalOptions.displayName = 'ProductRentalOptions';
