/**
 * useAdminRealtimeNotifications Hook
 * 
 * Centralized real-time notification subscription for admin panel.
 * Follows ISO 8601 timestamps and minimizes egress with single subscription pattern.
 * 
 * Features:
 * - Single Supabase realtime subscription (shared across all components)
 * - Handles INSERT, UPDATE, DELETE events
 * - Automatic reconnection with exponential backoff
 * - Optimistic updates with rollback on error
 * - Browser notification support
 * - Screen reader announcements (WCAG 2.1 AA)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { adminNotificationService, AdminNotification } from '../services/adminNotificationService';
import { announceToScreenReader } from '../pages/admin/utils/accessibility';

// Singleton pattern for shared subscription
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharedChannel: any = null;
let subscriberCount = 0;
const listeners = new Set<(notifications: AdminNotification[], event: RealtimeEvent) => void>();

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | 'INITIAL_LOAD' | 'REFRESH';

interface UseAdminRealtimeNotificationsOptions {
  /** Initial fetch limit */
  limit?: number;
  /** Enable browser notifications */
  enableBrowserNotifications?: boolean;
  /** Play sound on new notification */
  enableSound?: boolean;
  /** Filter function for notifications */
  filter?: (notification: AdminNotification) => boolean;
}

interface UseAdminRealtimeNotificationsReturn {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** Manual refresh notifications */
  refresh: () => Promise<void>;
  /** Mark notification as read (optimistic) */
  markAsRead: (id: string) => Promise<void>;
  /** Mark all as read (optimistic) */
  markAllAsRead: () => Promise<void>;
  /** Delete notification (optimistic) */
  deleteNotification: (id: string) => Promise<void>;
  /** Connection status */
  isConnected: boolean;
}

// Sound notification helper - centralized
const playNotificationSound = (type: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
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
      // Generic notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch {
    // Audio not available - silently ignore
  }
};

// Browser notification helper
const showBrowserNotification = async (notification: AdminNotification) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type.includes('paid'),
    });
  }
};

// Global notification state
let globalNotifications: AdminNotification[] = [];
let globalLoading = false;
let globalError: string | null = null;
let globalIsConnected = false;

export function useAdminRealtimeNotifications(
  options: UseAdminRealtimeNotificationsOptions = {}
): UseAdminRealtimeNotificationsReturn {
  const {
    limit = 50,
    enableBrowserNotifications = false,
    enableSound = true,
    filter,
  } = options;

  const [notifications, setNotifications] = useState<AdminNotification[]>(globalNotifications);
  const [loading, setLoading] = useState(globalLoading);
  const [error, setError] = useState<string | null>(globalError);
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  
  const mountedRef = useRef(true);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  
  // Use ref for filter to prevent recreation of updateLocalState on filter change
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Update local state from global notifications
  const updateLocalState = useCallback((notifs: AdminNotification[], event: RealtimeEvent) => {
    if (!mountedRef.current) return;
    
    const currentFilter = filterRef.current;
    const filtered = currentFilter ? notifs.filter(currentFilter) : notifs;
    setNotifications(filtered);
    
    // Handle new notification events
    if (event === 'INSERT' && notifs.length > 0) {
      const newest = notifs[0];
      if (enableSound) {
        playNotificationSound(newest.type);
      }
      if (enableBrowserNotifications) {
        showBrowserNotification(newest);
      }
      announceToScreenReader(
        `Notifikasi baru: ${newest.title}`,
        newest.type.includes('paid') ? 'assertive' : 'polite'
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableSound, enableBrowserNotifications]); // filter is accessed via ref to prevent infinite loops

  // Subscribe to global listener
  useEffect(() => {
    listeners.add(updateLocalState);
    
    // Initial sync with global state
    if (globalNotifications.length > 0) {
      updateLocalState(globalNotifications, 'INITIAL_LOAD');
    }
    
    return () => {
      listeners.delete(updateLocalState);
    };
  }, [updateLocalState]);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      globalLoading = true;
      setLoading(true);
      globalError = null;
      setError(null);
      
      const data = await adminNotificationService.getAdminNotifications(limitRef.current);
      globalNotifications = data || [];
      
      // Notify all listeners
      listeners.forEach(listener => listener(globalNotifications, 'INITIAL_LOAD'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      globalError = message;
      setError(message);
    } finally {
      globalLoading = false;
      setLoading(false);
    }
  }, []);

  // Setup shared realtime subscription
  useEffect(() => {
    mountedRef.current = true;
    subscriberCount++;
    
    // Only create channel if it doesn't exist
    if (!sharedChannel && supabase) {
      sharedChannel = supabase
        .channel('admin-notifications-unified', {
          config: {
            broadcast: { self: true },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications',
          },
          (payload) => {
            const newNotif = payload.new as AdminNotification;
            globalNotifications = [newNotif, ...globalNotifications];
            listeners.forEach(listener => listener(globalNotifications, 'INSERT'));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'admin_notifications',
          },
          (payload) => {
            const updated = payload.new as AdminNotification;
            globalNotifications = globalNotifications.map(n => 
              n.id === updated.id ? updated : n
            );
            listeners.forEach(listener => listener(globalNotifications, 'UPDATE'));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'admin_notifications',
          },
          (payload) => {
            const deleted = payload.old as { id: string };
            globalNotifications = globalNotifications.filter(n => n.id !== deleted.id);
            listeners.forEach(listener => listener(globalNotifications, 'DELETE'));
          }
        )
        .subscribe((status) => {
          globalIsConnected = status === 'SUBSCRIBED';
          setIsConnected(globalIsConnected);
          
          if (status === 'SUBSCRIBED') {
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Admin notifications realtime error');
          }
        });
    }
    
    // Initial load
    if (globalNotifications.length === 0 && !globalLoading) {
      loadNotifications();
    } else {
      // Sync local state with global
      updateLocalState(globalNotifications, 'INITIAL_LOAD');
    }

    return () => {
      mountedRef.current = false;
      subscriberCount--;
      
      // Only unsubscribe when no more subscribers
      if (subscriberCount === 0 && sharedChannel) {
        sharedChannel.unsubscribe();
        sharedChannel = null;
        globalIsConnected = false;
      }
    };
  }, [loadNotifications, updateLocalState]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Optimistic mark as read
  const markAsRead = useCallback(async (id: string) => {
    const previousState = [...globalNotifications];
    
    // Optimistic update
    globalNotifications = globalNotifications.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    listeners.forEach(listener => listener(globalNotifications, 'UPDATE'));
    
    try {
      await adminNotificationService.markAsRead(id);
    } catch (err) {
      // Rollback on error
      globalNotifications = previousState;
      listeners.forEach(listener => listener(globalNotifications, 'UPDATE'));
      throw err;
    }
  }, []);

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    const previousState = [...globalNotifications];
    
    // Optimistic update
    globalNotifications = globalNotifications.map(n => ({ ...n, is_read: true }));
    listeners.forEach(listener => listener(globalNotifications, 'UPDATE'));
    
    try {
      await adminNotificationService.markAllAsRead();
    } catch (err) {
      // Rollback on error
      globalNotifications = previousState;
      listeners.forEach(listener => listener(globalNotifications, 'UPDATE'));
      throw err;
    }
  }, []);

  // Optimistic delete
  const deleteNotification = useCallback(async (id: string) => {
    const previousState = [...globalNotifications];
    
    // Optimistic update
    globalNotifications = globalNotifications.filter(n => n.id !== id);
    listeners.forEach(listener => listener(globalNotifications, 'DELETE'));
    
    try {
      await adminNotificationService.deleteNotification(id);
    } catch (err) {
      // Rollback on error
      globalNotifications = previousState;
      listeners.forEach(listener => listener(globalNotifications, 'DELETE'));
      throw err;
    }
  }, []);

  // Compute unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isConnected,
  };
}

export default useAdminRealtimeNotifications;
