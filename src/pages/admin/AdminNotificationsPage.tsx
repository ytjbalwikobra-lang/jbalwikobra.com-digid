/**
 * AdminNotificationsPage.tsx
 * 
 * Pusat notifikasi admin — Cyber Compact Design System V3.
 * Layout bersih: header + metric pills + filter + list cards.
 * Menggunakan token --admin-* dari cyber-compact.css.
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  RefreshCw,
  Check,
  Trash2,
  CheckCheck,
  ChevronRight,
  Package,
  CreditCard,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/helpers';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { useToast } from '../../components/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { AdminPagination } from './components/AdminPagination';
import {
  getNotificationIcon,
  getNotificationStyle,
  getNotificationTypeLabel,
  formatNotificationTime,
  formatRelativeTime,
  isOrderNotification,
  getOrderTypeLabel,
  getStatusBadge,
  type AdminNotificationData,
} from './utils/notificationUtils';

type FilterType = 'all' | 'unread' | 'orders' | 'payments' | 'system';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Semua', icon: <Bell size={13} /> },
  { value: 'unread', label: 'Belum Dibaca', icon: <CheckCheck size={13} /> },
  { value: 'orders', label: 'Pesanan', icon: <Package size={13} /> },
  { value: 'payments', label: 'Pembayaran', icon: <CreditCard size={13} /> },
  { value: 'system', label: 'Sistem', icon: <Bell size={13} /> },
];

const AdminNotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useAdminRealtimeNotifications({ limit: 100 });

  const navigate = useNavigate();
  const toast = useToast();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    switch (filter) {
      case 'unread':
        result = result.filter(n => !n.is_read);
        break;
      case 'orders':
        result = result.filter(n => ['new_order', 'new_rent'].includes(n.type));
        break;
      case 'payments':
        result = result.filter(n => ['paid_order', 'paid_rent'].includes(n.type));
        break;
      case 'system':
        result = result.filter(n => ['system', 'new_user', 'new_review', 'order_cancelled'].includes(n.type));
        break;
    }

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(n =>
        n.customer_name?.toLowerCase().includes(term) ||
        n.product_name?.toLowerCase().includes(term) ||
        n.title?.toLowerCase().includes(term) ||
        n.message?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [notifications, filter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(start, start + itemsPerPage);
  }, [filteredNotifications, currentPage, itemsPerPage]);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch, itemsPerPage]);

  // Metrics
  const metrics = useMemo(() => {
    const orderCount = notifications.filter(n => ['new_order', 'new_rent'].includes(n.type)).length;
    const paymentCount = notifications.filter(n => ['paid_order', 'paid_rent'].includes(n.type)).length;
    return { total: notifications.length, unread: unreadCount, orders: orderCount, payments: paymentCount };
  }, [notifications, unreadCount]);

  const handleNotificationClick = useCallback((notification: AdminNotificationData) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.order_id && isOrderNotification(notification)) {
      // Gunakan state { ts } agar React Router selalu re-render walau path sama
      navigate(`/admin/orders/${notification.order_id}`, { state: { ts: Date.now() } });
    }
  }, [navigate, markAsRead]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.showToast('Notifikasi dihapus', 'success');
    } catch {
      toast.showToast('Gagal menghapus', 'error');
    }
  }, [deleteNotification, toast]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      toast.showToast('Semua notifikasi ditandai terbaca', 'success');
    } catch {
      toast.showToast('Gagal menandai terbaca', 'error');
    }
  }, [markAllAsRead, toast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteNotification(id)));
      setSelectedIds(new Set());
      toast.showToast(`${count} notifikasi dihapus`, 'success');
    } catch {
      toast.showToast('Gagal menghapus notifikasi', 'error');
    }
  }, [selectedIds, deleteNotification, toast]);

  const toggleSelect = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--admin-text)]">Notifikasi</h1>
            <p className="text-sm text-[var(--admin-text-secondary)] mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} belum dibaca dari ${notifications.length} notifikasi`
                : `${notifications.length} notifikasi`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg hover:bg-[var(--admin-bg-elevated)] transition-colors"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Tandai Semua Terbaca</span>
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--admin-error)] bg-[var(--admin-error-bg)] border border-[var(--admin-error-border)] rounded-lg hover:brightness-125 transition-colors"
              >
                <Trash2 size={14} />
                <span>Hapus ({selectedIds.size})</span>
              </button>
            )}
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-2 text-[var(--admin-text-muted)] bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg hover:bg-[var(--admin-bg-elevated)] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Metric pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <MetricPill label="Total" value={metrics.total} />
          <MetricPill label="Belum Dibaca" value={metrics.unread} accent />
          <MetricPill label="Pesanan" value={metrics.orders} />
          <MetricPill label="Pembayaran" value={metrics.payments} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari nama, produk, pesan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-base sm:text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all border',
                filter === opt.value
                  ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]'
                  : 'bg-[var(--admin-bg-card)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:bg-[var(--admin-bg-elevated)]'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-[var(--admin-bg-card)] border border-[var(--admin-border)] animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full bg-[var(--admin-bg-elevated)] flex items-center justify-center">
            <Bell size={24} className="text-[var(--admin-text-muted)]" />
          </div>
          <p className="text-sm text-[var(--admin-text-muted)]">
            {debouncedSearch ? 'Tidak ada hasil pencarian' : filter === 'unread' ? 'Semua sudah terbaca' : 'Belum ada notifikasi'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {paginatedNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const orderBadge = isOrderNotification(notification) ? getOrderTypeLabel(notification) : null;
              const statusBadge = isOrderNotification(notification) ? getStatusBadge(notification) : null;
              const typeLabel = getNotificationTypeLabel(notification.type);
              const isSelected = selectedIds.has(notification.id);
              const isClickable = notification.order_id && isOrderNotification(notification);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-150',
                    isClickable && 'cursor-pointer',
                    !notification.is_read
                      ? 'bg-[var(--admin-bg-card)] border-[var(--admin-border)] border-l-2 border-l-[var(--admin-accent)]'
                      : 'bg-[var(--admin-bg-card)]/40 border-[var(--admin-border)]/50',
                    isSelected && 'ring-1 ring-[var(--admin-accent)]/40',
                    'hover:bg-[var(--admin-bg-elevated)]'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelect(e, notification.id)}
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all mt-0.5',
                      isSelected
                        ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)]'
                        : 'border-[var(--admin-border)] hover:border-[var(--admin-text-tertiary)]'
                    )}
                  >
                    {isSelected && <Check size={10} className="text-white" />}
                  </button>

                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                    !notification.is_read ? style.icon : 'bg-[var(--admin-bg-elevated)]',
                  )}>
                    {React.cloneElement(getNotificationIcon(notification.type) as React.ReactElement, {
                      size: 16,
                      className: !notification.is_read ? 'text-white' : 'text-[var(--admin-text-muted)]'
                    })}
                  </div>

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    {/* Baris pertama: badge + waktu */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'px-1.5 py-0.5 text-[9px] font-bold rounded uppercase leading-none',
                          !notification.is_read ? style.badge : 'bg-[var(--admin-bg-elevated)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]'
                        )}>
                          {typeLabel}
                        </span>
                        {orderBadge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-subtle)] rounded uppercase leading-none">
                            {orderBadge}
                          </span>
                        )}
                        {statusBadge && (
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase leading-none"
                            style={{ color: statusBadge.color, backgroundColor: statusBadge.bg }}
                          >
                            {statusBadge.label}
                          </span>
                        )}
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--admin-text-muted)] whitespace-nowrap flex-shrink-0">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>

                    {/* Baris kedua: customer name */}
                    <p className={cn(
                      'text-[13px] font-semibold leading-tight truncate',
                      !notification.is_read ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-secondary)]'
                    )}>
                      {notification.customer_name || notification.title}
                    </p>

                    {/* Baris ketiga: produk + amount */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                        {notification.product_name || notification.message}
                      </p>
                      {notification.amount != null && notification.amount > 0 && (
                        <span className={cn(
                          'text-[11px] font-bold whitespace-nowrap flex-shrink-0',
                          !notification.is_read ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text-muted)]'
                        )}>
                          {formatCurrency(notification.amount)}
                        </span>
                      )}
                    </div>

                    {/* Baris keempat: waktu lengkap */}
                    <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Aksi hover */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--admin-success-bg)] transition-colors"
                        title="Tandai terbaca"
                      >
                        <Check size={14} className="text-[var(--admin-text-muted)]" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--admin-error-bg)] transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={14} className="text-[var(--admin-text-muted)]" />
                    </button>
                    {isClickable && (
                      <ChevronRight size={14} className="text-[var(--admin-text-muted)]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredNotifications.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

/** Pill kecil untuk metrik ringkasan */
const MetricPill: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={cn(
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs',
    accent && value > 0
      ? 'bg-[var(--admin-accent-subtle)] border-[var(--admin-accent)]/20 text-[var(--admin-accent)]'
      : 'bg-[var(--admin-bg-card)] border-[var(--admin-border)] text-[var(--admin-text-secondary)]'
  )}>
    <span className="font-bold">{value}</span>
    <span className="text-[var(--admin-text-muted)]">{label}</span>
  </div>
);

export default AdminNotificationsPage;
