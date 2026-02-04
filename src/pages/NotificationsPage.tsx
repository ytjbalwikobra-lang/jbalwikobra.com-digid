import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, X, Settings } from 'lucide-react';
import { PNCard, PNButton } from '../components/ui/CyberDesignSystem';
import { PageWrapper, ConsistentLayout } from '../components/layout/ConsistentLayout';
import { notificationService, AppNotification } from '../services/notificationService';
import { getAuthUserId } from '../services/authService';

type NotificationType = 'order' | 'payment' | 'system' | 'promo' | 'product' | 'feed_post';
interface NotificationUI {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'order' | 'promo'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const mapToUI = (n: AppNotification): NotificationUI => ({
    id: n.id,
    type: (n.type as NotificationType) || 'system',
    title: n.title,
    message: n.body || '',
    timestamp: n.created_at,
    isRead: n.is_read,
    actionUrl: n.link_url || undefined
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const uid = await getAuthUserId();
      const latest = await notificationService.getLatest(20, uid);
            const mappedNotifications = latest.map(mapToUI);
            setNotifications(mappedNotifications);
    } catch (error) {
      console.error('❌ NotificationsPage: Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const uid = await getAuthUserId();
      await notificationService.markAsRead(id, uid);
      await loadNotifications();
    } catch (e) {
      console.error('❌ NotificationsPage: markAsRead failed for notification:', id, e);
      // Optimistic fallback
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const markAllAsRead = async () => {
    try {
      const uid = await getAuthUserId();
            
      await notificationService.markAllAsRead(uid);
      
      await loadNotifications();
    } catch (e) {
      console.error('❌ NotificationsPage: markAllAsRead failed:', e);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'order') return notif.type === 'order' || notif.type === 'payment';
    if (filter === 'promo') return notif.type === 'promo';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: NotificationUI['type']) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'payment':
        return '💰';
      case 'promo':
        return '🎉';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: NotificationUI['type']) => {
    switch (type) {
      case 'order':
        return 'border-l-[var(--cyber-blue)]';
      case 'payment':
        return 'border-l-[var(--cyber-green)]';
      case 'promo':
        return 'border-l-[var(--cyber-pink-primary)]';
      case 'system':
        return 'border-l-[var(--cyber-border)]';
      default:
        return 'border-l-[var(--cyber-border)]';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    return `${days} hari yang lalu`;
  };

  if (loading) {
    return (
      <PageWrapper>
        <ConsistentLayout>
          <div className="space-y-4">
            <div className="cyber-skeleton h-8 w-48"></div>
            {Array.from({ length: 5 }).map((_, i) => (
              <PNCard key={i}>
                <div className="p-4 space-y-3">
                  <div className="cyber-skeleton h-5 w-3/4"></div>
                  <div className="cyber-skeleton h-4 w-full"></div>
                  <div className="cyber-skeleton h-3 w-1/3"></div>
                </div>
              </PNCard>
            ))}
          </div>
        </ConsistentLayout>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ConsistentLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Bell className="w-6 h-6 mr-3" />
                Notifikasi
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-[var(--cyber-text-secondary)] mt-1">
                Kelola semua notifikasi Anda di sini
              </p>
            </div>
            
            {unreadCount > 0 && (
              <PNButton
                variant="secondary"
                onClick={markAllAsRead}
                className="flex items-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Tandai Semua Dibaca
              </PNButton>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'unread', label: 'Belum Dibaca' },
              { key: 'order', label: 'Pesanan' },
              { key: 'promo', label: 'Promo' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-4 py-2 rounded-cyber-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-[var(--cyber-pink-primary)] text-white'
                    : 'bg-[var(--cyber-bg-pure)] text-white hover:bg-[var(--cyber-bg-card)]'
                }`}
              >
                {tab.label}
                {tab.key === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <PNCard>
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-[var(--cyber-text-secondary)] mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Tidak ada notifikasi
                  </h3>
                  <p className="text-[var(--cyber-text-secondary)]">
                    {filter === 'unread' 
                      ? 'Semua notifikasi sudah dibaca'
                      : 'Belum ada notifikasi untuk kategori ini'
                    }
                  </p>
                </div>
              </PNCard>
            ) : (
              filteredNotifications.map((notification) => (
                <PNCard key={notification.id} className={`border-l-4 ${getNotificationColor(notification.type)}`}>
                  <div className={`p-4 ${!notification.isRead ? 'bg-[var(--cyber-bg-card)]/50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-semibold ${!notification.isRead ? 'text-white' : 'text-[var(--cyber-text-secondary)]'}`}>
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-[var(--cyber-pink-primary)] rounded-full"></div>
                            )}
                          </div>
                          <p className="text-[var(--cyber-text-secondary)] text-sm mb-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-[var(--cyber-text-secondary)]">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {notification.actionUrl && (
                              <a
                                href={notification.actionUrl}
                                className="text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] font-medium"
                              >
                                Lihat Detail →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-pink-secondary)] transition-colors"
                            title="Tandai sudah dibaca"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-[var(--cyber-text-secondary)] hover:text-red-400 transition-colors"
                          title="Hapus notifikasi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </PNCard>
              ))
            )}
          </div>

          {/* Settings Footer */}
          <PNCard>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">Pengaturan Notifikasi</h3>
                  <p className="text-sm text-[var(--cyber-text-secondary)]">
                    Kelola preferensi notifikasi Anda
                  </p>
                </div>
                <PNButton variant="ghost">
                  <Settings className="w-5 h-5" />
                </PNButton>
              </div>
            </div>
          </PNCard>
        </div>
      </ConsistentLayout>
    </PageWrapper>
  );
};

export default NotificationsPage;
