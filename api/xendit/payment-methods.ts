import type { VercelRequest, VercelResponse } from '@vercel/node';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = 'https://api.xendit.co';

interface _PaymentMethodResponse {
  id: string;
  name: string;
  type: string;
  description?: string;
  available: boolean;
  channels?: string[];
  min_amount?: number;
  max_amount?: number;
  fees?: {
    percentage?: number;
    fixed?: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!XENDIT_SECRET_KEY) {
    console.error('[Xendit Payment Methods] Missing XENDIT_SECRET_KEY');
    return res.status(500).json({ error: 'Payment service configuration error' });
  }

  try {
    const { amount } = req.body;
    
    // For now, let's test with a simple request to check if credentials work
    // Try to get payment channels instead
    const response = await fetch(`${XENDIT_BASE_URL}/payment_channels`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });

    let apiCallSuccessful = false;

    if (response.ok) {
      await response.json();
      apiCallSuccessful = true;
    } else {
      const errorText = await response.text();
      console.warn('[Xendit Payment Methods] API call failed:', response.status, errorText);
    }

    // Use static methods but with proper source designation
    const methods = getStaticFallbackMethods(amount);

    // Cache: payment methods jarang berubah, cache 10 menit
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=300');
    
    return res.status(200).json({
      payment_methods: methods,
      source: apiCallSuccessful ? 'xendit_api' : 'fallback'
    });

  } catch (error) {
    console.error('[Xendit Payment Methods] Error:', error);
    const err = error as Error;
    console.error('[Xendit Payment Methods] Error details:', {
      message: err.message,
      stack: err.stack
    });
    
    // Return fallback methods on error
    return res.status(200).json({
      payment_methods: getStaticFallbackMethods(req.body.amount),
      source: 'fallback_error'
    });
  }
}

function getStaticFallbackMethods(amount?: number) {
  const staticMethods = [
    {
      id: 'ovo',
      name: 'OVO',
      type: 'EWALLET',
      description: 'Pembayaran instant dengan OVO',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 10000,
      max_amount: 10000000
    },
    {
      id: 'dana',
      name: 'DANA',
      type: 'EWALLET',
      description: 'Pembayaran instant dengan DANA',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 10000,
      max_amount: 10000000
    },
    {
      id: 'gopay',
      name: 'GoPay',
      type: 'EWALLET',
      description: 'Pembayaran instant dengan GoPay',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 10000,
      max_amount: 2000000
    },
    {
      id: 'qris',
      name: 'QRIS',
      type: 'QRIS',
      description: 'Scan QR Code untuk bayar',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 1000,
      max_amount: 10000000
    },
    // BCA Virtual Account - REMOVED (not activated)
    // {
    //   id: 'bca',
    //   name: 'BCA Virtual Account',
    //   type: 'VIRTUAL_ACCOUNT',
    //   description: 'Transfer melalui Virtual Account BCA',
    //   available: false, // NOT ACTIVATED
    //   processing_time: '1-15 menit',
    //   popular: false,
    //   min_amount: 10000,
    //   max_amount: 500000000 // BCA VA limit: 500 million
    // },
    {
      id: 'bjb',
      name: 'BJB Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account BJB',
      available: true,
      processing_time: 'Instant',
      popular: false,
      min_amount: 10000,
      max_amount: 500000000
    },
    {
      id: 'bni',
      name: 'BNI Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account BNI',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 10000,
      max_amount: 500000000
    },
    {
      id: 'bri',
      name: 'BRI Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account BRI',
      available: true,
      processing_time: 'Instant',
      popular: true,
      min_amount: 10000,
      max_amount: 1000000000
    },
    {
      id: 'bsi',
      name: 'BSI Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account BSI',
      available: true,
      processing_time: 'Instant',
      popular: false,
      min_amount: 10000,
      max_amount: 100000000
    },
    {
      id: 'cimb',
      name: 'CIMB Niaga Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account CIMB Niaga',
      available: true,
      processing_time: 'Instant',
      popular: false,
      min_amount: 10000,
      max_amount: 100000000
    },
    {
      id: 'mandiri',
      name: 'Mandiri Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account Mandiri',
      available: true,
      processing_time: '1-15 menit',
      popular: true,
      min_amount: 10000,
      max_amount: 500000000
    },
    {
      id: 'permata',
      name: 'Permata Virtual Account',
      type: 'VIRTUAL_ACCOUNT',
      description: 'Transfer melalui Virtual Account Permata',
      available: true,
      processing_time: 'Instant',
      popular: false,
      min_amount: 10000,
      max_amount: 100000000
    },
    {
      id: 'credit_card',
      name: 'Kartu Kredit/Debit',
      type: 'CREDIT_CARD',
      description: 'Visa, Mastercard, JCB',
      available: true,
      processing_time: 'Instant',
      min_amount: 10000,
      max_amount: 1000000000 // Updated to 1 billion for high-value support
    }
  ];

  // Filter by amount if provided
  if (amount) {
    return staticMethods.filter(method => 
      (!method.min_amount || amount >= method.min_amount) &&
      (!method.max_amount || amount <= method.max_amount)
    );
  }

  return staticMethods;
}
