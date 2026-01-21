/**
 * PaymentMethods - Dynamic payment method selection component
 * Only shows payment methods that are activated on your Xendit account
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Building2, Star, Wallet, Check, QrCode, Store, Loader2, AlertCircle, Shield } from 'lucide-react';
import { PNText, PNCard, PNHeading } from '../ui/PinkNeonDesignSystem';
import { 
  getActivatedPaymentChannels, 
  getPopularActivatedChannels,
  isChannelActivated,
  type ActivatedPaymentChannel
} from '../../config/paymentChannels';
import { 
  fetchAvailablePaymentMethods, 
  formatPaymentMethod, 
  isAmountValidForMethod,
  getPaymentMethodLimitations,
  groupPaymentMethods,
  getPopularPaymentMethods,
  type XenditPaymentMethod,
  type PaymentMethodGroup
} from '../../services/xenditPaymentService';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  badges?: string[];
  popular?: boolean;
  available: boolean;
  limitations?: string;
}

interface PaymentMethodsProps {
  selectedMethod?: string;
  onMethodSelect?: (methodId: string) => void;
  showSelection?: boolean;
  amount?: number;
  onDirectPayment?: (methodId: string) => void;
  loading?: boolean;
  error?: string; // Add error prop for validation messages
  checkoutType?: 'purchase' | 'rental'; // Add checkout type for conditional rendering
}

export const PaymentMethods = React.memo(({
  selectedMethod,
  onMethodSelect,
  showSelection = false,
  amount,
  onDirectPayment,
  loading = false,
  error,
  checkoutType = 'purchase'
}: PaymentMethodsProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [groupedMethods, setGroupedMethods] = useState<PaymentMethodGroup[]>([]);
  const [popularMethods, setPopularMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [source, setSource] = useState<'xendit_api' | 'fallback' | 'fallback_error'>('fallback');

  // Fetch payment methods on mount or when amount changes
  useEffect(() => {
    let cancelled = false;
    const loadPaymentMethods = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // Use activated payment channels configuration instead of Xendit API
        const activatedChannels = getActivatedPaymentChannels();
        const popularChannels = getPopularActivatedChannels();

        // Filter by amount if provided
        const filteredMethods = activatedChannels
          .filter(channel => !amount || (amount >= channel.min_amount && amount <= channel.max_amount))
          .map(channel => ({
            id: channel.id,
            name: channel.name,
            description: channel.description,
            icon: getPaymentIcon(channel.type, channel.id),
            badges: [channel.processing_time, ...(channel.popular ? ['Populer'] : [])],
            popular: channel.popular || false,
            available: channel.available,
            limitations: amount && (amount < channel.min_amount || amount > channel.max_amount) 
              ? `Minimum ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(channel.min_amount)}, Maksimum ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(channel.max_amount)}` 
              : undefined
          }));

        // Group methods by type, excluding popular methods to avoid duplication
        const groups: PaymentMethodGroup[] = [];
        const groupsMap: { [key: string]: XenditPaymentMethod[] } = {};
        
        filteredMethods.forEach(method => {
          const channel = activatedChannels.find(c => c.id === method.id);
          if (channel) {
            // Skip popular methods in grouped section to avoid duplicates
            if (popularChannels.some(pc => pc.id === method.id)) return;
            
            const typeKey = channel.type;
            if (!groupsMap[typeKey]) groupsMap[typeKey] = [];
            
            // Map channel type to XenditPaymentMethod type
            const mappedType: "EWALLET" | "QRIS" | "VIRTUAL_ACCOUNT" | "CREDIT_CARD" | "BANK" | "RETAIL_OUTLET" = 
              channel.type === 'OVER_THE_COUNTER' ? 'RETAIL_OUTLET' : 
              channel.type === 'VIRTUAL_ACCOUNT' ? 'BANK' :
              channel.type as "EWALLET" | "QRIS" | "VIRTUAL_ACCOUNT" | "CREDIT_CARD";
            
            // Convert PaymentMethod to XenditPaymentMethod
            groupsMap[typeKey].push({
              id: method.id,
              name: method.name,
              type: mappedType,
              processing_time: channel.processing_time,
              available: method.available,
              min_amount: channel.min_amount,
              max_amount: channel.max_amount,
              description: channel.type === 'EWALLET' ? 'Pembayaran instant dengan e-wallet' :
                          channel.type === 'VIRTUAL_ACCOUNT' ? 'Transfer bank melalui virtual account' :
                          channel.type === 'QRIS' ? 'Scan QR code untuk bayar' :
                          channel.type === 'OVER_THE_COUNTER' ? 'Bayar di retail atau cicilan' :
                          'Metode pembayaran',
              icon: channel.type === 'EWALLET' ? '💳' :
                    channel.type === 'VIRTUAL_ACCOUNT' ? '🏦' :
                    channel.type === 'QRIS' ? '📱' :
                    channel.type === 'OVER_THE_COUNTER' ? '🏪' :
                    '💰'
            });
          }
        });

        // Convert groups map to array format
        Object.entries(groupsMap).forEach(([type, methods]) => {
          groups.push({
            type: type,
            name: type === 'EWALLET' ? 'E-Wallet' :
                  type === 'VIRTUAL_ACCOUNT' ? 'Bank Transfer' :
                  type === 'QRIS' ? 'QR Code' :
                  type === 'OVER_THE_COUNTER' ? 'Retail/PayLater' :
                  type,
            description: type === 'EWALLET' ? 'Pembayaran instant dengan e-wallet' :
                        type === 'VIRTUAL_ACCOUNT' ? 'Transfer bank melalui virtual account' :
                        type === 'QRIS' ? 'Scan QR code untuk bayar' :
                        type === 'OVER_THE_COUNTER' ? 'Bayar di retail atau cicilan' :
                        'Metode pembayaran',
            icon: type === 'EWALLET' ? '💳' :
                  type === 'VIRTUAL_ACCOUNT' ? '🏦' :
                  type === 'QRIS' ? '📱' :
                  type === 'OVER_THE_COUNTER' ? '🏪' :
                  '💰',
            methods,
            popular: type === 'QRIS' || type === 'EWALLET'
          });
        });

        // Create popular methods list - ensure QRIS is always included
        const popular = filteredMethods.filter(method => method.popular);
        
        // Ensure QRIS is always in popular methods if available (critical payment method)
        const qrisMethod = filteredMethods.find(m => m.id === 'qris');
        const hasQrisInPopular = popular.find(p => p.id === 'qris');
        
        const finalPopular = hasQrisInPopular ? popular : 
          qrisMethod ? [...popular, qrisMethod] : popular;

        if (cancelled) return;
        setPaymentMethods(filteredMethods);
        setGroupedMethods(groups);
        setPopularMethods(finalPopular);
        setSource('fallback'); // Default to local configuration; may flip to xendit_api after health check

        // Lightweight health check: detect if Xendit API is reachable on this deploy
        // This keeps the robust local config for listing, but flips badges/messages to online when healthy
        try {
          const healthRes = await fetch('/api/xendit/payment-methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
          });
          if (!cancelled && healthRes.ok) {
            const healthData = await healthRes.json();
            if (healthData?.source === 'xendit_api') {
              setSource('xendit_api');
            }
          }
        } catch (e) {
          // Silently ignore; stay in fallback UI mode
          console.debug('[PaymentMethods] Xendit health check failed; staying in fallback mode');
        }
      } catch (err) {
        console.error('Failed to load activated payment methods:', err);
        setLoadError('Gagal memuat metode pembayaran. Menampilkan opsi default.');
        // Fallback to minimal static methods
        const staticMethods = getStaticPaymentMethods();
        const staticXenditMethods: XenditPaymentMethod[] = staticMethods.map(method => ({
          id: method.id,
          name: method.name,
          type: method.id === 'astrapay' ? 'EWALLET' :
                method.id === 'qris' ? 'QRIS' :
                method.id.includes('bni') || method.id.includes('bri') || method.id.includes('mandiri') ? 'VIRTUAL_ACCOUNT' :
                'VIRTUAL_ACCOUNT',
          description: method.description,
          icon: '💳',
          available: method.available,
          processing_time: method.badges?.includes('Instant') ? 'Instant' : '1-15 menit',
          popular: method.popular || false,
          min_amount: 10000,
          max_amount: method.id === 'gopay' ? 2000000 : 10000000
        }));
        
        // Filter out popular methods for grouped display to avoid duplicates
        const popularMethodForFallback = ['qris']; // Only QRIS is popular in fallback
        const nonPopularMethods = staticXenditMethods.filter(method => !popularMethodForFallback.includes(method.id));
        
        if (cancelled) return;
        setPaymentMethods(staticMethods);
        setGroupedMethods(groupPaymentMethods(nonPopularMethods));
        // Force popular methods to only show QRIS in fallback mode too
        setPopularMethods([
          {
            id: 'qris',
            name: 'QRIS',
            description: 'Scan QR untuk bayar',
            icon: getPaymentIcon('QRIS', 'qris'),
            badges: ['Instant', 'Populer'],
            popular: true,
            available: true,
            limitations: undefined
          }
        ]);
        setSource('fallback_error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPaymentMethods();

    return () => {
      cancelled = true;
    };
  }, [amount]);

  const getPaymentIcon = (type: string, id?: string): React.ReactNode => {
    // Handle string-based icons from service
    if (typeof id === 'string' && !id.includes('<')) {
      return getGroupIcon(id);
    }
    
    // Handle legacy JSX icons
    const iconMap: Record<string, React.ReactNode> = {
      // E-Wallets
      ovo: <Wallet className="text-orange-400" size={20} />,
      dana: <Smartphone className="text-blue-400" size={20} />,
      gopay: <Smartphone className="text-green-400" size={20} />,
      linkaja: <Smartphone className="text-red-400" size={20} />,
      shopeepay: <Wallet className="text-orange-400" size={20} />,
      
      // Banks
      bca: <Building2 className="text-blue-400" size={20} />,
      bni: <Building2 className="text-yellow-400" size={20} />,
      mandiri: <Building2 className="text-blue-400" size={20} />,
      bri: <Building2 className="text-red-400" size={20} />,
      cimb: <Building2 className="text-red-400" size={20} />,
      permata: <Building2 className="text-green-400" size={20} />,
      
      // Types
      EWALLET: <Smartphone className="text-green-400" size={20} />,
      VIRTUAL_ACCOUNT: <Building2 className="text-blue-400" size={20} />,
      CREDIT_CARD: <CreditCard className="text-purple-400" size={20} />,
      QRIS: <QrCode className="text-orange-400" size={20} />,
      qris: <QrCode className="text-orange-400" size={20} />
    };

    return iconMap[id || ''] || iconMap[type] || <CreditCard className="text-gray-400" size={20} />;
  };

  const getGroupIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'wallet': <Wallet className="text-green-400" size={20} />,
      'building': <Building2 className="text-blue-400" size={20} />,
      'qr-code': <QrCode className="text-orange-400" size={20} />,
      'credit-card': <CreditCard className="text-purple-400" size={20} />,
      'store': <Store className="text-gray-400" size={20} />
    };
    
    return iconMap[iconName] || <CreditCard className="text-gray-400" size={20} />;
  };

  const getStaticPaymentMethods = (): PaymentMethod[] => [
    // E-Wallets - Only activated ones
    {
      id: 'astrapay',
      name: 'AstraPay',
      description: 'Pembayaran instant dengan AstraPay',
      icon: <Wallet className="text-blue-400" size={20} />,
      badges: ['Instant', 'Populer'],
      popular: true,
      available: true
    },
    // QRIS - Activated
    {
      id: 'qris',
      name: 'QRIS',
      description: 'Scan QR untuk bayar',
      icon: <QrCode className="text-orange-400" size={20} />,
      badges: ['Instant', 'Populer'],
      popular: true,
      available: true
    },
    // Virtual Accounts - All activated banks
    {
      id: 'bjb',
      name: 'BJB Virtual Account',
      description: 'Transfer melalui Virtual Account BJB',
      icon: <Building2 className="text-green-400" size={20} />,
      badges: ['Instant'],
      available: true
    },
    {
      id: 'bni',
      name: 'BNI Virtual Account',
      description: 'Transfer melalui Virtual Account BNI',
      icon: <Building2 className="text-yellow-400" size={20} />,
      badges: ['Instant', 'Populer'],
      popular: true,
      available: true
    },
    {
      id: 'bri',
      name: 'BRI Virtual Account',
      description: 'Transfer melalui Virtual Account BRI',
      icon: <Building2 className="text-blue-400" size={20} />,
      badges: ['Instant', 'Populer'],
      popular: true,
      available: true
    },
    {
      id: 'bsi',
      name: 'BSI Virtual Account',
      description: 'Transfer melalui Virtual Account BSI',
      icon: <Building2 className="text-green-400" size={20} />,
      badges: ['Instant'],
      available: true
    },
    {
      id: 'bss',
      name: 'BSS Virtual Account',
      description: 'Transfer melalui Virtual Account Bank Sahabat Sampoerna',
      icon: <Building2 className="text-yellow-400" size={20} />,
      badges: ['Instant'],
      available: true
    },
    {
      id: 'cimb',
      name: 'CIMB Niaga Virtual Account',
      description: 'Transfer melalui Virtual Account CIMB Niaga',
      icon: <Building2 className="text-red-400" size={20} />,
      badges: ['Instant'],
      available: true
    },
    {
      id: 'mandiri',
      name: 'Mandiri Virtual Account',
      description: 'Transfer melalui Virtual Account Mandiri',
      icon: <Building2 className="text-orange-400" size={20} />,
      badges: ['1-15 menit', 'Populer'],
      popular: true,
      available: true
    },
    {
      id: 'permata',
      name: 'Permata Virtual Account',
      description: 'Transfer melalui Virtual Account Permata',
      icon: <Building2 className="text-purple-400" size={20} />,
      badges: ['Instant'],
      available: true
    },
    // Over-The-Counter
    {
      id: 'indomaret',
      name: 'Indomaret',
      description: 'Bayar di Indomaret terdekat',
      icon: <Store className="text-blue-400" size={20} />,
      badges: ['Instant setelah bayar', 'Populer'],
      popular: true,
      available: true
    },
    // PayLater
    {
      id: 'akulaku',
      name: 'Akulaku',
      description: 'Bayar nanti dengan Akulaku',
      icon: <CreditCard className="text-purple-400" size={20} />,
      badges: ['Instant'],
      available: true
    }
  ];

  // Loading state - more compact
  if (isLoading) {
    return (
      <PNCard className="space-y-3 p-3">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="text-pink-400" size={16} />
          <PNHeading level={3} className="!mb-0 text-sm">Memuat...</PNHeading>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-pink-400" size={24} />
        </div>
      </PNCard>
    );
  }

  // Error state with fallback
  if (error) {
    return (
      <PNCard className="space-y-4 p-5">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="text-yellow-400" size={20} />
          <PNHeading level={3} className="!mb-0">Metode Pembayaran</PNHeading>
        </div>
        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <PNText className="text-sm text-yellow-300">{error}</PNText>
        </div>
        {renderPaymentMethods()}
      </PNCard>
    );
  }

  function renderPaymentMethods() {
    // Render popular methods section in grid
    const renderPopularMethods = () => {
      if (popularMethods.length === 0) return null;
      
      return (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2 px-1">
            <Star className="text-pink-400" size={16} />
            <PNText className="font-semibold text-pink-400 text-sm tracking-wide">METODE POPULER</PNText>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {popularMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <div
                  key={method.id}
                  onClick={() => {
                    onMethodSelect?.(method.id);
                    if (onDirectPayment && showSelection) {
                      setTimeout(() => onDirectPayment(method.id), 100);
                    }
                  }}
                  className={`cursor-pointer group relative overflow-hidden transition-all duration-300 p-3 rounded-xl border flex flex-col items-center text-center space-y-2 ${
                    isSelected 
                      ? 'border-pink-500 bg-gradient-to-br from-pink-500/20 to-purple-600/10 shadow-[0_0_15px_-5px_rgba(236,72,153,0.5)] scale-[1.02]' 
                      : 'border-white/10 bg-white/5 hover:border-pink-400/50 hover:bg-white/10 hover:-translate-y-0.5'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-2 rounded-full transition-colors duration-300 ${isSelected ? 'bg-pink-500/20' : 'bg-black/30 group-hover:bg-white/10'}`}>
                    <div className="text-2xl transform transition-transform group-hover:scale-110 duration-300">{method.icon}</div>
                  </div>
                  <div className="space-y-0.5">
                    <PNText className={`font-semibold text-xs leading-tight ${isSelected ? 'text-white' : 'text-gray-200'}`}>{method.name}</PNText>
                    <PNText className="text-[10px] text-gray-500 leading-tight line-clamp-2">{method.description}</PNText>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 animate-scale-in">
                      <div className="bg-pink-500 rounded-full p-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                    </div>
                  )}
                   {/* Selection Ring Animation */}
                   {isSelected && (
                    <div className="absolute inset-0 border-2 border-pink-500 rounded-xl pointer-events-none animate-pulse-slow" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // Render grouped methods section in grid layout
    const renderGroupedMethods = () => {
      return (
        <div className="space-y-5">
          {groupedMethods.map((group) => (
            <div key={group.type} className="animate-fade-in">
              <div className="flex items-center space-x-2 mb-2.5 px-1 pb-1 border-b border-white/5">
                <div className="p-1.5 bg-gray-800/50 rounded-lg">
                  {getGroupIcon(group.icon)}
                </div>
                <div className="flex-1">
                  <PNText className="font-semibold text-sm text-gray-200">{group.name}</PNText>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {group.methods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  
                  return (
                    <div
                      key={method.id}
                      onClick={() => {
                        onMethodSelect?.(method.id);
                        if (onDirectPayment && showSelection) {
                          setTimeout(() => onDirectPayment(method.id), 100);
                        }
                      }}
                      className={`relative cursor-pointer group overflow-hidden transition-all duration-300 p-3 rounded-xl border flex flex-col justify-between min-h-[100px] ${
                        isSelected 
                          ? 'border-pink-500 bg-gradient-to-br from-pink-500/10 to-transparent shadow-lg shadow-pink-500/10 z-10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                         <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-pink-500/20' : 'bg-black/20'}`}>
                            <div className="text-xl">{method.icon}</div>
                         </div>
                        {isSelected && (
                          <div className="bg-pink-500 rounded-full p-0.5 animate-scale-in">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <PNText className={`font-semibold text-xs leading-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {method.name}
                        </PNText>
                        {method.processing_time && (
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${method.processing_time.includes('Instant') ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <PNText className="text-[9px] text-gray-400 leading-tight">
                              {method.processing_time}
                            </PNText>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    // Render security footer - more compact
    const renderSecurityFooter = () => (
      <div className="mt-3 p-2 bg-gray-500/10 border border-gray-500/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="text-gray-300" size={14} />
          <PNText className="text-xs text-gray-300">
            Pembayaran aman dengan enkripsi SSL
          </PNText>
        </div>
      </div>
    );

    // Main render - more compact
    return (
      <PNCard className="space-y-3 p-2.5 sm:p-3 bg-black border border-white/10">
        <div className="flex items-center space-x-2 mb-2 flex-wrap">
          <CreditCard className="text-pink-400" size={16} />
          <PNHeading level={3} className="!mb-0 flex-1 min-w-0 text-sm">
            {showSelection ? 'Pilih Metode Pembayaran' : 'Metode Pembayaran'}
          </PNHeading>
        </div>

        {/* Payment Method Validation Error */}
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-red-400" size={14} />
              <PNText className="text-red-400 text-xs">{error}</PNText>
            </div>
          </div>
        )}

        {/* Popular Methods Section */}
        {renderPopularMethods()}

        {/* Grouped Methods Section */}
        {renderGroupedMethods()}

        {/* Security Footer */}
        {renderSecurityFooter()}
      </PNCard>
    );
  }

  return renderPaymentMethods();
});

PaymentMethods.displayName = 'PaymentMethods';
