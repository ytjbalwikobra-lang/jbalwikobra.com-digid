// Best practice: keep secret on server
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY as string | undefined;
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// Only include payment methods that are ACTIVATED on your Xendit account
// Based on your Xendit dashboard activation status
const ACTIVATED_PAYMENT_METHODS = [
  // E-Wallets - Currently activated
  'ASTRAPAY',
  // Virtual Accounts - All activated on your account  
  'BJB',
  'BNI', 
  'BRI',
  'BSI',
  'CIMB',
  'MANDIRI',
  'PERMATA',
  // Over-the-counter - Activated
  'INDOMARET',
  // QR Code - Usually activated by default
  'QRIS'
  // Note: PayLater (AKULAKU) removed as it's not clearly activated
  // Add more e-wallets if you activate them: OVO, DANA, SHOPEEPAY, GOPAY, etc.
];

// Import shared notification service for DRY code
import { createOrderNotification, getProductName } from '../_utils/notificationService.js';
async function createOrderIfProvided(order: any, clientExternalId?: string) {
  try {
    if (!order) {
      console.log('[createOrderIfProvided] No order payload provided');
      return null;
    }
    if (!SUPABASE_URL) {
      console.error('[createOrderIfProvided] Missing SUPABASE_URL env var');
      return null;
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[createOrderIfProvided] Missing SUPABASE_SERVICE_ROLE_KEY env var');
      return null;
    }
    
    console.log('[createOrderIfProvided] Attempting to create order:', { 
      clientExternalId, 
      product_id: order.product_id, 
      customer_name: order.customer_name,
      amount: order.amount 
    });
    
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Validate product_id if provided (should be UUID format or null)
    if (order.product_id && typeof order.product_id === 'string') {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.product_id);
      if (!isValidUUID) {
        console.error('[createOrderIfProvided] Invalid product_id format:', order.product_id, 'Setting to null');
        order.product_id = null; // Set to null instead of failing
      } else {
        // Log that we have a valid product_id (useful for debugging)
        console.log('[createOrderIfProvided] Valid product_id provided:', order.product_id);
      }
    }
    
    const payload: any = {
      product_id: order.product_id || null,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      order_type: order.order_type || 'purchase',
      amount: order.amount,
      status: 'pending',
      payment_method: 'xendit',
      rental_duration: order.rental_duration || null,
      user_id: order.user_id || null,
      client_external_id: clientExternalId || null,
    };
    // If we have a client external id, try to reuse existing order row to be idempotent
    if (clientExternalId) {
      console.log('[createOrderIfProvided] Checking for existing order with client_external_id:', clientExternalId);
      const existingRes = await sb
        .from('orders')
        .select('id, customer_name, product_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id')
        .eq('client_external_id', clientExternalId)
        .limit(1);
      if (existingRes.error) {
        console.error('[createOrderIfProvided] Error checking existing order:', existingRes.error);
      }
      const existing = Array.isArray(existingRes.data) ? existingRes.data[0] : null;
      if (existing) {
        console.log('[createOrderIfProvided] Found existing order:', existing.id);
        // If invoice already attached (likely paid/pending at gateway), just return it
        if (existing.xendit_invoice_id) {
          console.log('[createOrderIfProvided] Existing order already has invoice, returning it');
          return existing;
        }
        // Otherwise, update basic fields and return
        console.log('[createOrderIfProvided] Updating existing order fields');
        const { data: upd } = await sb
          .from('orders')
          .update({
            product_id: payload.product_id,
            customer_name: payload.customer_name,
            customer_email: payload.customer_email,
            customer_phone: payload.customer_phone,
            order_type: payload.order_type,
            amount: payload.amount,
            rental_duration: payload.rental_duration,
            user_id: payload.user_id,
          })
          .eq('id', existing.id)
          .select('id, customer_name, product_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id')
          .single();
        if (upd) console.log('[createOrderIfProvided] Updated existing order successfully');
        return upd || existing;
      }
    }

    // Insert new or upsert by client_external_id to avoid race duplicates
    if (clientExternalId) {
      console.log('[createOrderIfProvided] Upserting new order with client_external_id');
      const { data, error } = await sb
        .from('orders')
        .upsert(payload, { onConflict: 'client_external_id' })
        .select('id, customer_name, product_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id')
        .single();
      if (error) {
        console.error('[createOrderIfProvided] Upsert error:', error);
        throw error;
      }
      console.log('[createOrderIfProvided] Upserted order successfully:', data?.id);
      
      // Create admin notification for new order (upsert path)
      try {
        // Get product name using shared utility
        const productName = await getProductName(sb, data?.product_id, data?.order_type);

        await createOrderNotification(
          sb,
          data.id,
          data.customer_name || 'Guest Customer',
          productName,
          Number(data.amount || 0),
          'new_order',
          data.customer_phone,
          data.order_type,
          data.rental_duration
        );
        console.log('[Admin] New order notification created successfully (upsert path)');
      } catch (notificationError) {
        console.error('[Admin] Failed to create new order notification (upsert path):', notificationError);
      }
      
      return data;
    } else {
      console.log('[createOrderIfProvided] Inserting new order without client_external_id');
      const { data, error } = await sb.from('orders').insert(payload).select('id, customer_name, product_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id').single();
      if (error) {
        console.error('[createOrderIfProvided] Insert error:', error);
        throw error;
      }
      console.log('[createOrderIfProvided] Inserted order successfully:', data?.id);
      
      // Create admin notification for new order using shared utility
      try {
        const productName = await getProductName(sb, data?.product_id, data?.order_type);

        await createOrderNotification(
          sb,
          data.id,
          data.customer_name || 'Guest Customer',
          productName,
          Number(data.amount || 0),
          'new_order',
          data.customer_phone,
          data.order_type,
          data.rental_duration
        );
        console.log('[Admin] New order notification created successfully');
      } catch (notificationError) {
        console.error('[Admin] Failed to create new order notification:', notificationError);
      }

      return data;
    }
  } catch (e) {
    console.error('[createOrderIfProvided] Failed to create order in Supabase:', e);
    return null;
  }
}

async function attachInvoiceToOrder(orderId: string, invoice: any) {
  try {
    if (!orderId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload: any = {
      xendit_invoice_id: invoice?.id || null,
      xendit_invoice_url: invoice?.invoice_url || null,
      currency: invoice?.currency || 'IDR',
      expires_at: invoice?.expiry_date ? new Date(invoice.expiry_date).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      payer_email: invoice?.payer_email || null,
    };
    await sb.from('orders').update(payload).eq('id', orderId);
  } catch (e) {
    console.error('Failed to attach invoice metadata to order:', e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!XENDIT_SECRET_KEY) return res.status(500).json({ error: 'Missing XENDIT_SECRET_KEY' });

  try {
  const { external_id, amount, payer_email, description, success_redirect_url, failure_redirect_url, customer, order } = req.body || {};
    console.log('[create-invoice] Request received:', { 
      external_id, 
      amount, 
      hasOrder: !!order, 
      orderKeys: order ? Object.keys(order) : [],
      hasCustomer: !!customer 
    });
    
    if (!external_id || typeof external_id !== 'string') return res.status(400).json({ error: 'external_id (string) is required' });
    if (!amount || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'amount (number>0) is required' });
    const desc = description || 'Invoice Pembelian JB Alwikobra';
    
    // Optionally create order on server using client external id for idempotency
    const finalExternalId = external_id;
    console.log('[create-invoice] About to create order if provided...');
    const createdOrder = await createOrderIfProvided(order, finalExternalId);
    console.log('[create-invoice] Order creation result:', { orderId: createdOrder?.id, hasOrder: !!createdOrder });

    const withOrderId = (url?: string | null) => {
      if (!url) return undefined;
      if (!createdOrder?.id) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}order_id=${createdOrder.id}`;
    };

    // Optimize: Reduce timeout from 20s to 10s for faster user feedback
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    console.log('[Xendit] Creating invoice', { external_id: finalExternalId, amount, hasCustomer: !!customer });

    // Performance optimization: Parallel processing of database operations
    const invoicePromise = fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64'),
        'X-IDEMPOTENCY-KEY': finalExternalId
      },
      body: JSON.stringify({
        external_id: finalExternalId,
        amount,
        payer_email,
        description: desc,
        success_redirect_url: withOrderId(success_redirect_url),
        failure_redirect_url: withOrderId(failure_redirect_url),
        customer,
        payment_methods: ACTIVATED_PAYMENT_METHODS, // Only show activated payment channels
        // Set expiry date to 24 hours from now
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          client_external_id: finalExternalId,
          product_id: order?.product_id || null,
          user_id: order?.user_id || null,
          order_type: order?.order_type || 'purchase',
          amount,
          customer_name: order?.customer_name || null,
          customer_email: order?.customer_email || payer_email || null,
          customer_phone: order?.customer_phone || null,
        },
        currency: 'IDR'
      }),
      signal: controller.signal
    });

    const resp = await invoicePromise;

    clearTimeout(timeout);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('[Xendit] Create invoice failed', resp.status, data);
      return res.status(resp.status).json({ error: data?.message || 'Failed to create invoice', details: data });
    }
    console.log('[create-invoice] Xendit invoice created successfully:', data?.id);
    
    // CRITICAL FIX: Always await metadata attachment to prevent race condition with webhook
    // The webhook might arrive before the order is linked to the Xendit invoice ID
    if (createdOrder?.id) {
      console.log('[create-invoice] Attaching metadata to order:', createdOrder.id);
      try {
        await attachInvoiceToOrder(createdOrder.id, data);
        console.log('[create-invoice] ✅ Metadata attached successfully');
      } catch (err) {
        console.error('[create-invoice] Failed to attach metadata:', err);
      }
    } else if (finalExternalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // FALLBACK: Try to attach metadata by client_external_id if createdOrder is null
      console.log('[create-invoice] No createdOrder, attempting fallback attach by client_external_id:', finalExternalId);
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: updateResult, error: updateError } = await sb
          .from('orders')
          .update({
            xendit_invoice_id: data?.id || null,
            xendit_invoice_url: data?.invoice_url || null,
            currency: data?.currency || 'IDR',
            expires_at: data?.expiry_date ? new Date(data.expiry_date).toISOString() : null,
          })
          .eq('client_external_id', finalExternalId)
          .select('id');
        
        if (updateError) {
          console.error('[create-invoice] Fallback update failed:', updateError);
        } else if (updateResult && updateResult.length > 0) {
          console.log('[create-invoice] ✅ Metadata attached via fallback for order:', updateResult[0].id);
        } else {
          console.warn('[create-invoice] ⚠️ No order found for client_external_id:', finalExternalId);
        }
      } catch (fallbackErr) {
        console.error('[create-invoice] Fallback attachment error:', fallbackErr);
      }
    } else {
      console.log('[create-invoice] No order created, skipping metadata attachment');
    }
    
    // Return to user
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[Xendit] Handler error', err);
    const isAbort = err?.name === 'AbortError';
    return res.status(500).json({ error: 'Internal server error', message: isAbort ? 'Upstream timeout' : (err?.message || String(err)) });
  }
}
