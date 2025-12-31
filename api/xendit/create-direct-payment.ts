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
const PAYMENT_METHODS: Record<string, string> = {
  // QRIS - Activated
  'qris': 'QRIS',
  // Virtual Accounts - Activated on your account
  'bjb': 'BJB',
  'bni': 'BNI',
  'bri': 'BRI',
  'bsi': 'BSI',
  'cimb': 'CIMB',
  'mandiri': 'MANDIRI',
  'permata': 'PERMATA',
  // E-Wallets - Only ASTRAPAY is activated
  'astrapay': 'ASTRAPAY',
  // Retail - Activated
  'indomaret': 'INDOMARET'
  // NOTE: Other e-wallets (SHOPEEPAY, GOPAY, DANA, LINKAJA, OVO) are NOT activated
  // Activate them in Xendit dashboard first before adding here
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

    console.log('[Payment] Creating payment link:', { 
      external_id, 
      amount, 
      payment_method: payment_method_id 
    });

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
            .select()
            .single();
          createdOrder = data;
          console.log('[Payment] Order updated:', existing.id);
        } else {
          const { data } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
          createdOrder = data;
          console.log('[Payment] Order created:', data?.id);
          
          // Send WhatsApp notification to customer about new order
          console.log('[Payment] Attempting to send WhatsApp notification...');
          if (data && customer?.mobile_number) {
            console.log('[Payment] Customer mobile number:', customer.mobile_number);
            try {
              console.log('[Payment] Loading DynamicWhatsAppService...');
              const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
              const wa = new DynamicWhatsAppService();
              console.log('[Payment] WhatsApp service initialized');
              
              // Normalize phone number
              let customerPhone = String(customer.mobile_number || '').replace(/\D/g, '');
              if (customerPhone.startsWith('8')) customerPhone = '62' + customerPhone;
              else if (customerPhone.startsWith('08')) customerPhone = '62' + customerPhone.substring(1);
              else if (customerPhone.startsWith('0')) customerPhone = '62' + customerPhone.substring(1);
              else if (!customerPhone.startsWith('62') && customerPhone.length >= 8) customerPhone = '62' + customerPhone;
              
              console.log('[Payment] Normalized phone:', customerPhone);
              
              if (/^62\d{8,15}$/.test(customerPhone)) {
                console.log('[Payment] Phone number valid, preparing message...');
                const isRental = orderData.order_type === 'rental';
                // Try to get product name from order data first, then from request body, fallback to default
                const productName = orderData.product_name || (req.body.product_name as string) || 'Produk Digital';
                const productId = order?.product_id || orderData.product_id;
                const productUrl = productId ? `https://jbalwikobra.com/products/${productId}` : 'https://jbalwikobra.com/products';
                
                // We'll get the payment link after creating the invoice
                // For now, store placeholder that will be updated in response
                const paymentLinkPlaceholder = 'Link akan dikirim setelah invoice dibuat';
                
                const message = `🔥 *SIAP BOSKU! ORDERAN UDAH DIBUAT*

Halo Bosku ${customer.given_names || 'Customer'} 👋

Terima kasih ya, pesanan Bosku udah berhasil kami catat di sistem ✅. Tinggal satu langkah lagi nih biar bisa langsung diproses!

📋 *DETAIL PESANAN:*

👤 *Nama:* ${customer.given_names || 'Customer'}

🎯 *Produk:* ${productName}

🔗 *Link Produk:* ${productUrl}

💰 *Total:* Rp ${Number(amount || 0).toLocaleString('id-ID')}

⏳ *Batas Waktu:* 24 Jam

💳 *CARA BAYARNYA GAMPANG:*

Tinggal klik link di bawah atau cek pesan terpisah ya Bosku.

🔗 *Link Bayar:* Link akan dikirim dalam pesan terpisah

⚠️ *CATATAN PENTING:*

• Jangan lupa lunasin sebelum 24 jam ya Bosku, biar orderannya nggak hangus otomatis.

• Simpan Order ID buat jaga-jaga: *${data.id}*

💬 *Support:* wa.me/6289653510125

🌐 *Website:* https://jbalwikobra.com

Terima kasih Bosku! 🎮✨`;

                const contextId = `order:${data.id}:created`;
                console.log('[Payment] Sending WhatsApp message to:', customerPhone);
                console.log('[Payment] Message length:', message.length);
                
                const sendRes = await wa.sendMessage({
                  phone: customerPhone,
                  message,
                  contextType: 'order-created-customer',
                  contextId
                });
                
                console.log('[Payment] WhatsApp send result:', JSON.stringify(sendRes));
                
                if (sendRes.success) {
                  console.log('[WhatsApp] ✅ New order notification sent to customer:', customerPhone);
                } else {
                  console.error('[WhatsApp] ❌ Failed to send notification:', sendRes.error);
                }
              } else {
                console.warn('[WhatsApp] ⚠️ Invalid phone number format:', customerPhone);
              }
            } catch (waError) {
              console.error('[WhatsApp] ❌ Error sending new order notification:', waError);
            }
          } else {
            console.log('[Payment] ⚠️ Skipping WhatsApp - No customer mobile number or order data');
          }
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

    console.log('[Payment] Xendit payload:', JSON.stringify(payload, null, 2));

    // For QRIS, use QR Code API instead of Invoice API
    let xenditData: any;
    let paymentSpecificData: any = {};
    
    if (channelCode === 'QRIS') {
      console.log('[Payment] 🔄 Using Xendit QR Code API for QRIS');
      
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
      
      console.log('[Payment] ✅ QR Code created:', qrData.id);
      console.log('[Payment] QR String length:', qrData.qr_string?.length || 0);
      
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

      console.log('[Payment] Payment link created:', xenditData.id);

      paymentSpecificData = {
        invoice_url: xenditData.invoice_url,
        payment_url: xenditData.invoice_url
      };
    }

    // Save payment to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Create payment record
        const paymentRecord = {
          xendit_id: xenditData.id,
          external_id: xenditData.external_id,
          payment_method: payment_method_id,
          amount: xenditData.amount,
          currency: xenditData.currency || 'IDR',
          status: xenditData.status || 'PENDING',
          payment_data: paymentSpecificData,
          created_at: xenditData.created || new Date().toISOString(),
          expiry_date: xenditData.expiry_date,
          description: description || 'Payment'
        };

        console.log('[Payment] Saving to database:', paymentRecord);

        const { data: savedPayment, error: saveError } = await supabase
          .from('payments')
          .upsert(paymentRecord, { onConflict: 'xendit_id' })
          .select()
          .single();

        if (saveError) {
          console.error('[Payment] Failed to save payment:', saveError);
        } else {
          console.log('[Payment] ✅ Payment saved to database');
        }

        // Update order with Xendit payment ID
        if (createdOrder) {
          await supabase
            .from('orders')
            .update({ xendit_invoice_id: xenditData.id })
            .eq('id', createdOrder.id);
        }
      } catch (err) {
        console.error('[Payment] Database error:', err);
      }
    }

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