/**
 * Admin Notification Panel - V3 Design System
 * Dropdown panel for admin notifications with real-time updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { adminNotificationService, AdminNotification } from '../../../services/adminNotificationService';
import { supabase } from '../../../services/supabase';
import { AdminColors } from '../design-tokens';
import { trapFocus, announceToScreenReader, useArrowNavigation } from '../utils/accessibility';
import { NotificationSkeleton } from './NotificationSkeleton';
import { useToast } from '../../../components/Toast';
import { getNotificationIcon, formatNotificationTime } from '../utils/notificationUtils';
import { useRetry } from '../utils/useRetry';

interface AdminNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCountChange?: (count: number) => void;
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const AdminNotificationPanel: React.FC<AdminNotificationPanelProps> = ({
  isOpen,
  onClose,
  onNotificationCountChange
}) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const notificationRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // Toast notifications for feedback
  const toast = useToast();
  
  // Retry hook for failed operations
  const { executeWithRetry } = useRetry({
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (attempt, error) => {
      announceToScreenReader(`Mencoba ulang... percobaan ${attempt}`, 'polite');
    },
    onMaxRetriesReached: (error) => {
      toast.showToast('Gagal memuat notifikasi setelah beberapa percobaan', 'error');
    }
  });

  // Load notifications with retry
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      const data = await executeWithRetry(
        async () => adminNotificationService.getAdminNotifications(50),
        'Load Notifications'
      );
      
      setNotifications(data || []);
      
      // Update unread count
      const unreadCount = (data || []).filter(n => !n.is_read).length;
      onNotificationCountChange?.(unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoadError('Gagal memuat notifikasi. Klik untuk mencoba lagi.');
    } finally {
      setLoading(false);
    }
  }, [onNotificationCountChange, executeWithRetry]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase || !isOpen) return;

    const channel = supabase
      .channel('admin-notifications-panel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const newNotif = payload.new as AdminNotification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Update unread count
          if (!newNotif.is_read) {
            const unreadCount = notifications.filter(n => !n.is_read).length + 1;
            onNotificationCountChange?.(unreadCount);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, notifications, onNotificationCountChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    // Trap focus within panel
    const cleanup = trapFocus(panelRef.current);

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      
      await adminNotificationService.markAsRead(id);
      
      // Update unread count
      const unreadCount = notifications.filter(n => !n.is_read && n.id !== id).length;
      onNotificationCountChange?.(unreadCount);
      
      toast.showToast('Ditandai sudah dibaca', 'success');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Rollback on error
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
      toast.showToast('Gagal menandai notifikasi', 'error');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.is_read);
    const previousState = [...notifications];
    
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      await Promise.all(
        unreadNotifs.map(n => adminNotificationService.markAsRead(n.id))
      );
      onNotificationCountChange?.(0);
      
      toast.showToast(`${unreadNotifs.length} notifikasi ditandai sudah dibaca`, 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // Rollback on error
      setNotifications(previousState);
      toast.showToast('Gagal menandai semua notifikasi', 'error');
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    try {
      await adminNotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.is_read) {
        const unreadCount = notifications.filter(n => !n.is_read && n.id !== id).length;
        onNotificationCountChange?.(unreadCount);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Filter notifications
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Arrow navigation for notification list
  const handleNotificationSelect = useCallback((index: number) => {
    const notification = filteredNotifications[index];
    if (notification && !notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  }, [filteredNotifications]);

  const { focusedIndex, handleKeyDown: handleArrowNav, reset: resetNavigation } = useArrowNavigation(
    filteredNotifications.length,
    handleNotificationSelect,
    { loop: true, initialIndex: -1 }
  );

  // Focus the notification when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && notificationRefs.current[focusedIndex]) {
      notificationRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Reset navigation when filter changes
  useEffect(() => {
    resetNavigation();
  }, [filter, resetNavigation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto" role="presentation">
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 lg:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Panel notifikasi. ${unreadCount} notifikasi belum dibaca`}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md lg:absolute lg:right-0 lg:top-full lg:bottom-auto lg:mt-2 lg:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: AdminColors.primary.light,
          borderColor: AdminColors.border.DEFAULT,
          border: '1px solid'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: AdminColors.border.DEFAULT }}
        >
          <div className="flex items-center gap-3">
            <Bell size={20} style={{ color: AdminColors.text.primary }} aria-hidden="true" />
            <h2 id="notification-panel-title" className="text-lg font-semibold" style={{ color: AdminColors.text.primary }}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: AdminColors.error.DEFAULT,
                  color: 'white'
                }}
                aria-label={`${unreadCount} belum dibaca`}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Tutup panel notifikasi"
          >
            <X size={20} style={{ color: AdminColors.text.secondary }} aria-hidden="true" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: AdminColors.border.DEFAULT }}
          role="tablist"
          aria-label="Filter notifikasi"
        >
          <button
            onClick={() => setFilter('all')}
            role="tab"
            aria-selected={filter === 'all'}
            aria-controls="notification-list"
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/50',
              filter === 'all'
                ? 'border-b-2'
                : ''
            )}
            style={{
              color: filter === 'all' ? AdminColors.primary.DEFAULT : AdminColors.text.secondary,
              borderColor: filter === 'all' ? AdminColors.primary.DEFAULT : 'transparent'
            }}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            role="tab"
            aria-selected={filter === 'unread'}
            aria-controls="notification-list"
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/50',
              filter === 'unread'
                ? 'border-b-2'
                : ''
            )}
            style={{
              color: filter === 'unread' ? AdminColors.primary.DEFAULT : AdminColors.text.secondary,
              borderColor: filter === 'unread' ? AdminColors.primary.DEFAULT : 'transparent'
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div
            className="flex justify-end p-2 border-b"
            style={{ borderColor: AdminColors.border.DEFAULT }}
          >
            <button
              onClick={handleMarkAllAsRead}
              aria-label={`Tandai semua ${unreadCount} notifikasi sebagai sudah dibaca`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              style={{ color: AdminColors.primary.DEFAULT }}
            >
              <CheckCheck size={16} aria-hidden="true" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div 
          id="notification-list"
          role="tabpanel"
          aria-label={`Daftar notifikasi ${filter === 'unread' ? 'belum dibaca' : 'semua'}`}
          className="overflow-y-auto" 
          style={{ maxHeight: '60vh' }}
          onKeyDown={handleArrowNav}
        >
          {loading && notifications.length === 0 ? (
            <NotificationSkeleton count={4} variant="panel" />
          ) : loadError ? (
            /* Error State with Retry */
            <div className="text-center p-8" role="alert">
              <AlertCircle size={48} className="mx-auto mb-3 text-red-400" aria-hidden="true" />
              <p className="text-red-300 mb-4">{loadError}</p>
              <button
                onClick={loadNotifications}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500"
                aria-label="Coba muat ulang notifikasi"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Coba Lagi
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-8" role="status">
              <Bell size={48} style={{ color: AdminColors.text.secondary }} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p style={{ color: AdminColors.text.secondary }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <ul role="list" aria-label="Daftar notifikasi. Gunakan panah atas/bawah untuk navigasi, Enter untuk menandai sudah dibaca">
              {filteredNotifications.map((notification, index) => (
                <li
                  key={notification.id}
                  ref={(el) => { notificationRefs.current[index] = el; }}
                  tabIndex={0}
                  className={cn(
                    'p-4 border-b transition-colors hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-inset',
                    !notification.is_read && 'bg-gray-800/30',
                    focusedIndex === index && 'ring-2 ring-pink-500/50 ring-inset'
                  )}
                  style={{ borderColor: AdminColors.border.DEFAULT }}
                  aria-label={`${notification.title}. ${notification.is_read ? 'Sudah dibaca' : 'Belum dibaca'}. ${index + 1} dari ${filteredNotifications.length}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1" aria-hidden="true">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className="font-medium text-sm"
                          style={{ color: AdminColors.text.primary }}
                        >
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: AdminColors.primary.DEFAULT }}
                            aria-label="Belum dibaca"
                            role="status"
                          />
                        )}
                      </div>
                      <p
                        className="text-sm mt-1 line-clamp-2"
                        style={{ color: AdminColors.text.secondary }}
                      >
                        {notification.message}
                      </p>
                      {notification.amount && (
                        <p className="text-sm font-medium mt-1" style={{ color: AdminColors.success.DEFAULT }}>
                          Rp {notification.amount.toLocaleString('id-ID')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className="text-xs"
                          style={{ color: AdminColors.text.secondary }}
                        >
                          {formatNotificationTime(notification.created_at)}
                        </span>
                        <div className="flex gap-2" role="group" aria-label="Aksi notifikasi">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                              aria-label={`Tandai ${notification.title} sebagai sudah dibaca`}
                            >
                              <Check size={14} style={{ color: AdminColors.text.secondary }} aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            aria-label={`Hapus notifikasi ${notification.title}`}
                          >
                            <Trash2 size={14} style={{ color: AdminColors.error.DEFAULT }} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPanel;
