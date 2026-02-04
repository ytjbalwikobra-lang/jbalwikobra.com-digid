/**
 * ProductActions - Purchase and interaction buttons
 * Features buy, rental, wishlist, and share functionality
 */

import React from 'react';
import { Calendar, Shield, CheckCircle, MessageCircle, XCircle, Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { RentalOption } from '../../types';
import { PNButton, PNCard } from '../ui/CyberDesignSystem';

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
        <div className="bg-[var(--cyber-error)]/10 border border-[var(--cyber-error)]/30 rounded-cyber-lg p-4 flex items-center gap-3 animate-pulse">
          <XCircle className="text-[var(--cyber-error)] flex-shrink-0" size={20} />
          <div>
            <p className="text-[var(--cyber-error)] font-medium">
              {soldChannel ? `Produk ini sudah terjual via ${soldChannel === 'web' ? 'Website' : 'WhatsApp'}` : 'Produk tidak tersedia untuk saat ini'}
            </p>
            <p className="text-[var(--cyber-error)]/70 text-sm">Silakan cek katalog kami untuk produk serupa lainnya.</p>
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
          className={`flex items-center justify-center space-x-2 py-4 text-lg shadow-lg shadow-[var(--cyber-pink-muted)] ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-200'}`}
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
      <PNCard className="mt-8 bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] p-5 backdrop-blur-sm">
        <h4 className="text-xs font-bold text-[var(--cyber-text-muted)] uppercase tracking-wider mb-4 text-center">Jaminan Keamanan & Layanan</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] transition-colors">
            <div className="p-2 bg-[var(--cyber-success)]/10 rounded-full">
              <Shield className="text-[var(--cyber-success)]" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--cyber-text-primary)]">Garansi 100%</span>
              <span className="text-[10px] text-[var(--cyber-text-muted)]">Uang kembali jika bermasalah</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] transition-colors">
            <div className="p-2 bg-[var(--cyber-pink-subtle)] rounded-full">
              <CheckCircle className="text-[var(--cyber-pink-primary)]" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--cyber-text-primary)]">Terverifikasi</span>
              <span className="text-[10px] text-[var(--cyber-text-muted)]">Akun valid & aman</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] transition-colors">
            <div className="p-2 bg-[var(--cyber-warning)]/10 rounded-full">
              <Zap className="text-[var(--cyber-warning)]" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--cyber-text-primary)]">Kirim Otomatis</span>
              <span className="text-[10px] text-[var(--cyber-text-muted)]">Langsung dikirim detik ini</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] transition-colors">
            <div className="p-2 bg-[var(--cyber-info)]/10 rounded-full">
              <MessageCircle className="text-[var(--cyber-info)]" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--cyber-text-primary)]">Support 24/7</span>
              <span className="text-[10px] text-[var(--cyber-text-muted)]">Bantuan kapan saja</span>
            </div>
          </div>
        </div>
      </PNCard>
    </div>
  );
});

ProductActions.displayName = 'ProductActions';
