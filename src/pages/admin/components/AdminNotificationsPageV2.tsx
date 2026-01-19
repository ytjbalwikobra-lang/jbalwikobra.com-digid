import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  RefreshCw, 
  Check, 
  CheckCheck,
  Search,
  Clock,
  AlertCircle
} from 'lucide-react';
import { adminNotificationService, AdminNotification } from '../../../services/adminNotificationService';
import { NotificationSkeleton } from './NotificationSkeleton';
import { 
  getNotificationIcon, 
  getNotificationStyle, 
  getNotificationTypeLabel, 
  formatNotificationTime 
} from '../utils/notificationUtils';
import { useRetry } from '../utils/useRetry';
import { formatCurrency } from '../../../utils/helpers';

const cn = (...c: any[]) => c.filter(Boolean).join(' ');

interface NotificationItem extends AdminNotification {
  _localRead?: boolean;
}

export const AdminNotificationsPageV2: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Retry hook for failed operations
  const { executeWithRetry } = useRetry({
    maxRetries: 3,
    initialDelay: 1000,
    onMaxRetriesReached: () => {
      setLoadError('Gagal memuat notifikasi setelah beberapa percobaan');
    }
  });

  // Load notifications with retry
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await executeWithRetry(
        async () => adminNotificationService.getAdminNotifications(100),
        'Load Notifications'
      );
      if (data) {
        setNotifications(data.map(n => ({ ...n, _localRead: n.is_read })));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoadError('Gagal memuat notifikasi. Klik untuk mencoba lagi.');
    } finally {
      setLoading(false);
    }
  }, [executeWithRetry]);

  useEffect(() => {
    loadNotifications();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, _localRead: true, is_read: true } : n)
    );
    
    try {
      await adminNotificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      // Revert on error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, _localRead: false, is_read: false } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n._localRead).map(n => n.id);
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => ({ ...n, _localRead: true, is_read: true }))
    );
    
    try {
      await Promise.all(unreadIds.map(id => adminNotificationService.markAsRead(id)));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      await loadNotifications(); // Reload on error
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'read' && notif._localRead) ||
      (filter === 'unread' && !notif._localRead);
    
    const matchesType = typeFilter === 'all' || notif.type === typeFilter;
    
    const matchesSearch = !searchTerm || 
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesType && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n._localRead).length;
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    today: notifications.filter(n => {
      const today = new Date().setHours(0, 0, 0, 0);
      const nDate = new Date(n.created_at).setHours(0, 0, 0, 0);
      return nDate === today;
    }).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-lg" aria-hidden="true">
              <Bell className="w-8 h-8 text-white" />
            </div>
            Admin Notifications
          </h1>
          <p className="text-gray-400 mt-2" aria-live="polite">
            {unreadCount > 0 
              ? `Kamu punya ${unreadCount} notifikasi yang belum dibaca` 
              : 'Semua notifikasi sudah dibaca! 🎉'}
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4" role="group" aria-label="Statistik notifikasi">
          <div className="px-6 py-3 rounded-2xl bg-black/40 border border-gray-700/50 backdrop-blur-sm">
            <div className="text-xs text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-white" aria-label={`Total ${stats.total} notifikasi`}>{stats.total}</div>
          </div>
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-br from-pink-500/10 to-fuchsia-500/10 border border-pink-500/30 backdrop-blur-sm">
            <div className="text-xs text-pink-300 mb-1">Belum Dibaca</div>
            <div className="text-2xl font-bold text-pink-400">{stats.unread}</div>
          </div>
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 backdrop-blur-sm">
            <div className="text-xs text-blue-300 mb-1">Hari Ini</div>
            <div className="text-2xl font-bold text-blue-400">{stats.today}</div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-black/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Search */}
          <div className="lg:col-span-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Cari notifikasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Cari notifikasi"
                className="w-full pl-12 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              aria-label="Filter berdasarkan status"
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter berdasarkan tipe notifikasi"
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
            >
              <option value="all">Semua Tipe</option>
              <option value="new_order">Pesanan Baru</option>
              <option value="paid_order">Pembayaran</option>
              <option value="new_user">Pengguna Baru</option>
              <option value="order_cancelled">Dibatalkan</option>
              <option value="new_review">Review</option>
            </select>
          </div>

          {/* Actions */}
          <div className="lg:col-span-4 flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={refreshing ? 'Sedang memuat ulang notifikasi' : 'Muat ulang notifikasi'}
              className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-gray-700 text-white hover:bg-gray-800/50 hover:border-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} aria-hidden="true" />
              Refresh
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                aria-label={`Tandai semua ${unreadCount} notifikasi sebagai sudah dibaca`}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-medium hover:from-pink-600 hover:to-fuchsia-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                <CheckCheck className="w-4 h-4" aria-hidden="true" />
                Tandai Semua
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3" role="region" aria-label="Daftar notifikasi" aria-live="polite">
        {loading ? (
          <NotificationSkeleton count={5} variant="page" />
        ) : loadError ? (
          /* Error State with Retry */
          <div className="text-center py-16 bg-red-500/10 border border-red-500/30 rounded-2xl" role="alert">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" aria-hidden="true" />
            <h3 className="text-xl font-bold text-white mb-2">Gagal Memuat Notifikasi</h3>
            <p className="text-red-300 mb-6">{loadError}</p>
            <button
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-500 text-white font-semibold hover:bg-pink-600 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Coba muat ulang notifikasi"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              Coba Lagi
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-black/20 border border-gray-800 rounded-2xl">
            <Bell className="w-16 h-16 mx-auto text-gray-600 mb-4" aria-hidden="true" />
            <h3 className="text-xl font-bold text-white mb-2">Tidak Ada Notifikasi</h3>
            <p className="text-gray-400">
              {searchTerm || filter !== 'all' || typeFilter !== 'all'
                ? 'Tidak ada notifikasi yang sesuai dengan filter.'
                : 'Kamu sudah membaca semua notifikasi!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const style = getNotificationStyle(notification.type);
            const isUnread = !notification._localRead;
            
            return (
              <article
                key={notification.id}
                role="article"
                aria-label={`${isUnread ? 'Belum dibaca: ' : ''}${notification.title} - ${getNotificationTypeLabel(notification.type)}`}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300',
                  'hover:scale-[1.01] hover:shadow-2xl',
                  isUnread 
                    ? `bg-gradient-to-br ${style.gradient} ${style.border} shadow-lg`
                    : 'bg-black/20 border-gray-800 hover:bg-black/30'
                )}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110',
                      style.icon
                    )} aria-hidden="true">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={cn(
                              'text-lg font-bold',
                              isUnread ? 'text-white' : 'text-gray-400'
                            )}>
                              {notification.title}
                            </h3>
                            <span className={cn(
                              'px-2 py-0.5 rounded-lg text-xs font-medium border',
                              style.badge
                            )}>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            <time dateTime={notification.created_at}>{formatNotificationTime(notification.created_at)}</time>
                          </div>
                        </div>
                        
                        {isUnread && (
                          <div className="w-3 h-3 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50 animate-pulse" />
                        )}
                      </div>
                      
                      <p className={cn(
                        'text-sm leading-relaxed mb-4',
                        isUnread ? 'text-gray-300' : 'text-gray-500'
                      )}>
                        {notification.message}
                      </p>

                      {/* Meta Info */}
                      {(notification.customer_name || notification.product_name || notification.amount) && (
                        <div className="flex flex-wrap gap-3 mb-4">
                          {notification.customer_name && (
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-xs text-gray-400">Customer: </span>
                              <span className="text-xs text-white font-medium">{notification.customer_name}</span>
                            </div>
                          )}
                          {notification.product_name && (
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-xs text-gray-400">Produk: </span>
                              <span className="text-xs text-white font-medium">{notification.product_name}</span>
                            </div>
                          )}
                          {notification.amount && (
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-xs text-gray-400">Jumlah: </span>
                              <span className="text-xs text-emerald-400 font-bold">
                                {formatCurrency(notification.amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {isUnread && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          aria-label={`Tandai notifikasi ${notification.title} sebagai sudah dibaca`}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                          Tandai Sudah Dibaca
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPageV2;
