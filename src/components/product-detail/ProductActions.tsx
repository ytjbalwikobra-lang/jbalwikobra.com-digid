/**
 * ProductActions - Purchase and interaction buttons
 * Features buy, rental, wishlist, and share functionality
 */

import React from 'react';
import { Calendar, Shield, CheckCircle, MessageCircle, XCircle, Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { RentalOption } from '../../types';
import { PNButton, PNCard } from '../ui/PinkNeonDesignSystem';

interface ProductActionsProps {
  // Product data
  stock: number;
  isActive?: boolean;
  soldChannel?: 'web' | 'wa' | null;
  
  // Rental
  cameFromFlashSaleCard?: boolean; // Deprecated: no longer affects rental visibility
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
  // cameFromFlashSaleCard is kept for backward compat but no longer used
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
    if (stock === 0) return '❌ Stok Sedang Kosong';
    return '🔥 Beli Sekarang (Instan)';
  };

  return (
    <div className="space-y-6">
      {/* Sold/Unavailable Notice */}
      {(soldChannel || !isActive) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <XCircle className="text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-300 font-medium">
              {soldChannel ? `Produk ini sudah terjual via ${soldChannel === 'web' ? 'Website' : 'WhatsApp'}` : 'Produk tidak tersedia untuk saat ini'}
            </p>
            <p className="text-red-400/70 text-sm">Silakan cek katalog kami untuk produk serupa lainnya.</p>
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
          className={`flex items-center justify-center space-x-2 py-4 text-lg shadow-lg shadow-pink-500/20 ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-200'}`}
        >
          {!isUnavailable && <Zap className="fill-current animate-pulse" size={20} />}
          <span>{getButtonText()}</span>
        </PNButton>

        {/* Rental Button - show if product has rental options */}
        {hasRental && selectedRental && (
          <PNButton
            variant={isUnavailable ? "secondary" : "ghost"}
            size="lg"
            onClick={() => onRental(selectedRental)}
            disabled={isUnavailable}
            fullWidth
            className={`flex items-center justify-center space-x-2 border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/5 ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-200'}`}
          >
            <Calendar size={20} />
            <span>📅 Sewa Akun ({selectedRental.duration}) - {formatCurrency(selectedRental.price)}</span>
          </PNButton>
        )}
      </div>

      {/* Trust Badges - Modern Grid Layout */}
      <PNCard className="mt-8 bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Jaminan Keamanan & Layanan</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="p-2 bg-green-500/10 rounded-full">
              <Shield className="text-green-400" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Garansi 100%</span>
              <span className="text-[10px] text-gray-400">Uang kembali jika bermasalah</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="p-2 bg-pink-500/10 rounded-full">
              <CheckCircle className="text-pink-400" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Terverifikasi</span>
              <span className="text-[10px] text-gray-400">Akun valid & aman</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="p-2 bg-orange-500/10 rounded-full">
              <Zap className="text-orange-400" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Kirim Otomatis</span>
              <span className="text-[10px] text-gray-400">Langsung dikirim detik ini</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <MessageCircle className="text-blue-400" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Support 24/7</span>
              <span className="text-[10px] text-gray-400">Bantuan kapan saja</span>
            </div>
          </div>
        </div>
      </PNCard>
    </div>
  );
});

ProductActions.displayName = 'ProductActions';
