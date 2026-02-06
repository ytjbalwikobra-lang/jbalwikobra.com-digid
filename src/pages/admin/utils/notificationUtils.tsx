/**
 * Shared Notification Utilities for Admin Panel
 * Consolidates notification icon and style helpers used across components
 * Uses CSS variables from cyber-compact.css (--admin-* namespace)
 * 
 * @module notificationUtils
 * @description Central utilities for admin notification display and logic
 */

import React from 'react';
import { ShoppingBag, CreditCard, User, XCircle, Star, AlertCircle, Home, Info, DollarSign } from 'lucide-react';

// Color constants matching CSS variables in cyber-compact.css
const ADMIN_COLORS = {
  success: '#10b981',        // --admin-success
  successBg: 'rgba(16, 185, 129, 0.082)', // ~15 hex opacity
  warning: '#f59e0b',        // --admin-warning
  warningBg: 'rgba(245, 158, 11, 0.082)', // ~15 hex opacity
  error: '#ef4444',          // --admin-error
  errorBg: 'rgba(239, 68, 68, 0.082)',    // ~15 hex opacity
  textSecondary: '#a1a1aa',  // --admin-text-secondary (zinc-400)
  primaryLighter: '#1a1a1a', // --admin-primary-lighter
};

// Re-export formatCurrency for convenience
export { formatCurrency } from '../../../utils/helpers';

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Notification type definitions
 */
export type AdminNotificationType = 
  | 'new_order' 
  | 'paid_order' 
  | 'new_user' 
  | 'order_cancelled' 
  | 'new_review'
  | 'new_rent'
  | 'paid_rent'
  | 'system'
  | string;

/**
 * Admin Notification interface (matches adminNotificationService)
 */
export interface AdminNotificationData {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  order_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
  customer_name?: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Style configuration for notification types
 */
export interface NotificationStyle {
  gradient: string;
  border: string;
  icon: string;
  badge: string;
  glow?: string;
  bg?: string;
  pulse?: string;
}

/**
 * Status badge configuration
 */
export interface StatusBadge {
  label: string;
  color: string;
  bg: string;
}

// ========================================
// ICON UTILITIES
// ========================================

/**
 * Get the appropriate icon for a notification type
 */
export const getNotificationIcon = (type: AdminNotificationType): React.ReactNode => {
  switch (type) {
    case 'new_order':
      return <ShoppingBag className="w-5 h-5 text-[var(--admin-info)]" />;
    case 'paid_order':
      return <CreditCard className="w-5 h-5 text-[var(--admin-success)]" />;
    case 'new_rent':
      return <Home className="w-5 h-5 text-[var(--admin-orange)]" />;
    case 'paid_rent':
      return <DollarSign className="w-5 h-5 text-[var(--admin-success)]" />;
    case 'order_cancelled':
      return <XCircle className="w-5 h-5 text-[var(--admin-error)]" />;
    case 'new_user':
      return <User className="w-5 h-5 text-[var(--admin-purple)]" />;
    case 'new_review':
      return <Star className="w-5 h-5 text-[var(--admin-warning)]" />;
    case 'system':
      return <AlertCircle className="w-5 h-5 text-[var(--admin-text-muted)]" />;
    default:
      return <Info className="w-5 h-5 text-[var(--admin-text-muted)]" />;
  }
};

// ========================================
// STYLE UTILITIES
// ========================================

/**
 * Get style configuration for a notification type
 */
export const getNotificationStyle = (type: AdminNotificationType): NotificationStyle => {
  switch (type) {
    case 'new_order':
      return {
        gradient: 'from-pink-500/20 to-rose-500/10',
        border: 'border-[var(--admin-accent)]/30',
        icon: 'bg-gradient-to-br from-pink-500 to-rose-600',
        badge: 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] border-[var(--admin-accent)]/30',
        glow: 'shadow-pink-500/20',
        bg: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20',
        pulse: 'bg-[var(--admin-accent)]',
      };
    case 'paid_order':
      return {
        gradient: 'from-emerald-500/20 to-emerald-600/10',
        border: 'border-[var(--admin-success)]/30',
        icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
        badge: 'bg-[var(--admin-success)]/20 text-[var(--admin-success)] border-[var(--admin-success)]/30',
        glow: 'shadow-emerald-500/20',
        bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20',
        pulse: 'bg-[var(--admin-success)]',
      };
    case 'new_rent':
      return {
        gradient: 'from-orange-500/20 to-amber-500/10',
        border: 'border-[var(--admin-orange)]/30',
        icon: 'bg-gradient-to-br from-orange-500 to-amber-600',
        badge: 'bg-[var(--admin-orange)]/20 text-[var(--admin-orange)] border-[var(--admin-orange)]/30',
        glow: 'shadow-orange-500/20',
        bg: 'bg-gradient-to-br from-orange-500/20 to-yellow-500/20',
        pulse: 'bg-[var(--admin-orange)]',
      };
    case 'paid_rent':
      return {
        gradient: 'from-yellow-500/20 to-emerald-500/10',
        border: 'border-[var(--admin-warning)]/30',
        icon: 'bg-gradient-to-br from-yellow-500 to-emerald-600',
        badge: 'bg-[var(--admin-warning)]/20 text-[var(--admin-warning)] border-[var(--admin-warning)]/30',
        glow: 'shadow-yellow-500/20',
        bg: 'bg-gradient-to-br from-yellow-500/20 to-emerald-500/20',
        pulse: 'bg-[var(--admin-warning)]',
      };
    case 'order_cancelled':
      return {
        gradient: 'from-pink-500/20 to-rose-500/10',
        border: 'border-[var(--admin-error)]/30',
        icon: 'bg-gradient-to-br from-pink-500 to-rose-600',
        badge: 'bg-[var(--admin-error)]/20 text-[var(--admin-error)] border-[var(--admin-error)]/30',
        glow: 'shadow-pink-500/20',
        bg: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20',
        pulse: 'bg-[var(--admin-error)]',
      };
    case 'new_user':
      return {
        gradient: 'from-pink-500/20 to-fuchsia-500/10',
        border: 'border-[var(--admin-accent)]/30',
        icon: 'bg-gradient-to-br from-pink-500 to-fuchsia-600',
        badge: 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] border-[var(--admin-accent)]/30',
        glow: 'shadow-pink-500/20',
        bg: 'bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20',
        pulse: 'bg-[var(--admin-accent)]',
      };
    case 'new_review':
      return {
        gradient: 'from-yellow-500/20 to-amber-500/10',
        border: 'border-[var(--admin-warning)]/30',
        icon: 'bg-gradient-to-br from-yellow-500 to-amber-600',
        badge: 'bg-[var(--admin-warning)]/20 text-[var(--admin-warning)] border-[var(--admin-warning)]/30',
        glow: 'shadow-yellow-500/20',
        bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
        pulse: 'bg-[var(--admin-warning)]',
      };
    default:
      return {
        gradient: 'from-[var(--admin-bg-card)] to-zinc-500/10',
        border: 'border-[var(--admin-border)]',
        icon: 'bg-gradient-to-br from-zinc-500 to-zinc-600',
        badge: 'bg-[var(--admin-bg-card)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]',
        glow: 'shadow-gray-500/20',
        bg: 'bg-gradient-to-br from-[var(--admin-accent-muted)] to-[var(--admin-accent-muted)]',
        pulse: 'bg-[var(--admin-accent)]',
      };
  }
};

// ========================================
// LABEL UTILITIES
// ========================================

/**
 * Get human-readable label for notification type
 */
export const getNotificationTypeLabel = (type: AdminNotificationType): string => {
  switch (type) {
    case 'new_order':
      return 'Pesanan Baru';
    case 'paid_order':
      return 'Pembayaran';
    case 'new_rent':
      return 'Sewa Baru';
    case 'paid_rent':
      return 'Pembayaran Sewa';
    case 'order_cancelled':
      return 'Dibatalkan';
    case 'new_user':
      return 'Pengguna Baru';
    case 'new_review':
      return 'Review Baru';
    case 'system':
      return 'Sistem';
    default:
      return 'Lainnya';
  }
};

// ========================================
// TIME UTILITIES
// ========================================

/**
 * Format time for notifications (Indonesian locale)
 */
export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ========================================
// ORDER TYPE HELPERS
// ========================================

/**
 * Order-related notification types
 */
const ORDER_NOTIFICATION_TYPES = ['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'] as const;

/**
 * Check if notification is order-related
 */
export const isOrderNotification = (notification: AdminNotificationData): boolean => {
  return (
    ORDER_NOTIFICATION_TYPES.includes(notification.type as typeof ORDER_NOTIFICATION_TYPES[number]) ||
    !!notification.metadata?.order_type ||
    !!notification.order_id
  );
};

/**
 * Get order type label (RENTAL or PURCHASE)
 */
export const getOrderTypeLabel = (notification: AdminNotificationData): 'RENTAL' | 'PURCHASE' => {
  const orderType = (notification.metadata?.order_type as string) || 
    (notification.type.includes('rent') ? 'rental' : 'purchase');
  return orderType === 'rental' ? 'RENTAL' : 'PURCHASE';
};

/**
 * Check if notification represents a completed/paid order
 */
export const isCompletedNotification = (notification: AdminNotificationData): boolean => {
  const metaStatus = (notification.metadata?.status as string) || 
    (notification.metadata?.order_status as string);
  if (metaStatus === 'completed') return true;
  return ['paid_order', 'paid_rent'].includes(notification.type);
};

/**
 * Get status badge for notification
 */
export const getStatusBadge = (notification: AdminNotificationData): StatusBadge => {
  if (['paid_order', 'paid_rent'].includes(notification.type)) {
    return { 
      label: 'Paid', 
      color: ADMIN_COLORS.success, 
      bg: ADMIN_COLORS.successBg
    };
  }
  if (['new_order', 'new_rent'].includes(notification.type)) {
    return { 
      label: 'Pending', 
      color: ADMIN_COLORS.warning, 
      bg: ADMIN_COLORS.warningBg
    };
  }
  if (notification.type === 'order_cancelled') {
    return { 
      label: 'Cancelled', 
      color: ADMIN_COLORS.error, 
      bg: ADMIN_COLORS.errorBg
    };
  }
  return { 
    label: 'Info', 
    color: ADMIN_COLORS.textSecondary, 
    bg: ADMIN_COLORS.primaryLighter
  };
};

/**
 * Check if notification type is high priority (should play sound)
 */
export const isHighPriorityNotification = (type: AdminNotificationType): boolean => {
  return ['paid_order', 'paid_rent', 'new_order', 'new_rent'].includes(type);
};

// ========================================
// TIER-BASED COPY FORMATTERS (ISO 9241-110: Progressive Disclosure)
// ========================================

/**
 * Copy tier definitions for notification display hierarchy
 * Tier 1: Floating - Minimal, glanceable
 * Tier 2: Panel - Medium detail for decision making
 * Tier 3: Modal - Full details for action
 */

/**
 * Tier 1: Get simplified title for floating notifications
 * Ultra-concise for quick scanning
 */
export const getFloatingTitle = (type: AdminNotificationType): string => {
  switch (type) {
    case 'new_order':
      return 'Pesanan Baru';
    case 'paid_order':
      return 'Pembayaran Diterima';
    case 'new_rent':
      return 'Penyewaan Baru';
    case 'paid_rent':
      return 'Pembayaran Sewa Diterima';
    case 'order_cancelled':
      return 'Pesanan Dibatalkan';
    case 'new_user':
      return 'Pengguna Baru Terdaftar';
    case 'new_review':
      return 'Ulasan Baru';
    case 'system':
      return 'Pemberitahuan Sistem';
    default:
      return 'Notifikasi';
  }
};

/**
 * Tier 2: Get panel title for notification panel
 * Standard Indonesian, clear and professional
 */
export const getPanelTitle = (type: AdminNotificationType): string => {
  switch (type) {
    case 'new_order':
      return 'Pesanan Pembelian Baru';
    case 'paid_order':
      return 'Pembayaran Pembelian Diterima';
    case 'new_rent':
      return 'Pesanan Penyewaan Baru';
    case 'paid_rent':
      return 'Pembayaran Penyewaan Diterima';
    case 'order_cancelled':
      return 'Pesanan Dibatalkan';
    case 'new_user':
      return 'Pengguna Baru Mendaftar';
    case 'new_review':
      return 'Ulasan Produk Baru';
    case 'system':
      return 'Pemberitahuan Sistem';
    default:
      return 'Notifikasi';
  }
};

/**
 * Tier 1: Format floating notification copy (minimal)
 * Only customer name for order types, or short description
 */
export const getFloatingCopy = (notification: AdminNotificationData): string => {
  const { type, customer_name, product_name } = notification;
  
  // Order-related: show customer name only
  if (['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'].includes(type)) {
    return customer_name || 'Pelanggan';
  }
  
  // User signup
  if (type === 'new_user') {
    return customer_name || 'Pengguna baru';
  }
  
  // Review
  if (type === 'new_review') {
    return product_name || 'Produk';
  }
  
  return '';
};

/**
 * Tier 2: Format panel notification copy (medium detail)
 * Customer + product, suitable for list view
 */
export const getPanelCopy = (notification: AdminNotificationData): { line1: string; line2?: string } => {
  const { type, customer_name, product_name } = notification;
  const customer = customer_name || 'Pelanggan';
  const product = product_name || 'Produk';
  
  // Order-related: customer on line 1, product on line 2
  if (['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'].includes(type)) {
    return {
      line1: customer,
      line2: product
    };
  }
  
  // User signup
  if (type === 'new_user') {
    return {
      line1: customer,
      line2: undefined
    };
  }
  
  // Review
  if (type === 'new_review') {
    return {
      line1: customer,
      line2: product
    };
  }
  
  // Fallback to message
  return {
    line1: notification.message || 'Tidak ada detail'
  };
};

/**
 * Get status label in Indonesian
 */
export const getStatusLabel = (type: AdminNotificationType): string => {
  switch (type) {
    case 'paid_order':
    case 'paid_rent':
      return 'Dibayar';
    case 'new_order':
    case 'new_rent':
      return 'Menunggu';
    case 'order_cancelled':
      return 'Dibatalkan';
    default:
      return 'Info';
  }
};

/**
 * Format relative time in Indonesian
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  
  // Older than a week: show date
  return formatNotificationTime(dateString);
};

// ========================================
// DEFAULT EXPORT
// ========================================

export default {
  getNotificationIcon,
  getNotificationStyle,
  getNotificationTypeLabel,
  formatNotificationTime,
  isHighPriorityNotification,
  isOrderNotification,
  getOrderTypeLabel,
  isCompletedNotification,
  getStatusBadge,
  // Tier-based copy formatters
  getFloatingTitle,
  getPanelTitle,
  getFloatingCopy,
  getPanelCopy,
  getStatusLabel,
  formatRelativeTime,
};
