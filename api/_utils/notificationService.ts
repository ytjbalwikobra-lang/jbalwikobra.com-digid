/**
 * Notification Service - Shared admin notification utilities
 * Centralized function to prevent code duplication across API endpoints
 * 
 * @module notificationService
 * @description Creates admin notifications for order events (new, paid, cancelled)
 */

interface NotificationType {
  new_order: string;
  paid_order: string;
  order_cancelled: string;
}

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
  orderType?: string
) {
  try {
    const isRental = orderType === 'rental';
    const typeLabel = isRental ? 'RENTAL' : 'PURCHASE';
    
    const titles: Record<string, string> = {
      new_order: isRental 
        ? 'Bang! ada yang ORDER RENTAL nih!' 
        : 'Bang! ada yang ORDER PURCHASE nih!',
      paid_order: isRental 
        ? 'Bang! ALHAMDULILLAH RENTAL udah di bayar nih' 
        : 'Bang! ALHAMDULILLAH PURCHASE udah di bayar nih',
      order_cancelled: isRental 
        ? 'Bang! ada yang CANCEL RENTAL order nih!' 
        : 'Bang! ada yang CANCEL PURCHASE order nih!'
    };

    const messages: Record<string, string> = {
      new_order: `namanya ${customerName}, produknya ${productName} harganya ${formatAmount(amount)}, ${isRental ? 'order RENTAL' : 'order PURCHASE'}, belum di bayar sih, tapi moga aja di bayar amin.`,
      paid_order: `namanya ${customerName}, produknya ${productName} harganya ${formatAmount(amount)}, ${isRental ? 'RENTAL udah di bayar' : 'PURCHASE udah di bayar'} Alhamdulillah.`,
      order_cancelled: `namanya ${customerName}, ${isRental ? 'RENTAL' : 'PURCHASE'} produktnya ${productName} di cancel nih.`
    };

    // Validate orderId as UUID - use null if invalid
    let validOrderId: string | null = null;
    if (orderId && typeof orderId === 'string' && isValidUUID(orderId)) {
      validOrderId = orderId;
    } else if (orderId) {
      console.warn('[NotificationService] Invalid UUID format for orderId:', orderId, 'Using null instead');
    }

    const notification = {
      type,
      title: titles[type] || 'Order Notification',
      message: messages[type] || `${customerName} placed an order for ${productName}`,
      order_id: validOrderId,
      customer_name: customerName,
      product_name: productName,
      amount: Math.round(Number(amount)), // Ensure it's an integer for BIGINT
      is_read: false,
      metadata: {
        priority: type === 'paid_order' ? 'high' : 'normal',
        category: type === 'paid_order' ? 'payment' : 'order',
        order_type: orderType || 'purchase',
        customer_phone: customerPhone,
        original_order_id: orderId
      },
      created_at: new Date().toISOString()
    };

    console.log('[NotificationService] Creating notification:', { type, orderId: validOrderId, orderType });

    const { data, error } = await sb
      .from('admin_notifications')
      .insert(notification)
      .select('id, type, title, message, order_id, product_name, amount, created_at, is_read, metadata')
      .single();

    if (error) {
      console.error('[NotificationService] Insert error:', error);
      throw error;
    }
    
    console.log('[NotificationService] Notification created successfully:', data?.id);
    return data;
    
  } catch (error) {
    console.error('[NotificationService] Failed to create notification:', error);
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
    console.error('[NotificationService] Failed to fetch product name:', error);
  }
  
  const isRental = orderType === 'rental';
  return isRental ? 'Akun Game Rental' : 'Akun Game Premium';
}
