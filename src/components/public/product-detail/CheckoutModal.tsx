import React, { useState, useMemo, useEffect } from 'react';
import { Info, Calendar, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { RentalOption } from '../../../types';
import { PNSection, PNButton } from '../../ui/PinkNeonDesignSystem';
import {
  PurchaseFormHeader,
  CustomerInfoForm,
  PaymentMethods,
  PurchaseActions
} from '../../purchase-form';

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
  onCheckout,
  onWhatsAppRental
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const modalContentRef = React.useRef<HTMLDivElement>(null);

  // Reset step when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setErrors({});
    }
  }, [visible]);

  // Auto scroll to top when step changes
  useEffect(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Handle payment method selection (don't redirect immediately)
  const handlePaymentMethodSelect = (methodId: string) => {
    console.log('Payment method selected:', methodId);
    setSelectedPaymentMethod(methodId);
    // Don't trigger form submission - wait for user to click "Bayar Sekarang"
  };

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      customer.name.trim().length > 0 &&
      customer.email.trim().length > 0 &&
      customer.phone.trim().length > 0 &&
      isPhoneValid &&
      acceptedTerms && // Both rental and purchase now require terms acceptance
      selectedPaymentMethod.trim().length > 0 // Payment method required for both rental and purchase
    );
  }, [customer, isPhoneValid, selectedPaymentMethod, checkoutType, acceptedTerms]);

  // Step validation
  const isStep1Valid = useMemo(() => {
    return (
      customer.name.trim().length > 0 &&
      customer.email.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(customer.email) &&
      customer.phone.trim().length > 0 &&
      isPhoneValid
    );
  }, [customer, isPhoneValid]);

  const isStep2Valid = useMemo(() => {
    return selectedPaymentMethod.trim().length > 0;
  }, [selectedPaymentMethod]);

  const isStep3Valid = useMemo(() => {
    return acceptedTerms;
  }, [acceptedTerms]);

  // Form errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    paymentMethod?: string;
    terms?: string;
  }>({});

  // Validate current step
  const validateCurrentStep = () => {
    const newErrors: typeof errors = {};
    
    if (currentStep === 1) {
      if (!customer.name.trim()) {
        newErrors.name = 'Nama lengkap wajib diisi';
      }
      
      if (!customer.email.trim()) {
        newErrors.email = 'Email wajib diisi';
      } else if (!/\S+@\S+\.\S+/.test(customer.email)) {
        newErrors.email = 'Format email tidak valid';
      }
      
      if (!customer.phone.trim()) {
        newErrors.phone = 'Nomor WhatsApp wajib diisi';
      } else if (!isPhoneValid) {
        newErrors.phone = 'Format nomor WhatsApp tidak valid';
      }
    } else if (currentStep === 2) {
      if (!selectedPaymentMethod.trim()) {
        newErrors.paymentMethod = 'Pilih metode pembayaran';
      }
    } else if (currentStep === 3) {
      if (!acceptedTerms) {
        newErrors.terms = 'Anda harus menyetujui syarat dan ketentuan';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setErrors({});
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  // Validate form on submit
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!customer.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi';
    }
    
    if (!customer.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(customer.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    
    if (!customer.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp wajib diisi';
    } else if (!isPhoneValid) {
      newErrors.phone = 'Format nomor WhatsApp tidak valid';
    }

    if (!selectedPaymentMethod.trim()) {
      newErrors.paymentMethod = 'Pilih metode pembayaran';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'Anda harus menyetujui syarat dan ketentuan';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prevent duplicate submissions
    if (creatingInvoice) {
      console.log('🚫 Already creating invoice, ignoring submission');
      return;
    }

    if (checkoutType === 'purchase') {
      onCheckout(selectedPaymentMethod);
    } else {
      // For rental, always use Xendit payment (payment method is now required)
      onCheckout(selectedPaymentMethod);
    }
  };

  if (!visible) return null;

  // Step configuration
  const steps = [
    { number: 1, title: 'Informasi Pembeli', icon: '👤' },
    { number: 2, title: 'Metode Pembayaran', icon: '💳' },
    { number: 3, title: 'Konfirmasi', icon: '✅' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center p-2 pt-4 md:p-4 z-[99999]">
      <div className="relative max-w-xl w-full mt-0 md:mt-0">
        {/* Glow effects - reduced */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-pink-500/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-fuchsia-600/15 rounded-full blur-2xl" />
        </div>
        
        {/* Modal content with PinkNeon design - more compact */}
        <div className="relative bg-black border border-white/10 rounded-xl backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_40px_-12px_rgba(0,0,0,0.25)] max-h-[95vh] md:max-h-[88vh] overflow-hidden">
          {/* Scrollable Content */}
          <div 
            ref={modalContentRef}
            className="overflow-y-auto max-h-[95vh] md:max-h-[88vh] p-2.5 md:p-4"
          >
            <form className="space-y-2.5 md:space-y-3">
              {/* Header */}
              <PurchaseFormHeader
                checkoutType={checkoutType}
                productName={productName}
                effectivePrice={effectivePrice}
                selectedRental={selectedRental}
                onClose={onClose}
              />

              {/* Step Progress Indicator - more compact */}
              <div className="relative">
                {/* Progress bar background */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-800 rounded-full" />
                
                {/* Active progress bar */}
                <div 
                  className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                />

                {/* Step indicators */}
                <div className="relative flex justify-between">
                  {steps.map((step) => (
                    <div key={step.number} className="flex flex-col items-center">
                      {/* Circle indicator - smaller */}
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-semibold transition-all duration-300 ${
                          currentStep > step.number
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/40'
                            : currentStep === step.number
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/40 scale-105'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                        }`}
                      >
                        {currentStep > step.number ? (
                          <Check size={16} />
                        ) : (
                          <span className="text-sm">{step.icon}</span>
                        )}
                      </div>
                      
                      {/* Step title - smaller */}
                      <div 
                        className={`mt-1 text-[9px] md:text-[10px] font-medium transition-colors duration-300 text-center max-w-[60px] md:max-w-none ${
                          currentStep >= step.number ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Content - more compact */}
              <div className="min-h-[200px]">
                {/* Step 1: Customer Information */}
                {currentStep === 1 && (
                  <div className="animate-fade-in space-y-2">
                    {/* Step Info - more compact */}
                    <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-pink-200">
                        📝 <strong>Langkah 1 dari 3:</strong> Masukkan informasi pembeli.
                      </p>
                    </div>
                    
                    <CustomerInfoForm
                      customer={customer}
                      setCustomer={setCustomer}
                      isPhoneValid={isPhoneValid}
                      setIsPhoneValid={setIsPhoneValid}
                      errors={errors}
                    />
                  </div>
                )}

                {/* Step 2: Payment Methods */}
                {currentStep === 2 && (
                  <div className="animate-fade-in space-y-2">
                    {/* Step Info - more compact */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-blue-200">
                        💳 <strong>Langkah 2 dari 3:</strong> Pilih metode pembayaran.
                      </p>
                    </div>
                    
                    <PaymentMethods 
                      selectedMethod={selectedPaymentMethod}
                      onMethodSelect={handlePaymentMethodSelect}
                      showSelection={true} 
                      amount={effectivePrice}
                      loading={creatingInvoice}
                      error={errors.paymentMethod}
                      checkoutType={checkoutType}
                    />
                  </div>
                )}

                {/* Step 3: Terms and Confirmation */}
                {currentStep === 3 && (
                  <div className="animate-fade-in space-y-2">
                    {/* Step Info - more compact */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-green-200">
                        ✅ <strong>Langkah 3 dari 3:</strong> Tinjau dan setujui.
                      </p>
                    </div>

                    {/* Order Summary - more compact */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2.5">
                      <h3 className="text-sm font-semibold text-white mb-1.5">Ringkasan Pesanan</h3>
                      <div className="space-y-1 text-[11px] md:text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Nama:</span>
                          <span className="text-white font-medium">{customer.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email:</span>
                          <span className="text-white font-medium">{customer.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">WhatsApp:</span>
                          <span className="text-white font-medium">{customer.phone}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2"></div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Metode Pembayaran:</span>
                          <span className="text-white font-medium">
                            {selectedPaymentMethod ? selectedPaymentMethod.toUpperCase().replace(/_/g, ' ') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <PurchaseActions
                      checkoutType={checkoutType}
                      acceptedTerms={acceptedTerms}
                      setAcceptedTerms={setAcceptedTerms}
                      creatingInvoice={creatingInvoice}
                      isFormValid={isFormValid}
                      onCheckout={() => handleSubmit()}
                      onWhatsAppRental={() => handleSubmit()}
                      onCancel={onClose}
                      selectedPaymentMethod={selectedPaymentMethod}
                      termsError={errors.terms}
                    />
                  </div>
                )}
              </div>

              {/* Navigation Buttons - more compact */}
              {currentStep < 3 && (
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <PNButton
                    variant="ghost"
                    size="md"
                    onClick={currentStep === 1 ? onClose : handlePrevStep}
                    className="flex-1 border border-gray-600 text-gray-300 hover:bg-gray-800 flex items-center justify-center gap-1 min-w-0 whitespace-nowrap py-2"
                  >
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <span className="truncate text-sm">{currentStep === 1 ? 'Tutup' : 'Kembali'}</span>
                  </PNButton>
                  
                  <PNButton
                    variant="primary"
                    size="md"
                    onClick={handleNextStep}
                    disabled={
                      (currentStep === 1 && !isStep1Valid) ||
                      (currentStep === 2 && !isStep2Valid)
                    }
                    className={`flex-1 flex items-center justify-center gap-1 min-w-0 whitespace-nowrap py-2 ${
                      ((currentStep === 1 && isStep1Valid) || (currentStep === 2 && isStep2Valid))
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="truncate text-sm">Lanjutkan</span>
                    <ChevronRight size={16} className="flex-shrink-0" />
                  </PNButton>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
