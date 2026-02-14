/**
 * AdminActivityLogPage — Halaman log aktivitas admin
 * Hanya bisa diakses oleh super_admin
 * Menampilkan audit trail semua aksi admin
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Package,
  Users,
  MessageSquare,
  Clock,
  Settings
} from 'lucide-react';
import AdminHeroSection from './components/ui/AdminHeroSection';

/** Tipe data activity log */
interface ActivityLog {
  id: string;
  admin_id: string;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/** Konfigurasi tampilan per tipe aksi */
function getActionConfig(action: string) {
  switch (action) {
    case 'order_completed':
      return { label: 'Order Selesai', color: 'var(--admin-success)', icon: ShoppingCart };
    case 'order_status_changed':
      return { label: 'Status Order Berubah', color: 'var(--admin-info)', icon: ShoppingCart };
    case 'rental_activated':
      return { label: 'Rental Diaktifkan', color: 'var(--admin-accent)', icon: Clock };
    case 'rental_returned':
      return { label: 'Rental Dikembalikan', color: 'var(--admin-info)', icon: Clock };
    case 'product_updated':
      return { label: 'Produk Diperbarui', color: 'var(--admin-warning)', icon: Package };
    case 'product_created':
      return { label: 'Produk Dibuat', color: 'var(--admin-success)', icon: Package };
    case 'chat_assigned':
      return { label: 'Chat Ditangani', color: 'var(--admin-purple)', icon: MessageSquare };
    case 'user_updated':
      return { label: 'User Diperbarui', color: 'var(--admin-orange)', icon: Users };
    case 'settings_updated':
      return { label: 'Pengaturan Diubah', color: 'var(--admin-warning)', icon: Settings };
    default:
      return { label: action.replace(/_/g, ' '), color: 'var(--admin-text-muted)', icon: Activity };
  }
}

/** Konfigurasi per tipe entitas */
function getEntityConfig(entityType: string) {
  switch (entityType) {
    case 'order': return { label: 'Order', icon: ShoppingCart };
    case 'product': return { label: 'Produk', icon: Package };
    case 'user': return { label: 'User', icon: Users };
    case 'chat': return { label: 'Chat', icon: MessageSquare };
    case 'rental': return { label: 'Rental', icon: Clock };
    case 'settings': return { label: 'Settings', icon: Settings };
    default: return { label: entityType, icon: Activity };
  }
}

const ENTITY_TYPES = [
  { value: '', label: 'Semua' },
  { value: 'order', label: 'Order' },
  { value: 'rental', label: 'Rental' },
  { value: 'product', label: 'Produk' },
  { value: 'chat', label: 'Chat' },
  { value: 'user', label: 'User' },
  { value: 'settings', label: 'Settings' },
];

const AdminActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [entityFilter, setEntityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const params = new URLSearchParams({
        action: 'activity-logs',
        page: String(page),
        limit: String(limit),
      });
      if (entityFilter) params.set('entityType', entityFilter);

      const response = await fetch(`/api/admin?${params.toString()}`, { headers });
      if (!response.ok) throw new Error('Gagal memuat log');

      const json = await response.json();
      setLogs(json.data || []);
      setTotalCount(json.count || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / limit);

  /** Format waktu relatif sederhana */
  const formatTime = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  /** Render detail dari JSONB */
  const renderDetails = (details: Record<string, unknown>) => {
    if (!details || Object.keys(details).length === 0) return null;
    const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entries.slice(0, 5).map(([key, val]) => (
          <span
            key={key}
            className="px-2 py-0.5 text-[10px] rounded bg-[var(--admin-bg-surface)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border)]"
          >
            {key.replace(/_/g, ' ')}: <span className="text-[var(--admin-text-secondary)]">{String(val)}</span>
          </span>
        ))}
      </div>
    );
  };

  // Filter berdasarkan search term (client-side untuk nama admin)
  const filteredLogs = searchTerm
    ? logs.filter(l =>
        l.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  return (
    <>
      <AdminHeroSection
        title="Activity Log"
        subtitle="Audit trail aktivitas admin — hanya super admin"
        badge="AUDIT"
        badgeColor="info"
      />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari admin atau aksi..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--admin-text-muted)] shrink-0" />
            <select
              value={entityFilter}
              onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
            >
              {ENTITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[var(--admin-accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tabel log */}
        <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-48 rounded bg-white/10" />
                    <div className="h-3 w-32 rounded bg-white/10" />
                  </div>
                  <div className="h-3 w-20 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-[var(--admin-text-muted)] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[var(--admin-text)] mb-1">Belum ada aktivitas</h3>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Log aktivitas admin akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {filteredLogs.map(log => {
                const actionConf = getActionConfig(log.action);
                const entityConf = getEntityConfig(log.entity_type);
                const ActionIcon = actionConf.icon;

                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-[var(--admin-bg-surface)] transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Ikon aksi */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `color-mix(in srgb, ${actionConf.color} 15%, transparent)` }}
                      >
                        <ActionIcon className="w-4 h-4" style={{ color: actionConf.color }} />
                      </div>

                      {/* Konten */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--admin-text)]">
                            {log.admin_name || log.admin_email || 'System'}
                          </span>
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${actionConf.color} 15%, transparent)`,
                              color: actionConf.color
                            }}
                          >
                            {actionConf.label}
                          </span>
                          {log.entity_id && (
                            <span className="text-[10px] text-[var(--admin-text-muted)] font-mono">
                              {entityConf.label}: {log.entity_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        {renderDetails(log.details)}
                      </div>

                      {/* Waktu */}
                      <span className="text-[11px] text-[var(--admin-text-muted)] whitespace-nowrap shrink-0">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--admin-text-muted)]">
              Menampilkan {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} dari {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-[var(--admin-bg-card)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-surface)] disabled:opacity-30 transition-colors touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--admin-text-secondary)]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-[var(--admin-bg-card)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-surface)] disabled:opacity-30 transition-colors touch-manipulation"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminActivityLogPage;
