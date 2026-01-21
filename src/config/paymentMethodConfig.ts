/**
 * 🔧 Payment Method Configuration
 * Centralized configuration for payment methods to eliminate duplication
 * 
 * ACTIVATED ON XENDIT DASHBOARD:
 * ✅ QRIS, AstraPay, Virtual Accounts (BJB/BNI/BRI/BSI/BSS/CIMB/Mandiri/Permata), Indomaret, Akulaku
 * 
 * NOT ACTIVATED:
 * ❌ Credit Card, BCA VA, OVO, DANA, GoPay, ShopeePay, LinkAja, Alfamart, Kredivo, Atome, Indodana
 */

export type PaymentMethodType = 'EWALLET' | 'VIRTUAL_ACCOUNT' | 'QRIS' | 'RETAIL_OUTLET' | 'PAYLATER';

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  xenditCode: string;
  apiEndpoint: '/payment_requests' | '/qr_codes' | '/invoices';
  channelProperties?: Record<string, any>;
  requiresRedirectUrls?: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  popular?: boolean;
}

// Activated payment channels based on Xendit dashboard
export const PAYMENT_METHOD_CONFIGS: Record<string, PaymentMethodConfig> = {
  // E-Wallets - Only AstraPay is activated ✅
  astrapay: {
    id: 'astrapay',
    name: 'AstraPay',
    type: 'EWALLET',
    xenditCode: 'ASTRAPAY',
    apiEndpoint: '/payment_requests',
    requiresRedirectUrls: true,
    minAmount: 1000,
    maxAmount: 10000000,
    processingTime: 'Instant',
    popular: true
  },

  // Virtual Accounts - Activated channels ✅
  bjb: {
    id: 'bjb',
    name: 'BJB Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'BJB',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 500000000, // BJB VA limit: 500 million
    processingTime: '1-15 menit'
  },
  bni: {
    id: 'bni',
    name: 'BNI Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'BNI',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 500000000, // BNI VA limit: 500 million
    processingTime: '1-15 menit',
    popular: true
  },
  bri: {
    id: 'bri',
    name: 'BRI Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'BRI',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 1000000000, // BRI VA limit: 1 billion (already correct)
    processingTime: '1-15 menit'
  },
  bsi: {
    id: 'bsi',
    name: 'BSI Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'BSI',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 1000000000, // BSI VA limit: 1 billion (already correct)
    processingTime: '1-15 menit'
  },
  bss: {
    id: 'bss',
    name: 'BSS Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'BSS',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 100000000, // BSS VA limit: 100 million
    processingTime: '1-15 menit'
  },
  cimb: {
    id: 'cimb',
    name: 'CIMB Niaga Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'CIMB',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 500000000, // CIMB VA limit: 500 million
    processingTime: '1-15 menit'
  },
  mandiri: {
    id: 'mandiri',
    name: 'Mandiri Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'MANDIRI',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 1000000000, // Mandiri VA limit: 1 billion (already correct)
    processingTime: '1-15 menit',
    popular: true
  },
  permata: {
    id: 'permata',
    name: 'Permata Virtual Account',
    type: 'VIRTUAL_ACCOUNT',
    xenditCode: 'PERMATA',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 1000000000, // Permata VA limit: 1 billion (already correct)
    processingTime: '1-15 menit'
  },

  // Retail Outlets
  indomaret: {
    id: 'indomaret',
    name: 'Indomaret',
    type: 'RETAIL_OUTLET',
    xenditCode: 'INDOMARET',
    apiEndpoint: '/payment_requests',
    minAmount: 10000,
    maxAmount: 5000000,
    processingTime: '1-24 jam'
  },

  // QRIS - Activated ✅
  qris: {
    id: 'qris',
    name: 'QRIS',
    type: 'QRIS',
    xenditCode: 'QRIS',
    apiEndpoint: '/qr_codes',
    minAmount: 1500,
    maxAmount: 10000000,
    processingTime: 'Instant',
    popular: true
  },

  // PayLater - Only Akulaku is activated ✅
  akulaku: {
    id: 'akulaku',
    name: 'Akulaku',
    type: 'PAYLATER',
    xenditCode: 'AKULAKU',
    apiEndpoint: '/invoices',
    minAmount: 50000,
    maxAmount: 10000000,
    processingTime: 'Instant',
    popular: false
  }
};

export class PaymentMethodUtils {
  /**
   * Get payment method configuration
   */
  static getConfig(paymentMethodId: string): PaymentMethodConfig | null {
    return PAYMENT_METHOD_CONFIGS[paymentMethodId.toLowerCase()] || null;
  }

  /**
   * Check if payment method is activated
   */
  static isActivated(paymentMethodId: string): boolean {
    return paymentMethodId.toLowerCase() in PAYMENT_METHOD_CONFIGS;
  }

  /**
   * Get all activated payment methods
   */
  static getAllActivated(): PaymentMethodConfig[] {
    return Object.values(PAYMENT_METHOD_CONFIGS);
  }

  /**
   * Get activated methods by type
   */
  static getByType(type: PaymentMethodType): PaymentMethodConfig[] {
    return Object.values(PAYMENT_METHOD_CONFIGS).filter(config => config.type === type);
  }

  /**
   * Get all activated method IDs
   */
  static getAllActivatedIds(): string[] {
    return Object.keys(PAYMENT_METHOD_CONFIGS);
  }

  /**
   * Create E-Wallet payment payload
   */
  static createEWalletPayload(
    config: PaymentMethodConfig,
    externalId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: any,
    successUrl?: string,
    failureUrl?: string
  ) {
    const channelProperties: any = {};
    
    if (config.requiresRedirectUrls && successUrl && failureUrl) {
      channelProperties.success_redirect_url = successUrl;
      channelProperties.failure_redirect_url = failureUrl;
    }

    return {
      reference_id: externalId,
      amount,
      currency,
      country: 'ID',
      payment_method: {
        type: 'EWALLET',
        ewallet: {
          channel_code: config.xenditCode,
          channel_properties: channelProperties
        },
        reusability: 'ONE_TIME_USE'
      },
      description,
      metadata
    };
  }

  /**
   * Create Virtual Account payment payload
   */
  static createVirtualAccountPayload(
    config: PaymentMethodConfig,
    externalId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: any,
    customerName: string
  ) {
    // Sanitize customer name (remove bank-related words)
    const sanitizedName = (customerName || 'Customer')
      .replace(/bank|bni|bri|mandiri|bca|bsi|cimb|permata|institution/gi, '')
      .trim() || 'Customer';

    return {
      reference_id: externalId,
      amount,
      currency,
      country: 'ID',
      payment_method: {
        type: 'VIRTUAL_ACCOUNT',
        virtual_account: {
          channel_code: config.xenditCode,
          channel_properties: {
            customer_name: sanitizedName,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        },
        reusability: 'ONE_TIME_USE'
      },
      description,
      metadata
    };
  }

  /**
   * Create QRIS payment payload
   */
  static createQRISPayload(
    externalId: string,
    amount: number,
    description: string,
    metadata: any,
    callbackUrl: string
  ) {
    return {
      external_id: externalId,
      type: 'DYNAMIC',
      callback_url: callbackUrl,
      amount,
      description,
      metadata
    };
  }

  /**
   * Create Retail Outlet payment payload
   */
  static createRetailPayload(
    config: PaymentMethodConfig,
    externalId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: any,
    customerName: string
  ) {
    const sanitizedName = (customerName || 'Customer')
      .replace(/bank|bni|bri|mandiri|bca|bsi|cimb|permata|institution/gi, '')
      .trim() || 'Customer';

    return {
      reference_id: externalId,
      amount,
      currency,
      country: 'ID',
      payment_method: {
        type: 'OVER_THE_COUNTER',
        over_the_counter: {
          channel_code: config.xenditCode,
          channel_properties: {
            customer_name: sanitizedName,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        },
        reusability: 'ONE_TIME_USE'
      },
      description,
      metadata
    };
  }

  /**
   * Format Xendit response based on payment method type
   */
  static formatResponse(responseData: any, config: PaymentMethodConfig, externalId: string, amount: number, currency: string) {
    const baseResponse = {
      id: responseData.id,
      status: responseData.status,
      external_id: responseData.reference_id || responseData.external_id || externalId,
      payment_method: {
        id: config.id,
        type: config.type
      },
      amount,
      currency,
      created: responseData.created || new Date().toISOString(),
      expiry_date: responseData.expires_at || responseData.expiration_date
    };

    // Add method-specific fields
    if (config.type === 'EWALLET' && responseData.actions?.length > 0) {
      const redirectAction = responseData.actions.find((action: any) => action.action === 'AUTH');
      if (redirectAction) {
        (baseResponse as any).payment_url = redirectAction.url;
        (baseResponse as any).action_type = redirectAction.action;
      }
    } else if (config.type === 'VIRTUAL_ACCOUNT' && responseData.payment_method?.virtual_account) {
      const va = responseData.payment_method.virtual_account;
      (baseResponse as any).account_number = va.channel_properties?.account_number;
      (baseResponse as any).bank_code = va.channel_code;
    } else if (config.type === 'RETAIL_OUTLET' && responseData.payment_method?.over_the_counter) {
      const otc = responseData.payment_method.over_the_counter;
      (baseResponse as any).payment_code = otc.channel_properties?.payment_code;
      (baseResponse as any).retail_outlet = otc.channel_code;
    } else if (config.type === 'QRIS' && responseData.qr_string) {
      (baseResponse as any).qr_string = responseData.qr_string;
      (baseResponse as any).qr_url = responseData.qr_string;
    }

    // Legacy support for other response formats
    if (responseData.account_number) {
      (baseResponse as any).account_number = responseData.account_number;
      (baseResponse as any).bank_code = responseData.bank_code;
    }
    if (responseData.invoice_url) {
      (baseResponse as any).payment_url = responseData.invoice_url;
    }

    return baseResponse;
  }

  /**
   * Create payment payload based on method type
   */
  static createPaymentPayload(
    config: PaymentMethodConfig,
    externalId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: any,
    customerName?: string,
    successUrl?: string,
    failureUrl?: string,
    callbackUrl?: string
  ) {
    switch (config.type) {
      case 'EWALLET':
        return this.createEWalletPayload(config, externalId, amount, currency, description, metadata, successUrl, failureUrl);
      
      case 'VIRTUAL_ACCOUNT':
        return this.createVirtualAccountPayload(config, externalId, amount, currency, description, metadata, customerName || 'Customer');
      
      case 'QRIS':
        return this.createQRISPayload(externalId, amount, description, metadata, callbackUrl || '');
      
      case 'RETAIL_OUTLET':
        return this.createRetailPayload(config, externalId, amount, currency, description, metadata, customerName || 'Customer');
      
      default:
        throw new Error(`Unsupported payment method type: ${config.type}`);
    }
  }
}

// For backwards compatibility
export const ACTIVATED_EWALLET_CHANNELS = Object.fromEntries(
  PaymentMethodUtils.getByType('EWALLET').map(config => [config.id, config.xenditCode])
);

export const ACTIVATED_VIRTUAL_ACCOUNT_CHANNELS = Object.fromEntries(
  PaymentMethodUtils.getByType('VIRTUAL_ACCOUNT').map(config => [config.id, config.xenditCode])
);

export const ACTIVATED_RETAIL_CHANNELS = Object.fromEntries(
  PaymentMethodUtils.getByType('RETAIL_OUTLET').map(config => [config.id, config.xenditCode])
);

export const ACTIVATED_QR_CHANNELS = Object.fromEntries(
  PaymentMethodUtils.getByType('QRIS').map(config => [config.id, config.xenditCode])
);
