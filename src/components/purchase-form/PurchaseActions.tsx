/**
 * PurchaseActions - Action buttons for purchase/rental forms
 * Handles terms acceptance, loading states, and action buttons
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MessageSquare, CheckCircle, Loader } from 'lucide-react';
import { PNButton, PNText } from '../ui/PinkNeonDesignSystem';

interface PurchaseActionsProps {
  checkoutType: 'purchase' | 'rental';
  acceptedTerms: boolean;
  setAcceptedTerms: (accepted: boolean) => void;
  creatingInvoice: boolean;
  isFormValid: boolean;
  onCheckout: () => void;
  onWhatsAppRental: () => void;
  onCancel: () => void;
  selectedPaymentMethod?: string; // Add selectedPaymentMethod prop
  termsError?: string; // Add terms error prop
}

export const PurchaseActions = React.memo(({
  checkoutType,
  acceptedTerms,
  setAcceptedTerms,
  creatingInvoice,
  isFormValid,
  onCheckout,
  onWhatsAppRental,
  onCancel,
  selectedPaymentMethod,
  termsError
}: PurchaseActionsProps) => {
  const isPurchase = checkoutType === 'purchase';
  // Both purchase and rental now require terms acceptance and payment method
  const canProceed = acceptedTerms && isFormValid && !creatingInvoice;

  return (
    <div className="space-y-3">
      {/* Terms and Conditions for Both Purchase and Rental */}
      <div className="space-y-2">
        <label className="flex items-start space-x-2 cursor-pointer">
          <div className="relative mt-1">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="sr-only"
            />
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
              ${acceptedTerms 
                ? 'bg-pink-500 border-pink-500' 
                : 'border-gray-400 hover:border-pink-400'
              }
            `}>
              {acceptedTerms && <CheckCircle className="text-white" size={12} />}
            </div>
          </div>
          <div className="flex-1">
            <PNText className="text-sm leading-relaxed">
              Saya menyetujui{' '}
              <Link 
                to="/terms" 
                className="text-pink-400 underline hover:text-pink-300 transition-colors"
                target="_blank" 
                rel="noreferrer"
              >
                Syarat & Ketentuan
              </Link>
              {' '}dan{' '}
              <Link 
                to="/privacy" 
                className="text-pink-400 underline hover:text-pink-300 transition-colors"
                target="_blank" 
                rel="noreferrer"
              >
                Kebijakan Privasi
              </Link>
            </PNText>
          </div>
        </label>
        {termsError && (
          <PNText className="text-red-400 text-xs mt-1">{termsError}</PNText>
        )}
      </div>

      {/* Security & Support Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-xs">
          <Shield className="text-green-400 flex-shrink-0" size={16} />
          <PNText className="text-gray-300">Pembayaran Aman</PNText>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <MessageSquare className="text-blue-400 flex-shrink-0" size={16} />
          <PNText className="text-gray-300">Support 24/7</PNText>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2\">
        <PNButton
          variant="ghost"
          size="md"
          onClick={onCancel}
          className="flex-1 border border-gray-600 text-gray-300 hover:bg-gray-800 py-2 text-sm"
        >
          Batal
        </PNButton>

        {isPurchase ? (
          <PNButton
            variant="primary"
            size="md"
            onClick={onCheckout}
            disabled={!canProceed}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm ${
              canProceed 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {creatingInvoice && (
              <Loader className="animate-spin" size={18} />
            )}
            <span>
              {creatingInvoice ? 'Memproses...' : 'Bayar Sekarang'}
            </span>
          </PNButton>
        ) : (
          // Rental always uses Xendit payment now
          <PNButton
            variant="primary"
            size="lg"
            onClick={onCheckout}
            disabled={!canProceed}
            className={`flex-1 flex items-center justify-center space-x-2 ${
              canProceed 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {creatingInvoice && (
              <Loader className="animate-spin" size={18} />
            )}
            <span>
              {creatingInvoice ? 'Memproses...' : 'Bayar Rental'}
            </span>
          </PNButton>
        )}
      </div>

      {/* Additional Info */}
      <div className="text-center">
        <PNText className="text-xs text-gray-400">
          Setelah pembayaran berhasil, Tim kami akan menghubungi Anda via WhatsApp untuk proses selanjutnya
        </PNText>
      </div>
    </div>
  );
});

PurchaseActions.displayName = 'PurchaseActions';
