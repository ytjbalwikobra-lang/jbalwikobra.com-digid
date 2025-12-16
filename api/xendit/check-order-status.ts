import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { external_id } = req.query;

  if (!external_id || typeof external_id !== 'string') {
    return res.status(400).json({ error: 'external_id is required' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Database configuration error' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check orders table by client_external_id
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, amount, status, payment_method, xendit_invoice_id, client_external_id, created_at, order_type, product_id')
      .eq('client_external_id', external_id)
      .single();

    if (orderError && orderError.code !== 'PGRST116') {
      console.error('[Check Order Status] Database error:', orderError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!orderData) {
      console.log('[Check Order Status] Order not found for external_id:', external_id);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('[Check Order Status] Found order with status:', orderData.status);

    // Return order status information
    return res.status(200).json({
      order_id: orderData.id,
      external_id: orderData.client_external_id,
      status: orderData.status,
      amount: orderData.amount,
      currency: orderData.currency || 'IDR',
      payment_method: orderData.payment_channel || orderData.payment_method,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      created_at: orderData.created_at,
      paid_at: orderData.paid_at,
      xendit_invoice_id: orderData.xendit_invoice_id,
      xendit_invoice_url: orderData.xendit_invoice_url,
      expires_at: orderData.expires_at
    });

  } catch (error) {
    console.error('[Check Order Status] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
