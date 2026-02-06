/**
 * Admin Floating Notifications - Design System V3
 * 
 * Displays toast-style floating notifications for new orders/payments.
 * Follows Admin Design System V3 with WCAG 2.1 AA compliance.
 * Uses CSS variables from cyber-compact.css (--admin-* namespace)
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
import { useNavigate } from 'react-router-dom';
import { X, Check, ExternalLink } from 'lucide-react';
import { AdminNotification } from '../../services/adminNotificationService';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { formatCurrency } from '../../utils/helpers';
import { 
  getNotificationIcon, 
  getNotificationStyle, 
  getFloatingTitle,
  getFloatingCopy,
  formatRelativeTime,
  getStatusLabel,
  isOrderNotification
} from './utils/notificationUtils';

// Border color mapping - uses CSS variable values
const BORDER_COLORS = {
  info: 'rgba(59, 130, 246, 0.3)',      // --admin-info-border
  success: 'rgba(16, 185, 129, 0.3)',   // --admin-success-border
  error: 'rgba(239, 68, 68, 0.3)',      // --admin-error-border
  warning: 'rgba(245, 158, 11, 0.3)',   // --admin-warning-border
  accent: 'rgba(245, 0, 87, 0.25)',    // --admin-accent with 25% opacity
};

// ========================================
// CONSTANTS
// ========================================

const MAX_VISIBLE = 3;
// Auto-dismiss removed - notifications should only dismiss when clicked

// ========================================
// TYPES
// ========================================

interface FloatingNotification extends AdminNotification {
  dismissed?: boolean;
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
  const navigate = useNavigate();
  
  // Refs for processed IDs tracking
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
  // HANDLERS
  // ========================================
  
  const handleDismiss = useCallback((id: string) => {
    // Simply mark as dismissed - no auto-reappear
    setFloatingNotifs(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    handleDismiss(id);

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
      handleDismiss(id);
    }
  }, [handleMarkAsRead, handleDismiss]);

  // Handle notification click - navigate to order page for order-related notifications
  const handleNotificationClick = useCallback((notification: FloatingNotification) => {
    // Only navigate for order-related notifications with order_id
    if (notification.order_id && isOrderNotification(notification)) {
      // Mark as read first
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }
      // Navigate to order detail page
      navigate(`/admin/orders/${notification.order_id}`);
    }
  }, [handleMarkAsRead, navigate]);

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
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      role="region"
      aria-label={`${visibleNotifications.length} notifikasi belum dibaca`}
      aria-live="polite"
      aria-atomic="false"
    >
      {visibleNotifications.map((notification, index) => {
        const style = getNotificationStyle(notification.type);
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
            className={`
              pointer-events-auto
              flex items-start gap-2 p-3 
              bg-[#0a0a0a] border border-pink-500/30 rounded-lg
              backdrop-blur-xl
              transition-all duration-300
              hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]
              hover:border-pink-500/50
              animate-in slide-in-from-right-full
              ${isClickable ? 'cursor-pointer' : ''}
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              borderColor: style.border.includes('blue') ? BORDER_COLORS.info :
                          style.border.includes('emerald') ? BORDER_COLORS.success :
                          style.border.includes('red') ? BORDER_COLORS.error :
                          style.border.includes('yellow') || style.border.includes('amber') ? BORDER_COLORS.warning :
                          BORDER_COLORS.accent,
            }}
          >
            {/* Icon */}
            <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
              {getNotificationIcon(notification.type)}
              {/* Pulse indicator */}
              <span 
                className="absolute top-0 right-0 w-2 h-2 bg-pink-500 rounded-full animate-ping" 
                aria-hidden="true" 
              />
            </div>

            {/* Content - Tier 1: Minimal copy for quick scanning */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-white truncate">
                  {floatingTitle}
                </h4>
                <span className="text-[10px] text-white/40 whitespace-nowrap flex-shrink-0">
                  {formatRelativeTime(notification.created_at)}
                </span>
              </div>
              
              {/* Tier 1: Show only customer/product name */}
              <p className="text-xs text-white/70 line-clamp-2">
                {floatingCopy}
              </p>

              {/* Tier 1 Meta: Status badge + Amount only */}
              {notification.amount && (
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold text-pink-400 bg-pink-500/10 rounded uppercase">
                    {statusLabel}
                  </span>
                  <span className="text-xs font-semibold text-pink-400">
                    {formatCurrency(notification.amount)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 pt-1" role="group" aria-label="Aksi notifikasi">
                {isClickable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                    aria-label={`Lihat detail pesanan`}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-pink-400 bg-pink-500/10 rounded hover:bg-pink-500/20 transition-colors"
                  >
                    <ExternalLink size={12} aria-hidden="true" />
                    <span>Detail</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  aria-label={`Tandai "${notification.title}" sebagai sudah dibaca`}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-pink-500 rounded hover:bg-pink-600 transition-colors"
                >
                  <Check size={12} aria-hidden="true" />
                  <span>Dibaca</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(notification.id);
                  }}
                  aria-label={`Tutup "${notification.title}"`}
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 transition-colors"
                >
                  <X size={14} className="text-white/60" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default AdminFloatingNotifications;
