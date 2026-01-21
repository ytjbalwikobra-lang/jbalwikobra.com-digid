/**
 * Xendit Payment Service
 * Handles dynamic payment method fetching and direct payment processing
 */

import { PaymentMethodUtils, PAYMENT_METHOD_CONFIGS, type PaymentMethodConfig } from '../config/paymentMethodConfig';

export interface XenditPaymentMethod {
  id: string;
  name: string;
  type: 'EWALLET' | 'BANK' | 'CREDIT_CARD' | 'QRIS' | 'VIRTUAL_ACCOUNT' | 'RETAIL_OUTLET' | 'PAYLATER';
  description: string;
  icon: string;
  available: boolean;
  fees?: {
    percentage?: number;
    fixed?: number;
  };
  min_amount?: number;
  max_amount?: number;
  processing_time: string;
  popular?: boolean;
  channels?: string[];
}

export interface CreateDirectPaymentInput {
  amount: number;
  currency: string;
  payment_method_id: string;
  customer: {
    given_names?: string;
    email?: string;
    mobile_number?: string;
  };
  description?: string;
  external_id: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
}

export interface DirectPaymentResponse {
  id: string;
  status: string;
  payment_url?: string;
  payment_code?: string;
  qr_string?: string;
  expiry_date: string;
  payment_method: XenditPaymentMethod;
}

/**
 * Fetch available payment methods from Xendit
 */
export async function fetchAvailablePaymentMethods(amount?: number): Promise<XenditPaymentMethod[]> {
  try {
    // For development, return static methods immediately to avoid 404
    if (process.env.NODE_ENV === 'development') {
      return getStaticPaymentMethods();
    }

    const response = await fetch('/api/xendit/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const data = await response.json();
    return data.payment_methods || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    // Return fallback static methods
    return getStaticPaymentMethods();
  }
}

/**
 * Create direct payment with specific payment method
 */
export async function createDirectPayment(input: CreateDirectPaymentInput): Promise<DirectPaymentResponse> {
  try {
    const response = await fetch('/api/xendit/create-direct-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating direct payment:', error);
    throw error;
  }
}

/**
 * Fallback static payment methods when API is unavailable
 * Now uses centralized configuration
 */
function getStaticPaymentMethods(): XenditPaymentMethod[] {
  return PaymentMethodUtils.getAllActivated().map(config => ({
    id: config.id,
    name: config.name,
    type: config.type,
    description: `Pembayaran dengan ${config.name}`,
    icon: getPaymentMethodIcon(config.type, config.id),
    available: true,
    processing_time: config.processingTime || 'Instant',
    popular: config.popular || false,
    min_amount: config.minAmount || 10000,
    max_amount: config.maxAmount || 1000000000
  }));
}

/**
 * Get payment method icon component
 */
export function getPaymentMethodIcon(type: string, paymentId?: string): string {
  const iconMap: Record<string, string> = {
    // E-Wallets
    'ovo': 'ovo',
    'dana': 'dana',
    'gopay': 'gopay',
    'linkaja': 'linkaja',
    'shopeepay': 'shopeepay',
    
    // Banks
    'bca': 'bca',
    'bni': 'bni',
    'mandiri': 'mandiri',
    'bri': 'bri',
    'cimb': 'cimb',
    'permata': 'permata',
    
    // Types
    'EWALLET': 'wallet',
    'VIRTUAL_ACCOUNT': 'building',
    'CREDIT_CARD': 'credit-card',
    'QRIS': 'qr-code',
    'BANK': 'building',
    'RETAIL_OUTLET': 'store'
  };

  return iconMap[paymentId || ''] || iconMap[type] || 'credit-card';
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: XenditPaymentMethod): {
  id: string;
  name: string;
  description: string;
  icon: string;
  badges: string[];
  available: boolean;
  popular: boolean;
} {
  const badges: string[] = [];
  
  if (method.processing_time === 'Instant') {
    badges.push('Instant');
  } else {
    badges.push(method.processing_time);
  }
  
  if (method.popular) {
    badges.push('Populer');
  }

  return {
    id: method.id,
    name: method.name,
    description: method.description,
    icon: getPaymentMethodIcon(method.type, method.id),
    badges,
    available: method.available,
    popular: method.popular || false
  };
}

/**
 * Check if amount is valid for payment method
 */
export function isAmountValidForMethod(amount: number, method: XenditPaymentMethod): boolean {
  if (method.min_amount && amount < method.min_amount) {
    return false;
  }
  
  if (method.max_amount && amount > method.max_amount) {
    return false;
  }
  
  return true;
}

/**
 * Get payment method requirements/limitations as text
 */
export function getPaymentMethodLimitations(method: XenditPaymentMethod): string | null {
  const limitations: string[] = [];
  
  if (method.min_amount) {
    limitations.push(`Min: Rp ${method.min_amount.toLocaleString()}`);
  }
  
  if (method.max_amount) {
    limitations.push(`Max: Rp ${method.max_amount.toLocaleString()}`);
  }
  
  return limitations.length > 0 ? limitations.join(' • ') : null;
}

/**
 * Group payment methods by type for better UX
 */
export interface PaymentMethodGroup {
  type: string;
  name: string;
  description: string;
  icon: string;
  methods: XenditPaymentMethod[];
  popular: boolean;
}

export function groupPaymentMethods(methods: XenditPaymentMethod[]): PaymentMethodGroup[] {
  const groups: Record<string, PaymentMethodGroup> = {};

  // Define group metadata
  const groupMetadata: Record<string, { name: string; description: string; icon: string; popular: boolean }> = {
    'EWALLET': {
      name: 'E-Wallet',
      description: 'Bayar dengan e-wallet',
      icon: 'wallet',
      popular: true
    },
    'VIRTUAL_ACCOUNT': {
      name: 'Virtual Account',
      description: 'Bayar dengan Virtual Account',
      icon: 'building',
      popular: true
    },
    'QRIS': {
      name: 'QRIS',
      description: 'Scan QR Code untuk bayar',
      icon: 'qr-code',
      popular: true
    },
    'CREDIT_CARD': {
      name: 'Kartu Kredit/Debit',
      description: 'Pembayaran dengan kartu',
      icon: 'credit-card',
      popular: false
    },
    'BANK': {
      name: 'Transfer Bank',
      description: 'Transfer ke rekening bank',
      icon: 'building',
      popular: false
    },
    'RETAIL_OUTLET': {
      name: 'Retail Outlet',
      description: 'Bayar di outlet fisik',
      icon: 'store',
      popular: false
    }
  };

  // Group methods by type
  methods.forEach(method => {
    if (!groups[method.type]) {
      const metadata = groupMetadata[method.type] || {
        name: method.type,
        description: `Pembayaran melalui ${method.type}`,
        icon: '💳',
        popular: false
      };

      groups[method.type] = {
        type: method.type,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        popular: metadata.popular,
        methods: []
      };
    }

    groups[method.type].methods.push(method);
  });

  // Sort groups by popularity and method count
  const sortedGroups = Object.values(groups).sort((a, b) => {
    // Popular groups first
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    
    // Then by number of methods
    return b.methods.length - a.methods.length;
  });

  // Sort methods within each group by popularity
  sortedGroups.forEach(group => {
    group.methods.sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  return sortedGroups;
}

/**
 * Get the most popular payment methods (for quick access)
 */
export function getPopularPaymentMethods(methods: XenditPaymentMethod[]): XenditPaymentMethod[] {
  return methods
    .filter(method => method.popular && method.available)
    .sort((a, b) => {
      // Order by processing speed first (instant first)
      if (a.processing_time === 'Instant' && b.processing_time !== 'Instant') return -1;
      if (a.processing_time !== 'Instant' && b.processing_time === 'Instant') return 1;
      
      // Then alphabetically
      return a.name.localeCompare(b.name);
    })
    .slice(0, 6); // Limit to top 6
}
