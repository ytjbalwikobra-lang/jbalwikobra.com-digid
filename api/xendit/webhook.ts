// Xendit webhook to update order status in Supabase (robust)
// Configure Xendit to call /api/xendit/webhook with a shared XENDIT_CALLBACK_TOKEN
// Refactored: Uses shared notificationService for DRY code

import { createOrderNotification, getProductName } from '../_utils/notificationService.js';

/**
 * Map Xendit webhook status to internal order status
 * Handles various status formats from different Xendit event types
 */
function mapStatus(x: string | undefined): 'pending'|'paid'|'completed'|'cancelled' {
  const s = (x || '').toUpperCase();
  if (s === 'PAID' || s === 'SUCCEEDED' || s === 'SUCCESS' || s === 'COMPLETED') return 'paid';
  if (s === 'SETTLED') return 'completed';
  if (s === 'EXPIRED' || s === 'CANCELLED') return 'cancelled';
  return 'pending';
}

// Separate function specifically for creating admin database notifications when payment is completed
async function createAdminPaidNotification(sb: any, invoiceId?: string, externalId?: string) {
  try {
    
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
      return;
    }

    // Get product name using shared utility with enhanced fallback logic
    const productName = await getProductName(sb, order.product_id, order.order_type);

    // Create the admin notification using shared service
    await createOrderNotification(
      sb,
      order.id,
      order.customer_name || 'Guest Customer',
      productName,
      Number(order.amount || 0),
      'paid_order',
      order.customer_phone,
      order.order_type,
      order.rental_duration
    );
    
  } catch (error) {
    console.error('[Admin] Failed to create paid order database notification:', error);
  }
}

async function sendOrderPaidNotification(sb: any, invoiceId?: string, externalId?: string) {
    
  try {
    
    // First, try to find the order without status filter to see if it exists
    let checkQuery = sb.from('orders')
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
        payment_method,
        product_id,
        products:product_id (
          id,
          name,
          price,
          description
        )
      `)
      .limit(1);
    
    if (invoiceId) {
      checkQuery = checkQuery.eq('xendit_invoice_id', invoiceId);
    } else if (externalId) {
      checkQuery = checkQuery.eq('client_external_id', externalId);
    } else {
      return;
    }
    
    const { data: checkOrders, error: checkError } = await checkQuery;
    
    if (checkError) {
      console.error('[WhatsApp] Error checking order:', checkError);
      return;
    }
    
    if (!checkOrders || checkOrders.length === 0) {
      return;
    }
    
    const order = checkOrders[0];
    
    // Check if order status is paid or completed
    if (order.status !== 'paid' && order.status !== 'completed') {
      return;
    }
    
    const product = order.products;
    let productName = product?.name;
    
    // If product name is still not found, try to fetch it directly
    if (!productName && order.product_id) {
      try {
        const { data: productData } = await sb
          .from('products')
          .select('name')
          .eq('id', order.product_id)
          .single();
        productName = productData?.name;
      } catch (fetchError) {
        console.error('[WhatsApp] Failed to fetch product directly:', fetchError);
      }
    }
    
    const isRental = order.order_type === 'rental';
    
    // Final fallback with better description
    if (!productName) {
      productName = isRental ? 'Akun Game Rental' : 'Akun Game Premium';
    }
    
    // Get product URL
    const productId = order.product_id;
    const productUrl = productId ? `https://jbalwikobra.com/products/${productId}` : 'https://jbalwikobra.com/products';
    
    // Get payment channel and timestamp
    const paymentChannel = order.payment_method || 'Xendit';
    const paidTimestamp = order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) : new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : paidTimestamp;
    
    // Calculate return date for rental (assuming rental_duration is in format like "7 Hari")
    let returnDate = 'Sesuai durasi rental';
    if (isRental && order.rental_duration) {
      const durationMatch = order.rental_duration.match(/(\d+)/);
      if (durationMatch && order.paid_at) {
        const days = parseInt(durationMatch[1]);
        const returnDateObj = new Date(order.paid_at);
        returnDateObj.setDate(returnDateObj.getDate() + days);
        returnDate = returnDateObj.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    
    // Generate notification message for admin (different for rental vs purchase)
    const message = isRental 
      ? `🔥 *RENTAL ORDER PAID!* 💰

━━━━━━━━━━━━━━━━━━━━━━━
📊 INFORMASI PESANAN
━━━━━━━━━━━━━━━━━━━━━━━

🆔 *Order ID:* #${order.id.substring(0, 8).toUpperCase()}
📅 *Tanggal Order:* ${orderDate}
⏰ *Tanggal Bayar:* ${paidTimestamp}
✅ *Status:* LUNAS - MENUNGGU PROSES

━━━━━━━━━━━━━━━━━━━━━━━
👤 DATA CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━

*Nama:* ${order.customer_name || 'Guest'}
*WhatsApp:* ${order.customer_phone || 'Tidak tersedia'}
*Email:* ${order.customer_email || 'Tidak tersedia'}

━━━━━━━━━━━━━━━━━━━━━━━
🎮 DETAIL PRODUK
━━━━━━━━━━━━━━━━━━━━━━━

*Produk:* ${productName}
*Kategori:* RENTAL
*Durasi:* ${order.rental_duration || 'Tidak ditentukan'}
*Harga:* Rp ${Number(order.amount || 0).toLocaleString('id-ID')}

🔗 *Link Produk:*
${productUrl}

━━━━━━━━━━━━━━━━━━━━━━━
💳 PEMBAYARAN
━━━━━━━━━━━━━━━━━━━━━━━

*Channel:* ${paymentChannel}
*Total Bayar:* Rp ${Number(order.amount || 0).toLocaleString('id-ID')}
*Invoice:* ${order.id}

━━━━━━━━━━━━━━━━━━━━━━━
🚨 ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━

⏱️ *TARGET:* 15 menit dari sekarang

✅ *CHECKLIST:*
☐ Video call verification dgn customer
☐ Cek identitas customer (KTP/SIM)
☐ Setup akun rental + password temporary
☐ Kirim detail login & panduan rental
☐ Kirim aturan rental & sanksi
☐ Catat jadwal return (${returnDate})
☐ Set reminder H-1 sebelum return

📱 *Contact Customer Sekarang:*
wa.me/${order.customer_phone?.replace(/\D/g, '').replace(/^0/, '62').replace(/^8/, '628') || ''}

#RentalPaid #VideoCallRequired #Urgent`
      : `🔥 *PURCHASE ORDER PAID!* 💰

━━━━━━━━━━━━━━━━━━━━━━━
📊 INFORMASI PESANAN
━━━━━━━━━━━━━━━━━━━━━━━

🆔 *Order ID:* #${order.id.substring(0, 8).toUpperCase()}
📅 *Tanggal Order:* ${orderDate}
⏰ *Tanggal Bayar:* ${paidTimestamp}
✅ *Status:* LUNAS - MENUNGGU PROSES

━━━━━━━━━━━━━━━━━━━━━━━
👤 DATA CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━

*Nama:* ${order.customer_name || 'Guest'}
*WhatsApp:* ${order.customer_phone || 'Tidak tersedia'}
*Email:* ${order.customer_email || 'Tidak tersedia'}

━━━━━━━━━━━━━━━━━━━━━━━
🎮 DETAIL PRODUK
━━━━━━━━━━━━━━━━━━━━━━━

*Produk:* ${productName}
*Kategori:* PURCHASE
*Harga:* Rp ${Number(order.amount || 0).toLocaleString('id-ID')}

🔗 *Link Produk:*
${productUrl}

━━━━━━━━━━━━━━━━━━━━━━━
💳 PEMBAYARAN
━━━━━━━━━━━━━━━━━━━━━━━

*Channel:* ${paymentChannel}
*Total Bayar:* Rp ${Number(order.amount || 0).toLocaleString('id-ID')}
*Invoice:* ${order.id}

━━━━━━━━━━━━━━━━━━━━━━━
🚨 ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━

⏱️ *TARGET:* 30 menit dari sekarang

✅ *CHECKLIST:*
☐ Test akun masih berfungsi normal
☐ Screenshot detail akun
☐ Ganti email + password akun
☐ Kirim login credentials ke customer
☐ Kirim panduan lengkap + warranty
☐ Edukasi customer cara aman pakai akun
☐ Follow up dalam 24 jam

📱 *Contact Customer Sekarang:*
wa.me/${order.customer_phone?.replace(/\D/g, '').replace(/^0/, '62').replace(/^8/, '628') || ''}

#PurchasePaid #FullOwnership #ProcessNow`;

    // Use dynamic WhatsApp service for unified logging and idempotency
    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();
    
    // Get contact phone for customer support
    const contactPhone = await wa.getContactPhone();
    
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
      if (resp.success) {
      } else {
        console.error('[WhatsApp] Admin group notification failed:', resp.error);
      }
    } else {
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
          return;
        }

        // Generate customer notification message (different for rental vs purchase)
        // Get product URL - currently unused but kept for future use
        const _productId = order.product_id;
        const _productUrl = _productId ? `https://jbalwikobra.com/products/${_productId}` : 'https://jbalwikobra.com/products';
        
        // Get payment channel from order - currently unused but kept for future use
        const _paymentChannel = order.payment_method || 'Xendit';
        
        // Format timestamp
        const paidTimestamp = order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const customerMessage = isRental 
          ? `✅ *MANTAP BOSKU! PEMBAYARAN DITERIMA* 💰

Halo Bosku *${order.customer_name || 'Customer'}* 👋

Alhamdulillah, uangnya udah masuk dengan aman! 

━━━━━━━━━━━━━━━━━━━━━━━
📋 *DETAIL PESANAN RENTAL*
━━━━━━━━━━━━━━━━━━━━━━━

🎮 Produk: *${productName}*
⏱️ Durasi: *${order.rental_duration || 'Sesuai paket'}*
💰 Total: *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*
📅 Dibayar: *${paidTimestamp}*
🆔 Order ID: *${order.id.substring(0, 8).toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━━━━
🔥 *LANGKAH SELANJUTNYA*
━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ *VIDEO CALL VERIFICATION*
   Tim kami akan hubungi Bosku untuk video call verification (wajib untuk rental ya Bosku)

2️⃣ *SIAPKAN DOKUMEN*
   • KTP/SIM (untuk verifikasi identitas)
   • Pastikan wajah Bosku terlihat jelas
   
3️⃣ *AKUN RENTAL*
   Setelah verifikasi OK, akun langsung dikirim ke WA ini

⏰ *Estimasi proses: 15-30 menit*

━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *PENTING UNTUK RENTAL*
━━━━━━━━━━━━━━━━━━━━━━━

🔒 Akun rental TIDAK BOLEH:
   • Diganti email/password tanpa izin
   • Dijual/dipindahtangankan
   • Dipakai untuk top up sendiri
   
📅 Return Date: *${returnDate}*

━━━━━━━━━━━━━━━━━━━━━━━

Ditunggu ya Bosku, sebentar lagi kami hubungi! 📞

Ada pertanyaan? Chat aja:
💬 wa.me/${contactPhone}

Happy Gaming! 🔥`
          : `✅ *MANTAP BOSKU! PEMBAYARAN DITERIMA* 💰

Halo Bosku *${order.customer_name || 'Customer'}* 👋

Alhamdulillah, uangnya udah masuk dengan aman! 

━━━━━━━━━━━━━━━━━━━━━━━
📋 *DETAIL PESANAN PURCHASE*
━━━━━━━━━━━━━━━━━━━━━━━

🎮 Produk: *${productName}*
💰 Total: *Rp ${Number(order.amount || 0).toLocaleString('id-ID')}*
📅 Dibayar: *${paidTimestamp}*
🆔 Order ID: *${order.id.substring(0, 8).toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━━━━
🔥 *LANGKAH SELANJUTNYA*
━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ *PROSES AKUN*
   Tim kami lagi siapin akun pesanan Bosku dengan detail lengkap

2️⃣ *PENGIRIMAN*
   Login credentials + panduan lengkap akan dikirim ke WA ini

3️⃣ *FULL OWNERSHIP*
   Akun jadi 100% milik Bosku! Bebas ganti email, password, dll

⏰ *Estimasi proses: 15-30 menit*

━━━━━━━━━━━━━━━━━━━━━━━
✨ *YANG BOSKU DAPAT*
━━━━━━━━━━━━━━━━━━━━━━━

✅ Login credentials (email/username + password)
✅ Panduan cara ganti email & bind akun
✅ Tips keamanan akun
✅ Warranty 30 hari
✅ Support after-sales

━━━━━━━━━━━━━━━━━━━━━━━

Mohon ditunggu ya Bosku, nanti langsung kami kirim detail akunnya! 🚀

Ada pertanyaan? Chat aja:
💬 wa.me/${contactPhone}

Happy Gaming Bosku! 🔥`;

        // Idempotency per order+status for customer
  const alreadySentCustomer = await wa.hasMessageLog('order-paid-customer', contextId);
        if (alreadySentCustomer) {
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
        } else {
          console.error('[WhatsApp] Customer notification failed:', sendRes.error);
        }
      } catch (customerError) {
        console.error('[WhatsApp] Error sending customer notification:', customerError);
      }
    } else {
    }

  } catch (error) {
    console.error('[WhatsApp] ❌ Failed to send notification. Error:', error);
    console.error('[WhatsApp] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[WhatsApp] Error details:', JSON.stringify(error, null, 2));
  } finally {
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
      console.error('[Webhook] Missing identifiers in payload');
      console.error('[Webhook] Payload structure:', JSON.stringify({ data, qr_code: data.qr_code }, null, 2));
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
    let foundOrderId: string | null = null;
    
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
        .select('id, status, xendit_invoice_id, client_external_id, order_type, product_id');
      if (!error) {
        updated = (up || []).length;
        if (up && up.length > 0) {
          foundOrderId = up[0].id;
        }
      } else {
        console.error('[Webhook] Error updating by xendit_invoice_id:', error);
      }
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
          xendit_invoice_id: invoiceId, // CRITICAL: Also set xendit_invoice_id here for future webhook correlation
          currency,
          expires_at: expiresAt,
        })
        .eq('client_external_id', externalId)
        .select('id, status, xendit_invoice_id, client_external_id, order_type, product_id');
      if (!e2) {
        updated = (up2 || []).length;
        if (up2 && up2.length > 0) {
          foundOrderId = up2[0].id;
          
          // CRITICAL FIX: If we found the order by client_external_id but it didn't have xendit_invoice_id,
          // this means the invoice was created but the order wasn't linked. Now it's linked.
          if (!up2[0].xendit_invoice_id && invoiceId) {
          }
        }
      } else {
        console.error('[Webhook] Error updating by client_external_id:', e2);
      }
    }

    // Additional fallback: Try to find order using partial match on external_id
    // This handles cases where external_id might have prefixes/suffixes
    if (updated === 0 && externalId) {
      const { data: up3, error: e3 } = await sb
        .from('orders')
        .select('id, client_external_id, xendit_invoice_id, status, order_type')
        .or(`client_external_id.ilike.%${externalId}%,xendit_invoice_id.ilike.%${externalId}%`)
        .limit(1);
      
      if (!e3 && up3 && up3.length > 0) {
        const { data: up3Update, error: e3Update } = await sb
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
          .eq('id', up3[0].id)
          .select('id, status, xendit_invoice_id, client_external_id, order_type, product_id');
        
        if (!e3Update && up3Update && up3Update.length > 0) {
          updated = up3Update.length;
          foundOrderId = up3Update[0].id;
        }
      } else if (e3) {
        console.error('[Webhook] Error in fuzzy search:', e3);
      }
    }

    // CRITICAL: Log warning if no order was updated by any method
    if (updated === 0) {
      console.error('[Webhook] ⚠️ CRITICAL: Could not update any order!');
      console.error('[Webhook] Looked for xendit_invoice_id:', invoiceId);
      console.error('[Webhook] Looked for client_external_id:', externalId);
      console.error('[Webhook] This order will remain in pending status unless metadata fallback works!');
    }

    // If paid/complete, mark product as sold via web (purchase only)
    if (status === 'paid' || status === 'completed') {
      try {
        let orderRow: any | null = null;

        if (foundOrderId) {
          const { data: orderData } = await sb
            .from('orders')
            .select('id, order_type, product_id, status')
            .eq('id', foundOrderId)
            .single();
          orderRow = orderData || null;
        }

        if (orderRow?.order_type === 'purchase' && orderRow.product_id) {
          await sb
            .from('products')
            .update({
              sold_channel: 'web',
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderRow.product_id);
        }
      } catch (soldErr) {
        console.error('[Webhook] ❌ Failed to mark product as sold via web:', soldErr);
      }
    }

    // CRITICAL FIX: Enhanced payment status synchronization with better error handling
    
    let _ordersUpdated = 0;
    let paymentsUpdated = 0;
    const updateErrors: string[] = [];

    // Update payments table first to ensure payment status is recorded
    try {
      
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
                            } else if (paymentError) {
          const error = `Error updating payments table by external_id: ${JSON.stringify(paymentError)}`;
          console.error(`[Webhook] ❌ ${error}`);
          updateErrors.push(error);
        } else {
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
                            } else if (paymentErrorById) {
          const error = `Error updating payments table by xendit_id: ${JSON.stringify(paymentErrorById)}`;
          console.error(`[Webhook] ❌ ${error}`);
          updateErrors.push(error);
        }
      }
    } catch (paymentException) {
      const err = paymentException as Error;
      const error = `Exception updating payments table: ${err.message || paymentException}`;
      console.error(`[Webhook] ❌ ${error}`);
      updateErrors.push(error);
    }

    // Log final payment update status
    
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
      
      // Always attempt to send notification if status is paid/completed, regardless of update count
      // This handles edge cases where webhook is called multiple times or order was already updated
      if (status === 'paid' || status === 'completed') {
        
        // Send WhatsApp notifications for successful payments
        // Some channels report final state as 'completed' (e.g., SETTLED), not 'paid'
        await sendOrderPaidNotification(sb, invoiceId, externalId);
        
        // Create admin database notification separately
        try {
          await createAdminPaidNotification(sb, invoiceId, externalId);
        } catch (adminNotificationError) {
          console.error('[Webhook] Admin database notification failed:', adminNotificationError);
        }
      } else {
      }
    } catch (e) {
      console.error('[Webhook] Failed to send notifications after payment:', e);
    }

    // Final verification: Check if both tables are in sync
    let syncStatus = 'unknown';
    try {
      if ((status === 'paid' || status === 'completed') && (invoiceId || externalId)) {
        
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
