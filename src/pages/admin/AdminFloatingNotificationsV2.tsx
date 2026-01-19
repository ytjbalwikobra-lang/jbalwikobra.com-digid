import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, 
  X,
  Check,
  ShoppingBag,
  CreditCard,
  User,
  XCircle,
  Star,
  Package,
  Settings,
  Sparkles
} from 'lucide-react';
import { adminNotificationService, AdminNotification } from '../../services/adminNotificationService';
import { supabase } from '../../services/supabase';
import { announceToScreenReader } from './utils/accessibility';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/helpers';
import { getNotificationStyle, formatNotificationTime } from './utils/notificationUtils';

interface NotificationItem extends AdminNotification {
  dismissed?: boolean;
  reappearAt?: number;
}

const MAX_VISIBLE = 3; // Show max 3 floating notifications at once
const AUTO_DISMISS_TIME = 8000; // 8 seconds
const REAPPEAR_TIME = 30000; // 30 seconds

// Sound notification helper
const playNotificationSound = (type: string) => {
  try {
    // Create an oscillator for a notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for different notification types
    if (type === 'paid_order' || type === 'paid_rent') {
      // Success/money sound - pleasant ascending tone
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else {
      // Generic notification sound - simple beep
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch {
    // Audio notification not available - silently ignore
  }
};

export const AdminFloatingNotificationsV2: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const lastSeenRef = useRef<string | null>(null);
  const dismissTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const reappearTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const loadLatestNotifications = useCallback(async () => {
    try {
      const data = await adminNotificationService.getAdminNotifications(20);
      if (data && data.length > 0) {
        const filtered = data.filter(n => 
          !n.type.includes('test') && 
          !n.type.includes('debug')
        );
        
        // Find new notifications
        const lastId = lastSeenRef.current;
        const newNotifs = lastId 
          ? filtered.filter(n => n.created_at > (filtered.find(x => x.id === lastId)?.created_at || ''))
          : filtered.slice(0, 5);

        if (newNotifs.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const toAdd = newNotifs
              .filter(n => !existingIds.has(n.id))
              .map(n => ({ ...n, dismissed: false }));
            
            return [...toAdd, ...prev].slice(0, 20);
          });
          
          // Update last seen
          lastSeenRef.current = filtered[0].id;
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  // Initial load and realtime subscription
  useEffect(() => {
    loadLatestNotifications();

    // Setup realtime subscription
    let channel: any = null;
    
    if (supabase) {
      channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications'
          },
          (payload) => {
            const newNotif = payload.new as AdminNotification;
            if (!newNotif.type.includes('test') && !newNotif.type.includes('debug')) {
              setNotifications(prev => [{ ...newNotif, dismissed: false }, ...prev].slice(0, 20));
              lastSeenRef.current = newNotif.id;
              
              // Play sound for paid notifications (purchase and rental)
              if (newNotif.type === 'paid_order' || newNotif.type === 'paid_rent') {
                playNotificationSound(newNotif.type);
              }
              
              // Announce to screen readers
              announceToScreenReader(
                `Notifikasi baru: ${newNotif.title}. ${newNotif.message}`,
                newNotif.type.includes('paid') ? 'assertive' : 'polite'
              );
            }
          }
        )
        .subscribe();
    }

    // Fallback polling
    const pollInterval = setInterval(() => {
      loadLatestNotifications();
    }, 5000);

    return () => {
      if (channel) channel.unsubscribe();
      clearInterval(pollInterval);
      Object.values(dismissTimersRef.current).forEach(clearTimeout);
      Object.values(reappearTimersRef.current).forEach(clearTimeout);
    };
  }, [loadLatestNotifications]);

  // Auto-dismiss unread notifications
  useEffect(() => {
    notifications.forEach(notif => {
      if (!notif.is_read && !notif.dismissed && !dismissTimersRef.current[notif.id]) {
        dismissTimersRef.current[notif.id] = setTimeout(() => {
          handleDismiss(notif.id, true); // Auto-dismiss with reappear
        }, AUTO_DISMISS_TIME);
      }
    });
  }, [notifications]);

  const handleDismiss = (id: string, withReappear: boolean = false) => {
    // Clear existing timers
    if (dismissTimersRef.current[id]) {
      clearTimeout(dismissTimersRef.current[id]);
      delete dismissTimersRef.current[id];
    }

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );

    // Set reappear timer for unread notifications
    if (withReappear) {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.is_read) {
        reappearTimersRef.current[id] = setTimeout(() => {
          setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, dismissed: false, reappearAt: Date.now() } : n)
          );
          delete reappearTimersRef.current[id];
        }, REAPPEAR_TIME);
      }
    }
  };

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );

    handleDismiss(id, false);

    // Clear reappear timer
    if (reappearTimersRef.current[id]) {
      clearTimeout(reappearTimersRef.current[id]);
      delete reappearTimersRef.current[id];
    }

    try {
      await adminNotificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      new_order: ShoppingBag,
      paid_order: CreditCard,
      new_user: User,
      order_cancelled: XCircle,
      new_review: Star,
      new_rent: Package,
      paid_rent: CreditCard,
      system: Settings,
    };
    const Icon = icons[type as keyof typeof icons] || Bell;
    return Icon;
  };

  // Get visible notifications (not dismissed, limit to MAX_VISIBLE)
  const visibleNotifications = notifications
    .filter(n => !n.dismissed && !n.is_read)
    .slice(0, MAX_VISIBLE);

  // Keyboard handler for notification cards
  const handleKeyDown = (e: React.KeyboardEvent, notificationId: string) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleMarkAsRead(notificationId);
        break;
      case 'Escape':
        e.preventDefault();
        handleDismiss(notificationId, true);
        break;
    }
  };

  // Get type label for screen readers
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      new_order: 'Pesanan baru',
      paid_order: 'Pembayaran diterima',
      new_user: 'Pengguna baru',
      order_cancelled: 'Pesanan dibatalkan',
      new_review: 'Ulasan baru',
      new_rent: 'Sewa baru',
      paid_rent: 'Pembayaran sewa diterima',
      system: 'Sistem',
    };
    return labels[type] || 'Notifikasi';
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div 
      className="fixed top-20 right-6 z-[100] space-y-3 max-w-md w-full pointer-events-none"
      role="region"
      aria-label={`${visibleNotifications.length} notifikasi belum dibaca`}
      aria-live="polite"
      aria-atomic="false"
    >
      {visibleNotifications.map((notification, index) => {
        const style = getNotificationStyle(notification.type);
        const Icon = getNotificationIcon(notification.type);
        const isReappearing = notification.reappearAt && Date.now() - notification.reappearAt < 3000;
        const typeLabel = getTypeLabel(notification.type);

        return (
          <div
            key={notification.id}
            role="alert"
            aria-label={`${typeLabel}: ${notification.title}`}
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, notification.id)}
            className={cn(
              'pointer-events-auto relative overflow-hidden rounded-2xl backdrop-blur-xl',
              'transform transition-all duration-500 ease-out',
              'animate-in slide-in-from-right-full',
              `animation-delay-${index * 100}`,
              style.bg,
              'border-2',
              style.border,
              'shadow-2xl',
              style.glow,
              isReappearing ? 'ring-4 ring-pink-500/50 animate-pulse' : '',
              'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent'
            )}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Glow effect */}
            <div 
              className={cn(
                'absolute inset-0 bg-gradient-to-r opacity-30 blur-xl',
                style.gradient
              )} 
              aria-hidden="true"
            />

            {/* Content */}
            <div className="relative p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div 
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                    style.gradient,
                    'relative'
                  )}
                  aria-hidden="true"
                >
                  <Icon className="w-6 h-6 text-white" />
                  
                  {/* Pulse indicator */}
                  <div className={cn(
                    'absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse',
                    style.pulse,
                    'shadow-lg'
                  )}>
                    <div className={cn(
                      'absolute inset-0 rounded-full animate-ping',
                      style.pulse,
                      'opacity-75'
                    )} />
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {notification.title}
                    </h4>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatNotificationTime(notification.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-2">
                    {notification.message}
                  </p>

                  {/* Meta info */}
                  {(notification.customer_name || notification.amount) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {notification.customer_name && (
                        <div className="px-2 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
                          <span className="text-xs text-white font-medium">
                            {notification.customer_name}
                          </span>
                        </div>
                      )}
                      {notification.amount && (
                        <div className="px-2 py-1 rounded-lg bg-emerald-500/20 backdrop-blur-sm">
                          <span className="text-xs text-emerald-300 font-bold">
                            {formatCurrency(notification.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2" role="group" aria-label="Aksi notifikasi">
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      aria-label={`Tandai notifikasi ${notification.title} sebagai sudah dibaca`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      Tandai Dibaca
                    </button>
                    
                    <button
                      onClick={() => handleDismiss(notification.id, true)}
                      aria-label={`Tutup sementara notifikasi ${notification.title}`}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Reappearing indicator */}
                  {isReappearing && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-pink-300 animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-medium">Belum dibaca - muncul kembali</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom progress bar for auto-dismiss */}
            {!notification.is_read && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div 
                  className={cn('h-full bg-gradient-to-r', style.gradient)}
                  style={{
                    animation: `progress ${AUTO_DISMISS_TIME}ms linear`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .animate-in {
          animation: slide-in-from-right 0.5s ease-out;
        }
        
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminFloatingNotificationsV2;
