// Xendit webhook to update order status in Supabase (robust)
// Configure Xendit to call /api/xendit/webhook with a shared XENDIT_CALLBACK_TOKEN

function mapStatus(x: string | undefined): 'pending'|'paid'|'completed'|'cancelled' {
  const s = (x || '').toUpperCase();
  if (s === 'PAID' || s === 'SUCCEEDED' || s === 'SUCCESS') return 'paid';
  if (s === 'SETTLED') return 'completed';
  if (s === 'EXPIRED' || s === 'CANCELLED') return 'cancelled';
  return 'pending';
}

// Admin notification function for database notifications
async function createOrderNotification(sb: any, orderId: string, customerName: string, productName: string, amount: number, type: string = 'paid_order', customerPhone?: string, orderType?: string) {
  try {
    const isRental = orderType === 'rental';
    const typeLabel = isRental ? 'RENTAL' : 'PURCHASE';
    
    const titles = {
      new_order: isRental ? 'Notifikasi Sewa Baru' : 'Notifikasi Pesanan Baru',
      paid_order: isRental ? 'Notifikasi Sewa Dibayar' : 'Notifikasi Pesanan Dibayar',
      order_cancelled: isRental ? 'Notifikasi Sewa Dibatalkan' : 'Notifikasi Pesanan Dibatalkan'
    };

    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const messages = {
      new_order: isRental 
        ? `Sewa baru dari ${customerName}, produk ${productName} senilai ${formatAmount(amount)}, sewa belum dibayar, mohon tunggu pembayaran.`
        : `Pesanan baru dari ${customerName}, produk ${productName} senilai ${formatAmount(amount)}, pesanan belum dibayar, mohon tunggu pembayaran.`,
      paid_order: isRental
        ? `Sewa telah dibayar oleh ${customerName}, produk ${productName} senilai ${formatAmount(amount)}, sewa sudah lunas.`
        : `Pesanan telah dibayar oleh ${customerName}, produk ${productName} senilai ${formatAmount(amount)}, pesanan sudah lunas.`,
      order_cancelled: isRental
        ? `Sewa dibatalkan oleh ${customerName}, produk ${productName} senilai ${formatAmount(amount)}.`
        : `Pesanan dibatalkan oleh ${customerName}, produk ${productName} senilai ${formatAmount(amount)}.`
    };

    // Ensure orderId is a valid UUID or null
    let validOrderId = null;
    if (orderId && typeof orderId === 'string') {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
      if (isValidUUID) {
        validOrderId = orderId;
      } else {
        console.warn('[Admin] Invalid UUID format for orderId:', orderId, 'Using null instead');
      }
    }

    const notification = {
      type,
      title: titles[type] || 'Payment Received',
      message: messages[type] || `${customerName} paid for ${productName}`,
      order_id: validOrderId,
      customer_name: customerName,
      product_name: productName,
      amount: Math.round(Number(amount)),
      is_read: false,
      metadata: {
        priority: type === 'paid_order' ? 'high' : 'normal',
        category: 'payment',
        order_type: orderType || 'purchase',
        customer_phone: customerPhone,
        original_order_id: orderId
      },
      created_at: new Date().toISOString()
    };

    console.log('[Admin] Creating paid order notification:', notification);

    const { data, error } = await sb
      .from('admin_notifications')
      .insert(notification)
      .select('id, type, title, message, order_id, user_id, product_name, amount, created_at, is_read, metadata')
      .single();

    if (error) {
      console.error('[Admin] Paid notification insert error:', error);
      throw error;
    } else {
      console.log('[Admin] Paid order notification created successfully with ID:', data?.id);
      return data;
    }
  } catch (error) {
    console.error('[Admin] Failed to create paid order notification:', error);
    throw error;
  }
}

// Separate function specifically for creating admin database notifications when payment is completed
async function createAdminPaidNotification(sb: any, invoiceId?: string, externalId?: string) {
  try {
    console.log('[Admin] Looking for order to create paid notification:', { invoiceId, externalId });
    
    // Query for order with paid status to ensure we only notify for actually paid orders
    let q = sb.from('orders')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        amount,
        status,
        order_type,
        rental_duration,
        product_id,
        products:product_id (
          id,
          name,
          price,
          description
        )
      `)
      .in('status', ['paid', 'completed'])
      .limit(1);
    
    if (invoiceId) q = q.eq('xendit_invoice_id', invoiceId);
    else if (externalId) q = q.eq('client_external_id', externalId);
    
    const { data: orders, error: queryError } = await q;
    
    if (queryError) {
      console.error('[Admin] Database query error for notification:', queryError);
      return;
    }
    
    const order = orders?.[0];
    
    if (!order) {
      console.log('[Admin] No paid order found for creating paid notification');
      return;
    }

    console.log('[Admin] Found paid order for notification:', {
      id: order.id,
      status: order.status,
      order_type: order.order_type
    });

    // Get product name with enhanced fallback logic
    const product = order.products;
    let productName = product?.name;
    
    // If product name is still not found, try to fetch it directly
    if (!productName && order.product_id) {
      console.log('[Admin] Product name not found in relationship, fetching directly...');
      try {
        const { data: productData } = await sb
          .from('products')
          .select('name')
          .eq('id', order.product_id)
          .single();
        productName = productData?.name;
        console.log('[Admin] Direct product fetch result:', productName);
      } catch (fetchError) {
        console.error('[Admin] Failed to fetch product directly:', fetchError);
      }
    }
    
    // Final fallback with better description
    if (!productName) {
      // Try to infer from order type
      const isRental = order.order_type === 'rental';
      productName = isRental ? 'Akun Game Rental' : 'Akun Game Premium';
      console.log('[Admin] Using fallback product name based on order type:', productName);
    }
    console.log('[Admin] Final product name for notification:', productName);

    // Create the admin notification
    await createOrderNotification(
      sb,
      order.id,
      order.customer_name || 'Guest Customer',
      productName,
      Number(order.amount || 0),
      'paid_order',
      order.customer_phone,
      order.order_type
    );
    
    console.log('[Admin] Paid order database notification created successfully');
    
  } catch (error) {
    console.error('[Admin] Failed to create paid order database notification:', error);
  }
}

async function sendOrderPaidNotification(sb: any, invoiceId?: string, externalId?: string) {
  try {
    // Get order details with product information and rental details
    // Include both 'paid' and 'completed' statuses to handle providers that emit SETTLED/COMPLETED
    let q = sb.from('orders')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        amount,
        status,
        order_type,
        rental_duration,
        created_at,
        paid_at,
        product_id,
        products:product_id (
          id,
          name,
          price,
          description
        )
      `)
      .in('status', ['paid', 'completed'])
      .limit(1);
    
    if (invoiceId) q = q.eq('xendit_invoice_id', invoiceId);
    else if (externalId) q = q.eq('client_external_id', externalId);
    
    const { data: orders } = await q;
    const order = orders?.[0];
    
    if (!order) {
      console.log('[WhatsApp] No paid order found for notification');
      return;
    }

    console.log('[WhatsApp] Found order for notification:', {
      id: order.id,
      status: order.status,
      order_type: order.order_type,
      amount: order.amount
    });

    const product = order.products;
    let productName = product?.name;
    
    // If product name is still not found, try to fetch it directly
    if (!productName && order.product_id) {
      console.log('[WhatsApp] Product name not found in relationship, fetching directly...');
      try {
        const { data: productData } = await sb
          .from('products')
          .select('name')
          .eq('id', order.product_id)
          .single();
        productName = productData?.name;
        console.log('[WhatsApp] Direct product fetch result:', productName);
      } catch (fetchError) {
        console.error('[WhatsApp] Failed to fetch product directly:', fetchError);
      }
    }
    
    const isRental = order.order_type === 'rental';
    
    // Final fallback with better description
    if (!productName) {
      productName = isRental ? 'Akun Game Rental' : 'Akun Game Premium';
      console.log('[WhatsApp] Using fallback product name based on order type:', productName);
    }
    console.log('[WhatsApp] Final product name for notification:', productName);
    
    // Generate notification message (different for rental vs purchase)
    const message = isRental 
      ? `🔥 *NEW RENTAL ORDER PAID!* 💰

📊 **RENTAL PESANAN BARU**
━━━━━━━━━━━━━━━━━━━━━━━

👤 **Customer:** *${order.customer_name || 'Guest'}*
📧 **Email:** ${order.customer_email || 'Not provided'}
📱 **WhatsApp:** *${order.customer_phone || 'Not provided'}*

🆔 **Order ID:** \`${order.id}\`
🎯 **Product:** *${productName}*
⏰ **Duration:** *${order.rental_duration || 'Not specified'}*
💰 **Amount:** *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*

✅ **Status:** *PAID* ✅
📅 **Paid at:** ${order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : 'Just now'}

🚨 **ACTION REQUIRED:**
• Setup rental access dalam 5-15 menit
• Contact customer untuk video call verification
• Prepare login credentials
• Send rental guidelines dan aturan
• Pastikan dokumen verifikasi valid

⏱️ **DEADLINE:** 15 menit dari sekarang

📋 **CHECKLIST:**
□ Siapkan akun rental
□ Hubungi customer untuk jadwal video call
□ Kirim panduan rental
□ Dokumentasikan proses handover

#RentalPaid #ActionRequired #VideoCallRequired`
      : `🔥 *NEW PURCHASE ORDER PAID!* 💰

📊 **PURCHASE PESANAN BARU**
━━━━━━━━━━━━━━━━━━━━━━━

👤 **Customer:** *${order.customer_name || 'Guest'}*
📧 **Email:** ${order.customer_email || 'Not provided'}
📱 **WhatsApp:** *${order.customer_phone || 'Not provided'}*

🆔 **Order ID:** \`${order.id}\`
🎯 **Product:** *${productName}*
💰 **Amount:** *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*

✅ **Status:** *PAID* ✅
📅 **Paid at:** ${order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : 'Just now'}

🚨 **ACTION REQUIRED:**
• Prepare account delivery dalam 5-30 menit
• Send login credentials to customer
• Include setup guide dan warranty info
• Follow up untuk kepuasan customer
• Pastikan akun sudah ditest sebelum dikirim

⏱️ **DEADLINE:** 30 menit dari sekarang

📋 **CHECKLIST:**
□ Test akun berfungsi normal
□ Kirim detail login via WhatsApp
□ Sertakan panduan lengkap
□ Follow up dalam 24 jam

#PurchasePaid #ActionRequired #FullOwnership`;

    // Use dynamic WhatsApp service for unified logging and idempotency
    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();
    // Use a single success context across paid/completed to prevent duplicates on SETTLED after PAID
    const contextId = `order:${order.id}:success`;

    // Idempotency: if already sent for this order+status, skip
    const alreadySentGroup = await wa.hasMessageLog('order-paid-group', contextId);
    if (!alreadySentGroup) {
      const settings = await wa.getActiveProviderSettings();
      
      // Determine appropriate group based on order type and group configurations
      let groupId = settings?.default_group_id; // fallback
      
      if (settings?.group_configurations) {
        const groupConfigs = settings.group_configurations;
        
        if (isRental && groupConfigs.rental_orders) {
          groupId = groupConfigs.rental_orders;
        } else if (!isRental && groupConfigs.purchase_orders) {
          groupId = groupConfigs.purchase_orders;
        }
        // For other order types, we could add flash_sales check here
        // else if (order.order_type === 'flash_sale' && groupConfigs.flash_sales) {
        //   groupId = groupConfigs.flash_sales;
        // }
      }
      
      const start = Date.now();
      const resp = await wa.sendGroupMessage({
        message,
        groupId,
        contextType: 'order-paid-group',
        contextId
      });
      const duration = Date.now() - start;
      if (resp.success) {
        console.log('[WhatsApp] Admin group notified', { 
          groupId, 
          orderType: order.order_type,
          isRental,
          ms: duration 
        });
      } else {
        console.error('[WhatsApp] Admin group notification failed:', resp.error);
      }
    } else {
      console.log('[WhatsApp] Admin group already notified for', contextId);
    }



    // Send notification to customer if phone number is provided
    if (order.customer_phone) {
      try {
        // Normalize phone using service's formatter (same logic as dynamic service)
        const raw = String(order.customer_phone || '');
        let customerPhone = raw.replace(/\D/g, '');
        if (customerPhone.startsWith('8')) customerPhone = '62' + customerPhone;
        else if (customerPhone.startsWith('08')) customerPhone = '62' + customerPhone.substring(1);
        else if (customerPhone.startsWith('0')) customerPhone = '62' + customerPhone.substring(1);
        else if (!customerPhone.startsWith('62') && customerPhone.length >= 8) customerPhone = '62' + customerPhone;
        if (!/^62\d{8,15}$/.test(customerPhone)) {
          console.log(`[WhatsApp] Invalid phone number format: ${order.customer_phone}`);
          return;
        }

        // Generate customer notification message (different for rental vs purchase)
        const customerMessage = isRental 
          ? `🎉 *RENTAL PAYMENT CONFIRMED!*

Halo ${order.customer_name || 'Customer'} 👋

Terima kasih! Pembayaran rental Anda telah *BERHASIL DIPROSES* ✅

📋 **DETAIL RENTAL:**
• Order ID: *${order.id}*
• Product: *${productName}*
• Duration: *${order.rental_duration || 'Sesuai pesanan'}*
• Total Paid: *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*
• Status: *PAID* ✅
• Paid at: ${order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : 'Baru saja'}

🚀 **LANGKAH SELANJUTNYA:**
• Tim kami akan mengatur akses rental dalam *5-15 menit*
• Informasi login akan dikirim via WhatsApp
• Anda akan diminta verifikasi data via *Video Call*
• Rental dimulai setelah verifikasi selesai

⚠️ **PERSIAPKAN DOKUMEN:**
• KTP/Passport/SIM yang masih aktif
• Foto selfie dengan dokumen
• Koneksi internet stabil untuk video call

📝 **PENTING:**
• Rental tidak bisa diperpanjang otomatis
• Backup data pribadi sebelum rental berakhir
• Gunakan akun sesuai aturan yang berlaku
• Jangan ubah password atau data akun

💬 **Support 24/7:** wa.me/6289653510125
🌐 **Website:** https://jbalwikobra.com

Terima kasih telah mempercayai JB Alwikobra! 🎮✨`
          : `🎉 *PURCHASE PAYMENT CONFIRMED!*

Halo ${order.customer_name || 'Customer'} 👋

Terima kasih! Pembayaran Anda telah *BERHASIL DIPROSES* ✅

📋 **DETAIL PURCHASE:**
• Order ID: *${order.id}*
• Product: *${productName}*
• Total Paid: *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*
• Status: *PAID* ✅
• Paid at: ${order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : 'Baru saja'}

🚀 **LANGKAH SELANJUTNYA:**
• Tim kami akan memproses pesanan dalam *5-30 menit*
• Akun game akan dikirim melalui WhatsApp
• Detail login dan panduan akan disertakan
• Akun menjadi milik Anda *SEPENUHNYA*

✅ **YANG ANDA DAPATKAN:**
• *Full access permanent* - selamanya
• *Support after sales* berkelanjutan
• *Panduan lengkap* penggunaan akun
• *Free konsultasi* setup dan optimasi

🔒 **KEAMANAN TERJAMIN:**
• Akun original dan legal
• Data aman dan terlindungi
• Transaksi tercatat resmi

💬 **Support 24/7:** wa.me/6289653510125
🌐 **Website:** https://jbalwikobra.com

Terima kasih telah berbelanja di JB Alwikobra! 🎮✨`;

        // Idempotency per order+status for customer
  const alreadySentCustomer = await wa.hasMessageLog('order-paid-customer', contextId);
        if (alreadySentCustomer) {
          console.log('[WhatsApp] Customer already notified for', contextId);
          return;
        }

        // Use dynamic service for customer message
        const sendRes = await wa.sendMessage({
          phone: customerPhone,
          message: customerMessage,
          contextType: 'order-paid-customer',
          contextId
        });
        if (sendRes.success) {
          console.log(`[WhatsApp] Customer notification sent to ${customerPhone}`);
        } else {
          console.error('[WhatsApp] Customer notification failed:', sendRes.error);
        }
      } catch (customerError) {
        console.error('[WhatsApp] Error sending customer notification:', customerError);
      }
    } else {
      console.log('[WhatsApp] No customer phone number provided, skipping customer notification');
    }

  } catch (error) {
    console.error('[WhatsApp] Error sending order paid notification:', error);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin test hook: send a WhatsApp group message using DB-configured provider
  // Usage: POST /api/xendit/webhook?testGroupSend=1 { message, groupId? }
  if ((req.query && (req.query as any).testGroupSend) || (req.body && (req.body as any).testGroupSend)) {
    try {
      const { message, groupId } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
      const wa = new DynamicWhatsAppService();
      const resp = await wa.sendGroupMessage({ message: message || 'Admin test message', groupId, contextType: 'admin-test', contextId: String(Date.now()) });
      return res.status(resp.success ? 200 : 400).json(resp);
    } catch (e: any) {
      console.error('[Webhook testGroupSend] error', e);
      return res.status(500).json({ error: e?.message || 'failed' });
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN as string | undefined;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    // Header validation
    const headerToken = (req.headers['x-callback-token'] as string | undefined) || (req.headers['X-Callback-Token'] as string | undefined) || '';
    if (XENDIT_CALLBACK_TOKEN && String(headerToken || '').trim() !== String(XENDIT_CALLBACK_TOKEN).trim()) {
      console.error('[Webhook] Invalid callback token');
      return res.status(401).json({ error: 'Invalid callback token' });
    }

    const payload = req.body || {};
    const event = (payload.event || payload.type || '').toString();
    const data = payload.data || payload;

    // Extract identifiers from various possible shapes
    const invoiceId: string | undefined =
      data.id || data.invoice_id || data.payment_request_id || data.payment_method_id ||
      data.qr_code?.id || data.payment_method?.id;

    const externalId: string | undefined =
      data.external_id || data.reference_id || data.qr_code?.external_id || data.qr_code?.reference_id ||
      data.payment_method?.reference_id || data.payment_method?.external_id;

    // Determine status from field or event name
    const rawStatus: string | undefined = data.status || data.qr_code?.status || data.payment_method?.status ||
      (event.includes('succeeded') ? 'SUCCEEDED' : undefined) ||
      (event.includes('failed') ? 'FAILED' : undefined) ||
      (event.includes('expired') ? 'EXPIRED' : undefined);

    if (!externalId && !invoiceId) {
      console.error('[Webhook] Missing identifiers');
      return res.status(400).json({ error: 'Invalid payload: missing identifiers' });
    }

    const status = mapStatus(rawStatus);
    const paidAt: string | null = data.paid_at ? new Date(data.paid_at).toISOString() : (status === 'paid' || status === 'completed') ? new Date().toISOString() : null;
    const paymentChannel: string | null =
      data.payment_channel || data.payment_method || data.channel_code || data.payment_method?.type ||
      (data.qr_code ? 'QRIS' : null);
    const payerEmail: string | null = data.payer_email || data.payer?.email || null;
    const invoiceUrl: string | null = data.invoice_url || null;
    const currency: string | null = data.currency || 'IDR';
    const expiresAt: string | null = data.expiry_date ? new Date(data.expiry_date).toISOString() : null;

    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try update by invoice id first
    let updated = 0;
    if (invoiceId) {
      const { data: up, error } = await sb
        .from('orders')
        .update({
          status,
          paid_at: paidAt,
          payment_channel: paymentChannel,
          payer_email: payerEmail,
          xendit_invoice_url: invoiceUrl,
          xendit_invoice_id: invoiceId,
          currency,
          expires_at: expiresAt,
        })
        .eq('xendit_invoice_id', invoiceId)
        .select('id');
      if (!error) updated = (up || []).length;
    }

  // Fallback: update by client_external_id (we set external_id === client_external_id when creating invoice)
  if (updated === 0 && externalId) {
      const { data: up2, error: e2 } = await sb
        .from('orders')
        .update({
          status,
          paid_at: paidAt,
          payment_channel: paymentChannel,
          payer_email: payerEmail,
          xendit_invoice_url: invoiceUrl,
          xendit_invoice_id: invoiceId,
          currency,
          expires_at: expiresAt,
        })
    .eq('client_external_id', externalId)
        .select('id');
      if (!e2) updated = (up2 || []).length;
    }

    // CRITICAL FIX: Enhanced payment status synchronization with better error handling
    console.log(`[Webhook] Starting payment status sync: status=${status}, invoiceId=${invoiceId}, externalId=${externalId}`);
    
    let ordersUpdated = 0;
    let paymentsUpdated = 0;
    const updateErrors: string[] = [];

    // Update payments table first to ensure payment status is recorded
    try {
      console.log('[Webhook] Updating payments table...');
      
      if (externalId) {
        const paymentUpdateData: any = {
          status: status.toUpperCase(), // Payments table uses uppercase status
        };
        
        // Add paid_at if payment is completed
        if (status === 'paid' || status === 'completed') {
          paymentUpdateData.paid_at = paidAt;
        }

        const { data: paymentUpdate, error: paymentError } = await sb
          .from('payments')
          .update(paymentUpdateData)
          .eq('external_id', externalId)
          .select('id, status, external_id');

        if (!paymentError && paymentUpdate && paymentUpdate.length > 0) {
          paymentsUpdated += paymentUpdate.length;
          console.log(`[Webhook] ✅ Successfully updated ${paymentUpdate.length} payment record(s) by external_id to status: ${status.toUpperCase()}`);
          console.log(`[Webhook] Updated payment records:`, paymentUpdate.map(p => ({ id: p.id, status: p.status, external_id: p.external_id })));
        } else if (paymentError) {
          const error = `Error updating payments table by external_id: ${JSON.stringify(paymentError)}`;
          console.error(`[Webhook] ❌ ${error}`);
          updateErrors.push(error);
        } else {
          console.log(`[Webhook] ⚠️ No payment records found to update for external_id: ${externalId}`);
        }
      }

      // Also try updating by xendit_id if available and we haven't updated any payments yet
      if (paymentsUpdated === 0 && invoiceId) {
        const paymentUpdateData: any = {
          status: status.toUpperCase(), // Payments table uses uppercase status
        };
        
        // Add paid_at if payment is completed
        if (status === 'paid' || status === 'completed') {
          paymentUpdateData.paid_at = paidAt;
        }

        const { data: paymentUpdateById, error: paymentErrorById } = await sb
          .from('payments')
          .update(paymentUpdateData)
          .eq('xendit_id', invoiceId)
          .select('id, status, xendit_id');

        if (!paymentErrorById && paymentUpdateById && paymentUpdateById.length > 0) {
          paymentsUpdated += paymentUpdateById.length;
          console.log(`[Webhook] ✅ Successfully updated ${paymentUpdateById.length} payment record(s) by xendit_id to status: ${status.toUpperCase()}`);
          console.log(`[Webhook] Updated payment records:`, paymentUpdateById.map(p => ({ id: p.id, status: p.status, xendit_id: p.xendit_id })));
        } else if (paymentErrorById) {
          const error = `Error updating payments table by xendit_id: ${JSON.stringify(paymentErrorById)}`;
          console.error(`[Webhook] ❌ ${error}`);
          updateErrors.push(error);
        }
      }
    } catch (paymentException) {
      const error = `Exception updating payments table: ${paymentException.message || paymentException}`;
      console.error(`[Webhook] ❌ ${error}`);
      updateErrors.push(error);
    }

    // Log final payment update status
    console.log(`[Webhook] Payment table update summary: ${paymentsUpdated} records updated`);
    
    if (updateErrors.length > 0) {
      console.error(`[Webhook] ❌ ${updateErrors.length} errors occurred during payment status sync:`);
      updateErrors.forEach((error, index) => {
        console.error(`[Webhook] Error ${index + 1}: ${error}`);
      });
    }

    // If nothing updated yet, try to create/upsert order from metadata for resilience
    if (updated === 0) {
      const meta = (data.metadata || {}) as any;
      if (meta && (externalId || meta.client_external_id)) {
        const clientId = (externalId || meta.client_external_id) as string;
        const baseRow: any = {
          client_external_id: clientId,
          product_id: meta.product_id || null,
          user_id: meta.user_id || null,
          order_type: meta.order_type || 'purchase',
          amount: typeof meta.amount === 'number' ? meta.amount : (data.amount || null),
          customer_name: meta.customer_name || null,
          customer_email: meta.customer_email || payerEmail,
          customer_phone: meta.customer_phone || null,
          status: 'pending',
          payment_method: 'xendit',
        };
        const { error: upErr } = await sb
          .from('orders')
          .upsert(baseRow, { onConflict: 'client_external_id' });
        if (!upErr) {
          // Now update with invoice details
          const { data: up3, error: e3 } = await sb
            .from('orders')
            .update({
              status,
              paid_at: paidAt,
              payment_channel: paymentChannel,
              payer_email: payerEmail,
              xendit_invoice_url: invoiceUrl,
              xendit_invoice_id: invoiceId,
              currency,
              expires_at: expiresAt,
            })
            .eq('client_external_id', clientId)
            .select('id');
          if (!e3) updated = (up3 || []).length;

          // Also update payments table for the upserted order
          const paymentUpdateData: any = {
            status: status.toUpperCase(),
          };
          
          if (status === 'paid' || status === 'completed') {
            paymentUpdateData.paid_at = paidAt;
          }

          await sb
            .from('payments')
            .update(paymentUpdateData)
            .eq('external_id', clientId);
        }
      }
      // If still nothing updated and we have at least an externalId, insert a minimal placeholder order
      if (updated === 0 && externalId) {
        const baseRow: any = {
          client_external_id: externalId,
          order_type: 'purchase',
          amount: typeof (data.amount) === 'number' ? data.amount : null,
          customer_name: null,
          customer_email: payerEmail,
          customer_phone: null,
          status: 'pending',
          payment_method: 'xendit',
          created_at: new Date().toISOString()
        };
        const { error: insertErr } = await sb.from('orders').upsert(baseRow, { onConflict: 'client_external_id' });
        if (!insertErr) {
          const { data: up4 } = await sb
            .from('orders')
            .update({
              status,
              paid_at: paidAt,
              payment_channel: paymentChannel,
              payer_email: payerEmail,
              xendit_invoice_url: invoiceUrl,
              xendit_invoice_id: invoiceId,
              currency,
              expires_at: expiresAt,
            })
            .eq('client_external_id', externalId)
            .select('id');
          updated = (up4 || []).length;

          // Also update payments table for the inserted order
          const paymentUpdateData: any = {
            status: status.toUpperCase(),
          };
          
          if (status === 'paid' || status === 'completed') {
            paymentUpdateData.paid_at = paidAt;
          }

          await sb
            .from('payments')
            .update(paymentUpdateData)
            .eq('external_id', externalId);
        }
      }
    }

    // Send notifications on successful payment
    try {
      console.log('[Webhook] Processing complete:', { updated, status, invoiceId, externalId });
      
      if (updated > 0 && (status === 'paid' || status === 'completed')) {
        console.log('[Webhook] Order updated successfully, proceeding with notifications');
        
        // Send WhatsApp notifications for successful payments
        // Some channels report final state as 'completed' (e.g., SETTLED), not 'paid'
        if (status === 'paid' || status === 'completed') {
          console.log('[Webhook] Calling sendOrderPaidNotification with:', { invoiceId, externalId });
          await sendOrderPaidNotification(sb, invoiceId, externalId);
          
          // Create admin database notification separately
          console.log('[Webhook] Creating admin database notification for paid order');
          try {
            await createAdminPaidNotification(sb, invoiceId, externalId);
            console.log('[Webhook] Admin database notification completed successfully');
          } catch (adminNotificationError) {
            console.error('[Webhook] Admin database notification failed:', adminNotificationError);
          }
        }
      } else {
        console.log('[Webhook] No orders updated or status not paid/completed:', { updated, status });
        
        // Still try to send notification if we have identifiers and the status is paid
        if ((status === 'paid' || status === 'completed') && (invoiceId || externalId)) {
          console.log('[Webhook] Attempting notification despite no updates');
          await sendOrderPaidNotification(sb, invoiceId, externalId);
          
          // Also try admin database notification
          console.log('[Webhook] Attempting admin database notification despite no updates');
          try {
            await createAdminPaidNotification(sb, invoiceId, externalId);
            console.log('[Webhook] Admin database notification completed successfully (fallback)');
          } catch (adminNotificationError) {
            console.error('[Webhook] Admin database notification failed (fallback):', adminNotificationError);
          }
        }
      }
    } catch (e) {
      console.error('Failed to send notifications after payment:', e);
    }

    // Final verification: Check if both tables are in sync
    let syncStatus = 'unknown';
    try {
      if ((status === 'paid' || status === 'completed') && (invoiceId || externalId)) {
        console.log('[Webhook] Performing final sync verification...');
        
        // Query both tables to verify sync
        let orderQuery = sb.from('orders').select('id, status, paid_at');
        let paymentQuery = sb.from('payments').select('id, status, paid_at');
        
        if (invoiceId) {
          orderQuery = orderQuery.eq('xendit_invoice_id', invoiceId);
          paymentQuery = paymentQuery.eq('xendit_id', invoiceId);
        } else if (externalId) {
          orderQuery = orderQuery.eq('client_external_id', externalId);
          paymentQuery = paymentQuery.eq('external_id', externalId);
        }
        
        const [orderResult, paymentResult] = await Promise.all([
          orderQuery.limit(1),
          paymentQuery.limit(1)
        ]);
        
        const order = orderResult.data?.[0];
        const payment = paymentResult.data?.[0];
        
        if (order && payment) {
          const orderStatus = order.status;
          const paymentStatus = payment.status?.toLowerCase();
          
          if ((orderStatus === 'paid' || orderStatus === 'completed') && 
              (paymentStatus === 'paid' || paymentStatus === 'completed')) {
            syncStatus = 'synced';
            console.log('[Webhook] ✅ Sync verification successful: Both tables updated');
          } else {
            syncStatus = 'out_of_sync';
            console.error('[Webhook] ❌ Sync verification failed: Tables out of sync');
            console.error(`[Webhook] Order status: ${orderStatus}, Payment status: ${paymentStatus}`);
          }
        } else {
          syncStatus = 'missing_records';
          console.error('[Webhook] ❌ Sync verification failed: Missing records');
          console.error(`[Webhook] Order found: ${!!order}, Payment found: ${!!payment}`);
        }
      }
    } catch (verificationError) {
      syncStatus = 'verification_error';
      console.error('[Webhook] ❌ Sync verification error:', verificationError);
    }

    return res.status(200).json({ 
      ok: true, 
      updated, 
      payments_updated: paymentsUpdated || 0,
      sync_status: syncStatus,
      by: updated ? (invoiceId ? 'invoice_id' : 'external_id') : 'none',
      notification_attempted: (status === 'paid' || status === 'completed') && (invoiceId || externalId),
      errors: updateErrors.length > 0 ? updateErrors : undefined
    });
  } catch (e: any) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: 'Internal server error', message: e?.message || String(e) });
  }
}
