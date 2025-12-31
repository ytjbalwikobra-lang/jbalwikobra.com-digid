/**
 * Admin Notification Panel - V3 Design System
 * Dropdown panel for admin notifications with real-time updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, ShoppingBag, CreditCard, User, XCircle, AlertCircle, Info } from 'lucide-react';
import { adminNotificationService, AdminNotification } from '../../../services/adminNotificationService';
import { supabase } from '../../../services/supabase';
import { AdminColors } from '../design-tokens';

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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminNotificationService.getAdminNotifications(50);
      setNotifications(data || []);
      
      // Update unread count
      const unreadCount = data.filter(n => !n.is_read).length;
      onNotificationCountChange?.(unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [onNotificationCountChange]);

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

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await adminNotificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      
      // Update unread count
      const unreadCount = notifications.filter(n => !n.is_read && n.id !== id).length;
      onNotificationCountChange?.(unreadCount);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifs.map(n => adminNotificationService.markAsRead(n.id))
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onNotificationCountChange?.(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'paid_order':
      case 'paid_rent':
        return <CreditCard className="w-5 h-5 text-green-400" />;
      case 'new_order':
      case 'new_rent':
        return <ShoppingBag className="w-5 h-5 text-blue-400" />;
      case 'order_cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'new_user':
        return <User className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  // Filter notifications
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
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
            <Bell size={20} style={{ color: AdminColors.text.primary }} />
            <h3 className="text-lg font-semibold" style={{ color: AdminColors.text.primary }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: AdminColors.error.DEFAULT,
                  color: 'white'
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={20} style={{ color: AdminColors.text.secondary }} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: AdminColors.border.DEFAULT }}
        >
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
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
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-700 transition-colors"
              style={{ color: AdminColors.primary.DEFAULT }}
            >
              <CheckCheck size={16} />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: AdminColors.primary.DEFAULT }} />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-8">
              <Bell size={48} style={{ color: AdminColors.text.secondary }} className="mx-auto mb-3 opacity-50" />
              <p style={{ color: AdminColors.text.secondary }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 border-b transition-colors hover:bg-gray-800/50',
                    !notification.is_read && 'bg-gray-800/30'
                  )}
                  style={{ borderColor: AdminColors.border.DEFAULT }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
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
                          {formatDate(notification.created_at)}
                        </span>
                        <div className="flex gap-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                              title="Mark as read"
                            >
                              <Check size={14} style={{ color: AdminColors.text.secondary }} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} style={{ color: AdminColors.error.DEFAULT }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPanel;
