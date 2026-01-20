/**
 * Sold Via WA Modal Component - V3 Design System
 * Modal for confirming and adjusting sale price when marking product as sold via WhatsApp
 * WCAG 2.1 AA Compliant with keyboard navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumberID, parseNumberID } from '../../../../utils/helpers';
import { AdminModal } from './AdminModal';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image?: string;
}

export interface SoldViaWAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, soldPrice: number) => Promise<void>;
  product: Product | null;
}

export const SoldViaWAModal: React.FC<SoldViaWAModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  product
}) => {
  const [soldPrice, setSoldPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isOpen && product) {
      const initialPrice = product.price || 0;
      setSoldPrice(String(initialPrice));
      setDisplayPrice(formatNumberID(initialPrice));
      setError(null);
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, product]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const numericValue = parseInt(raw, 10) || 0;
    setSoldPrice(String(numericValue));
    setDisplayPrice(formatNumberID(numericValue));
  };

  const handleSubmit = async () => {
    if (!product) return;
    
    const numericPrice = parseNumberID(soldPrice);
    
    if (numericPrice <= 0) {
      setError('Harga harus lebih dari 0');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onConfirm(product.id, numericPrice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!product) return null;

  const numericSoldPrice = parseNumberID(soldPrice);
  const originalPrice = product.price || 0;
  const priceDifference = numericSoldPrice - originalPrice;
  const hasDiscount = priceDifference < 0;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tandai Terjual via WhatsApp"
      size="sm"
      actions={
        <>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={onClose} 
            disabled={loading}
          >
            Batal
          </button>
          <button 
            className="admin-btn admin-btn-primary flex items-center gap-2" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <MessageCircle size={16} />
                Tandai Terjual
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Product Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          {product.image && (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">{product.name}</h4>
            <p className="text-sm text-gray-400">
              Harga asli: {formatCurrency(originalPrice)}
            </p>
          </div>
        </div>

        {/* Price Input */}
        <div>
          <label 
            htmlFor="sold-price" 
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Harga Jual Sebenarnya
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
            <input
              ref={inputRef}
              id="sold-price"
              type="text"
              inputMode="numeric"
              value={displayPrice}
              onChange={handlePriceChange}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              placeholder="Masukkan harga jual"
              disabled={loading}
              aria-describedby={error ? 'price-error' : undefined}
            />
          </div>
          {error && (
            <p id="price-error" className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
        </div>

        {/* Price Difference Indicator */}
        {numericSoldPrice > 0 && priceDifference !== 0 && (
          <div className={`p-3 rounded-lg ${hasDiscount ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
            <p className={`text-sm ${hasDiscount ? 'text-yellow-300' : 'text-green-300'}`}>
              {hasDiscount ? (
                <>
                  <span className="font-medium">Diskon:</span> {formatCurrency(Math.abs(priceDifference))} dari harga asli
                </>
              ) : (
                <>
                  <span className="font-medium">Markup:</span> +{formatCurrency(priceDifference)} dari harga asli
                </>
              )}
            </p>
          </div>
        )}

        {/* Confirmation Note */}
        <p className="text-xs text-gray-500">
          Produk akan ditandai sebagai tidak aktif dan terjual via WhatsApp dengan harga yang Anda masukkan.
        </p>
      </div>
    </AdminModal>
  );
};

/**
 * Hook for using SoldViaWA modal
 * 
 * Usage:
 * const { showSoldViaWAModal, SoldViaWAModalComponent } = useSoldViaWAModal();
 * 
 * // In JSX
 * <SoldViaWAModalComponent />
 * 
 * // To show modal
 * const handleMarkSold = async (product: Product) => {
 *   const result = await showSoldViaWAModal(product);
 *   if (result) {
 *     // result contains { productId, soldPrice }
 *   }
 * };
 */
export const useSoldViaWAModal = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
    resolve: ((value: { productId: string; soldPrice: number } | null) => void) | null;
  }>({
    isOpen: false,
    product: null,
    resolve: null
  });

  const showSoldViaWAModal = (
    product: Product
  ): Promise<{ productId: string; soldPrice: number } | null> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        product,
        resolve
      });
    });
  };

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (modalState.resolve) {
      modalState.resolve(null);
    }
  };

  const handleConfirm = async (productId: string, soldPrice: number) => {
    if (modalState.resolve) {
      modalState.resolve({ productId, soldPrice });
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const SoldViaWAModalComponent = () => (
    <SoldViaWAModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      product={modalState.product}
    />
  );

  return {
    showSoldViaWAModal,
    SoldViaWAModalComponent
  };
};
