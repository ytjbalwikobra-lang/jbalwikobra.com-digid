/**
 * Shared Notification Utilities for Admin Panel
 * Consolidates notification icon and style helpers used across components
 */

import React from 'react';
import { ShoppingBag, CreditCard, User, XCircle, Star, AlertCircle, Home, Info, DollarSign } from 'lucide-react';

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
 * Get the appropriate icon for a notification type
 */
export const getNotificationIcon = (type: AdminNotificationType): React.ReactNode => {
  switch (type) {
    case 'new_order':
      return <ShoppingBag className="w-5 h-5 text-blue-400" />;
    case 'paid_order':
      return <CreditCard className="w-5 h-5 text-emerald-400" />;
    case 'new_rent':
      return <Home className="w-5 h-5 text-orange-400" />;
    case 'paid_rent':
      return <DollarSign className="w-5 h-5 text-emerald-400" />;
    case 'order_cancelled':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'new_user':
      return <User className="w-5 h-5 text-purple-400" />;
    case 'new_review':
      return <Star className="w-5 h-5 text-yellow-400" />;
    case 'system':
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    default:
      return <Info className="w-5 h-5 text-gray-400" />;
  }
};

/**
 * Style configuration for notification types
 */
export interface NotificationStyle {
  gradient: string;
  border: string;
  icon: string;
  badge: string;
  glow?: string;
}

/**
 * Get style configuration for a notification type
 */
export const getNotificationStyle = (type: AdminNotificationType): NotificationStyle => {
  switch (type) {
    case 'new_order':
      return {
        gradient: 'from-blue-500/20 to-cyan-500/10',
        border: 'border-blue-500/30',
        icon: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        glow: 'shadow-blue-500/20',
      };
    case 'paid_order':
      return {
        gradient: 'from-emerald-500/20 to-green-500/10',
        border: 'border-emerald-500/30',
        icon: 'bg-gradient-to-br from-emerald-500 to-green-600',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
      };
    case 'new_rent':
      return {
        gradient: 'from-orange-500/20 to-amber-500/10',
        border: 'border-orange-500/30',
        icon: 'bg-gradient-to-br from-orange-500 to-amber-600',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        glow: 'shadow-orange-500/20',
      };
    case 'paid_rent':
      return {
        gradient: 'from-yellow-500/20 to-emerald-500/10',
        border: 'border-yellow-500/30',
        icon: 'bg-gradient-to-br from-yellow-500 to-emerald-600',
        badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        glow: 'shadow-yellow-500/20',
      };
    case 'order_cancelled':
      return {
        gradient: 'from-red-500/20 to-rose-500/10',
        border: 'border-red-500/30',
        icon: 'bg-gradient-to-br from-red-500 to-rose-600',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        glow: 'shadow-red-500/20',
      };
    case 'new_user':
      return {
        gradient: 'from-purple-500/20 to-violet-500/10',
        border: 'border-purple-500/30',
        icon: 'bg-gradient-to-br from-purple-500 to-violet-600',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        glow: 'shadow-purple-500/20',
      };
    case 'new_review':
      return {
        gradient: 'from-yellow-500/20 to-amber-500/10',
        border: 'border-yellow-500/30',
        icon: 'bg-gradient-to-br from-yellow-500 to-amber-600',
        badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        glow: 'shadow-yellow-500/20',
      };
    default:
      return {
        gradient: 'from-gray-500/20 to-slate-500/10',
        border: 'border-gray-500/30',
        icon: 'bg-gradient-to-br from-gray-500 to-slate-600',
        badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        glow: 'shadow-gray-500/20',
      };
  }
};

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

/**
 * Format time ago string for notifications
 */
export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Check if notification type is high priority (should play sound)
 */
export const isHighPriorityNotification = (type: AdminNotificationType): boolean => {
  return ['paid_order', 'paid_rent', 'new_order', 'new_rent'].includes(type);
};

export default {
  getNotificationIcon,
  getNotificationStyle,
  getNotificationTypeLabel,
  formatNotificationTime,
  isHighPriorityNotification,
};
