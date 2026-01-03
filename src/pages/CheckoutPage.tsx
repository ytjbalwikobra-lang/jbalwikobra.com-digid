import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, ArrowLeft } from 'lucide-react';
import { RentalOption } from '../types';
import { PNContainer, PNSection, PNButton } from '../components/ui/PinkNeonDesignSystem';
import {
  PurchaseFormHeader,
  CustomerInfoForm,
  PaymentMethods,
  PurchaseActions
} from '../components/purchase-form';

interface Customer { 
  name: string; 
  email: string; 
  phone: string; 
}

interface CheckoutState {
  checkoutType: 'purchase' | 'rental';
  productName: string;
  effectivePrice: number;
  selectedRental: RentalOption | null;
  customer: Customer;
  isPhoneValid: boolean;
  acceptedTerms: boolean;
  creatingInvoice: boolean;
  productId?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutData = location.state as CheckoutState;

  // Redirect if no checkout data
  useEffect(() => {
    if (!checkoutData || !checkoutData.productName) {
      navigate('/', { replace: true });
    }
  }, [checkoutData, navigate]);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [customer, setCustomer] = useState<Customer>(
    checkoutData?.customer || { name: '', email: '', phone: '' }
  );
  const [isPhoneValid, setIsPhoneValid] = useState(checkoutData?.isPhoneValid || false);
  const [acceptedTerms, setAcceptedTerms] = useState(checkoutData?.acceptedTerms || false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    paymentMethod?: string;
    terms?: string;
  }>({});

  if (!checkoutData) {
    return null;
  }

  const { checkoutType, productName, effectivePrice, selectedRental } = checkoutData;

  // Step configuration
  const steps = [
    { number: 1, title: 'Informasi Pembeli', icon: '👤' },
    { number: 2, title: 'Metode Pembayaran', icon: '💳' },
    { number: 3, title: 'Konfirmasi', icon: '✅' }
  ];

  // Handle payment method selection
  const handlePaymentMethodSelect = (methodId: string) => {
    console.log('Payment method selected:', methodId);
    setSelectedPaymentMethod(methodId);
    setErrors(prev => ({ ...prev, paymentMethod: undefined }));
  };

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      customer.name.trim().length > 0 &&
      customer.email.trim().length > 0 &&
      customer.phone.trim().length > 0 &&
      isPhoneValid &&
      acceptedTerms &&
      selectedPaymentMethod.trim().length > 0
    );
  }, [customer, isPhoneValid, selectedPaymentMethod, acceptedTerms]);

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

  // Navigation handlers
  const handleNextStep = () => {
    if (currentStep === 1 && !isStep1Valid) {
      setErrors({
        name: !customer.name.trim() ? 'Nama harus diisi' : undefined,
        email: !customer.email.trim() ? 'Email harus diisi' : !(/\S+@\S+\.\S+/.test(customer.email)) ? 'Email tidak valid' : undefined,
        phone: !customer.phone.trim() || !isPhoneValid ? 'Nomor WhatsApp tidak valid' : undefined
      });
      return;
    }

    if (currentStep === 2 && !isStep2Valid) {
      setErrors({ paymentMethod: 'Pilih metode pembayaran' });
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid) {
      setErrors({
        terms: !acceptedTerms ? 'Anda harus menyetujui syarat dan ketentuan' : undefined,
        paymentMethod: !selectedPaymentMethod ? 'Pilih metode pembayaran' : undefined
      });
      return;
    }

    if (creatingInvoice) {
      console.log('🚫 Already creating invoice, ignoring submission');
      return;
    }

    setCreatingInvoice(true);

    try {
      console.log('🚀 Starting order creation process...');
      
      const { createXenditInvoice } = await import('../services/paymentService');
      
      // Generate unique external ID
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substr(2, 9);
      const random2 = performance.now().toString(36).substr(2, 5);
      const random3 = Math.random().toString(36).substr(2, 4);
      const externalId = `order_${timestamp}_${random1}_${random2}_${random3}`;
      
      console.log('📝 Generated external ID:', externalId);
      
      const amount = effectivePrice;
      
      const invoiceData = await createXenditInvoice({
        externalId,
        amount,
        payerEmail: customer.email,
        description: `Pembelian ${productName}`,
        successRedirectUrl: `${window.location.origin}/payment-status?status=success`,
        failureRedirectUrl: `${window.location.origin}/payment-status?status=failed`,
        paymentMethod: selectedPaymentMethod,
        customer: {
          given_names: customer.name,
          email: customer.email,
          mobile_number: customer.phone,
        },
        order: {
          product_id: checkoutData.productId || '',
          product_name: productName,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          order_type: checkoutType,
          amount,
          rental_duration: checkoutType === 'rental' ? selectedRental?.duration : null,
        }
      });
      
      // Redirect to payment
      const paymentParams = new URLSearchParams({
        id: invoiceData.id,
        method: selectedPaymentMethod || 'unknown',
        amount: amount.toString(),
        external_id: externalId,
        description: `Pembelian ${productName}`
      });
      
      // For e-wallets that require immediate redirect
      if (invoiceData.invoice_url && 
          selectedPaymentMethod && 
          ['dana', 'gopay', 'linkaja', 'shopeepay', 'ovo'].includes(selectedPaymentMethod.toLowerCase())) {
        window.location.href = invoiceData.invoice_url;
      } else {
        window.location.href = `/payment?${paymentParams.toString()}`;
      }
      
    } catch (error) {
      console.error('❌ Checkout error:', error);
      setCreatingInvoice(false);
      setErrors({ terms: 'Gagal membuat invoice. Silakan coba lagi.' });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <PNContainer>
        <PNSection className="py-4 md:py-6">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Kembali</span>
          </button>

          {/* Main checkout content */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-black border border-white/10 rounded-xl p-4 md:p-6 space-y-4">
              {/* Header */}
              <PurchaseFormHeader
                checkoutType={checkoutType}
                productName={productName}
                effectivePrice={effectivePrice}
                selectedRental={selectedRental}
                onClose={handleBack}
              />

              {/* Step Progress Indicator */}
              <div className="relative">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-800 rounded-full" />
                <div 
                  className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                />

                <div className="relative flex justify-between">
                  {steps.map((step) => (
                    <div key={step.number} className="flex flex-col items-center">
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

              {/* Step Content */}
              <div className="min-h-[200px]">
                {/* Step 1: Customer Information */}
                {currentStep === 1 && (
                  <div className="animate-fade-in space-y-2">
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
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-green-200">
                        ✅ <strong>Langkah 3 dari 3:</strong> Tinjau dan setujui.
                      </p>
                    </div>

                    {/* Order Summary */}
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
                      onCheckout={handleSubmit}
                      onWhatsAppRental={handleSubmit}
                      onCancel={handleBack}
                      selectedPaymentMethod={selectedPaymentMethod}
                      termsError={errors.terms}
                    />
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              {currentStep < 3 && (
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <PNButton
                    variant="ghost"
                    size="md"
                    onClick={currentStep === 1 ? handleBack : handlePrevStep}
                    className="flex-1 border border-gray-600 text-gray-300 hover:bg-gray-800 flex items-center justify-center gap-1 min-w-0 whitespace-nowrap py-2"
                  >
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <span className="truncate text-sm">{currentStep === 1 ? 'Kembali' : 'Sebelumnya'}</span>
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
            </div>
          </div>
        </PNSection>
      </PNContainer>
    </div>
  );
};

export default CheckoutPage;
