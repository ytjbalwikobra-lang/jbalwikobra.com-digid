/**
 * PaymentStatus - Shows payment success/failure status with countdown
 * Automatically redirects to homepage after 15 seconds for successful payments
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Home } from 'lucide-react';
import { PNContainer, PNCard, PNHeading, PNText, PNButton } from '../components/ui/CyberDesignSystem';
import { formatCurrency } from '../utils/helpers';

const PaymentStatus: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status'); // 'success', 'failed', or 'expired'
  const paymentId = searchParams.get('id');

  const isSuccess = status === 'success';
  const isExpired = status === 'expired';

  useEffect(() => {
    // Fetch payment data if payment ID is provided
    if (paymentId) {
      fetchPaymentData();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    // Start countdown for successful payments
    if (isSuccess && !loading) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSuccess, loading, navigate]);

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`/api/xendit/get-payment?id=${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      }
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--cyber-pink-secondary)] mx-auto mb-4"></div>
          <PNText>Memuat status pembayaran...</PNText>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white flex items-center justify-center">
      <PNContainer className="py-8">
        <div className="max-w-md mx-auto">
          {isSuccess ? (
            // Success Status
            <PNCard className="text-center space-y-6 p-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center ring-1 ring-green-400/40">
                  <CheckCircle className="text-green-400" size={32} />
                </div>
                <div className="space-y-2">
                  <PNHeading level={2} className="text-green-400">Pembayaran Berhasil!</PNHeading>
                  <PNText className="text-[var(--cyber-text-secondary)]">Terima kasih! Pembayaran Anda telah berhasil diproses.</PNText>
                </div>
              </div>

              {paymentData && (
                <div className="bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] p-4 rounded-cyber-lg space-y-2 text-left">
                  <div className="flex justify-between">
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">ID Pembayaran:</PNText>
                    <PNText className="text-sm font-mono">{paymentData.id}</PNText>
                  </div>
                  {paymentData.amount && (
                    <div className="flex justify-between">
                      <PNText className="text-sm text-[var(--cyber-text-muted)]">Jumlah:</PNText>
                      <PNText className="text-sm font-bold">{formatCurrency(paymentData.amount)}</PNText>
                    </div>
                  )}
                  {paymentData.payment_method && (
                    <div className="flex justify-between">
                      <PNText className="text-sm text-[var(--cyber-text-muted)]">Metode:</PNText>
                      <PNText className="text-sm">{paymentData.payment_method.toUpperCase()}</PNText>
                    </div>
                  )}
                  {paymentData.description && (
                    <div className="flex justify-between">
                      <PNText className="text-sm text-[var(--cyber-text-muted)]">Keterangan:</PNText>
                      <PNText className="text-sm">{paymentData.description}</PNText>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-blue-500/15 border border-blue-400/30 p-5 rounded-cyber-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Clock className="text-blue-400" size={16} />
                    <PNText className="text-sm text-blue-300">Mengarahkan ke beranda dalam</PNText>
                  </div>
                  <div className="text-3xl font-extrabold text-blue-300">{countdown} detik</div>
                </div>

                <div className="space-y-3">
                  <PNButton
                    onClick={handleGoHome}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <Home size={18} />
                    <span>Kembali ke Beranda</span>
                  </PNButton>
                  <div className="text-center">
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">• Pesanan Anda sedang diproses</PNText>
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">• Akun akan dikirim via WhatsApp dalam 5-30 menit</PNText>
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">• Tim support siap membantu: wa.me/6289653510125</PNText>
                  </div>
                </div>
              </div>
            </PNCard>
          ) : (
            // Failed/Expired Status
            <PNCard className="text-center space-y-6 p-8">
              <div className="flex flex-col items-center space-y-4">
                <div className={`w-16 h-16 ${isExpired ? 'bg-orange-500/20 ring-1 ring-orange-400/40' : 'bg-red-500/20 ring-1 ring-red-400/40'} rounded-full flex items-center justify-center`}>
                  {isExpired ? <Clock className="text-orange-400" size={32} /> : <XCircle className="text-red-400" size={32} />}
                </div>
                <div className="space-y-2">
                  <PNHeading level={2} className={isExpired ? 'text-orange-400' : 'text-red-400'}>
                    {isExpired ? 'Waktu Pembayaran Habis' : 'Pembayaran Gagal'}
                  </PNHeading>
                  <PNText className="text-[var(--cyber-text-secondary)]">{isExpired ? 'Maaf, waktu untuk menyelesaikan pembayaran telah habis.' : 'Maaf, pembayaran Anda tidak dapat diproses.'}</PNText>
                </div>
              </div>

              {paymentData && (
                <div className="bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] p-4 rounded-cyber-lg space-y-2 text-left">
                  <div className="flex justify-between">
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">ID Pembayaran:</PNText>
                    <PNText className="text-sm font-mono">{paymentData.id}</PNText>
                  </div>
                  {paymentData.amount && (
                    <div className="flex justify-between">
                      <PNText className="text-sm text-[var(--cyber-text-muted)]">Jumlah:</PNText>
                      <PNText className="text-sm font-bold">{formatCurrency(paymentData.amount)}</PNText>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">Status:</PNText>
                    <PNText className={`text-sm ${isExpired ? 'text-orange-400' : 'text-red-400'}`}>{isExpired ? 'EXPIRED' : (paymentData.status || 'FAILED')}</PNText>
                  </div>
                  {isExpired && paymentData.expiry_date && (
                    <div className="flex justify-between">
                      <PNText className="text-sm text-[var(--cyber-text-muted)]">Kedaluwarsa:</PNText>
                      <PNText className="text-sm text-[var(--cyber-text-secondary)]">{new Date(paymentData.expiry_date).toLocaleString('id-ID')}</PNText>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className={`${isExpired ? 'bg-orange-500/15 border border-orange-400/30' : 'bg-yellow-500/15 border border-yellow-400/30'} p-4 rounded-cyber-lg text-left`}>
                  <PNText className={`${isExpired ? 'text-orange-400' : 'text-yellow-400'} font-semibold mb-2`}>{isExpired ? 'Apa yang terjadi?' : 'Kemungkinan penyebab:'}</PNText>
                  <ul className="text-sm text-[var(--cyber-text-secondary)] space-y-1">
                    {isExpired ? (
                      <>
                        <li>• Anda tidak menyelesaikan pembayaran dalam waktu yang ditentukan</li>
                        <li>• Untuk keamanan, pembayaran otomatis dibatalkan setelah batas waktu</li>
                        <li>• Silakan buat pesanan baru untuk melanjutkan</li>
                      </>
                    ) : (
                      <>
                        <li>• Pembayaran dibatalkan</li>
                        <li>• Waktu pembayaran habis</li>
                        <li>• Saldo tidak mencukupi</li>
                        <li>• Gangguan jaringan</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="space-y-3">
                  <PNButton
                    onClick={handleGoHome}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <Home size={18} />
                    <span>{isExpired ? 'Buat Pesanan Baru' : 'Coba Lagi'}</span>
                  </PNButton>
                  <PNButton
                    onClick={handleGoHome}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <Home size={18} />
                    <span>Kembali ke Beranda</span>
                  </PNButton>
                  <div className="text-center">
                    <PNText className="text-sm text-[var(--cyber-text-muted)]">Butuh bantuan? Hubungi customer service:</PNText>
                    <PNText className="text-sm text-[var(--cyber-pink-primary)]">wa.me/6289653510125</PNText>
                  </div>
                </div>
              </div>
            </PNCard>
          )}
        </div>
      </PNContainer>
    </div>
  );
};

export default PaymentStatus;
