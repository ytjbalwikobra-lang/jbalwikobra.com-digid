/**
 * Admin Notification Panel - V3 Design System
 * Premium dropdown panel for admin notifications with real-time updates
 * 
 * Design System: WCAG 2.1 AA Compliant
 * Layout: ISO 9241-210 Human-centred design principles
 * 
 * Uses unified useAdminRealtimeNotifications hook for single subscription pattern
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminNotification } from '../../../services/adminNotificationService';
import { useAdminRealtimeNotifications } from '../../../hooks/useAdminRealtimeNotifications';
import { AdminColors } from '../design-tokens';
import { trapFocus, announceToScreenReader, useArrowNavigation } from '../utils/accessibility';
import { NotificationSkeleton } from './NotificationSkeleton';
import { useToast } from '../../../components/Toast';
import { 
  getNotificationIcon, 
  formatNotificationTime,
  formatCurrency,
  isOrderNotification,
  getOrderTypeLabel,
  isCompletedNotification,
  getStatusBadge,
  getPanelTitle,
  getPanelCopy,
  getStatusLabel
} from '../utils/notificationUtils';
import { cn } from '../../../utils/cn';
import { OrderDetailsModal } from '../../../components/admin/OrderDetailsModal';

interface AdminNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Get status badge for notification - Indonesian labels
 */
const getLocalizedStatusBadge = (notification: AdminNotification): { label: string; color: string; bg: string } => {
  const badge = getStatusBadge(notification);
  // Override with Indonesian labels
  const localizedLabel = getStatusLabel(notification.type);
  return { ...badge, label: localizedLabel };
};

export const AdminNotificationPanel: React.FC<AdminNotificationPanelProps> = ({
  isOpen,
  onClose
}) => {
  // Use unified realtime notifications hook - single subscription pattern
  const {
    notifications,
    unreadCount,
    loading,
    error: loadError,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isConnected,
  } = useAdminRealtimeNotifications({ limit: 50 });

  const [filter, setFilter] = useState<'all' | 'unread' | 'complete'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const panelRef = useRef<HTMLDivElement>(null);
  const notificationRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // Modal state for order details - ISO 9241-110: Dialog principles
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Toast notifications for feedback
  const toast = useToast();

  // Focus trap, click-outside handler, and keyboard navigation
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

    // Handle click outside to close panel
    const handleClickOutside = (e: MouseEvent) => {
      // When modal is open, ignore outside clicks to prevent panel from closing
      if (isModalOpen) return;

      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bellButton = (e.target as Element)?.closest('[aria-label="Notifications"]');
        if (!bellButton) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Delay adding click listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timeoutId);
    };
  }, [isOpen, onClose, isModalOpen]);

  // Mark as read handler with toast feedback
  const handleMarkAsRead = async (id: string, silent = false) => {
    try {
      await markAsRead(id);
      if (!silent) {
        toast.showToast('Ditandai sudah dibaca', 'success');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      if (!silent) {
        toast.showToast('Gagal menandai notifikasi', 'error');
      }
    }
  };

  // Mark all as read handler with toast feedback
  const handleMarkAllAsRead = async () => {
    const unreadNotifCount = unreadCount;
    try {
      await markAllAsRead();
      toast.showToast(`${unreadNotifCount} notifikasi ditandai sudah dibaca`, 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.showToast('Gagal menandai semua notifikasi', 'error');
    }
  };

  // Delete notification handler with toast feedback
  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.showToast('Notifikasi dihapus', 'success');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.showToast('Gagal menghapus notifikasi', 'error');
    }
  };

  // Show all notifications without filtering by type
  // This follows ISO 9241-210 principle: provide full information transparency
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : filter === 'complete'
      ? notifications.filter(isCompletedNotification)
      : notifications;

  // Pagination - ISO 9241-151 guideline: manageable information chunks
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes - ensures consistent user experience
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Arrow navigation for notification list
  const handleNotificationSelect = useCallback((index: number) => {
    const notification = filteredNotifications[index];
    if (notification && !notification.is_read) {
      handleMarkAsRead(notification.id, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Handle notification click - open modal for order-related notifications
  const handleNotificationClick = useCallback((notification: AdminNotification) => {
    // ISO 9241-110: Open modal only for order-related notifications
    if (notification.order_id && ['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'].includes(notification.type)) {
      if (!notification.is_read) {
        handleMarkAsRead(notification.id, true);
      }
      setSelectedOrderId(notification.order_id);
      setIsModalOpen(true);
      announceToScreenReader('Membuka detail order', 'polite');
    }
  }, [handleMarkAsRead]);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Visible on mobile, transparent on desktop */}
      <div 
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none transition-opacity duration-200" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Notification Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-panel-title"
        aria-describedby="notification-panel-desc"
        className={cn(
          // Base styles
          'fixed z-[70] overflow-hidden',
          // Glass morphism effect
          'backdrop-blur-xl',
          // Shadow and border
          'shadow-2xl shadow-black/40',
          // Mobile: Full screen drawer from right
          'right-0 top-0 bottom-0 w-full max-w-[420px]',
          // Desktop: Dropdown positioned below bell
          'lg:right-0 lg:top-14 lg:bottom-auto lg:w-[400px] lg:max-h-[85vh] lg:rounded-2xl'
        )}
        style={{
          background: `linear-gradient(135deg, ${AdminColors.primary.light} 0%, rgba(30, 41, 59, 0.98) 100%)`,
          border: `1px solid ${AdminColors.border.light}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ 
            borderBottom: `1px solid ${AdminColors.border.DEFAULT}`,
            background: `linear-gradient(180deg, rgba(236, 72, 153, 0.08) 0%, transparent 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            {/* Animated Bell Icon */}
            <div 
              className="relative p-2 rounded-xl"
              style={{ background: `linear-gradient(135deg, ${AdminColors.accent.DEFAULT}20, ${AdminColors.accent.dark}10)` }}
            >
              <Bell size={22} style={{ color: AdminColors.accent.DEFAULT }} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h2 
                  id="notification-panel-title" 
                  className="text-lg font-semibold"
                  style={{ color: AdminColors.text.primary }}
                >
                  Notifikasi
                </h2>
                {/* Realtime connection indicator */}
                <div 
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
                  title={isConnected ? 'Realtime terhubung' : 'Realtime terputus'}
                  aria-label={isConnected ? 'Realtime terhubung' : 'Realtime terputus'}
                />
              </div>
              <p 
                id="notification-panel-desc"
                className="text-xs"
                style={{ color: AdminColors.text.tertiary }}
              >
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            style={{ 
              background: AdminColors.primary.lighter,
              color: AdminColors.text.secondary
            }}
            aria-label="Tutup panel notifikasi"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Filter Tabs - Material Design inspired */}
        <div
          className="flex relative"
          style={{ 
            borderBottom: `1px solid ${AdminColors.border.DEFAULT}`,
            background: AdminColors.primary.light
          }}
          role="tablist"
          aria-label="Filter notifikasi"
        >
          {/* Active Tab Indicator */}
          <div 
            className="absolute bottom-0 h-0.5 transition-all duration-300 ease-out"
            style={{ 
              background: `linear-gradient(90deg, ${AdminColors.accent.DEFAULT}, ${AdminColors.accent.light})`,
              width: '33.3333%',
              left: filter === 'all' ? '0%' : filter === 'unread' ? '33.3333%' : '66.6666%',
              boxShadow: `0 0 12px ${AdminColors.accent.DEFAULT}60`
            }}
          />
          
          <button
            onClick={() => setFilter('all')}
            role="tab"
            aria-selected={filter === 'all'}
            aria-controls="notification-list"
            className={cn(
              'flex-1 px-4 py-3.5 text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:bg-white/5',
              filter === 'all' ? 'text-pink-500' : ''
            )}
            style={{ color: filter === 'all' ? AdminColors.accent.DEFAULT : AdminColors.text.tertiary }}
          >
            <span className="flex items-center justify-center gap-2">
              Semua
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ 
                  background: filter === 'all' ? `${AdminColors.accent.DEFAULT}20` : AdminColors.primary.lighter,
                  color: filter === 'all' ? AdminColors.accent.DEFAULT : AdminColors.text.tertiary
                }}
              >
                {notifications.length}
              </span>
            </span>
          </button>
          
          <button
            onClick={() => setFilter('unread')}
            role="tab"
            aria-selected={filter === 'unread'}
            aria-controls="notification-list"
            className={cn(
              'flex-1 px-4 py-3.5 text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:bg-white/5'
            )}
            style={{ color: filter === 'unread' ? AdminColors.accent.DEFAULT : AdminColors.text.tertiary }}
          >
            <span className="flex items-center justify-center gap-2">
              Belum Dibaca
              {unreadCount > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse"
                  style={{ 
                    background: `${AdminColors.accent.DEFAULT}`,
                    color: 'white'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>
          </button>
          
          <button
            onClick={() => setFilter('complete')}
            role="tab"
            aria-selected={filter === 'complete'}
            aria-controls="notification-list"
            className={cn(
              'flex-1 px-4 py-3.5 text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:bg-white/5'
            )}
            style={{ color: filter === 'complete' ? AdminColors.accent.DEFAULT : AdminColors.text.tertiary }}
          >
            <span className="flex items-center justify-center gap-2">
              Selesai
            </span>
          </button>
        </div>

        {/* Quick Actions Bar */}
        {unreadCount > 0 && (
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ 
              borderBottom: `1px solid ${AdminColors.border.DEFAULT}`,
              background: `${AdminColors.primary.DEFAULT}80`
            }}
          >
            <span className="text-xs" style={{ color: AdminColors.text.tertiary }}>
              {unreadCount} notifikasi menunggu
            </span>
            <button
              onClick={handleMarkAllAsRead}
              aria-label={`Tandai semua ${unreadCount} notifikasi sebagai sudah dibaca`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              style={{ 
                background: `linear-gradient(135deg, ${AdminColors.accent.DEFAULT}20, ${AdminColors.accent.dark}10)`,
                color: AdminColors.accent.DEFAULT,
                border: `1px solid ${AdminColors.accent.DEFAULT}30`
              }}
            >
              <CheckCheck size={14} aria-hidden="true" />
              Tandai semua dibaca
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div 
          id="notification-list"
          role="tabpanel"
          aria-label={`Daftar notifikasi ${filter === 'unread' ? 'belum dibaca' : 'semua'}`}
          className="overflow-y-auto overscroll-contain" 
          style={{ 
            maxHeight: 'calc(85vh - 200px)',
            scrollbarWidth: 'thin',
            scrollbarColor: `${AdminColors.border.light} transparent`
          }}
          onKeyDown={handleArrowNav}
        >
          {loading && notifications.length === 0 ? (
            <div className="p-4">
              <NotificationSkeleton count={4} variant="panel" />
            </div>
          ) : loadError ? (
            /* Error State with Retry */
            <div className="flex flex-col items-center justify-center p-8 text-center" role="alert">
              <div 
                className="p-4 rounded-2xl mb-4"
                style={{ background: `${AdminColors.error.DEFAULT}15` }}
              >
                <AlertCircle size={40} style={{ color: AdminColors.error.DEFAULT }} aria-hidden="true" />
              </div>
              <p className="text-sm mb-4" style={{ color: AdminColors.text.secondary }}>{loadError}</p>
              <button
                onClick={loadNotifications}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                style={{ 
                  background: `linear-gradient(135deg, ${AdminColors.accent.DEFAULT}, ${AdminColors.accent.dark})`,
                  color: 'white',
                  boxShadow: `0 4px 20px ${AdminColors.accent.DEFAULT}40`
                }}
                aria-label="Coba muat ulang notifikasi"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Coba Lagi
              </button>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-10 text-center" role="status">
              <div 
                className="p-5 rounded-2xl mb-4"
                style={{ background: `${AdminColors.accent.DEFAULT}10` }}
              >
                <Bell size={40} style={{ color: AdminColors.text.tertiary }} aria-hidden="true" />
              </div>
              <p className="text-base font-medium mb-1" style={{ color: AdminColors.text.secondary }}>
                {filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
              </p>
              <p className="text-sm" style={{ color: AdminColors.text.tertiary }}>
                {filter === 'unread' ? 'Semua notifikasi sudah dibaca ✨' : 'Notifikasi akan muncul di sini'}
              </p>
            </div>
          ) : (
            <ul role="list" aria-label="Daftar notifikasi. Gunakan panah atas/bawah untuk navigasi">
              {paginatedNotifications.map((notification, index) => {
                const orderBadge = isOrderNotification(notification) ? getOrderTypeLabel(notification) : null;
                const amountLabel = notification.amount ? formatCurrency(notification.amount) : null;
                const customerDisplay = notification.customer_name || 'Customer';
                const productDisplay = notification.product_name || 'Produk';

                return (
                  <li
                    key={notification.id}
                    ref={(el) => { notificationRefs.current[index] = el; }}
                    tabIndex={0}
                    className={cn(
                      'relative px-4 py-4 transition-all duration-200',
                      'hover:bg-white/5 focus:outline-none focus:bg-white/5',
                      focusedIndex === index && 'bg-white/5 ring-2 ring-inset ring-pink-500/30',
                      notification.order_id && 'cursor-pointer'
                    )}
                    style={{ 
                      borderBottom: `1px solid ${AdminColors.border.DEFAULT}`,
                      background: !notification.is_read 
                        ? `linear-gradient(90deg, ${AdminColors.accent.DEFAULT}08, transparent)` 
                        : undefined
                    }}
                    aria-label={`${notification.title}. ${notification.is_read ? 'Sudah dibaca' : 'Belum dibaca'}. ${startIndex + index + 1} dari ${filteredNotifications.length}${notification.order_id ? '. Klik untuk detail order' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                  {/* Unread Indicator Line */}
                  {!notification.is_read && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                      style={{ 
                        background: `linear-gradient(180deg, ${AdminColors.accent.DEFAULT}, ${AdminColors.accent.dark})`,
                        boxShadow: `0 0 8px ${AdminColors.accent.DEFAULT}60`
                      }}
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex gap-3.5">
                    {/* Icon */}
                    <div 
                      className="flex-shrink-0 p-2.5 rounded-xl"
                      style={{ 
                        background: `${AdminColors.primary.lighter}`,
                        border: `1px solid ${AdminColors.border.DEFAULT}`
                      }}
                      aria-hidden="true"
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title Row */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={cn(
                            'text-sm leading-tight',
                            !notification.is_read ? 'font-semibold' : 'font-medium'
                          )}
                          style={{ color: AdminColors.text.primary }}
                        >
                          {notification.title}
                        </h4>
                        
                        {/* Unread Dot */}
                        {!notification.is_read && (
                          <div className="flex-shrink-0 mt-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full animate-pulse"
                              style={{ 
                                background: AdminColors.accent.DEFAULT,
                                boxShadow: `0 0 8px ${AdminColors.accent.DEFAULT}`
                              }}
                              aria-label="Belum dibaca"
                              role="status"
                            />
                          </div>
                        )}
                      </div>

                      {/* Order-focused copy */}
                      {orderBadge ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 text-[11px] font-semibold rounded-md uppercase tracking-wide"
                              style={{ 
                                background: `${AdminColors.accent.DEFAULT}15`,
                                color: AdminColors.accent.DEFAULT,
                                border: `1px solid ${AdminColors.accent.DEFAULT}40`
                              }}
                              aria-label={`Tipe order ${orderBadge}`}
                            >
                              {orderBadge}
                            </span>
                            <span className="text-sm font-medium" style={{ color: AdminColors.text.secondary }}>
                              {customerDisplay}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: AdminColors.text.secondary }}>
                            {productDisplay}
                          </p>
                          {amountLabel && (
                            <p 
                              className="text-sm font-semibold"
                              style={{ color: AdminColors.success.DEFAULT }}
                            >
                              {amountLabel}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p
                            className="text-sm line-clamp-2 leading-relaxed"
                            style={{ color: AdminColors.text.secondary }}
                          >
                            {notification.message}
                          </p>

                          {amountLabel && (
                            <p 
                              className="text-sm font-semibold mt-1.5"
                              style={{ color: AdminColors.success.DEFAULT }}
                            >
                              {amountLabel}
                            </p>
                          )}
                        </>
                      )}

                      {/* Footer Row */}
                      <div className="flex items-center justify-between mt-2.5">
                        {/* Timestamp with Indonesian status label */}
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{
                              background: getLocalizedStatusBadge(notification).bg,
                              color: getLocalizedStatusBadge(notification).color,
                              border: `1px solid ${getLocalizedStatusBadge(notification).color}30`
                            }}
                          >
                            {getLocalizedStatusBadge(notification).label}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: AdminColors.text.tertiary }}
                          >
                            {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1" role="group" aria-label="Aksi notifikasi">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="p-2 rounded-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                              style={{ 
                                background: `${AdminColors.success.DEFAULT}15`,
                                color: AdminColors.success.DEFAULT
                              }}
                              aria-label={`Tandai "${notification.title}" sebagai sudah dibaca`}
                            >
                              <Check size={14} aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="p-2 rounded-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            style={{ 
                              background: `${AdminColors.error.DEFAULT}15`,
                              color: AdminColors.error.DEFAULT
                            }}
                            aria-label={`Hapus notifikasi "${notification.title}"`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ 
              borderTop: `1px solid ${AdminColors.border.DEFAULT}`,
              background: AdminColors.primary.light
            }}
          >
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              style={{ 
                background: currentPage === 1 ? AdminColors.primary.lighter : `${AdminColors.accent.DEFAULT}20`,
                color: currentPage === 1 ? AdminColors.text.tertiary : AdminColors.accent.DEFAULT,
                border: `1px solid ${currentPage === 1 ? AdminColors.border.DEFAULT : AdminColors.accent.DEFAULT}30`
              }}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: AdminColors.text.secondary }}>
                Halaman <span className="font-semibold" style={{ color: AdminColors.accent.DEFAULT }}>{currentPage}</span> dari {totalPages}
              </span>
              <span className="text-xs px-2 py-1 rounded-full" style={{ 
                background: `${AdminColors.accent.DEFAULT}15`,
                color: AdminColors.text.tertiary
              }}>
                {filteredNotifications.length} total
              </span>
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              style={{ 
                background: currentPage === totalPages ? AdminColors.primary.lighter : `${AdminColors.accent.DEFAULT}20`,
                color: currentPage === totalPages ? AdminColors.text.tertiary : AdminColors.accent.DEFAULT,
                border: `1px solid ${currentPage === totalPages ? AdminColors.border.DEFAULT : AdminColors.accent.DEFAULT}30`
              }}
              aria-label="Halaman berikutnya"
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div
            className="px-4 py-3 text-center"
            style={{ 
              borderTop: `1px solid ${AdminColors.border.DEFAULT}`,
              background: `${AdminColors.primary.DEFAULT}90`
            }}
          >
            <a
              href="/admin/notifications"
              className="inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:gap-3"
              style={{ color: AdminColors.accent.DEFAULT }}
            >
              Lihat semua notifikasi
              <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </div>

      {/* Order Details Modal - ISO 9241-110: Dialog principles */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderId={selectedOrderId}
      />
    </>
  );
};

export default AdminNotificationPanel;
