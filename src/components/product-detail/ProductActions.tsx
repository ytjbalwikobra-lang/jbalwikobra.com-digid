/**
 * ProductActions - Purchase and interaction buttons
 * Features buy, rental, wishlist, and share functionality
 */

import React from 'react';
import { CreditCard, Calendar, Shield, CheckCircle, Clock, MessageCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { RentalOption } from '../../types';
import { PNButton, PNCard } from '../ui/PinkNeonDesignSystem';

interface ProductActionsProps {
  // Product data
  stock: number;
  isActive?: boolean;
  soldChannel?: 'web' | 'wa' | null;
  
  // Rental
  cameFromFlashSaleCard: boolean;
  hasRental: boolean;
  selectedRental: RentalOption | null;
  
  // Event handlers
  onPurchase: () => void;
  onRental: (rental: RentalOption) => void;
}

export const ProductActions = React.memo(({
  stock,
  isActive = true,
  soldChannel,
  cameFromFlashSaleCard,
  hasRental,
  selectedRental,
  onPurchase,
  onRental
}: ProductActionsProps) => {
  // Check if product is unavailable (sold or inactive)
  const isUnavailable = !isActive || !!soldChannel || stock === 0;
  
  const getButtonText = () => {
    if (soldChannel === 'web') return 'Sudah Terjual via Web';
    if (soldChannel === 'wa') return 'Sudah Terjual via WA';
    if (!isActive) return 'Produk Tidak Tersedia';
    if (stock === 0) return 'Stok Habis';
    return 'Beli Sekarang';
  };

  return (
    <div className="space-y-6">
      {/* Sold/Unavailable Notice */}
      {(soldChannel || !isActive) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-300 font-medium">
              {soldChannel ? `Produk ini sudah terjual via ${soldChannel === 'web' ? 'Website' : 'WhatsApp'}` : 'Produk tidak tersedia'}
            </p>
            <p className="text-red-400/70 text-sm">Silakan lihat produk lainnya di katalog</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Purchase Button */}
        <PNButton
          variant={isUnavailable ? "secondary" : "primary"}
          size="lg"
          onClick={onPurchase}
          disabled={isUnavailable}
          fullWidth
          className={`flex items-center justify-center space-x-2 ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CreditCard size={20} />
          <span>{getButtonText()}</span>
        </PNButton>

        {/* Rental Button - hidden if user came from flash sale card */}
        {!cameFromFlashSaleCard && hasRental && selectedRental && (
          <PNButton
            variant={isUnavailable ? "secondary" : "ghost"}
            size="lg"
            onClick={() => onRental(selectedRental)}
            disabled={isUnavailable}
            fullWidth
            className={`flex items-center justify-center space-x-2 border-2 border-pink-500/50 text-pink-400 hover:bg-pink-500/10 ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Calendar size={20} />
            <span>Rental {selectedRental.duration} - {formatCurrency(selectedRental.price)}</span>
          </PNButton>
        )}
      </div>

      {/* Trust Badges */}
      <PNCard className="mt-8 bg-black/50 border border-white/10 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Shield className="text-green-500" size={16} />
            <span>Garansi 100%</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <CheckCircle className="text-pink-400" size={16} />
            <span>Akun Terverifikasi</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Clock className="text-orange-500" size={16} />
            <span>Proses 24 Jam</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <MessageCircle className="text-green-500" size={16} />
            <span>Support 24/7</span>
          </div>
        </div>
      </PNCard>
    </div>
  );
});

ProductActions.displayName = 'ProductActions';
