// Xendit Invoice API v2 for Direct Payment
// Documentation: https://developers.xendit.co/api-reference/#create-invoice
// This endpoint creates an invoice for a specific payment method

import type { VercelRequest, VercelResponse } from '@vercel/node';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY as string | undefined;
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

interface PaymentRequest {
  amount: number;
  currency: string;
  payment_method_id: string;
  customer?: {
    given_names?: string;
    email?: string;
    mobile_number?: string;
  };
  description?: string;
  external_id: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  order?: {
    product_id?: string;
    product_name?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    order_type?: 'purchase' | 'rental';
    amount: number;
    rental_duration?: string | null;
    user_id?: string | null;
  };
}

// Payment method mapping for Xendit Invoice API v2
// Reference: https://developers.xendit.co/api-reference/#create-invoice
// IMPORTANT: Only include payment methods activated on your Xendit account
// Last synced with Xendit Dashboard: 2026-01-21
const PAYMENT_METHODS: Record<string, string> = {
  // QRIS - Activated ✅
  'qris': 'QRIS',
  // Virtual Accounts - All Activated ✅
  'bjb': 'BJB',
  'bni': 'BNI',
  'bri': 'BRI',
  'bsi': 'BSI',
  'bss': 'BSS', // Bank Sahabat Sampoerna
  'cimb': 'CIMB',
  'mandiri': 'MANDIRI',
  'permata': 'PERMATA',
  // E-Wallets - Only ASTRAPAY is activated ✅
  'astrapay': 'ASTRAPAY',
  // Over-The-Counter - Activated ✅
  'indomaret': 'INDOMARET',
  // PayLater - Only AKULAKU is activated ✅
  'akulaku': 'AKULAKU'
  // NOT ACTIVATED on your Xendit Dashboard:
  // - BCA Virtual Account
  // - Credit/Debit Card (CREDIT_CARD)
  // - OVO, DANA, GOPAY, SHOPEEPAY, LINKAJA (E-Wallets)
  // - Alfamart (Retail)
  // - Kredivo, Atome, Indodana (PayLater)
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!XENDIT_SECRET_KEY) {
    console.error('[Payment] Missing XENDIT_SECRET_KEY');
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    const {
      amount,
      currency = 'IDR',
      payment_method_id,
      customer,
      description,
      external_id,
      success_redirect_url,
      failure_redirect_url,
      order
    }: PaymentRequest = req.body;

    // Validate required fields
    if (!external_id || !amount || !payment_method_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'external_id, amount, and payment_method_id are required'
      });
    }

    // Get Xendit channel code
    const methodKey = payment_method_id.toLowerCase();
    const channelCode = PAYMENT_METHODS[methodKey];
    
    if (!channelCode) {
      return res.status(400).json({
        error: 'Unsupported payment method',
        message: `Payment method '${payment_method_id}' is not supported`,
        supported_methods: Object.keys(PAYMENT_METHODS)
      });
    }

    // Validate product is active before creating payment (prevent purchasing sold products)
    if (order?.product_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: product } = await supabase
          .from('products')
          .select('id, is_active, sold_channel')
          .eq('id', order.product_id)
          .single();
        
        if (product && (!product.is_active || product.sold_channel)) {
          console.warn('[Payment] Attempted to purchase inactive/sold product:', order.product_id);
          return res.status(400).json({
            error: 'Product unavailable',
            message: 'Produk ini sudah tidak tersedia atau sudah terjual'
          });
        }
      } catch (err) {
        console.error('[Payment] Error checking product availability:', err);
        // Continue with payment creation - fail-open for better UX
      }
    }

    // Create order in database if provided
    let createdOrder: any = null;
    if (order && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const orderData = {
          product_id: order.product_id || null,
          product_name: order.product_name || null,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          order_type: order.order_type || 'purchase',
          amount: order.amount,
          status: 'pending',
          payment_method: 'xendit',
          payment_channel: channelCode, // Record actual payment channel (BRI, QRIS, MANDIRI, etc.)
          rental_duration: order.rental_duration || null,
          user_id: order.user_id || null,
          client_external_id: external_id,
        };

        // Check for existing order
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('client_external_id', external_id)
          .maybeSingle();

        if (existing) {
          const { data } = await supabase
            .from('orders')
            .update(orderData)
            .eq('id', existing.id)
            .select('id, status, amount')
            .single();
          createdOrder = data;
        } else {
          const { data } = await supabase
            .from('orders')
            .insert(orderData)
            .select('id, status, amount')
            .single();
          createdOrder = data;
        }
      } catch (err) {
        console.error('[Payment] Database error:', err);
      }
    }

    // Build Xendit Invoice API v2 payload
    const payload: any = {
      external_id,
      amount,
      description: description || 'Payment',
      currency,
      payment_methods: [channelCode],
      payer_email: customer?.email || 'noreply@jbalwikobra.com'
    };

    // Add customer info
    if (customer) {
      payload.customer = {};
      if (customer.given_names) payload.customer.given_names = customer.given_names;
      if (customer.email) payload.customer.email = customer.email;
      if (customer.mobile_number) payload.customer.mobile_number = customer.mobile_number;
    }

    // Add redirect URLs
    if (success_redirect_url) payload.success_redirect_url = success_redirect_url;
    if (failure_redirect_url) payload.failure_redirect_url = failure_redirect_url;

    // Set expiry to 24 hours
    payload.expiry_date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // For QRIS, use QR Code API instead of Invoice API
    let xenditData: any;
    let paymentSpecificData: any = {};
    
    if (channelCode === 'QRIS') {
      
      // Create QR Code using Xendit QR Code API
      const qrPayload = {
        external_id,
        type: 'DYNAMIC',
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.jbalwikobra.com'}/api/xendit/callback`,
        amount: amount.toString(),
        currency
      };
      
      const qrResponse = await fetch('https://api.xendit.co/qr_codes', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'X-IDEMPOTENCY-KEY': external_id
        },
        body: JSON.stringify(qrPayload)
      });
      
      const qrData = await qrResponse.json();
      
      if (!qrResponse.ok) {
        console.error('[Payment] QR Code API error:', qrData);
        return res.status(qrResponse.status).json({
          error: qrData.message || 'QR Code creation failed',
          details: qrData
        });
      }
      
      // Format response to match Invoice API structure
      xenditData = {
        id: qrData.id,
        external_id: qrData.external_id,
        status: qrData.status,
        amount: parseFloat(qrData.amount),
        currency: qrData.currency,
        created: qrData.created,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      paymentSpecificData = {
        qr_string: qrData.qr_string,
        qr_url: qrData.qr_string,
        payment_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.jbalwikobra.com'}/payment?id=${qrData.id}&method=qris`
      };
      
    } else {
      // For non-QRIS payments, use Invoice API v2
      const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'X-IDEMPOTENCY-KEY': external_id
        },
        body: JSON.stringify(payload)
      });

      xenditData = await xenditResponse.json();

      if (!xenditResponse.ok) {
        console.error('[Payment] Xendit error:', xenditData);
        return res.status(xenditResponse.status).json({
          error: xenditData.message || 'Payment creation failed',
          details: xenditData
        });
      }

      paymentSpecificData = {
        invoice_url: xenditData.invoice_url,
        payment_url: xenditData.invoice_url
      };
    }

    // Save payment to database and link order to Xendit invoice
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Create payment record
        const paymentRecord = {
          xendit_id: xenditData.id,
          external_id: xenditData.external_id || external_id,
          payment_method: payment_method_id,
          amount: xenditData.amount,
          currency: xenditData.currency || 'IDR',
          status: xenditData.status || 'PENDING',
          payment_data: paymentSpecificData,
          created_at: xenditData.created || new Date().toISOString(),
          expiry_date: xenditData.expiry_date,
          description: description || 'Payment'
        };

        const { error: saveError } = await supabase
          .from('payments')
          .upsert(paymentRecord, { onConflict: 'xendit_id' });

        if (saveError) {
          console.error('[Payment] Failed to save payment:', saveError);
        }

        // CRITICAL FIX: Always link order to Xendit invoice ID
        // This ensures the webhook can find the order later
        const orderUpdateData = {
          xendit_invoice_id: xenditData.id,
          xendit_invoice_url: paymentSpecificData.invoice_url || paymentSpecificData.payment_url || null,
          payment_channel: channelCode, // Ensure payment channel is set even if order existed before
        };

        if (createdOrder?.id) {
          // Update by order ID if we have it
          const { error: orderUpdateError } = await supabase
            .from('orders')
            .update(orderUpdateData)
            .eq('id', createdOrder.id);
          
          if (orderUpdateError) {
            console.error('[Payment] Failed to update order by ID:', orderUpdateError);
          } else {
          }
        } else if (external_id) {
          // FALLBACK: Update by client_external_id if createdOrder is null
          // This handles race conditions where order creation might have issues
          const { data: orderUpdate, error: orderUpdateError } = await supabase
            .from('orders')
            .update(orderUpdateData)
            .eq('client_external_id', external_id)
            .select('id');
          
          if (orderUpdateError) {
            console.error('[Payment] Failed to update order by client_external_id:', orderUpdateError);
          } else if (orderUpdate && orderUpdate.length > 0) {
          } else {
            console.warn('[Payment] ⚠️ No order found to link for client_external_id:', external_id);
          }
        } else {
          console.warn('[Payment] ⚠️ Cannot link order: no createdOrder and no external_id');
        }
      } catch (err) {
        console.error('[Payment] Database error:', err);
      }
    }

    // Notifikasi WhatsApp ke customer individual DIHAPUS (auth revamp)
    // Customer notification sekarang melalui in-app notification

    // Return standardized response (Invoice API format)
    return res.status(200).json({
      id: xenditData.id,
      status: xenditData.status,
      payment_url: xenditData.invoice_url,
      invoice_url: xenditData.invoice_url,
      payment_method: payment_method_id,
      amount: xenditData.amount,
      currency: xenditData.currency,
      external_id: xenditData.external_id,
      expiry_date: xenditData.expiry_date,
      qr_string: paymentSpecificData.qr_string, // Include QR string in response
      qr_url: paymentSpecificData.qr_url
    });

  } catch (error: any) {
    console.error('[Payment] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
}