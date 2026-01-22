/**
 * CheckoutModal - Redesigned Purchase/Rental Modal
 * Single-scroll experience with inline validation
 * Consistent with Pink Neon design system
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, User, Mail, CreditCard, Shield, CheckCircle, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { RentalOption } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import PhoneInput from '../PhoneInput';
import { PaymentMethods } from '../purchase-form';

interface Customer { name: string; email: string; phone: string; }

interface Props {
  visible: boolean;
  onClose: () => void;
  checkoutType: 'purchase' | 'rental';
  productName: string;
  effectivePrice: number;
  selectedRental: RentalOption | null;
  customer: Customer;
  setCustomer: (c: Customer) => void;
  isPhoneValid: boolean;
  setIsPhoneValid: (v: boolean) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  creatingInvoice: boolean;
  onCheckout: (paymentMethod: string) => void;
  onWhatsAppRental: () => void;
}

const CheckoutModal: React.FC<Props> = ({
  visible,
  onClose,
  checkoutType,
  productName,
  effectivePrice,
  selectedRental,
  customer,
  setCustomer,
  isPhoneValid,
  setIsPhoneValid,
  acceptedTerms,
  setAcceptedTerms,
  creatingInvoice,
  onCheckout
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const modalRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // Validation
  const isNameValid = customer.name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email);
  const isCustomerInfoValid = isNameValid && isEmailValid && isPhoneValid && customer.phone.length > 0;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedPaymentMethod('');
      setShowPaymentSection(false);
      setTouched({ name: false, email: false, phone: false });
    }
  }, [visible]);

  // Auto-expand payment section when customer info is valid
  useEffect(() => {
    if (isCustomerInfoValid && !showPaymentSection) {
      setShowPaymentSection(true);
      // Scroll to payment section after a brief delay
      setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isCustomerInfoValid, showPaymentSection]);
  
  const isFormComplete = useMemo(() => {
    return isCustomerInfoValid && selectedPaymentMethod && acceptedTerms;
  }, [isCustomerInfoValid, selectedPaymentMethod, acceptedTerms]);

  const handleSubmit = () => {
    if (!isFormComplete || creatingInvoice) return;
    onCheckout(selectedPaymentMethod);
  };

  // Close on escape key and implement focus trap
  useEffect(() => {
    if (!visible || !modalRef.current) return;
    
    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];
    
    // Focus first element on open
    firstEl?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Focus trap
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const isPurchase = checkoutType === 'purchase';
  const price = isPurchase ? effectivePrice : selectedRental?.price || effectivePrice;

  // Input styling
  const inputBase = "w-full h-12 px-4 pl-12 bg-white/5 border rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none transition-all duration-200";
  const inputNormal = "border-white/10 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20";
  const inputError = "border-red-500/50 bg-red-500/5 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20";
  const inputSuccess = "border-green-500/30 bg-green-500/5";

  const getInputClass = (field: 'name' | 'email' | 'phone', isValid: boolean) => {
    if (!touched[field]) return `${inputBase} ${inputNormal}`;
    return `${inputBase} ${isValid ? inputSuccess : inputError}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[99999]">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        aria-describedby="checkout-modal-price"
        className="relative w-full sm:max-w-md bg-gray-950 sm:rounded-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-gray-950 border-b border-white/10 px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="checkout-modal-title" className="text-xl font-bold text-white truncate">
                {isPurchase ? 'Checkout' : 'Rental Checkout'}
              </h2>
              <p className="text-sm text-gray-400 truncate">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-3 w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Price Badge */}
          <div id="checkout-modal-price" className="mt-4 flex items-center justify-between p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
            <span className="text-sm text-gray-300 font-medium">Total Pembayaran</span>
            <span className="text-xl font-bold text-pink-400">{formatCurrency(price)}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Section 1: Customer Information */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center">
                <User size={16} className="text-pink-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Informasi Pembeli</h3>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  placeholder="Nama Lengkap"
                  className={getInputClass('name', isNameValid)}
                />
                {touched.name && !isNameValid && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Nama minimal 2 karakter
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="Email Aktif"
                  className={getInputClass('email', isEmailValid)}
                />
                {touched.email && !isEmailValid && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Format email tidak valid
                  </p>
                )}
              </div>

              {/* Phone */}
              <div 
                className="relative"
                onBlur={() => setTouched(t => ({ ...t, phone: true }))}
              >
                <PhoneInput
                  value={customer.phone}
                  onChange={(value) => setCustomer({ ...customer, phone: value })}
                  onValidationChange={setIsPhoneValid}
                  placeholder="08xx xxxx xxxx"
                  required
                  disableAutoDetection
                  className={touched.phone && !isPhoneValid ? 'border-red-500/50' : ''}
                />
                {touched.phone && !isPhoneValid && customer.phone && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Nomor WhatsApp tidak valid
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Payment Methods (Expandable) */}
          <section ref={paymentRef}>
            <button
              onClick={() => setShowPaymentSection(!showPaymentSection)}
              disabled={!isCustomerInfoValid}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                isCustomerInfoValid
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                  : 'bg-gray-900/50 border-gray-800 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  selectedPaymentMethod ? 'bg-green-500/20' : 'bg-blue-500/20'
                }`}>
                  {selectedPaymentMethod ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <CreditCard size={14} className="text-blue-400" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-white">Metode Pembayaran</h3>
                  {selectedPaymentMethod && (
                    <p className="text-xs text-gray-400">
                      {selectedPaymentMethod.toUpperCase().replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown 
                size={18} 
                className={`text-gray-400 transition-transform ${showPaymentSection ? 'rotate-180' : ''}`} 
              />
            </button>

            {showPaymentSection && isCustomerInfoValid && (
              <div className="mt-3 animate-fade-in">
                <PaymentMethods
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={setSelectedPaymentMethod}
                  showSelection={true}
                  amount={price}
                  loading={creatingInvoice}
                  checkoutType={checkoutType}
                />
              </div>
            )}
          </section>

          {/* Section 3: Terms */}
          <section className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  acceptedTerms 
                    ? 'bg-pink-500 border-pink-500' 
                    : 'border-gray-500 group-hover:border-pink-400'
                }`}>
                  {acceptedTerms && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-300 leading-relaxed">
                Saya menyetujui{' '}
                <Link to="/terms" target="_blank" className="text-pink-400 hover:underline">
                  Syarat & Ketentuan
                </Link>
                {' '}dan{' '}
                <Link to="/privacy" target="_blank" className="text-pink-400 hover:underline">
                  Kebijakan Privasi
                </Link>
              </span>
            </label>
          </section>
        </div>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-white/10 px-5 py-5 space-y-4">
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Shield size={16} className="text-green-400" />
            <span>Transaksi aman & terenkripsi</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete || creatingInvoice}
            className={`w-full h-12 min-h-[48px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
              isFormComplete && !creatingInvoice
                ? 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {creatingInvoice ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{isPurchase ? 'Bayar Sekarang' : 'Bayar Rental'}</span>
            )}
          </button>

          {/* Validation Summary */}
          {!isFormComplete && (
            <div className="text-center text-xs text-gray-500">
              {!isCustomerInfoValid && 'Lengkapi data pembeli'}
              {isCustomerInfoValid && !selectedPaymentMethod && 'Pilih metode pembayaran'}
              {isCustomerInfoValid && selectedPaymentMethod && !acceptedTerms && 'Setujui syarat & ketentuan'}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default CheckoutModal;
