/**
 * Admin Floating Notifications - Design System V3
 * 
 * Displays toast-style floating notifications for new orders/payments.
 * Follows Admin Design System V3 with WCAG 2.1 AA compliance.
 * 
 * @accessibility
 * - ARIA live regions for screen reader announcements
 * - Keyboard navigable (Enter to mark read, Escape to dismiss)
 * - Focus management and visible focus states
 * - Sufficient color contrast (4.5:1 minimum)
 * 
 * @performance
 * - Single realtime subscription via useAdminRealtimeNotifications hook
 * - Efficient memo and ref patterns to prevent unnecessary re-renders
 * - Timer cleanup on unmount
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Check, Sparkles, ExternalLink } from 'lucide-react';
import { AdminNotification } from '../../services/adminNotificationService';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { AdminColors } from './design-tokens';
import { formatCurrency } from '../../utils/helpers';
import { OrderDetailsModal } from '../../components/admin/OrderDetailsModal';
import { 
  getNotificationIcon, 
  getNotificationStyle, 
  getFloatingTitle,
  getFloatingCopy,
  formatRelativeTime,
  getStatusLabel,
  isOrderNotification
} from './utils/notificationUtils';

// ========================================
// CONSTANTS
// ========================================

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 8000;
const REAPPEAR_MS = 30000;

// ========================================
// TYPES
// ========================================

interface FloatingNotification extends AdminNotification {
  dismissed?: boolean;
  reappearAt?: number;
}

// ========================================
// COMPONENT
// ========================================

// Stable filter function - defined outside component to prevent recreating on each render
const notificationFilter = (n: AdminNotification) => !n.type.includes('test') && !n.type.includes('debug');

const AdminFloatingNotifications: React.FC = () => {
  // Realtime notifications hook - single subscription pattern
  const { notifications, markAsRead } = useAdminRealtimeNotifications({
    limit: 20,
    enableSound: true,
    enableBrowserNotifications: false,
    filter: notificationFilter,
  });

  const [floatingNotifs, setFloatingNotifs] = useState<FloatingNotification[]>([]);
  
  // Modal state for order details - ISO 9241-110: Dialog principles
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Refs for timer management and processed IDs
  const dismissTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reappearTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // ========================================
  // NOTIFICATION SYNC EFFECT
  // ========================================
  
  useEffect(() => {
    const unreadNotifs = notifications.filter(n => !n.is_read);
    
    // Initial load: show up to 5 recent unread
    if (initialLoadRef.current && unreadNotifs.length > 0) {
      initialLoadRef.current = false;
      const recentUnread = unreadNotifs.slice(0, 5);
      recentUnread.forEach(n => processedIdsRef.current.add(n.id));
      setFloatingNotifs(recentUnread.map(n => ({ ...n, dismissed: false })));
      return;
    }
    
    // Add new notifications
    unreadNotifs.forEach(notif => {
      if (!processedIdsRef.current.has(notif.id)) {
        processedIdsRef.current.add(notif.id);
        setFloatingNotifs(prev => {
          if (prev.some(n => n.id === notif.id)) return prev;
          return [{ ...notif, dismissed: false }, ...prev].slice(0, 20);
        });
      }
    });
    
    // Sync read state
    setFloatingNotifs(prev => 
      prev.map(n => {
        const globalN = notifications.find(gn => gn.id === n.id);
        if (globalN?.is_read && !n.is_read) {
          return { ...n, is_read: true, dismissed: true };
        }
        return n;
      })
    );
  }, [notifications]);

  // ========================================
  // CLEANUP ON UNMOUNT
  // ========================================
  
  useEffect(() => {
    return () => {
      dismissTimersRef.current.forEach(timer => clearTimeout(timer));
      reappearTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // ========================================
  // AUTO-DISMISS EFFECT
  // ========================================
  
  useEffect(() => {
    floatingNotifs.forEach(notif => {
      if (!notif.is_read && !notif.dismissed && !dismissTimersRef.current.has(notif.id)) {
        const timer = setTimeout(() => {
          handleDismiss(notif.id, true);
        }, AUTO_DISMISS_MS);
        dismissTimersRef.current.set(notif.id, timer);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floatingNotifs]);

  // ========================================
  // HANDLERS
  // ========================================
  
  const handleDismiss = useCallback((id: string, withReappear = false) => {
    // Clear dismiss timer
    const dismissTimer = dismissTimersRef.current.get(id);
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimersRef.current.delete(id);
    }

    setFloatingNotifs(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );

    // Set reappear timer for unread
    if (withReappear) {
      setFloatingNotifs(prev => {
        const notif = prev.find(n => n.id === id);
        if (notif && !notif.is_read) {
          const timer = setTimeout(() => {
            setFloatingNotifs(p => 
              p.map(n => n.id === id ? { ...n, dismissed: false, reappearAt: Date.now() } : n)
            );
            reappearTimersRef.current.delete(id);
          }, REAPPEAR_MS);
          reappearTimersRef.current.set(id, timer);
        }
        return prev;
      });
    }
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    handleDismiss(id, false);
    
    // Clear reappear timer
    const reappearTimer = reappearTimersRef.current.get(id);
    if (reappearTimer) {
      clearTimeout(reappearTimer);
      reappearTimersRef.current.delete(id);
    }

    try {
      await markAsRead(id);
    } catch (error) {
      console.error('[FloatingNotifications] Failed to mark as read:', error);
    }
  }, [handleDismiss, markAsRead]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMarkAsRead(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDismiss(id, true);
    }
  }, [handleMarkAsRead, handleDismiss]);

  // Handle notification click - open modal for order-related notifications
  const handleNotificationClick = useCallback((notification: FloatingNotification) => {
    // Only open modal for order-related notifications with order_id
    if (notification.order_id && isOrderNotification(notification)) {
      // Mark as read first
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }
      // Open modal
      setSelectedOrderId(notification.order_id);
      setIsModalOpen(true);
    }
  }, [handleMarkAsRead]);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  }, []);

  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const visibleNotifications = useMemo(() => 
    floatingNotifs
      .filter(n => !n.dismissed && !n.is_read)
      .slice(0, MAX_VISIBLE),
    [floatingNotifs]
  );

  // ========================================
  // RENDER
  // ========================================
  
  if (visibleNotifications.length === 0) return null;

  return (
    <div 
      className="admin-floating-notifications"
      role="region"
      aria-label={`${visibleNotifications.length} notifikasi belum dibaca`}
      aria-live="polite"
      aria-atomic="false"
    >
      {visibleNotifications.map((notification, index) => {
        const style = getNotificationStyle(notification.type);
        const isReappearing = notification.reappearAt && Date.now() - notification.reappearAt < 3000;
        const floatingTitle = getFloatingTitle(notification.type);
        const floatingCopy = getFloatingCopy(notification);
        const statusLabel = getStatusLabel(notification.type);
        const isClickable = notification.order_id && isOrderNotification(notification);

        return (
          <div
            key={notification.id}
            role="alert"
            aria-label={`${floatingTitle}: ${floatingCopy}${isClickable ? '. Klik untuk detail' : ''}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleNotificationClick(notification);
              } else {
                handleKeyDown(e, notification.id);
              }
            }}
            onClick={() => isClickable && handleNotificationClick(notification)}
            className={`admin-floating-notification ${isClickable ? 'admin-floating-notification--clickable' : ''}`}
            style={{
              animationDelay: `${index * 100}ms`,
              borderColor: style.border.includes('blue') ? AdminColors.info.border :
                          style.border.includes('emerald') ? AdminColors.success.border :
                          style.border.includes('red') ? AdminColors.error.border :
                          style.border.includes('yellow') || style.border.includes('amber') ? AdminColors.warning.border :
                          AdminColors.accent.DEFAULT + '40',
            }}
            data-reappearing={isReappearing || undefined}
          >
            {/* Icon */}
            <div className="admin-floating-notification__icon">
              {getNotificationIcon(notification.type)}
              {/* Pulse indicator */}
              <span className="admin-floating-notification__pulse" aria-hidden="true" />
            </div>

            {/* Content - Tier 1: Minimal copy for quick scanning */}
            <div className="admin-floating-notification__content">
              <div className="admin-floating-notification__header">
                <h4 className="admin-floating-notification__title">
                  {floatingTitle}
                </h4>
                <span className="admin-floating-notification__time">
                  {formatRelativeTime(notification.created_at)}
                </span>
              </div>
              
              {/* Tier 1: Show only customer/product name */}
              <p className="admin-floating-notification__message">
                {floatingCopy}
              </p>

              {/* Tier 1 Meta: Status badge + Amount only */}
              {notification.amount && (
                <div className="admin-floating-notification__meta">
                  <span className="admin-floating-notification__status">
                    {statusLabel}
                  </span>
                  <span className="admin-floating-notification__amount">
                    {formatCurrency(notification.amount)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="admin-floating-notification__actions" role="group" aria-label="Aksi notifikasi">
                {isClickable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                    aria-label={`Lihat detail pesanan`}
                    className="admin-floating-notification__btn admin-floating-notification__btn--view"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    <span>Lihat Detail</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  aria-label={`Tandai "${notification.title}" sebagai sudah dibaca`}
                  className="admin-floating-notification__btn admin-floating-notification__btn--primary"
                >
                  <Check size={14} aria-hidden="true" />
                  <span>Dibaca</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(notification.id, true);
                  }}
                  aria-label={`Tutup sementara "${notification.title}"`}
                  className="admin-floating-notification__btn admin-floating-notification__btn--dismiss"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Reappearing indicator */}
              {isReappearing && (
                <div className="admin-floating-notification__reappear">
                  <Sparkles size={12} aria-hidden="true" />
                  <span>Belum dibaca - muncul kembali</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div 
              className="admin-floating-notification__progress" 
              aria-hidden="true"
              style={{ '--auto-dismiss-duration': `${AUTO_DISMISS_MS}ms` } as React.CSSProperties}
            />
          </div>
        );
      })}

      {/* Order Details Modal - ISO 9241-110: Dialog principles */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default AdminFloatingNotifications;
