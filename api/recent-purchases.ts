import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';

// Initialize Supabase client
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface RecentPurchase {
  id: string;
  customer_name: string;
  product_name?: string;
  amount: number;
  created_at: string;
  order_type: 'purchase' | 'rental';
  rental_duration?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get orders from last 3 days with 'paid' or 'completed' status
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        product_name,
        amount,
        created_at,
        order_type,
        rental_duration,
        product_id,
        products (
          name
        )
      `)
      .in('status', ['paid', 'completed'])
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent purchases:', error);
      return res.status(500).json({ error: 'Failed to fetch recent purchases' });
    }

    // Format the response
    const recentPurchases: RecentPurchase[] = (orders || []).map((order: any) => ({
      id: order.id,
      customer_name: order.customer_name || 'Customer',
      product_name: order.product_name || order.products?.name || 'Product',
      amount: order.amount,
      created_at: order.created_at,
      order_type: order.order_type || 'purchase',
      rental_duration: order.rental_duration
    }));

    // Cache for 2 minutes (dynamic data but can have short cache)
    setCacheHeaders(res, { maxAge: 120, staleWhileRevalidate: 240 });

    return res.status(200).json({
      success: true,
      data: recentPurchases,
      count: recentPurchases.length
    });

  } catch (error) {
    console.error('Error in recent-purchases API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
