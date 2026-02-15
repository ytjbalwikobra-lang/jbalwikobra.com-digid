/**
 * AdminRentalTrackingPage — Halaman tracking akun yang sedang di-rental
 * Menampilkan daftar rental aktif, status, dan estimasi waktu selesai
 * Bisa diakses oleh semua tipe admin (super_admin & admin_viewer)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Timer,
  Package,
  User,
  Calendar,
  ArrowDownUp,
  Search
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import AdminHeroSection from './components/ui/AdminHeroSection';
import { supabase } from '../../services/supabase';

/** Tipe data rental dari API */
interface RentalOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  product_id: string;
  amount: number;
  rental_duration: string;
  rental_start_date: string;
  rental_end_date: string;
  rental_status: 'active' | 'expiring_soon' | 'expired' | 'returned';
  status: string;
  completed_at: string;
  completed_by: string;
  created_at: string;
}

/** Hitung sisa waktu rental dalam format human-readable */
function getRemainingTime(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Sudah berakhir';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days} hari ${remainHours} jam`;
  }
  return `${hours} jam ${minutes} menit`;
}

/** Hitung progress persentase rental */
function getRentalProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/** Warna badge berdasarkan status rental */
function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Aktif', color: 'var(--admin-success)', bgOpacity: '15', icon: Clock };
    case 'expiring_soon':
      return { label: 'Segera Berakhir', color: 'var(--admin-warning)', bgOpacity: '20', icon: AlertTriangle };
    case 'expired':
      return { label: 'Berakhir', color: 'var(--admin-error)', bgOpacity: '15', icon: Timer };
    case 'returned':
      return { label: 'Dikembalikan', color: 'var(--admin-info)', bgOpacity: '15', icon: CheckCircle };
    default:
      return { label: status, color: 'var(--admin-text-muted)', bgOpacity: '10', icon: Clock };
  }
}

const AdminRentalTrackingPage: React.FC = () => {
  const toast = useToast();
  const [rentals, setRentals] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'end_date' | 'start_date'>('end_date');

  const fetchRentals = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true);
    else setLoading(true);

    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const response = await fetch('/api/admin?action=active-rentals', { headers });
      if (!response.ok) throw new Error('Gagal memuat data rental');

      const json = await response.json();
      setRentals(json.data || []);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal memuat data rental', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  // Realtime subscription — auto-refresh saat rental_status berubah
  useEffect(() => {
    if (!supabase) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('admin-rental-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'order_type=eq.rental'
        },
        (payload) => {
          console.log('[AdminRentalTrackingPage] Rental updated:', payload);
          // Debounce: tunggu 1 detik sebelum refetch untuk menghindari multiple calls
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchRentals(true);
            debounceTimer = null;
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase?.removeChannel(channel);
    };
  }, [fetchRentals]);

  /** Tandai rental dikembalikan */
  const handleMarkReturned = async (orderId: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const response = await fetch('/api/admin?action=mark-rental-returned', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) throw new Error('Gagal update status');
      toast?.showToast('Rental ditandai sebagai dikembalikan', 'success');
      await fetchRentals(true);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal update', 'error');
    }
  };

  // Filter dan sort
  const filteredRentals = rentals
    .filter(r => {
      if (statusFilter !== 'all' && r.rental_status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.customer_name?.toLowerCase().includes(q) ||
          r.product_name?.toLowerCase().includes(q) ||
          r.customer_email?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(sortBy === 'end_date' ? a.rental_end_date : a.rental_start_date).getTime();
      const dateB = new Date(sortBy === 'end_date' ? b.rental_end_date : b.rental_start_date).getTime();
      return dateA - dateB;
    });

  // Statistik ringkas
  const stats = {
    active: rentals.filter(r => r.rental_status === 'active').length,
    expiringSoon: rentals.filter(r => r.rental_status === 'expiring_soon').length,
    expired: rentals.filter(r => r.rental_status === 'expired').length,
    returned: rentals.filter(r => r.rental_status === 'returned').length,
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      <AdminHeroSection
        title="Rental Tracking"
        subtitle="Monitor akun yang sedang di-rental dan estimasi pengembalian"
        badge="RENTAL"
        badgeColor="pink"
      />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistik ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Aktif', value: stats.active, color: 'var(--admin-success)', icon: Clock },
            { label: 'Segera Berakhir', value: stats.expiringSoon, color: 'var(--admin-warning)', icon: AlertTriangle },
            { label: 'Berakhir', value: stats.expired, color: 'var(--admin-error)', icon: Timer },
            { label: 'Dikembalikan', value: stats.returned, color: 'var(--admin-info)', icon: CheckCircle },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--admin-text)]">{stat.value}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar: search, filter, sort, refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Pencarian */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari pelanggan atau produk..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] transition-colors"
            />
          </div>

          {/* Filter status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="expiring_soon">Segera Berakhir</option>
            <option value="expired">Berakhir</option>
            <option value="returned">Dikembalikan</option>
          </select>

          {/* Sort */}
          <button
            onClick={() => setSortBy(prev => prev === 'end_date' ? 'start_date' : 'end_date')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)] transition-colors"
            title={`Sort: ${sortBy === 'end_date' ? 'Tanggal berakhir' : 'Tanggal mulai'}`}
          >
            <ArrowDownUp className="w-4 h-4" />
            <span className="hidden sm:inline">{sortBy === 'end_date' ? 'Berakhir' : 'Mulai'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchRentals(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[var(--admin-accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Daftar rental */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-white/10" />
                    <div className="h-3 w-32 rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl p-12 text-center">
            <Package className="w-12 h-12 text-[var(--admin-text-muted)] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--admin-text)] mb-1">
              {searchTerm || statusFilter !== 'all' ? 'Tidak ada hasil' : 'Belum ada rental aktif'}
            </h3>
            <p className="text-sm text-[var(--admin-text-muted)]">
              {searchTerm || statusFilter !== 'all'
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Rental akan muncul di sini setelah admin mengkonfirmasi pesanan rental selesai diproses'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRentals.map(rental => {
              const statusConf = getStatusConfig(rental.rental_status);
              const StatusIcon = statusConf.icon;
              const progress = getRentalProgress(rental.rental_start_date, rental.rental_end_date);
              const remaining = getRemainingTime(rental.rental_end_date);

              return (
                <div
                  key={rental.id}
                  className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl p-4 hover:border-[var(--admin-border-light)] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info produk */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${statusConf.color} 15%, transparent)` }}
                      >
                        <StatusIcon className="w-5 h-5" style={{ color: statusConf.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-[var(--admin-text)] truncate">
                            {rental.product_name || 'Produk'}
                          </h4>
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase shrink-0"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${statusConf.color} ${statusConf.bgOpacity}%, transparent)`,
                              color: statusConf.color
                            }}
                          >
                            {statusConf.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--admin-text-muted)]">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {rental.customer_name || rental.customer_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {rental.rental_duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress dan waktu */}
                    <div className="flex items-center gap-4 sm:w-auto">
                      <div className="flex-1 sm:w-48">
                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: progress > 90 ? 'var(--admin-error)' : progress > 75 ? 'var(--admin-warning)' : 'var(--admin-success)'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--admin-text-muted)]">
                          <span>{formatDate(rental.rental_start_date)}</span>
                          <span className="font-medium" style={{ color: statusConf.color }}>{remaining}</span>
                        </div>
                      </div>

                      {/* Tombol aksi */}
                      {(rental.rental_status === 'expired' || rental.rental_status === 'active' || rental.rental_status === 'expiring_soon') && (
                        <button
                          onClick={() => handleMarkReturned(rental.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--admin-info)]/15 text-[var(--admin-info)] text-xs font-medium hover:bg-[var(--admin-info)]/25 active:scale-95 transition-all touch-manipulation shrink-0"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Dikembalikan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminRentalTrackingPage;
