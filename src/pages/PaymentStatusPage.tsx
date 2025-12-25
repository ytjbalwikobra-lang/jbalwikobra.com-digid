import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { isLoggedIn } from '../services/authService';
import { PNContainer, PNCard, PNHeading, PNText, PNButton, PNSection } from '../components/ui/PinkNeonDesignSystem';
import { CheckCircle, XCircle, Clock, AlertTriangle, Home, ShoppingBag, CreditCard, Mail, Calendar, DollarSign } from 'lucide-react';

type Order = {
  id: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  amount: number;
  created_at: string;
  xendit_invoice_id?: string | null;
  xendit_invoice_url?: string | null;
  currency?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  payment_channel?: string | null;
  payer_email?: string | null;
};

const PaymentStatusPage: React.FC = () => {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderId = params.get('order_id');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const ok = await isLoggedIn();
      setAuthed(ok);
      if (!supabase) { setLoading(false); return; }
      if (orderId) {
  const { data } = await supabase
    .from('orders')
    .select(
      'id, customer_name, product_name, amount, status, order_type, ' +
      'rental_duration, created_at, updated_at, user_id, product_id, ' +
      'customer_email, customer_phone, payment_method, ' +
      'xendit_invoice_id, client_external_id'
    )
    .eq('id', orderId)
    .maybeSingle();
        setOrder(data as any);
        setLoading(false);
        return;
      }
      // Fallback: show latest order for logged-in user
      if (ok) {
        const { data } = await supabase
          .from('orders')
          .select(
            'id, customer_name, product_name, amount, status, order_type, ' +
            'rental_duration, created_at, updated_at, user_id, product_id, ' +
            'customer_email, customer_phone, payment_method, ' +
            'xendit_invoice_id, client_external_id'
          )
          .order('created_at', { ascending: false })
          .limit(1);
        setOrder((data && data[0]) as any);
      }
      setLoading(false);
    };
    run();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PNContainer className="flex items-center justify-center min-h-screen">
          <PNCard className="w-full max-w-md p-8">
            <div className="text-center space-y-6">
              <div className="animate-spin w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full mx-auto"></div>
              <div className="space-y-3">
                <div className="h-6 bg-gradient-to-r from-pink-500/20 to-transparent rounded-xl animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-pink-500/10 to-transparent rounded-lg animate-pulse"></div>
                <div className="h-4 w-2/3 bg-gradient-to-r from-pink-500/10 to-transparent rounded-lg animate-pulse mx-auto"></div>
              </div>
              <PNText color="muted" className="animate-pulse">Memuat status pembayaran...</PNText>
            </div>
          </PNCard>
        </PNContainer>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PNContainer className="flex items-center justify-center min-h-screen">
          <PNCard className="w-full max-w-lg text-center p-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5"></div>
            
            <div className="relative space-y-6">
              {/* Icon */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={40} className="text-white" />
              </div>
              
              {/* Title */}
              <PNHeading level={2} gradient className="text-2xl">Tidak Ada Detail Order</PNHeading>
              
              {/* Description */}
              <PNText color="muted" className="text-lg leading-relaxed">
                Jika pembayaran berhasil, Anda akan menerima email konfirmasi.
                {authed ? ' Cek juga riwayat order Anda.' : ' Silakan login untuk melihat riwayat order.'}
              </PNText>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-4">
                {authed && (
                  <Link to="/orders">
                    <PNButton 
                      size="lg"
                      className="flex items-center justify-center space-x-2 w-full"
                    >
                      <ShoppingBag size={20} />
                      <span>Riwayat Order</span>
                    </PNButton>
                  </Link>
                )}
                <Link to="/">
                  <PNButton 
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center space-x-2 w-full"
                  >
                    <Home size={20} />
                    <span>Beranda</span>
                  </PNButton>
                </Link>
              </div>
            </div>
          </PNCard>
        </PNContainer>
      </div>
    );
  }

  // Enhanced status mapping with Pink Neon design
  const getStatusConfig = (status: string) => {
    const configs = {
      paid: { 
        title: 'Pembayaran Berhasil!', 
        subtitle: 'Transaksi Anda telah dikonfirmasi',
        icon: CheckCircle, 
        gradient: 'from-green-400 to-emerald-500',
        bgGradient: 'from-green-500/10 to-emerald-500/10',
        borderColor: 'border-green-500/30'
      },
      completed: { 
        title: 'Transaksi Selesai!', 
        subtitle: 'Pesanan Anda telah selesai diproses',
        icon: CheckCircle, 
        gradient: 'from-blue-400 to-cyan-500',
        bgGradient: 'from-blue-500/10 to-cyan-500/10',
        borderColor: 'border-blue-500/30'
      },
      pending: { 
        title: 'Menunggu Pembayaran', 
        subtitle: 'Silakan selesaikan pembayaran Anda',
        icon: Clock, 
        gradient: 'from-yellow-400 to-orange-500',
        bgGradient: 'from-yellow-500/10 to-orange-500/10',
        borderColor: 'border-yellow-500/30'
      },
      cancelled: { 
        title: 'Transaksi Dibatalkan', 
        subtitle: 'Pembayaran expired atau dibatalkan',
        icon: XCircle, 
        gradient: 'from-red-400 to-rose-500',
        bgGradient: 'from-red-500/10 to-rose-500/10',
        borderColor: 'border-red-500/30'
      },
    } as const;
    
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-black text-white">
      <PNContainer className="py-8">
        {/* Header Status Card */}
        <PNSection padding="md">
          <PNCard className={`relative overflow-hidden border ${statusConfig.borderColor}`}>
            {/* Background Pattern */}
            <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.bgGradient}`}></div>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5"></div>
            
            <div className="relative p-8 text-center space-y-6">
              {/* Status Icon */}
              <div className={`mx-auto w-24 h-24 bg-gradient-to-r ${statusConfig.gradient} rounded-full flex items-center justify-center animate-pulse`}>
                <StatusIcon size={48} className="text-white" />
              </div>
              
              {/* Status Title */}
              <div className="space-y-2">
                <PNHeading level={1} className={`text-3xl bg-gradient-to-r ${statusConfig.gradient} bg-clip-text text-transparent`}>
                  {statusConfig.title}
                </PNHeading>
                <PNText color="muted" className="text-lg">
                  {statusConfig.subtitle}
                </PNText>
              </div>
              
              {/* Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center sm:text-left">
                    <PNText color="muted" className="text-sm mb-1">Order ID</PNText>
                    <PNText className="font-mono text-sm sm:text-base break-all">{order.id}</PNText>
                  </div>
                  <div className="text-center sm:text-right">
                    <PNText color="muted" className="text-sm mb-1">Total Pembayaran</PNText>
                    <PNHeading level={3} className="text-white text-xl">
                      Rp {Number(order.amount).toLocaleString('id-ID')}
                    </PNHeading>
                  </div>
                </div>
              </div>
            </div>
          </PNCard>
        </PNSection>

        {/* Payment Details Section */}
        <PNSection padding="md">
          <PNCard className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-2xl">
                <CreditCard size={24} className="text-white" />
              </div>
              <PNHeading level={2} className="text-white">Detail Pembayaran</PNHeading>
            </div>
            
            <div className="space-y-4">
              {order.payment_channel && (
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <DollarSign size={20} className="text-pink-400" />
                    <PNText color="muted">Metode Pembayaran</PNText>
                  </div>
                  <PNText className="font-medium capitalize">
                    {order.payment_channel.toLowerCase().replace(/_/g,' ')}
                  </PNText>
                </div>
              )}
              
              {order.payer_email && (
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Mail size={20} className="text-blue-400" />
                    <PNText color="muted">Email Pembayar</PNText>
                  </div>
                  <PNText className="font-medium">{order.payer_email}</PNText>
                </div>
              )}
              
              {order.xendit_invoice_id && (
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CreditCard size={20} className="text-purple-400" />
                    <PNText color="muted">Invoice ID</PNText>
                  </div>
                  <PNText className="font-mono text-sm break-all">{order.xendit_invoice_id}</PNText>
                </div>
              )}
              
              {order.expires_at && (
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Calendar size={20} className="text-orange-400" />
                    <PNText color="muted">Expired</PNText>
                  </div>
                  <PNText className="font-medium">
                    {new Date(order.expires_at).toLocaleString('id-ID')}
                  </PNText>
                </div>
              )}
              
              {order.paid_at && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-400" />
                    <PNText color="muted">Dibayar Pada</PNText>
                  </div>
                  <PNText className="font-medium text-green-300">
                    {new Date(order.paid_at).toLocaleString('id-ID')}
                  </PNText>
                </div>
              )}
            </div>
          </PNCard>
        </PNSection>

        {/* Action Buttons Section */}
        <PNSection padding="md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {order.xendit_invoice_url && order.status === 'pending' && (
              <a 
                href={order.xendit_invoice_url} 
                target="_blank" 
                rel="noreferrer"
                className="md:col-span-1"
              >
                <PNButton size="lg" className="w-full flex items-center justify-center space-x-2">
                  <CreditCard size={20} />
                  <span>Bayar Sekarang</span>
                </PNButton>
              </a>
            )}
            
            <Link to="/products" className="md:col-span-1">
              <PNButton 
                variant="secondary" 
                size="lg" 
                className="w-full flex items-center justify-center space-x-2"
              >
                <ShoppingBag size={20} />
                <span>Lanjut Belanja</span>
              </PNButton>
            </Link>
            
            <Link to="/" className="md:col-span-1">
              <PNButton 
                variant="ghost" 
                size="lg" 
                className="w-full flex items-center justify-center space-x-2"
              >
                <Home size={20} />
                <span>Beranda</span>
              </PNButton>
            </Link>
          </div>
        </PNSection>
      </PNContainer>
    </div>
  );
};

export default PaymentStatusPage;
