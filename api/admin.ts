import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';

// Lazy supabase client (service role preferred for admin operations)
// Clean environment variables to remove any CRLF characters
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();

// CRITICAL: Use service role key for admin operations to bypass RLS
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Log which key is being used (for debugging)
if (supabase) {
  const keyType = supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON';
  console.log(`[admin.ts] Supabase initialized with ${keyType} key`);
  console.log(`[admin.ts] URL length: ${supabaseUrl.length}, Key length: ${supabaseKey.length}`);
  if (!supabaseServiceKey) {
    console.warn('[admin.ts] WARNING: Using ANON key instead of SERVICE_ROLE key - RLS policies will apply!');
  }
}

// Basic in-memory rate limiting
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT = 60; // 60 calls / window

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function respond(res: VercelResponse, status: number, body: any, cacheSeconds: number = 0) {
  res.setHeader('Content-Type', 'application/json');
  
  // Add cache headers for successful responses using new caching utility
  if (status === 200 && cacheSeconds > 0) {
    setCacheHeaders(res, { maxAge: cacheSeconds, staleWhileRevalidate: cacheSeconds * 2 });
  } else if (status === 200) {
    // No cache for real-time data or mutations
    setCacheHeaders(res, CacheStrategies.NoCache);
  } else {
    // Don't cache errors
    setCacheHeaders(res, CacheStrategies.NoCache);
  }
  
  res.status(status).send(JSON.stringify(body));
}

function parseIntSafe(v: any, def: number) { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : def; }

function normalizeAction(action?: string | string[]): string {
  if (!action) return 'unknown';
  const a = Array.isArray(action) ? action[0] : action;
  if (a === 'dashboard') return 'dashboard-stats';
  if (a === 'notifications') return 'recent-notifications';
  return a;
}

async function dashboardStats() {
  console.log('📊 [API /api/admin] dashboardStats: Starting to fetch dashboard statistics');
  
  if (!supabase) {
    console.error('❌ [API /api/admin] dashboardStats: Supabase client not available');
    return mockDashboard();
  }
  
  try {
    console.log('🔍 [API /api/admin] dashboardStats: Querying database...');
    console.log('🔑 [API /api/admin] Using Supabase key type:', supabaseServiceKey ? 'SERVICE_ROLE ✅' : 'ANON ⚠️');
    
    // Use optimized approach with separate queries and error handling
    const [ordersRes, usersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true })
    ]);
    
    console.log('📈 [API /api/admin] dashboardStats: Basic counts:', {
      orders: ordersRes.count,
      users: usersRes.count,
      products: productsRes.count,
      ordersError: ordersRes.error?.message,
      usersError: usersRes.error?.message,
      productsError: productsRes.error?.message
    });
    
    let flashSalesCount = 0;
    try {
      const flashRes = await supabase.from('flash_sales').select('id', { count: 'exact', head: true });
      flashSalesCount = flashRes.count || 0;
    } catch (e) {
      console.warn('⚠️ [API /api/admin] dashboardStats: Flash sales query failed:', e);
    }
    
    let reviewsCount = 0;
    let averageRating = 0;
    try {
      const reviewsRes = await supabase.from('reviews').select('id, rating', { count: 'exact' });
      reviewsCount = reviewsRes.count || 0;
      if (reviewsRes.data && reviewsRes.data.length > 0) {
        const totalRating = reviewsRes.data.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
        averageRating = totalRating / reviewsRes.data.length;
      }
    } catch (e) {
      console.warn('⚠️ [API /api/admin] dashboardStats: Reviews query failed:', e);
    }
    
    // Get order statistics efficiently with separate targeted queries
    console.log('💰 [API /api/admin] dashboardStats: Fetching order statistics...');
    
    // Get completed/paid orders
    const [completedRes, pendingRes, paidOrdersRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['completed', 'paid']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('amount').in('status', ['completed', 'paid'])
    ]);
    
    const completed = completedRes.count || 0;
    const pending = pendingRes.count || 0;
    
    // Calculate revenue from paid/completed orders
    let revenue = 0;
    if (paidOrdersRes.data) {
      revenue = paidOrdersRes.data.reduce((sum, order) => {
        return sum + (Number(order.amount) || 0);
      }, 0);
    }
    
    console.log('✅ [API /api/admin] dashboardStats: Order stats calculated:', {
      completed,
      pending,
      revenue
    });
    
    const stats = {
      orders: { 
        count: ordersRes.count || 0, 
        completed, 
        pending, 
        revenue, 
        completedRevenue: revenue // Same as revenue for completed/paid orders
      },
      users: { count: usersRes.count || 0 },
      products: { count: productsRes.count || 0 },
      flashSales: { count: flashSalesCount },
      reviews: { count: reviewsCount, averageRating: Math.round(averageRating * 10) / 10 }
    };
    
    console.log('✅ [API /api/admin] dashboardStats: Final stats:', JSON.stringify(stats, null, 2));
    
    return stats;
  } catch (error) {
    console.error('❌ [API /api/admin] dashboardStats: Unexpected error:', error);
    // Return mock data but log the error for debugging
    console.error('❌ [API /api/admin] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return mockDashboard();
  }
}

function mockDashboard() {
  return { orders:{count:0,completed:0,pending:0,revenue:0,completedRevenue:0}, users:{count:0}, products:{count:0}, flashSales:{count:0}, reviews:{count:0, averageRating:0} };
}

async function recentNotifications(limit: number) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, description, is_read, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data||[]).map(n => ({ id:n.id, type:n.type||'new_order', title:n.title||'Notification', message:n.message||n.description||'', isRead:!!n.is_read, createdAt:n.created_at, metadata:n.metadata||null }));
}

async function listOrders(page: number, limit: number, status?: string) {
  console.log('📦 [API /api/admin] listOrders: page', page, 'limit', limit, 'status', status);
  console.log('🔑 [API /api/admin] Using key type:', supabaseServiceKey ? 'SERVICE_ROLE ✅' : 'ANON ⚠️');
  console.log('🔑 [API /api/admin] Supabase URL:', supabaseUrl);
  console.log('🔑 [API /api/admin] SERVICE_KEY present:', !!supabaseServiceKey);
  
  if (!supabase) return { data: [], count: 0, page };
  
  // FIRST: Test raw count without any filters
  console.log('[listOrders] Testing raw table access...');
  const rawTest = await supabase.from('orders').select('*', { count: 'exact', head: true });
  console.log('[listOrders] Raw table count test:', { count: rawTest.count, error: rawTest.error });
  
  const from = (page - 1) * limit; const to = from + limit - 1;
  
  // First get orders - only select columns that exist in the table
  let query: any = supabase.from('orders').select('id, customer_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, client_external_id, xendit_invoice_id, product_name, currency, paid_at, expires_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (status && status !== 'all') {
    // Handle "completed" status to include both 'paid' and 'completed' orders
    if (status === 'completed') {
      query = query.in('status', ['paid', 'completed']);
    } else {
      query = query.eq('status', status);
    }
  }
  const { data: orders, error, count } = await query;
  
  console.log('📊 [API /api/admin] listOrders result:', {
    count,
    ordersLength: orders?.length,
    hasError: !!error,
    errorMessage: error?.message
  });
  
  if (error) {
    console.error('❌ [API /api/admin] listOrders error:', error);
    return { data: [], count: 0, page };
  }
  
  // Get payment data for these orders
  const orderRows = orders || [];
  const externalIds = orderRows.map(order => order.client_external_id).filter(Boolean);
  let paymentsMap: { [key: string]: any } = {};
  
  if (externalIds.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('external_id, xendit_id, payment_method, status, payment_data, created_at, expiry_date')
      .in('external_id', externalIds);
    
    if (payments) {
      payments.forEach(payment => {
        paymentsMap[payment.external_id] = payment;
      });
    }
  }
  
  // Get product names for orders that have product_id
  const productIds = Array.from(new Set(orderRows.map(order => order.product_id).filter(Boolean)));
  let productsMap: { [key: string]: string } = {};
  
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    
    if (products) {
      products.forEach(product => {
        productsMap[product.id] = product.name;
      });
    }
  }
  
  // Map orders with payment data and product names
  const mappedOrders = orderRows.map((order: any) => {
    const paymentRecord = paymentsMap[order.client_external_id];
    
    return {
      ...order,
      product_name: order.product_id ? productsMap[order.product_id] : undefined,
      payment_data: paymentRecord ? {
        xendit_id: paymentRecord.xendit_id,
        payment_method_type: paymentRecord.payment_method,
        payment_status: paymentRecord.status,
        qr_url: paymentRecord.payment_data?.qr_url,
        qr_string: paymentRecord.payment_data?.qr_string,
        account_number: paymentRecord.payment_data?.account_number,
        bank_code: paymentRecord.payment_data?.bank_code,
        payment_url: paymentRecord.payment_data?.payment_url,
        payment_code: paymentRecord.payment_data?.payment_code,
        retail_outlet: paymentRecord.payment_data?.retail_outlet,
      } : undefined
    };
  });
  
  return { data: mappedOrders, count: count || 0, page };
}

async function updateOrderStatus(orderId: string, newStatus: string) {
  if (!supabase) return false;
  if (!orderId || !newStatus) return false;
  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  return !error;
}

async function listUsers(page: number, limit: number, search?: string) {
  console.log('👥 [API /api/admin] listUsers: page', page, 'limit', limit, 'search', search);
  console.log('🔑 [API /api/admin] Using key type:', supabaseServiceKey ? 'SERVICE_ROLE ✅' : 'ANON ⚠️');
  console.log('🔑 [API /api/admin] Supabase URL:', supabaseUrl);
  console.log('🔑 [API /api/admin] SERVICE_KEY present:', !!supabaseServiceKey);
  
  if (!supabase) {
    console.error('[listUsers] Supabase client not initialized');
    return { data: [], count: 0, page };
  }
  
  console.log('[listUsers] Querying users - page:', page, 'limit:', limit, 'search:', search);
  
  // FIRST: Test raw count without any filters
  console.log('[listUsers] Testing raw table access...');
  const rawTest = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log('[listUsers] Raw table count test:', { count: rawTest.count, error: rawTest.error });
  
  const from = (page - 1) * limit; 
  const to = from + limit - 1;
  
  let query: any = supabase
    .from('users')
    .select('id,name,email,phone,avatar_url,is_admin,created_at,is_active,last_login_at,phone_verified,profile_completed', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
    
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  
  const { data, error, count } = await query;
  
  console.log('📊 [API /api/admin] listUsers result:', {
    count,
    dataLength: data?.length,
    hasError: !!error,
    errorMessage: error?.message,
    sampleUser: data?.[0] ? { id: data[0].id, email: data[0].email } : null
  });
  
  if (error) {
    console.error('[listUsers] Query error:', error);
    console.error('[listUsers] Error details:', JSON.stringify(error, null, 2));
    return { data: [], count: 0, page };
  }
  
  console.log('[listUsers] Successfully fetched', data?.length || 0, 'users out of', count || 0, 'total');
  
  if ((count || 0) === 0) {
    console.warn('[listUsers] WARNING: No users found in database. Check RLS policies or table data.');
  }
  
  return { data: data || [], count: count || 0, page };
}

async function listProducts(page: number, limit: number, search?: string) {
  if (!supabase) return { data: [], count: 0, page };
  const from = (page - 1) * limit; const to = from + limit - 1;
  let query: any = supabase.from('products').select('id,name,description,price,images,is_active,is_flash_sale,stock,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, page };
  return { data:data||[], count:count||0, page };
}

async function timeSeries(days?: number, startDate?: string, endDate?: string) {
  if (!supabase) return [];
  let fromDate: Date;
  if (startDate && endDate) { fromDate = new Date(startDate); } else { const d = days && days>0 ? days : 7; fromDate = new Date(Date.now() - d*86400000); }
  const { data, error } = await supabase.from('orders').select('created_at,status,amount').gte('created_at', fromDate.toISOString()).order('created_at');
  if (error) return [];
  const bucket = new Map<string,{pending:number;completed:number;cancelled:number;paid:number;total:number}>();
  (data||[]).forEach(r => { const day = r.created_at.substring(0,10); if(!bucket.has(day)) bucket.set(day,{pending:0,completed:0,cancelled:0,paid:0,total:0}); const b=bucket.get(day)!; b.total++; switch(r.status){case 'completed': b.completed++; break; case 'cancelled': b.cancelled++; break; case 'paid': b.paid++; break; case 'pending': b.pending++; break;} });
  return Array.from(bucket.entries()).map(([date,v]) => ({ date, ...v }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  try {
    // ✅ SECURITY: Validate admin authentication
    const auth = await validateAdminAuth(req);
    if (!auth.valid) {
      console.warn('[API /api/admin] Unauthorized access attempt:', {
        error: auth.error,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      return respond(res, 401, { 
        error: 'unauthorized', 
        message: auth.error || 'Authentication required'
      });
    }

    // Log successful admin access
    console.log('[API /api/admin] Authenticated admin access:', {
      userId: auth.userId,
      email: auth.userEmail,
      action: req.query.action
    });

    const action = normalizeAction(req.query.action);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip + ':' + action)) return respond(res, 429, { error: 'rate_limited' });

    if (req.method === 'POST' && action === 'update-order') {
      const { orderId, status } = req.body || {};
      const ok = await updateOrderStatus(orderId, status);
      return respond(res, ok ? 200 : 400, ok ? { success: true } : { error: 'update_failed' });
    }

    if (req.method === 'POST' && action === 'update-settings') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const settingsData = req.body || {};
        console.log('🔧 Admin API: Updating website settings', settingsData);
        
        // Get current settings first
        const { data: current } = await supabase
          .from('website_settings')
          .select('*') // Select all columns for update operations
          .single();
          
        if (current) {
          // Update existing settings
          const { data, error } = await supabase
            .from('website_settings')
            .update(settingsData)
            .eq('id', current.id)
            .select()
            .single();
            
          if (error) {
            console.error('❌ Admin API: Settings update error', error);
            return respond(res, 400, { error: 'update_failed', details: error.message });
          }
          
          console.log('✅ Admin API: Settings updated successfully');
          return respond(res, 200, { success: true, data });
        } else {
          // Create new settings record
          const { data, error } = await supabase
            .from('website_settings')
            .insert(settingsData)
            .select()
            .single();
            
          if (error) {
            console.error('❌ Admin API: Settings insert error', error);
            return respond(res, 400, { error: 'insert_failed', details: error.message });
          }
          
          console.log('✅ Admin API: Settings created successfully');
          return respond(res, 200, { success: true, data });
        }
      } catch (e: any) {
        console.error('❌ Admin API: Settings operation failed', e);
        return respond(res, 500, { error: 'settings_operation_failed', message: e.message });
      }
    }

    const page = parseIntSafe(req.query.page, 1);
    const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);

    switch (action) {
      case 'dashboard-stats': {
        console.log('🎯 [API /api/admin] Handling dashboard-stats request');
        const data = await dashboardStats();
        console.log('📤 [API /api/admin] Sending dashboard-stats response:', JSON.stringify(data, null, 2));
        return respond(res, 200, data, 0); // No cache - always fresh data
      }
      case 'recent-notifications': {
        const data = await recentNotifications(limit);
        return respond(res, 200, { data }, 30); // Cache for 30 seconds
      }
      case 'orders': {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const data = await listOrders(page, limit, status);
        return respond(res, 200, { success: true, ...data }, 0); // No cache - always fresh data
      }
      case 'users': {
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const result = await listUsers(page, limit, search);
        return respond(res, 200, { success: true, ...result }, 0); // No cache - always fresh data
      }
      case 'products': {
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const data = await listProducts(page, limit, search);
        return respond(res, 200, data, 300); // Cache for 5 minutes
      }
      case 'time-series': {
        const days = req.query.days ? parseIntSafe(req.query.days, 7) : undefined;
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const data = await timeSeries(days, startDate, endDate);
        return respond(res, 200, { data }, 300); // Cache for 5 minutes
      }
      case 'settings': {
        if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
        
        try {
          const { data, error } = await supabase
            .from('website_settings')
            .select('*') // Select all columns to ensure frontend gets everything it needs
            .single();
            
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('❌ Admin API: Settings fetch error', error);
            return respond(res, 500, { error: 'fetch_failed', details: error.message });
          }
          
          return respond(res, 200, { data: data || {} }, 600); // Cache for 10 minutes
        } catch (e: any) {
          console.error('❌ Admin API: Settings fetch failed', e);
          return respond(res, 500, { error: 'settings_fetch_failed', message: e.message });
        }
      }
      case 'archive_product': {
        if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
        
        try {
          const { productId } = req.body || {};
          if (!productId) {
            return respond(res, 400, { error: 'missing_product_id' });
          }
          
          console.log('🗄️ Admin API: Archiving product', productId);
          
          const { data, error } = await supabase
            .from('products')
            .update({ 
              archived_at: new Date().toISOString(),
              is_active: false 
            })
            .eq('id', productId)
            .select()
            .single();
            
          if (error) {
            console.error('❌ Admin API: Archive product error', error);
            return respond(res, 400, { error: 'archive_failed', details: error.message });
          }
          
          console.log('✅ Admin API: Product archived successfully');
          return respond(res, 200, { success: true, data });
        } catch (e: any) {
          console.error('❌ Admin API: Archive product failed', e);
          return respond(res, 500, { error: 'archive_operation_failed', message: e.message });
        }
      }
      default:
        return respond(res, 400, { error: 'unknown_action', action });
    }
  } catch (e: any) {
    console.error('Admin API error', e);
    return respond(res, 500, { error: 'internal_error', message: e.message });
  }
}
// (Removed legacy duplicated handler & unused legacy helpers to resolve conflicts and keep canonical actions only)
