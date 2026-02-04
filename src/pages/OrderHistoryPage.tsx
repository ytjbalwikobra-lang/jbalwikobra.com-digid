import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { AuthRequired } from '../components/ProtectedRoute';
import { useToast } from '../components/Toast';
import { SEOHead, Breadcrumb } from '../components/seo';
// Removed legacy standardClasses helper – using direct utilities

type Order = {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  created_at: string;
  payment_channel?: string | null;
  xendit_invoice_url?: string | null;
};

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      showToast('Database tidak tersedia. Silakan coba lagi nanti.', 'error');
      return;
    }
    
    try {
      setLoading(true);
      // Fetch orders for the current user
      const { data, error } = await supabase
        .from('orders')
        .select('id, amount, status, created_at, payment_channel, xendit_invoice_url')
        .eq('user_id', user.id) // Filter by user_id
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching orders:', error);
        showToast('Gagal memuat riwayat order. Silakan coba lagi.', 'error');
        return;
      }
      
      if (data) {
        setOrders(data as Order[]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast('Terjadi kesalahan saat memuat data. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleRefresh = () => {
    fetchOrders();
  };



  return (
    <AuthRequired>
      <SEOHead
        title="Riwayat Order | JBal WiKobra"
        description="Lihat riwayat pembelian dan status order Anda."
        url="/orders"
      />
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Riwayat Order', href: '/orders' }
        ]}
      />
      <div className="min-h-screen bg-[var(--cyber-bg-pure)]">
        <div className="py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">
                Riwayat Order Saya
                {!loading && orders.length > 0 && (
                  <span className="ml-2 text-sm text-[var(--cyber-text-muted)]">
                    ({orders.length} order)
                  </span>
                )}
              </h1>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 rounded-cyber-lg bg-[var(--cyber-pink-primary)]/10 hover:bg-[var(--cyber-pink-primary)]/20 text-[var(--cyber-pink-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loading ? (
              <div className="bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg p-6">
                <div className="cyber-skeleton h-5 w-48 mb-4"></div>
                <div className="divide-y divide-[var(--cyber-border)]/60">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <div className="cyber-skeleton h-3.5 w-40 mb-2"></div>
                        <div className="cyber-skeleton h-3.5 w-56"></div>
                      </div>
                      <div className="text-right">
                        <div className="cyber-skeleton h-4 w-28 mb-2 ml-auto"></div>
                        <div className="cyber-skeleton h-6 w-20 rounded-md ml-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-[var(--cyber-bg-pure)] border border-[var(--cyber-pink-primary)]/30 rounded-cyber-lg p-6 text-center text-[var(--cyber-text-secondary)]">
                Belum ada order.
              </div>
            ) : (
              <div className="bg-[var(--cyber-bg-pure)] border border-[var(--cyber-pink-primary)]/30 rounded-cyber-lg divide-y divide-[var(--cyber-pink-primary)]/20">
                {orders.map(o => (
                  <div key={o.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[var(--cyber-text-muted)]">{new Date(o.created_at).toLocaleString('id-ID')}</div>
                      <div className="font-mono text-[var(--cyber-text-secondary)]">{o.id}</div>
                      {o.payment_channel && (
                        <div className="text-xs text-[var(--cyber-text-muted)] mt-1">
                          Metode: <span className="capitalize">{o.payment_channel.toLowerCase().replace(/_/g,' ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">Rp {Number(o.amount).toLocaleString('id-ID')}</div>
                      <div className={`text-sm px-2 py-1 rounded ${
                        o.status === 'paid' ? 'bg-green-600 text-white' :
                        o.status === 'pending' ? 'bg-yellow-600 text-white' :
                        o.status === 'completed' ? 'bg-blue-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {o.status === 'paid' ? 'Lunas' :
                         o.status === 'pending' ? 'Menunggu' :
                         o.status === 'completed' ? 'Selesai' :
                         'Dibatalkan'}
                      </div>
                      {o.xendit_invoice_url && o.status === 'pending' && (
                        <a href={o.xendit_invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--cyber-pink-primary)] hover:underline block mt-1">
                          Bayar Sekarang
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthRequired>
  );
};

export default OrderHistoryPage;
