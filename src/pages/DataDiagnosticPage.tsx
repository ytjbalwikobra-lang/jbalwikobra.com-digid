import React, { useState } from 'react';
import { PNCard, PNButton } from '../components/ui/CyberDesignSystem';
import { adminService } from '../services/adminService';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// NOTE: Do not create Supabase client at module load to avoid crashes in development
// when env vars are not set. We'll lazily create a client inside the diagnostic runner.
let supabase: SupabaseClient | null = null;

interface DiagnosticData {
  orders: { count: number; sample: any[] };
  users: { count: number; sample: any[] };
  products: { count: number; sample: any[] };
  reviews: { count: number; sample: any[] };
  stats: any;
  errors: string[];
}

export const DataDiagnosticPage: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const errors: string[] = [];
    const result: DiagnosticData = {
      orders: { count: 0, sample: [] },
      users: { count: 0, sample: [] },
      products: { count: 0, sample: [] },
      reviews: { count: 0, sample: [] },
      stats: null,
      errors
    };

    try {
      // Lazily create Supabase client if env configured
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        errors.push('Supabase not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
      } else if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseKey);
      }

      if (!supabase) {
        // Still attempt to fetch admin stats via adminService (has fallbacks) and return early
        try {
          const stats = await adminService.getDashboardStats();
          result.stats = stats;
        } catch (statsError) {
          errors.push(`Stats Error: ${statsError}`);
        }
        setDiagnostic(result);
        setLoading(false);
        return;
      }

      // Check orders
      const { data: orders, error: ordersError, count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .limit(3);
      
      if (ordersError) {
        errors.push(`Orders Error: ${ordersError.message}`);
      } else {
        result.orders = { count: ordersCount || 0, sample: orders || [] };
      }

      // Check users
  const { data: users, error: usersError, count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(3);
      
      if (usersError) {
        errors.push(`Users Error: ${usersError.message}`);
      } else {
        result.users = { count: usersCount || 0, sample: users || [] };
      }

      // Check products
  const { data: products, error: productsError, count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .limit(3);
      
      if (productsError) {
        errors.push(`Products Error: ${productsError.message}`);
      } else {
        result.products = { count: productsCount || 0, sample: products || [] };
      }

      // Check reviews
  const { data: reviews, error: reviewsError, count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .limit(3);
      
      if (reviewsError) {
        errors.push(`Reviews Error: ${reviewsError.message}`);
      } else {
        result.reviews = { count: reviewsCount || 0, sample: reviews || [] };
      }

      // Get stats from admin service
      try {
        const stats = await adminService.getDashboardStats();
        result.stats = stats;
      } catch (statsError) {
        errors.push(`Stats Error: ${statsError}`);
      }

    } catch (error) {
      errors.push(`General Error: ${error}`);
    }

    setDiagnostic(result);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Data Display Diagnostic</h1>
        <PNButton onClick={runDiagnostic} disabled={loading}>
          {loading ? 'Running...' : 'Run Diagnostic'}
        </PNButton>
      </div>

      {diagnostic && (
        <div className="space-y-6">
          {/* Errors */}
          {diagnostic.errors.length > 0 && (
            <PNCard className="border-red-200 bg-red-50">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-red-700 mb-2">Errors Found:</h2>
                <ul className="list-disc list-inside space-y-1">
                  {diagnostic.errors.map((error, i) => (
                    <li key={i} className="text-red-600 text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </PNCard>
          )}

          {/* Stats Overview */}
          {diagnostic.stats && (
            <PNCard>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-4">Current Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--cyber-pink-primary)]">{diagnostic.stats.totalOrders}</div>
                    <div className="text-sm text-[var(--cyber-text-secondary)]">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">Rp {diagnostic.stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-[var(--cyber-text-secondary)]">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--cyber-text-secondary)]">{diagnostic.stats.totalUsers}</div>
                    <div className="text-sm text-[var(--cyber-text-secondary)]">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--cyber-pink-primary)]">{diagnostic.stats.totalProducts}</div>
                    <div className="text-sm text-[var(--cyber-text-secondary)]">Products</div>
                  </div>
                </div>
              </div>
            </PNCard>
          )}

          {/* Data Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders */}
            <PNCard>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Orders ({diagnostic.orders.count})
                </h2>
                {diagnostic.orders.sample.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {diagnostic.orders.sample.map((order, i) => (
                      <div key={i} className="p-2 bg-[var(--cyber-bg-pure)] rounded-cyber-lg">
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-[var(--cyber-text-secondary)]">
                          Rp {order.amount?.toLocaleString()} - {order.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--cyber-text-secondary)]">No orders found</div>
                )}
              </div>
            </PNCard>

            {/* Users */}
            <PNCard>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Users ({diagnostic.users.count})
                </h2>
                {diagnostic.users.sample.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {diagnostic.users.sample.map((user, i) => (
                      <div key={i} className="p-2 bg-[var(--cyber-bg-pure)] rounded-cyber-lg">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-[var(--cyber-text-secondary)]">{user.email}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--cyber-text-secondary)]">No users found</div>
                )}
              </div>
            </PNCard>

            {/* Products */}
            <PNCard>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Products ({diagnostic.products.count})
                </h2>
                {diagnostic.products.sample.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {diagnostic.products.sample.map((product, i) => (
                      <div key={i} className="p-2 bg-[var(--cyber-bg-pure)] rounded-cyber-lg">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-[var(--cyber-text-secondary)]">
                          Rp {product.price?.toLocaleString()} - Stock: {product.stock}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--cyber-text-secondary)]">No products found</div>
                )}
              </div>
            </PNCard>

            {/* Reviews */}
            <PNCard>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Reviews ({diagnostic.reviews.count})
                </h2>
                {diagnostic.reviews.sample.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {diagnostic.reviews.sample.map((review, i) => (
                      <div key={i} className="p-2 bg-[var(--cyber-bg-pure)] rounded-cyber-lg">
                        <div className="font-medium">{review.rating}/5 ⭐</div>
                        <div className="text-white/70">{review.comment}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/70">No reviews found</div>
                )}
              </div>
            </PNCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataDiagnosticPage;
