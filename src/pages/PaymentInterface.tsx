/**
 * PaymentInterface - Pink Neon Design System Version
 * Following homepage design patterns with countdown timer
 * Mobile-first responsive design with professional animations
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, CreditCard, ArrowLeft, QrCode, Shield, Smartphone, CheckCircle, AlertTriangle, Zap, Star, Building2, Copy, Camera } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { PNContainer, PNCard, PNHeading, PNText, PNButton, PNSection, PNSectionHeader } from '../components/ui/PinkNeonDesignSystem';
import QRCode from 'react-qr-code';

interface PaymentData {
  id: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  external_id: string;
  created: string;
  expiry_date?: string;
  qr_string?: string;
  description?: string;
  virtual_account_number?: string;
  account_number?: string;
  bank_code?: string;
  bank_name?: string;
  invoice_url?: string;
  payment_url?: string;
  account_holder_name?: string;
  transfer_amount?: number;
}

const PaymentInterface: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const paymentId = searchParams.get('id');
  const paymentMethod = searchParams.get('method');

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setError('Payment ID tidak ditemukan');
      setLoading(false);
      return;
    }
    fetchPaymentData();
  }, [paymentId]);

  // Poll for QR string if it's missing for QRIS payments
  useEffect(() => {
    if (paymentData && 
        (paymentMethod?.toLowerCase() === 'qris' || paymentData.payment_method?.toLowerCase() === 'qris') &&
        !paymentData.qr_string &&
        paymentData.status !== 'PAID' &&
        paymentData.status !== 'COMPLETED') {
      
      const pollForQRString = async () => {
        try {
          const response = await fetch(`/api/xendit/get-payment?id=${paymentId}`);
          if (response.ok) {
            const data = await response.json();
            
            if (data.qr_string) {
              setPaymentData(prev => ({
                ...prev!,
                qr_string: data.qr_string,
                qr_url: data.qr_url
              }));
              return true; // Found QR string
            }
          }
        } catch (error) {
          console.error('❌ Error polling for QR string:', error);
        }
        return false; // QR string not found
      };
      
      // Initial poll after 2 seconds
      const initialPoll = setTimeout(async () => {
        const found = await pollForQRString();
        if (!found) {
          // Start interval polling if not found initially
          const pollInterval = setInterval(async () => {
            const found = await pollForQRString();
            if (found) {
              clearInterval(pollInterval);
            }
          }, 5000); // Poll every 5 seconds
          
          // Stop polling after 60 seconds
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 60000);
          
          return () => clearInterval(pollInterval);
        }
      }, 2000);
      
      return () => clearTimeout(initialPoll);
    }
  }, [paymentData, paymentId, paymentMethod]);

  // Poll for VA number if it's missing (for Invoice API Virtual Account payments)
  useEffect(() => {
    if (paymentData && 
        paymentData.payment_method && 
        paymentData.payment_method.includes('Virtual Account') &&
        !paymentData.virtual_account_number && 
        !paymentData.account_number &&
        paymentData.invoice_url) {
      
      // Try to get VA details directly from Xendit invoice
      const fetchVAFromInvoice = async () => {
        try {
          const response = await fetch(`/api/xendit/get-invoice-details?invoice_id=${paymentData.id}`);
          if (response.ok) {
            const invoiceData = await response.json();
            
            if (invoiceData.virtual_account_number) {
              setPaymentData(prev => ({
                ...prev!,
                virtual_account_number: invoiceData.virtual_account_number,
                bank_code: invoiceData.bank_code,
                bank_name: invoiceData.bank_name,
                account_holder_name: invoiceData.account_holder_name,
                transfer_amount: invoiceData.transfer_amount
              }));
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching VA from invoice:', error);
        }
      };
      
      // Initial attempt
      fetchVAFromInvoice();
      
      // If still no VA number after initial attempt, start polling
      const pollTimeout = setTimeout(() => {
        const pollForVA = setInterval(async () => {
          
          try {
            // First try the invoice endpoint
            await fetchVAFromInvoice();
            
            // Then try the regular payment endpoint
            const response = await fetch(`/api/xendit/get-payment?id=${paymentId}`);
            if (response.ok) {
              const data = await response.json();
              
              if (data.virtual_account_number || data.account_number) {
                setPaymentData(data);
                clearInterval(pollForVA);
              }
            }
          } catch (error) {
            console.error('Error polling for VA number:', error);
          }
        }, 5000); // Poll every 5 seconds
        
        // Stop polling after 60 seconds
        setTimeout(() => {
          clearInterval(pollForVA);
        }, 60000);
        
        return () => clearInterval(pollForVA);
      }, 2000); // Wait 2 seconds before starting polling
      
      return () => clearTimeout(pollTimeout);
    }
  }, [paymentData, paymentId]);

  // Payment status polling - check every 5 seconds for payment completion
  useEffect(() => {
    // Helper function to check if payment is completed (handles all status variations)
    const isPaymentCompleted = (status: string) => {
      if (!status) return false;
      const normalizedStatus = status.toLowerCase();
      return normalizedStatus === 'paid' || 
             normalizedStatus === 'succeeded' || 
             normalizedStatus === 'completed' ||
             normalizedStatus === 'success';
    };

    if (!paymentData || isPaymentCompleted(paymentData.status)) {
      return; // Don't poll if already paid or no payment data
    }

    const pollInterval = setInterval(async () => {
      try {
        
        // Try primary method - check by payment ID
        const response = await fetch(`/api/xendit/get-payment?id=${paymentId}`);
        if (response.ok) {
          const data = await response.json();
                    
          // Check if payment is completed (handle all status variations)
          if (isPaymentCompleted(data.status)) {
            clearInterval(pollInterval);
            
            // Use order_id if available, otherwise use payment id
            const orderId = data.order_id || data.external_id || paymentId;
            
            // Redirect to success page
            window.location.href = `/payment-status?status=success&order_id=${encodeURIComponent(orderId)}`;
            return;
          }
          
          // Update payment data if status changed
          if (data.status !== paymentData.status) {
            setPaymentData(data);
          }
        } else {
          console.error('Payment poll failed with status:', response.status);
        }

        // Also try checking by external_id if we have it
        if (paymentData.external_id && paymentData.external_id !== paymentId) {
          try {
            const externalResponse = await fetch(`/api/xendit/check-order-status?external_id=${encodeURIComponent(paymentData.external_id)}`);
            if (externalResponse.ok) {
              const externalData = await externalResponse.json();
                            
              if (isPaymentCompleted(externalData.status)) {
                clearInterval(pollInterval);
                
                // Redirect to success page using order ID
                window.location.href = `/payment-status?status=success&order_id=${encodeURIComponent(externalData.order_id)}`;
                return;
              }
            }
          } catch (externalError) {
                      }
        }
      } catch (error) {
        console.error('Payment status polling error:', error);
      }
    }, 5000); // Poll every 5 seconds for faster detection

    return () => clearInterval(pollInterval);
  }, [paymentData, paymentId, navigate]);

  const fetchPaymentData = async () => {
    // Helper function to check if payment is completed (handles all status variations)
    const isPaymentCompleted = (status: string) => {
      if (!status) return false;
      const normalizedStatus = status.toLowerCase();
      return normalizedStatus === 'paid' || 
             normalizedStatus === 'succeeded' || 
             normalizedStatus === 'completed' ||
             normalizedStatus === 'success';
    };

    try {
      const response = await fetch(`/api/xendit/get-payment?id=${paymentId}`);
      if (!response.ok) throw new Error('Payment not found');
      const data = await response.json();
                  
      // Check if payment is already completed
      if (isPaymentCompleted(data.status)) {
        
        // Use order_id if available, otherwise use payment id
        const orderId = data.order_id || data.external_id || paymentId;
        
        // Redirect to success page
        window.location.href = `/payment-status?status=success&order_id=${encodeURIComponent(orderId)}`;
        return;
      }
      
      setPaymentData(data);
      
      // Also check order status by external_id if available
      if (data.external_id && data.external_id !== paymentId) {
        try {
          const orderResponse = await fetch(`/api/xendit/check-order-status?external_id=${encodeURIComponent(data.external_id)}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
                        
            if (isPaymentCompleted(orderData.status)) {
              window.location.href = `/payment-status?status=success&order_id=${encodeURIComponent(orderData.order_id)}`;
              return;
            }
          }
        } catch (orderError) {
                  }
      }
    } catch (err) {
      console.error('Failed to fetch payment data:', err);
      setError('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    let expiryDate;
    
    // Use provided expiry_date or calculate default expiry (24 hours from creation)
    if (paymentData?.expiry_date) {
      expiryDate = new Date(paymentData.expiry_date);
    } else if (paymentData?.created) {
      // Default: 24 hours from payment creation
      expiryDate = new Date(paymentData.created);
      expiryDate.setHours(expiryDate.getHours() + 24);
    } else {
      // Fallback: 24 hours from now
      expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
    }
    
    const now = currentTime.getTime();
    const expiry = expiryDate.getTime();
    const diff = expiry - now;
    
    if (diff <= 0) return 'Kedaluwarsa';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const isTimeRunningOut = () => {
    let expiryDate;
    
    // Use provided expiry_date or calculate default expiry (24 hours from creation)
    if (paymentData?.expiry_date) {
      expiryDate = new Date(paymentData.expiry_date);
    } else if (paymentData?.created) {
      // Default: 24 hours from payment creation
      expiryDate = new Date(paymentData.created);
      expiryDate.setHours(expiryDate.getHours() + 24);
    } else {
      return false; // No time limit if no creation date
    }
    
    const now = currentTime.getTime();
    const expiry = expiryDate.getTime();
    const diff = expiry - now;
    return diff > 0 && diff <= 5 * 60 * 1000; // 5 minutes
  };

  // Check for expiry
  useEffect(() => {
    let expiryDate;
    
    // Use provided expiry_date or calculate default expiry (24 hours from creation)
    if (paymentData?.expiry_date) {
      expiryDate = new Date(paymentData.expiry_date);
    } else if (paymentData?.created) {
      // Default: 24 hours from payment creation
      expiryDate = new Date(paymentData.created);
      expiryDate.setHours(expiryDate.getHours() + 24);
    } else {
      return; // No expiry check if no date available
    }
    
    const now = currentTime.getTime();
    const expiry = expiryDate.getTime();
    
    if (now >= expiry) {
      navigate(`/payment-status?status=expired&id=${encodeURIComponent(paymentData.id)}`);
    }
  }, [currentTime, paymentData, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <PNContainer>
          <div className="text-center">
            {/* Enhanced Loading Animation */}
            <div className="relative mb-8">
              <div className="w-16 h-16 mx-auto relative">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-pink-500/20"></div>
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-full flex items-center justify-center">
                  <CreditCard className="text-white" size={24} />
                </div>
              </div>
            </div>
            <PNHeading level={2} gradient className="mb-4">Memuat Pembayaran</PNHeading>
            <PNText color="muted">Menyiapkan interface pembayaran Anda...</PNText>
          </div>
        </PNContainer>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <PNContainer>
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <PNHeading level={1} className="text-red-400 mb-4">Terjadi Kesalahan</PNHeading>
            <PNText className="mb-8" color="muted">{error || 'Payment data tidak ditemukan'}</PNText>
            <PNButton
              onClick={() => navigate('/')}
              variant="primary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>Kembali ke Beranda</span>
            </PNButton>
          </div>
        </PNContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PNContainer>
        
        {/* Compact Header: Back button only (timer moved below status badge) */}
        <PNSection padding="md">
          <PNCard className="p-4 mb-8">
            <div className="flex items-center justify-between">
              {/* Back Button with Pink Accent */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-all duration-200 group"
                aria-label="Kembali ke beranda"
              >
                <div className="p-2 bg-white/5 border border-white/10 rounded-xl group-hover:bg-pink-500/20 group-hover:border-pink-500/50 transition-all">
                  <ArrowLeft size={20} />
                </div>
                <span className="font-medium">Kembali</span>
              </button>
            </div>
          </PNCard>
        </PNSection>

        {/* Warning Banner for Time Running Out */}
        {isTimeRunningOut() && (
          <PNSection padding="sm">
            <div className="relative overflow-hidden bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 animate-pulse"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-red-500 rounded-xl">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <div>
                  <PNHeading level={3} className="text-red-300 mb-2">⚠️ Waktu Hampir Habis!</PNHeading>
                  <PNText className="text-red-200">Segera selesaikan pembayaran sebelum kedaluwarsa</PNText>
                </div>
              </div>
            </div>
          </PNSection>
        )}

        {/* Payment Summary Card - Pink Neon Style */}
        <PNSection padding="md">
          <PNCard className="p-8 mb-8 relative overflow-hidden">
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-fuchsia-500/5"></div>
            
            <div className="relative text-center space-y-6">
              {/* Icon with Gradient Background */}
              <div className="relative inline-flex">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/25 mx-auto">
                  <CreditCard className="text-white" size={32} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Star size={14} className="text-white" />
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="space-y-3">
                <div className="text-sm text-pink-300/80 font-medium tracking-wide">JBalwikobra Payment</div>
                <PNHeading level={1} gradient className="text-4xl font-extrabold">
                  {formatCurrency(paymentData.amount)}
                </PNHeading>
                <PNText className="text-lg max-w-md mx-auto">{paymentData.description}</PNText>
              </div>
              
              {/* Status Badge */}
              <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 text-yellow-300 px-6 py-3 rounded-2xl backdrop-blur-sm">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="font-semibold">Menunggu Pembayaran</span>
              </div>

              {/* Big Countdown directly under status badge */}
              <div
                className={`mt-5 w-full max-w-sm mx-auto rounded-2xl border backdrop-blur-sm px-6 py-5 ${
                  isTimeRunningOut()
                    ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50 shadow-lg shadow-red-500/25'
                    : 'bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 border-pink-500/40 shadow-lg shadow-pink-500/20'
                }`}
                aria-live="polite"
              >
                <div className="flex items-center justify-center space-x-3 mb-1">
                  <Clock size={20} className="text-white/90" />
                  <span className="text-xs tracking-wide text-gray-200/90">Sisa Waktu Pembayaran</span>
                </div>
                <div className={`text-center font-mono font-extrabold ${isTimeRunningOut() ? 'text-red-200' : 'text-white'}`}>
                  <span className="text-4xl lg:text-5xl leading-none">{getTimeRemaining()}</span>
                </div>
              </div>

              {/* Payment Method Info */}
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <QrCode size={16} />
                <span>Metode: {(paymentMethod || paymentData.payment_method || 'QRIS').toUpperCase()}</span>
              </div>
            </div>
          </PNCard>
        </PNSection>

        {/* Enhanced QR Code Section */}
        {(paymentData.qr_string || (paymentMethod && paymentMethod.toLowerCase() === 'qris')) && (
          <PNSection padding="md">
            <PNCard className="p-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5"></div>
              
              <div className="relative">
                {/* Section Header with Pink Neon Style */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="p-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-2xl">
                      <QrCode className="text-white" size={28} />
                    </div>
                    <div className="text-left">
                      <PNHeading level={2} gradient>Scan QR Code QRIS</PNHeading>
                      <PNText color="muted" className="text-sm">Bayar dengan aplikasi e-wallet atau mobile banking</PNText>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced QR Code Display */}
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-pink-500/10 border-4 border-pink-500/20">
                      {paymentData.qr_string ? (
                        <QRCode 
                          value={paymentData.qr_string} 
                          size={280}
                          style={{ maxWidth: "100%", height: "auto" }}
                        />
                      ) : (
                        <div className="w-70 h-70 flex items-center justify-center bg-gray-100 rounded-2xl">
                          <div className="text-center text-gray-600">
                            <QrCode size={64} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-sm">QR Code sedang dimuat...</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Payment ID: {paymentData.id}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 rounded-3xl blur-xl -z-10 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Step-by-Step Instructions */}
                <div className="max-w-lg mx-auto">
                  <PNHeading level={3} className="text-center mb-6 text-white">Cara Pembayaran</PNHeading>
                  
                  <div className="space-y-4">
                    {[
                      { icon: Smartphone, text: "Buka aplikasi e-wallet atau mobile banking Anda" },
                      { icon: QrCode, text: "Pilih menu Scan QR Code atau QRIS" },
                      { icon: Zap, text: "Arahkan kamera ke QR code di atas" },
                      { icon: CheckCircle, text: `Konfirmasi pembayaran sebesar ${formatCurrency(paymentData.amount)}` }
                    ].map((step, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex items-center space-x-3 flex-1">
                          <step.icon size={20} className="text-pink-500 flex-shrink-0" />
                          <PNText className="text-sm leading-relaxed">{step.text}</PNText>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PNCard>
          </PNSection>
        )}

        {/* Virtual Account Section */}
        {(paymentData.virtual_account_number || paymentData.account_number || paymentData.invoice_url) && (
          <PNSection padding="md">
            <PNCard className="p-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
              
              <div className="relative">
                {/* Section Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl">
                      <Building2 className="text-white" size={28} />
                    </div>
                    <div className="text-left">
                      <PNHeading level={2} gradient>Transfer Bank Virtual Account</PNHeading>
                      <PNText color="muted" className="text-sm">Transfer ke nomor virtual account {paymentData.bank_name || paymentData.bank_code}</PNText>
                    </div>
                  </div>
                </div>
                
                {/* Virtual Account Details or Invoice Link */}
                {(paymentData.virtual_account_number || paymentData.account_number) ? (
                  <div className="space-y-6 mb-8">
                    {/* Bank Information */}
                    <div className="text-center p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-500/20">
                      <PNText className="text-sm text-gray-400 mb-2">Bank</PNText>
                      <PNHeading level={3} className="text-2xl font-bold">
                        {paymentData.bank_name || `Bank ${paymentData.bank_code?.toUpperCase()}`}
                      </PNHeading>
                    </div>

                    {/* Virtual Account Number */}
                    <div className="text-center p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20">
                      <PNText className="text-sm text-gray-400 mb-2">Nomor Virtual Account</PNText>
                      <div className="font-mono text-2xl lg:text-3xl font-bold text-white tracking-wider bg-gray-800/50 px-4 py-3 rounded-xl border border-gray-600/50">
                        {paymentData.virtual_account_number || paymentData.account_number}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(paymentData.virtual_account_number || paymentData.account_number || '')}
                        className="mt-3 inline-flex items-center space-x-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Copy size={16} />
                        <span>Salin Nomor</span>
                      </button>
                    </div>

                    {/* Amount */}
                    <div className="text-center p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
                      <PNText className="text-sm text-gray-400 mb-2">Jumlah Transfer</PNText>
                      <PNHeading level={3} className="text-2xl font-bold text-purple-300">
                        {formatCurrency(paymentData.amount)}
                      </PNHeading>
                    </div>
                  </div>
                ) : (
                  /* Invoice URL as fallback */
                  <div className="space-y-6 mb-8">
                    <div className="text-center p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20">
                      <PNHeading level={3} className="text-xl mb-4">
                        Klik tombol di bawah untuk melihat detail Virtual Account
                      </PNHeading>
                      <PNButton
                        onClick={() => window.open(paymentData.invoice_url, '_blank')}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold"
                      >
                        Lihat Detail Pembayaran
                      </PNButton>
                      <PNText color="muted" className="text-sm mt-3">
                        Halaman ini akan menampilkan nomor Virtual Account yang dapat Anda gunakan untuk transfer
                      </PNText>
                    </div>
                  </div>
                )}

                {/* Payment Steps */}
                <div className="space-y-4">
                  <PNHeading level={3} className="text-center mb-6">Cara Transfer Virtual Account</PNHeading>
                  <div className="grid gap-4">
                    {[
                      { icon: Smartphone, text: "Buka aplikasi mobile banking atau ATM" },
                      { icon: Building2, text: "Pilih menu Transfer > Virtual Account / Rekening Ponsel" },
                      { icon: Copy, text: paymentData.virtual_account_number || paymentData.account_number ? `Masukkan nomor VA: ${paymentData.virtual_account_number || paymentData.account_number}` : "Masukkan nomor Virtual Account (lihat detail pembayaran)" },
                      { icon: CreditCard, text: `Transfer sejumlah: ${formatCurrency(paymentData.amount)}` },
                      { icon: CheckCircle, text: "Konfirmasi transfer dan selesai!" }
                    ].map((step, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl border border-gray-600/50">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex items-center space-x-3 flex-1">
                          <step.icon size={20} className="text-blue-400 flex-shrink-0" />
                          <PNText className="text-sm leading-relaxed">{step.text}</PNText>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiry Information */}
                {paymentData.expiry_date && (
                  <div className="mt-6 text-center p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20">
                    <PNText color="muted" className="text-sm">
                      Virtual Account berlaku hingga: <span className="font-semibold text-yellow-300">{new Date(paymentData.expiry_date).toLocaleString('id-ID')}</span>
                    </PNText>
                  </div>
                )}
              </div>
            </PNCard>
          </PNSection>
        )}

        {/* Enhanced Footer Section */}
        <PNSection padding="md">
          <div className="text-center space-y-6">
            {/* Security & Features Icons */}
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2 text-green-400">
                <Shield size={18} />
                <span className="text-sm font-medium">Secure Payment</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-400">
                <Zap size={18} />
                <span className="text-sm font-medium">Real-time Update</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-400">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Auto Redirect</span>
              </div>
            </div>
            
            {/* Footer Text */}
            <PNText color="muted" className="text-center">
              Halaman ini akan otomatis terupdate ketika pembayaran berhasil
            </PNText>
            
            {/* Branding */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-pink-300/60 font-medium tracking-wide">
                Powered by JBalwikobra × Xendit
              </div>
            </div>
          </div>
        </PNSection>

      </PNContainer>
    </div>
  );
};

export default PaymentInterface;