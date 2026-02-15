import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';
import { createOrderNotification, getProductName } from './_utils/adminNotificationService.js';

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
  
  if (!supabase) {
    console.error('❌ [API /api/admin] dashboardStats: Supabase client not available');
    return mockDashboard();
  }
  
  try {
    // Gunakan RPC untuk mengurangi egress — 1 query menggantikan 7+ query terpisah
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats');
    if (!rpcError && rpcData) {
      return {
        orders: { 
          count: rpcData.totalOrders || 0, 
          completed: rpcData.completedOrders || 0, 
          pending: rpcData.pendingOrders || 0, 
          revenue: Number(rpcData.totalRevenue) || 0,
          completedRevenue: Number(rpcData.totalRevenue) || 0
        },
        users: { count: rpcData.totalUsers || 0 },
        products: { count: rpcData.totalProducts || 0 },
        flashSales: { count: rpcData.totalFlashSales || 0 },
        reviews: { count: rpcData.totalReviews || 0, averageRating: Number(rpcData.averageRating) || 0 },
        activeRentals: rpcData.activeRentals || 0
      };
    }

    console.warn('[API /api/admin] RPC fallback — error:', rpcError?.message);
    
    // Fallback: query terpisah tapi TANPA mengunduh semua baris orders
    const [ordersRes, usersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true })
    ]);
    
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
      // Gunakan RPC get_average_rating jika tersedia
      const { data: ratingData, error: ratingError } = await supabase.rpc('get_average_rating');
      if (!ratingError && ratingData && ratingData.length > 0) {
        reviewsCount = Number(ratingData[0].total_reviews) || 0;
        averageRating = Number(ratingData[0].avg_rating) || 0;
      } else {
        // Fallback: hanya count (tanpa rating detail)
        const reviewsRes = await supabase.from('reviews').select('id', { count: 'exact', head: true });
        reviewsCount = reviewsRes.count || 0;
      }
    } catch (e) {
      console.warn('⚠️ [API /api/admin] dashboardStats: Reviews query failed:', e);
    }
    
    // Count-only queries (head: true = nol data transfer)
    const [completedRes, pendingRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['completed', 'paid']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    
    // Revenue via RPC (1 angka, bukan ribuan baris)
    let revenue = 0;
    try {
      const { data: revData, error: revError } = await supabase.rpc('get_total_revenue');
      if (!revError && revData !== null) {
        revenue = Number(revData) || 0;
      }
    } catch { /* fallback: revenue = 0 */ }
    
    const stats = {
      orders: { 
        count: ordersRes.count || 0, 
        completed: completedRes.count || 0, 
        pending: pendingRes.count || 0, 
        revenue, 
        completedRevenue: revenue
      },
      users: { count: usersRes.count || 0 },
      products: { count: productsRes.count || 0 },
      flashSales: { count: flashSalesCount },
      reviews: { count: reviewsCount, averageRating: Math.round(averageRating * 10) / 10 },
      activeRentals: 0
    };
    
        
    return stats;
  } catch (error) {
    console.error('❌ [API /api/admin] dashboardStats: Unexpected error:', error);
    console.error('❌ [API /api/admin] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return mockDashboard();
  }
}

function mockDashboard() {
  return { orders:{count:0,completed:0,pending:0,revenue:0,completedRevenue:0}, users:{count:0}, products:{count:0}, flashSales:{count:0}, reviews:{count:0, averageRating:0}, activeRentals:0 };
}

async function recentNotifications(limit: number) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('id, type, title, message, is_read, created_at, metadata, order_id, product_name, amount')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data||[]).map(n => ({ id:n.id, type:n.type||'new_order', title:n.title||'Notification', message:n.message||'', isRead:!!n.is_read, createdAt:n.created_at, metadata:n.metadata||null }));
}

async function listOrders(page: number, limit: number, status?: string) {
  
  if (!supabase) return { data: [], count: 0, page };
  
  const from = (page - 1) * limit; const to = from + limit - 1;
  
  // First get orders - only select columns that exist in the table
  let query: any = supabase.from('orders').select('id, customer_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, payment_channel, client_external_id, xendit_invoice_id, product_name, currency, paid_at, expires_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (status && status !== 'all') {
    // Handle "completed" status to include both 'paid' and 'completed' orders
    if (status === 'completed') {
      query = query.in('status', ['paid', 'completed']);
    } else {
      query = query.eq('status', status);
    }
  }
  const { data: orders, error, count } = await query;
  
  if (error) {
    console.error('❌ [API /api/admin] listOrders error:', error);
    return { data: [], count: 0, page };
  }
  
  // Get payment data for these orders
  const orderRows = orders || [];
  const externalIds = orderRows.map((order: any) => order.client_external_id).filter(Boolean);
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
  const productIds = Array.from(new Set(orderRows.map((order: any) => order.product_id).filter(Boolean)));
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

async function updateOrderStatus(orderId: string, newStatus: string, adminId?: string, adminName?: string, adminEmail?: string) {
  if (!supabase) return false;
  if (!orderId || !newStatus) return false;
  
  try {
    // Ambil data order sebelum update
    const { data: order, error: fetchError } = await supabase
      .from('orders')
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
          name
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (fetchError || !order) {
      console.error('[updateOrderStatus] Failed to fetch order:', fetchError);
      return false;
    }
    
    const oldStatus = order.status;
    
    // Siapkan data update
    const updateData: Record<string, unknown> = { status: newStatus };
    
    // Jika order rental di-mark completed → aktifkan rental tracking
    const isCompleted = newStatus === 'completed' && oldStatus !== 'completed';
    if (isCompleted && order.order_type === 'rental' && order.rental_duration) {
      const now = new Date();
      const endDate = calculateRentalEndDate(now, order.rental_duration);
      updateData.rental_start_date = now.toISOString();
      updateData.rental_end_date = endDate.toISOString();
      updateData.rental_status = 'active';
      updateData.completed_at = now.toISOString();
      if (adminId) updateData.completed_by = adminId;
      console.log(`[updateOrderStatus] Rental activated: ${order.rental_duration}, end: ${endDate.toISOString()}`);
    } else if (isCompleted) {
      updateData.completed_at = new Date().toISOString();
      if (adminId) updateData.completed_by = adminId;
    }
    
    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (updateError) {
      console.error('[updateOrderStatus] Update failed:', updateError);
      return false;
    }
    
    // Catat activity log
    if (adminId) {
      try {
        await logAdminActivity(adminId, adminName, adminEmail, 
          isCompleted ? 'order_completed' : 'order_status_changed',
          'order', orderId, {
            old_status: oldStatus, new_status: newStatus,
            order_type: order.order_type,
            rental_duration: order.rental_duration,
            ...(isCompleted && order.order_type === 'rental' ? { rental_activated: true } : {})
          });
      } catch (e) { console.error('[updateOrderStatus] Activity log failed:', e); }
    }
    
    // Buat notifikasi untuk perubahan status relevan
    const isPaid = newStatus === 'paid' && oldStatus !== 'paid';
    
    if (isPaid || isCompleted) {
      try {
        const productName = await getProductName(supabase, order.product_id, order.order_type);
        const notificationType = 'paid_order';
        
        await createOrderNotification(
          supabase,
          order.id,
          order.customer_name || 'Guest Customer',
          productName,
          Number(order.amount || 0),
          notificationType,
          order.customer_phone,
          order.order_type,
          order.rental_duration
        );
        
        const finalType = order.order_type === 'rental' ? 'paid_rent' : 'paid_order';
        console.log(`[updateOrderStatus] Notification created: ${finalType} for order ${orderId}`);
      } catch (notificationError) {
        console.error('[updateOrderStatus] Failed to create notification:', notificationError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[updateOrderStatus] Exception:', error);
    return false;
  }
}

/** Hitung tanggal akhir rental berdasarkan string durasi */
function calculateRentalEndDate(startDate: Date, duration: string): Date {
  const end = new Date(startDate);
  const lower = duration.toLowerCase();
  
  // Parse angka dari string
  const numMatch = lower.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 1;
  
  if (lower.includes('jam') || lower.includes('hour')) {
    end.setHours(end.getHours() + num);
  } else if (lower.includes('hari') || lower.includes('day')) {
    end.setDate(end.getDate() + num);
  } else if (lower.includes('minggu') || lower.includes('week')) {
    end.setDate(end.getDate() + num * 7);
  } else if (lower.includes('bulan') || lower.includes('month')) {
    end.setMonth(end.getMonth() + num);
  } else {
    // Default: asumsikan hari
    end.setDate(end.getDate() + num);
  }
  
  return end;
}

/** Catat aktivitas admin ke tabel admin_activity_logs */
async function logAdminActivity(
  adminId: string, adminName?: string, adminEmail?: string,
  action: string = 'unknown', entityType: string = 'unknown',
  entityId?: string, details?: Record<string, unknown>
) {
  if (!supabase) return;
  try {
    await supabase.from('admin_activity_logs').insert({
      admin_id: adminId,
      admin_name: adminName || null,
      admin_email: adminEmail || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {}
    });
  } catch (e) {
    console.error('[logAdminActivity] Error:', e);
  }
}

/** Ambil daftar rental aktif — optimized query dengan kolom minimal */
async function listActiveRentals() {
  if (!supabase) return { data: [], count: 0 };
  
  try {
    const { data, error, count } = await supabase
      .from('orders')
      .select(`
        id, 
        customer_name, 
        customer_email, 
        customer_phone,
        product_name, 
        product_id, 
        amount, 
        rental_duration,
        rental_start_date, 
        rental_end_date, 
        rental_status, 
        status, 
        completed_at, 
        created_at
      `, { count: 'exact' })
      .eq('order_type', 'rental')
      .in('status', ['paid', 'completed'])
      .not('rental_status', 'is', null)
      .order('rental_end_date', { ascending: true });
    
    if (error) {
      console.error('[listActiveRentals] Error:', error);
      return { data: [], count: 0 };
    }
    return { data: data || [], count: count || 0 };
  } catch (e) {
    console.error('[listActiveRentals] Exception:', e);
    return { data: [], count: 0 };
  }
}

/** Ambil rental aktif berdasarkan product_id (untuk tampilan publik) */
async function getProductRentalStatus(productId: string) {
  if (!supabase || !productId) return null;
  
  try {
    // Cari rental aktif untuk produk ini
    const { data } = await supabase
      .from('orders')
      .select('id, rental_duration, rental_start_date, rental_end_date, rental_status')
      .eq('product_id', productId)
      .eq('order_type', 'rental')
      .in('rental_status', ['active', 'expiring_soon'])
      .order('rental_end_date', { ascending: true })
      .limit(1);
    
    if (!data || data.length === 0) return null;
    
    // Cek antrian — rental yang pending di belakangnya
    const { data: queue } = await supabase
      .from('orders')
      .select('id, rental_duration, rental_start_date, rental_end_date, rental_status, created_at')
      .eq('product_id', productId)
      .eq('order_type', 'rental')
      .in('status', ['paid', 'completed'])
      .in('rental_status', ['active', 'expiring_soon'])
      .order('rental_end_date', { ascending: true });
    
    return {
      currentRental: data[0],
      queueCount: (queue?.length || 1) - 1,
      estimatedAvailable: data[0].rental_end_date
    };
  } catch (e) {
    console.error('[getProductRentalStatus] Error:', e);
    return null;
  }
}

/** Update rental_status berdasarkan waktu (dipanggil dari cron atau on-demand) */
async function refreshRentalStatuses() {
  if (!supabase) return 0;
  
  const now = new Date().toISOString();
  const nowMs = Date.now();
  let updated = 0;
  
  try {
    // 1. Ambil semua rental aktif untuk cek threshold 10%
    const { data: activeRentals } = await supabase
      .from('orders')
      .select('id, rental_start_date, rental_end_date')
      .eq('rental_status', 'active')
      .gt('rental_end_date', now);

    if (activeRentals && activeRentals.length > 0) {
      // Cek mana yang sisa waktunya < 10% dari total durasi → expiring_soon
      const expiringSoonIds = activeRentals
        .filter(r => {
          const start = new Date(r.rental_start_date).getTime();
          const end = new Date(r.rental_end_date).getTime();
          const totalDuration = end - start;
          const remaining = end - nowMs;
          return remaining > 0 && remaining < totalDuration * 0.1;
        })
        .map(r => r.id);

      if (expiringSoonIds.length > 0) {
        const { data: expiringSoon } = await supabase
          .from('orders')
          .update({ rental_status: 'expiring_soon' })
          .in('id', expiringSoonIds)
          .select('id');
        updated += expiringSoon?.length || 0;
      }
    }
    
    // 2. Active/expiring_soon → expired (lewat deadline)
    const { data: expired } = await supabase
      .from('orders')
      .update({ rental_status: 'expired' })
      .in('rental_status', ['active', 'expiring_soon'])
      .lte('rental_end_date', now)
      .select('id');
    updated += expired?.length || 0;
    
    if (updated > 0) {
      console.log(`[refreshRentalStatuses] Updated ${updated} rental statuses`);
    }
    return updated;
  } catch (e) {
    console.error('[refreshRentalStatuses] Error:', e);
    return 0;
  }
}

/** Ambil activity logs admin (hanya untuk super_admin) */
async function listAdminActivityLogs(page: number, limit: number, entityType?: string) {
  if (!supabase) return { data: [], count: 0, page };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  try {
    let query: any = supabase
      .from('admin_activity_logs')
      .select('id, admin_id, admin_name, admin_email, action, entity_type, entity_id, details, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[listAdminActivityLogs] Error:', error);
      return { data: [], count: 0, page };
    }
    return { data: data || [], count: count || 0, page };
  } catch (e) {
    console.error('[listAdminActivityLogs] Exception:', e);
    return { data: [], count: 0, page };
  }
}

async function listUsers(page: number, limit: number, search?: string) {
  
  if (!supabase) {
    console.error('[listUsers] Supabase client not initialized');
    return { data: [], count: 0, page };
  }
  
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
  
  if (error) {
    console.error('[listUsers] Query error:', error);
    console.error('[listUsers] Error details:', JSON.stringify(error, null, 2));
    return { data: [], count: 0, page };
  }
  
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
  let toDate: Date;
  if (startDate && endDate) { fromDate = new Date(startDate); toDate = new Date(endDate); } else { const d = days && days>0 ? days : 7; fromDate = new Date(Date.now() - d*86400000); toDate = new Date(); }
  
  // Gunakan RPC untuk server-side aggregation — mengurangi transfer ribuan baris ke ~7-30 baris
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_orders_time_series', {
      p_start_date: fromDate.toISOString(),
      p_end_date: toDate.toISOString()
    });
    if (!rpcError && rpcData) {
      return (rpcData as any[]).map((row: any) => ({
        date: row.date,
        pending: Number(row.pending_count) || 0,
        completed: Number(row.completed_count) || 0,
        cancelled: Number(row.cancelled_count) || 0,
        paid: Number(row.paid_count) || 0,
        total: Number(row.total_count) || 0,
      }));
    }
    console.warn('[timeSeries] RPC error, fallback:', rpcError?.message);
  } catch { /* fallback di bawah */ }

  // Fallback: query dengan limit untuk mencegah transfer berlebihan
  const { data, error } = await supabase.from('orders').select('created_at,status,amount').gte('created_at', fromDate.toISOString()).order('created_at').limit(2000);
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

    // Get action from query string or body (for POST requests)
    const action = normalizeAction(req.query.action || req.body?.action);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip + ':' + action)) return respond(res, 429, { error: 'rate_limited' });

    // Create Product - Uses service role to bypass RLS
    if (req.method === 'POST' && action === 'createProduct') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const productData = req.body?.productData || req.body;
        
        if (!productData || !productData.name || !productData.price) {
          return respond(res, 400, { error: 'missing_parameters', message: 'name and price are required' });
        }
        
        // Ensure images array is set and image field uses first image or placeholder
        const images = productData.images && productData.images.length > 0 ? productData.images : [];
        const image = images.length > 0 ? images[0] : (productData.image || 'https://via.placeholder.com/400x300?text=No+Image');
        
        const insertData = {
          name: productData.name,
          description: productData.description || '',
          price: productData.price,
          original_price: productData.original_price || productData.price,
          category_id: productData.category_id || null,
          game_title_id: productData.game_title_id || null,
          tier_id: productData.tier_id || null,
          image,
          images,
          stock: productData.stock || 1,
          is_active: productData.is_active !== undefined ? productData.is_active : true,
          has_rental: productData.has_rental || false,
          is_flash_sale: false,
          flash_sale_end_time: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Use service role to bypass RLS
        const { data, error } = await supabase
          .from('products')
          .insert(insertData)
          .select('id, name, price, image, is_active, stock, created_at')
          .single();
        
        if (error) {
          console.error('[Admin API] Product create error:', error);
          return respond(res, 400, { error: 'create_failed', details: error.message });
        }
        return respond(res, 200, { success: true, data });
      } catch (e: any) {
        console.error('[Admin API] Exception:', e);
        return respond(res, 500, { error: 'internal_error', message: e.message });
      }
    }

    if (req.method === 'POST' && action === 'updateProduct') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const { id, fields } = req.body || {};
        
        console.log('[Admin API] updateProduct called:', { id, fields: JSON.stringify(fields) });
        
        if (!id || !fields) {
          return respond(res, 400, { error: 'missing_parameters' });
        }
        
        // Use service role to bypass RLS
        const { data, error } = await supabase
          .from('products')
          .update(fields)
          .eq('id', id)
          .select('id, name, price, image, is_active, stock, updated_at')
          .single();
        
        if (error) {
          console.error('[Admin API] Product update error:', error);
          return respond(res, 400, { error: 'update_failed', details: error.message });
        }
        
        console.log('[Admin API] Product updated successfully:', { id, price: data?.price });
        return respond(res, 200, { success: true, data });
      } catch (e: any) {
        console.error('[Admin API] Exception:', e);
        return respond(res, 500, { error: 'internal_error', message: e.message });
      }
    }

    // Update User (Admin only)
    if (req.method === 'POST' && action === 'updateUser') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const { id, fields } = req.body || {};
        
        if (!id || !fields) {
          return respond(res, 400, { error: 'missing_parameters' });
        }
        
        // Only allow specific fields to be updated
        const allowedFields = ['name', 'phone', 'is_admin', 'is_active', 'avatar_url'];
        const sanitizedFields: Record<string, any> = {};
        
        for (const key of Object.keys(fields)) {
          if (allowedFields.includes(key)) {
            sanitizedFields[key] = fields[key];
          }
        }
        
        if (Object.keys(sanitizedFields).length === 0) {
          return respond(res, 400, { error: 'no_valid_fields' });
        }
        
        // Add updated_at timestamp
        sanitizedFields.updated_at = new Date().toISOString();
        
        // Use service role to bypass RLS
        const { data, error } = await supabase
          .from('users')
          .update(sanitizedFields)
          .eq('id', id)
          .select('id, name, email, is_active, is_admin, role, updated_at')
          .single();
        
        if (error) {
          console.error('[Admin API] User update error:', error);
          return respond(res, 400, { error: 'update_failed', details: error.message });
        }
        return respond(res, 200, { success: true, data });
      } catch (e: any) {
        console.error('[Admin API] Exception:', e);
        return respond(res, 500, { error: 'internal_error', message: e.message });
      }
    }

    // Delete Flash Sale
    if (req.method === 'POST' && action === 'deleteFlashSale') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const { id } = req.body || {};
        
        if (!id) {
          return respond(res, 400, { error: 'missing_flash_sale_id' });
        }
        
        // Use service role to bypass RLS
        const { error } = await supabase
          .from('flash_sales')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('[Admin API] Flash sale delete error:', error);
          return respond(res, 400, { error: 'delete_failed', details: error.message });
        }
        return respond(res, 200, { success: true });
      } catch (e: any) {
        console.error('[Admin API] Exception:', e);
        return respond(res, 500, { error: 'internal_error', message: e.message });
      }
    }

    if (req.method === 'POST' && action === 'update-order') {
      const { orderId, status } = req.body || {};
      const ok = await updateOrderStatus(orderId, status, auth.userId, auth.userName, auth.userEmail);
      return respond(res, ok ? 200 : 400, ok ? { success: true } : { error: 'update_failed' });
    }

    // Egress-optimized: Fetch single order details for modal
    if (req.method === 'GET' && action === 'get-order') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      const orderId = req.query.orderId as string;
      if (!orderId) return respond(res, 400, { error: 'missing_order_id' });

      try {
        // Fetch only necessary fields - egress optimization
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            customer_phone,
            product_name,
            amount,
            order_type,
            rental_duration,
            rental_start_date,
            rental_end_date,
            rental_status,
            completed_at,
            completed_by,
            status,
            payment_method,
            payment_channel,
            created_at,
            updated_at,
            product_id
          `)
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          console.error('❌ Get order error:', orderError);
          return respond(res, 404, { error: 'order_not_found' });
        }

        // Fetch only first product image - egress optimization
        let productImage = null;
        if (order.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('images')
            .eq('id', order.product_id)
            .single();

          if (product?.images && product.images.length > 0) {
            productImage = product.images[0]; // Only first image
          }
        }

        const orderDetails = {
          ...order,
          product_image: productImage
        };

        // Return fresh data to avoid stale status after updates
        return respond(res, 200, { order: orderDetails }, 0);
      } catch (err) {
        console.error('❌ Get order exception:', err);
        return respond(res, 500, { error: 'internal_error' });
      }
    }

    if (req.method === 'POST' && action === 'update-settings') {
      if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
      
      try {
        const settingsData = req.body || {};
        
        // Get current settings first
        const { data: current } = await supabase
          .from('website_settings')
          .select('id')
          .single();
          
        if (current) {
          // Update existing settings
          const { data, error } = await supabase
            .from('website_settings')
            .update(settingsData)
            .eq('id', current.id)
            .select('id, site_name, updated_at')
            .single();
            
          if (error) {
            console.error('❌ Admin API: Settings update error', error);
            return respond(res, 400, { error: 'update_failed', details: error.message });
          }
          return respond(res, 200, { success: true, data });
        } else {
          // Create new settings record
          const { data, error } = await supabase
            .from('website_settings')
            .insert(settingsData)
            .select('id, site_name, updated_at')
            .single();
            
          if (error) {
            console.error('❌ Admin API: Settings insert error', error);
            return respond(res, 400, { error: 'insert_failed', details: error.message });
          }
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
        const data = await dashboardStats();
                return respond(res, 200, data, 60); // Cache 60 detik — mengurangi hits berulang
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
            .select('id, site_name, logo_url, favicon_url, contact_email, support_email, contact_phone, whatsapp_number, address, business_hours, company_description, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, hero_title, hero_subtitle, footer_copyright_text, newsletter_enabled, social_media_enabled, topup_game_url, whatsapp_channel_url, hero_button_url, jual_akun_whatsapp_url, updated_at')
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
          
          const { data, error } = await supabase
            .from('products')
            .update({ 
              archived_at: new Date().toISOString(),
              is_active: false 
            })
            .eq('id', productId)
            .select('id, is_active, archived_at')
            .single();
            
          if (error) {
            console.error('❌ Admin API: Archive product error', error);
            return respond(res, 400, { error: 'archive_failed', details: error.message });
          }
          return respond(res, 200, { success: true, data });
        } catch (e: any) {
          console.error('❌ Admin API: Archive product failed', e);
          return respond(res, 500, { error: 'archive_operation_failed', message: e.message });
        }
      }
      case 'active-rentals': {
        // Refresh status rental dulu lalu ambil daftar (cache 1 menit)
        await refreshRentalStatuses();
        const result = await listActiveRentals();
        return respond(res, 200, { success: true, ...result }, 60);
      }
      case 'product-rental-status': {
        const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
        if (!productId) return respond(res, 400, { error: 'missing_product_id' });
        await refreshRentalStatuses();
        const result = await getProductRentalStatus(productId);
        return respond(res, 200, { data: result }, 120);
      }
      case 'activity-logs': {
        // Hanya super_admin yang bisa akses
        if (auth.role !== 'super_admin') {
          return respond(res, 403, { error: 'forbidden', message: 'Only super_admin can access activity logs' });
        }
        const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
        const result = await listAdminActivityLogs(page, limit, entityType);
        return respond(res, 200, { success: true, ...result }, 0);
      }
      case 'mark-rental-returned': {
        if (!supabase) return respond(res, 500, { error: 'database_unavailable' });
        const { orderId: rentalOrderId } = req.body || {};
        if (!rentalOrderId) return respond(res, 400, { error: 'missing_order_id' });
        
        try {
          const { error } = await supabase
            .from('orders')
            .update({ rental_status: 'returned' })
            .eq('id', rentalOrderId)
            .eq('order_type', 'rental');
          
          if (error) return respond(res, 400, { error: 'update_failed', details: error.message });
          
          // Log aktivitas
          await logAdminActivity(auth.userId || '', auth.userName, auth.userEmail,
            'rental_returned', 'rental', rentalOrderId, { marked_returned: true });
          
          return respond(res, 200, { success: true });
        } catch (e: any) {
          return respond(res, 500, { error: 'internal_error', message: e.message });
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
