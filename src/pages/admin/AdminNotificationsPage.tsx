/**
 * AdminNotificationsPage.tsx
 * 
 * Full-page notification center for admin panel.
 * Replaces the dropdown panel with a proper page following admin design system.
 * 
 * Copywriting Hierarchy:
 * - Badge row: Type label (Pesanan Baru/Pembayaran/etc.) + Order type (RENTAL/PURCHASE) + Status (Paid/Pending)
 * - Line 1: Customer name (bold, primary)
 * - Line 2: Product name + Amount (secondary)
 * - Line 3: Timestamp relative + absolute (muted)
 * - Colors: Per notification type via getNotificationStyle()
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  RefreshCw,
  Check,
  Trash2,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/helpers';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { useToast } from '../../components/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
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

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'unread', label: 'Belum Dibaca' },
  { value: 'orders', label: 'Pesanan' },
  { value: 'payments', label: 'Pembayaran' },
  { value: 'system', label: 'Sistem' },
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
    return [
      { label: 'Total', value: notifications.length, icon: <Bell size={16} className="text-[var(--cyber-pink-primary)]" /> },
      { label: 'Belum Dibaca', value: unreadCount, icon: <CheckCheck size={16} className="text-[var(--cyber-pink-primary)]" /> },
      { label: 'Pesanan', value: orderCount, icon: <Filter size={16} className="text-[var(--cyber-pink-primary)]" /> },
      { label: 'Pembayaran', value: paymentCount, icon: <Check size={16} className="text-[var(--cyber-pink-primary)]" /> },
    ];
  }, [notifications, unreadCount]);

  const handleNotificationClick = useCallback((notification: AdminNotificationData) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.order_id && isOrderNotification(notification)) {
      navigate(`/admin/orders/${notification.order_id}`);
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
    <div className="admin-page space-y-4">
      {/* Hero */}
      <AdminHeroSection
        title="Notifikasi"
        subtitle={`${unreadCount} belum dibaca dari ${notifications.length} notifikasi`}
        badge={unreadCount > 0 ? `${unreadCount} Baru` : 'Terbaca'}
        badgeColor={unreadCount > 0 ? 'pink' : 'success'}
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari nama customer, produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-9 pr-3 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg text-base sm:text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <AdminButton variant="secondary" size="sm" onClick={handleMarkAllRead} icon={<CheckCheck size={14} />}>
                Tandai Terbaca
              </AdminButton>
            )}
            {selectedIds.size > 0 && (
              <AdminButton variant="secondary" size="sm" onClick={handleBulkDelete} icon={<Trash2 size={14} />}>
                Hapus ({selectedIds.size})
              </AdminButton>
            )}
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => refresh()}
              disabled={loading}
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </AdminHeroSection>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <AdminBentoMetricCard key={i} label={m.label} value={m.value} icon={m.icon} />
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all duration-200 border',
              filter === opt.value
                ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-lg shadow-[var(--admin-accent)]/30'
                : 'bg-[var(--admin-bg-card)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:bg-[var(--admin-bg-elevated)] hover:text-[var(--admin-text)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <AdminLoadingState variant="skeleton-cards" cards={6} />
      ) : filteredNotifications.length === 0 ? (
        <AdminEmptyState
          icon={<Bell className="w-12 h-12" />}
          title={debouncedSearch ? 'Tidak Ada Hasil' : filter === 'unread' ? 'Semua Sudah Terbaca' : 'Belum Ada Notifikasi'}
          description={debouncedSearch ? 'Coba kata kunci lain' : 'Notifikasi akan muncul saat ada aktivitas'}
          hasFilters={!!debouncedSearch || filter !== 'all'}
        />
      ) : (
        <>
          <div className="space-y-2">
            {paginatedNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const orderBadge = isOrderNotification(notification) ? getOrderTypeLabel(notification) : null;
              const statusBadge = isOrderNotification(notification) ? getStatusBadge(notification) : null;
              const typeLabel = getNotificationTypeLabel(notification.type);
              const isSelected = selectedIds.has(notification.id);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'group relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200',
                    notification.order_id && 'cursor-pointer',
                    !notification.is_read
                      ? `bg-gradient-to-r ${style.gradient} ${style.border}`
                      : 'bg-[var(--admin-bg-card)]/30 border-[var(--admin-border)]',
                    isSelected && 'ring-1 ring-[var(--admin-accent)]/50',
                    'hover:bg-[var(--admin-bg-elevated)]'
                  )}
                >
                  {/* Select checkbox */}
                  <button
                    onClick={(e) => toggleSelect(e, notification.id)}
                    className={cn(
                      'flex-shrink-0 w-8 h-8 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all duration-200 mt-0.5',
                      isSelected
                        ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)]'
                        : 'border-[var(--admin-border-lighter)] hover:border-[var(--admin-text-tertiary)] bg-transparent'
                    )}
                    aria-label="Select"
                  >
                    {isSelected && <Check size={10} className="text-white" />}
                  </button>

                  {/* Type-colored Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform',
                    !notification.is_read ? style.icon : 'bg-[var(--admin-bg-elevated)]',
                    'group-hover:scale-105'
                  )}>
                    {React.cloneElement(getNotificationIcon(notification.type) as React.ReactElement, {
                      size: 18,
                      className: !notification.is_read ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'
                    })}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'px-2 py-0.5 text-[9px] font-bold rounded uppercase border leading-none',
                        !notification.is_read ? style.badge : 'bg-[var(--admin-bg-card)] text-[var(--admin-text-muted)] border-[var(--admin-border)]'
                      )}>
                        {typeLabel}
                      </span>
                      {orderBadge && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-[var(--admin-accent-light)] bg-[var(--admin-accent-subtle)] rounded border border-[var(--admin-accent)]/25 uppercase leading-none">
                          {orderBadge}
                        </span>
                      )}
                      {statusBadge && (
                        <span
                          className="px-2 py-0.5 text-[9px] font-bold rounded border uppercase leading-none"
                          style={{
                            color: statusBadge.color,
                            backgroundColor: statusBadge.bg,
                            borderColor: `${statusBadge.color}30`,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      )}
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] flex-shrink-0 animate-pulse" />
                      )}
                    </div>

                    {/* Customer name */}
                    <p className={cn(
                      'text-sm font-semibold leading-tight',
                      !notification.is_read ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-secondary)]'
                    )}>
                      {notification.customer_name || notification.title}
                    </p>

                    {/* Product + Amount */}
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn(
                        'text-xs leading-tight line-clamp-1',
                        !notification.is_read ? 'text-[var(--admin-text-secondary)]' : 'text-[var(--admin-text-tertiary)]'
                      )}>
                        {notification.product_name || notification.message}
                      </p>
                      {notification.amount != null && notification.amount > 0 && (
                        <span className={cn(
                          'text-xs font-bold whitespace-nowrap flex-shrink-0',
                          !notification.is_read ? 'text-[var(--admin-success)]' : 'text-[var(--admin-success)]/50'
                        )}>
                          {formatCurrency(notification.amount)}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-[10px] text-[var(--admin-text-muted)]">
                      {formatRelativeTime(notification.created_at)}
                      <span className="mx-1.5 text-[var(--admin-text-disabled)]">·</span>
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                        className="p-2.5 rounded-lg bg-[var(--admin-bg-card)] hover:bg-[var(--admin-success-bg)] border border-[var(--admin-border)] hover:border-[var(--admin-success-border)] transition-all touch-manipulation active:scale-95"
                        aria-label="Tandai terbaca"
                        title="Tandai terbaca"
                      >
                        <Check size={16} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-success)]" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-2.5 rounded-lg bg-[var(--admin-bg-card)] hover:bg-[var(--admin-accent)]/20 border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/30 transition-all touch-manipulation active:scale-95"
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      <Trash2 size={16} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-light)]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredNotifications.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AdminNotificationsPage;
