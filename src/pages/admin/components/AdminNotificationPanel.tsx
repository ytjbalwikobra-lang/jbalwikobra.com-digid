/**
 * AdminNotificationPanel.tsx
 * 
 * ULTRA-COMPACT CYBERPUNK NOTIFICATION PANEL
 * - Strict 320px width (w-80)
 * - Compact header (h-12), ultra-dense rows  (h-14)
 * - Text: xs for names, text-[10px] for dates
 * - Icons: h-6 w-6
 * - Hover-only delete actions
 * - No pagination - scroll-based
 * - 2 filter tabs: All / Unread
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Trash2, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAdminRealtimeNotifications } from '../../../hooks/useAdminRealtimeNotifications';
import { useToast } from '../../../components/Toast';
import {
  getNotificationIcon,
  formatNotificationTime,
  isOrderNotification,
  getOrderTypeLabel,
  type AdminNotificationData,
} from '../utils/notificationUtils';

interface AdminNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminNotificationPanel: React.FC<AdminNotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useAdminRealtimeNotifications({ limit: 50 });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const toast = useToast();

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bellButton = (e.target as Element)?.closest('[aria-label="Notifications"]');
        if (!bellButton) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timeoutId);
    };
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.showToast('Notifikasi dihapus', 'success');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.showToast('Gagal menghapus notifikasi', 'error');
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleNotificationClick = useCallback((notification: AdminNotificationData) => {
    if (
      notification.order_id &&
      ['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'].includes(notification.type)
    ) {
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }
      onClose();
      navigate(`/admin/orders/${notification.order_id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Premium Solid Panel - New KV Design */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-[70] overflow-hidden flex flex-col',
          'bg-black border border-pink-500/30',
          'shadow-[0_0_40px_rgba(236,72,153,0.25),0_20px_60px_-15px_rgba(0,0,0,0.8)]',
          'right-0 top-0 bottom-0 w-80',
          'lg:right-6 lg:top-16 lg:bottom-auto lg:w-80 lg:max-h-[70vh] lg:rounded-2xl'
        )}
      >
        {/* Premium Gradient Header */}
        <div className="relative px-4 py-4 border-b border-pink-500/20 bg-gradient-to-r from-pink-600/10 via-pink-500/5 to-transparent">
          {/* Animated glow orb */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg shadow-pink-500/50">
                  <Bell size={16} className="text-white" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-pink-500 text-white rounded-full border border-black/50 shadow-lg animate-bounce">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Notifikasi</h2>
                <p className="text-[10px] font-medium text-pink-400/80">
                  {unreadCount > 0 ? `${unreadCount} pesan baru` : 'Semua terbaca'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:scale-110"
              aria-label="Close"
            >
              <X size={14} className="text-white/70 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Modern Tab Pills */}
        <div className="flex gap-2 px-4 py-3 bg-black/20">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300',
              filter === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/50 scale-105'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10'
            )}
          >
            Semua ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300',
              filter === 'unread'
                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/50 scale-105'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10'
            )}
          >
            Baru ({unreadCount})
          </button>
        </div>

        {/* Premium Notification Cards */}
        <div className="flex-1 overflow-y-auto cyber-scrollbar px-3 py-2 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 w-8 h-8 border-2 border-pink-400/30 rounded-full animate-ping" />
              </div>
              <p className="text-xs text-white/50 font-medium">Memuat...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                <Bell size={28} className="text-white/20" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/60 mb-1">
                  {filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
                </p>
                <p className="text-[10px] text-white/40">
                  Notifikasi akan muncul di sini
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredNotifications.map((notification) => {
                const orderBadge = isOrderNotification(notification) ? getOrderTypeLabel(notification) : null;
                const isHovered = hoveredId === notification.id;

                return (
                  <li
                    key={notification.id}
                    onMouseEnter={() => setHoveredId(notification.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300',
                      notification.order_id && 'cursor-pointer',
                      !notification.is_read
                        ? 'bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/30 shadow-lg shadow-pink-500/10'
                        : 'bg-white/5 border-white/10',
                      isHovered && 'scale-[1.02] shadow-xl shadow-pink-500/20 border-pink-500/50'
                    )}
                  >
                    {/* Premium Icon Container */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all duration-300",
                      !notification.is_read
                        ? "bg-gradient-to-br from-pink-500 to-pink-600"
                        : "bg-gradient-to-br from-white/10 to-white/5",
                      isHovered && "scale-110"
                    )}>
                      {React.cloneElement(getNotificationIcon(notification.type) as React.ReactElement, {
                        size: 16,
                        className: !notification.is_read ? 'text-white' : 'text-pink-400'
                      })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!notification.is_read && (
                          <div className="px-1.5 py-0.5 text-[8px] font-bold bg-pink-500 text-white rounded uppercase shadow-sm">
                            New
                          </div>
                        )}
                        {orderBadge && (
                          <span className="px-2 py-0.5 text-[9px] font-bold text-pink-400 bg-pink-500/20 rounded-md border border-pink-500/30 uppercase">
                            {orderBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-white line-clamp-1">
                        {notification.customer_name || notification.title}
                      </p>
                      <p className="text-[10px] text-white/60 line-clamp-2 leading-relaxed">
                        {notification.product_name || notification.message}
                      </p>
                      <p className="text-[9px] text-white/40 font-medium">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Hover Action */}
                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} className="text-pink-400" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Premium Footer Action */}
        {unreadCount > 0 && (
          <div className="border-t border-pink-500/20 px-3 py-3 bg-black/20">
            <button
              onClick={() => markAllAsRead()}
              className="w-full px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:from-pink-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Check size={14} />
              Tandai Semua Terbaca
            </button>
          </div>
        )}
      </div>

    </>
  );
};

export default AdminNotificationPanel;
