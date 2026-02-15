/**
 * Admin Notification Service (Backend)
 * 
 * Creates admin notifications for order events (new, paid, cancelled).
 * Writes to the `admin_notifications` table.
 * 
 * NOT to be confused with:
 * - src/services/customerNotificationService.ts → customer-facing notifications
 * - src/services/adminNotificationService.ts → frontend admin notification client
 * 
 * Supported notification types: new_order, paid_order, order_cancelled, new_rent, paid_rent
 */

/**
 * Format currency to Indonesian Rupiah
 */
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Validate UUID format
 */
const isValidUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

/**
 * Create admin notification for order events
 * Unified function used by both create-invoice and webhook handlers
 * 
 * @param sb - Supabase client instance
 * @param orderId - Order UUID
 * @param customerName - Customer name
 * @param productName - Product name
 * @param amount - Order amount
 * @param type - Notification type: 'new_order' | 'paid_order' | 'order_cancelled'
 * @param customerPhone - Optional customer phone
 * @param orderType - Order type: 'purchase' | 'rental'
 * @returns Created notification data or null on failure
 */
export async function createOrderNotification(
  sb: any,
  orderId: string,
  customerName: string,
  productName: string,
  amount: number,
  type: string = 'new_order',
  customerPhone?: string,
  orderType?: string,
  rentalDuration?: string
) {
  try {
    const isRental = orderType === 'rental';
    const typeLabel = isRental ? 'RENTAL' : 'PURCHASE';
    
    // Map notification types for rental orders to rental-specific types
    let finalType = type;
    if (isRental) {
      if (type === 'new_order') {
        finalType = 'new_rent';
      } else if (type === 'paid_order') {
        finalType = 'paid_rent';
      }
      // order_cancelled remains the same for both
    }
    
    const titles: Record<string, string> = {
      new_order: '🛒 Order Baru',
      paid_order: '💰 Pembayaran Diterima',
      new_rent: '🎮 Rental Baru',
      paid_rent: '💰 Rental Dibayar',
      expiring_rent: '⏰ Rental Akan Berakhir',
      order_cancelled: '❌ Order Dibatalkan'
    };

    // Concise message for panel: type + name + product + value
    let message = '';
    if (finalType === 'new_order') {
      message = `[${typeLabel}] Nama: ${customerName} • Produk: ${productName} • Nilai: ${formatAmount(amount)}`;
    } else if (finalType === 'paid_order') {
      message = `[${typeLabel} PAID] Nama: ${customerName} • Produk: ${productName} • Nilai: ${formatAmount(amount)}`;
    } else if (finalType === 'new_rent') {
      message = `[RENTAL] Nama: ${customerName} • Produk: ${productName} • Nilai: ${formatAmount(amount)}`;
    } else if (finalType === 'paid_rent') {
      message = `[RENTAL PAID] Nama: ${customerName} • Produk: ${productName} • Nilai: ${formatAmount(amount)}`;
    } else if (finalType === 'expiring_rent') {
      message = `[RENTAL EXPIRING] Nama: ${customerName} • Produk: ${productName} • Durasi: ${rentalDuration || '-'}`;
    } else if (finalType === 'order_cancelled') {
      const orderTypeLabel = isRental ? 'RENTAL' : 'PURCHASE';
      message = `[${orderTypeLabel} CANCELLED] Nama: ${customerName} • Produk: ${productName} • Nilai: ${formatAmount(amount)}`;
    }

    // Validate orderId as UUID - use null if invalid
    let validOrderId: string | null = null;
    if (orderId && typeof orderId === 'string' && isValidUUID(orderId)) {
      validOrderId = orderId;
    } else if (orderId) {
      console.warn('[AdminNotificationService] Invalid UUID format for orderId:', orderId, 'Using null instead');
    }

    // Determine if this is a payment notification
    const isPaidNotification = finalType === 'paid_order' || finalType === 'paid_rent';
    const isExpiringRent = finalType === 'expiring_rent';

    const notification = {
      type: finalType,
      title: titles[finalType] || 'Order Notification',
      message: message || `${customerName} - ${productName} - ${formatAmount(amount)}`,
      order_id: validOrderId,
      customer_name: customerName,
      product_name: productName,
      amount: Math.round(Number(amount)), // Ensure it's an integer for BIGINT
      is_read: false,
      metadata: {
        priority: (isPaidNotification || isExpiringRent) ? 'high' : 'normal',
        category: isPaidNotification ? 'payment' : isExpiringRent ? 'expiring_rental' : 'order',
        order_type: orderType || 'purchase',
        customer_phone: customerPhone,
        original_order_id: orderId,
        rental_duration: rentalDuration
      },
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('admin_notifications')
      .insert(notification)
      .select('id, type, title, message, order_id, product_name, amount, created_at, is_read, metadata')
      .single();

    if (error) {
      console.error('[AdminNotificationService] Insert error:', error);
      throw error;
    }
    return data;
    
  } catch (error) {
    console.error('[AdminNotificationService] Failed to create notification:', error);
    return null;
  }
}

/**
 * Get product name by ID with fallback
 */
export async function getProductName(
  sb: any, 
  productId: string | null, 
  orderType?: string
): Promise<string> {
  if (!productId) {
    const isRental = orderType === 'rental';
    return isRental ? 'Akun Game Rental' : 'Akun Game Premium';
  }
  
  try {
    const { data } = await sb
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();
    
    if (data?.name) {
      return data.name;
    }
  } catch (error) {
    console.error('[AdminNotificationService] Failed to fetch product name:', error);
  }
  
  const isRental = orderType === 'rental';
  return isRental ? 'Akun Game Rental' : 'Akun Game Premium';
}

/**
 * Create a customer-facing notification (writes to customer_notifications table)
 * Called from webhook after successful payment to notify the customer in-app
 */
export async function createCustomerPaymentNotification(
  sb: any,
  order: {
    id: string;
    user_id?: string | null;
    customer_name?: string;
    order_type?: string;
    amount?: number;
    product_id?: string | null;
  },
  productName: string
) {
  try {
    const isRental = order.order_type === 'rental';
    const formattedAmount = formatAmount(Number(order.amount || 0));
    
    const notification = {
      user_id: order.user_id || null, // null = visible to all (guest purchases)
      type: 'payment',
      title: isRental ? '✅ Pembayaran Rental Berhasil' : '✅ Pembayaran Berhasil',
      body: `Pembayaran untuk ${productName} sebesar ${formattedAmount} telah dikonfirmasi. ${isRental ? 'Silakan cek detail rental Anda.' : 'Terima kasih atas pembelian Anda!'}`,
      link_url: `/orders`,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('customer_notifications')
      .insert(notification)
      .select('id')
      .single();

    if (error) {
      console.error('[AdminNotificationService] Failed to create customer payment notification:', error);
      return null;
    }
    
    console.log('[Webhook] ✅ Customer payment notification created:', data?.id);
    return data;
  } catch (error) {
    console.error('[AdminNotificationService] Exception creating customer payment notification:', error);
    return null;
  }
}
