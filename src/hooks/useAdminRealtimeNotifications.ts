/**
 * useAdminRealtimeNotifications Hook v2
 * 
 * Centralized real-time notification subscription for admin panel.
 * Enhanced with robust reconnection, fallback polling, cache invalidation,
 * cross-tab sync, presence tracking, and connection status management.
 * 
 * Features:
 * - Single Supabase realtime subscription (shared across all components)
 * - Handles INSERT, UPDATE, DELETE events
 * - Automatic reconnection with exponential backoff (1s → 2s → 4s → ... → 30s max)
 * - Fallback polling when realtime is disconnected (30s intervals)
 * - Cache invalidation on realtime events
 * - Cross-tab synchronization via BroadcastChannel API
 * - Admin presence tracking (online/offline status)
 * - Optimistic updates with rollback on error
 * - Browser notification support
 * - Screen reader announcements (WCAG 2.1 AA)
 * - Connection status indicator support (connected/reconnecting/offline)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { adminNotificationService, AdminNotification } from '../services/adminNotificationService';
import { announceToScreenReader } from '../pages/admin/utils/accessibility';

// ========================================
// TYPES
// ========================================

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | 'INITIAL_LOAD' | 'REFRESH';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

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
  /** Detailed connection status: 'connected' | 'reconnecting' | 'offline' */
  connectionStatus: ConnectionStatus;
  /** Admin presence info: list of online admin users */
  onlineAdmins: AdminPresenceState[];
}

export interface AdminPresenceState {
  user_id: string;
  name: string;
  role: string;
  online_at: string;
}

// ========================================
// SINGLETON STATE
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharedChannel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let presenceChannel: any = null;
let subscriberCount = 0;
const listeners = new Set<(notifications: AdminNotification[], event: RealtimeEvent) => void>();
const connectionListeners = new Set<(status: ConnectionStatus) => void>();
const presenceListeners = new Set<(admins: AdminPresenceState[]) => void>();

// Global state
let globalNotifications: AdminNotification[] = [];
let globalLoading = false;
let globalError: string | null = null;
let globalConnectionStatus: ConnectionStatus = 'offline';
let globalOnlineAdmins: AdminPresenceState[] = [];

// Reconnection state
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_DELAY = 30_000; // 30 seconds max
const BASE_RECONNECT_DELAY = 1_000; // 1 second base

// Fallback polling state
let pollingTimer: ReturnType<typeof setInterval> | null = null;
const POLLING_INTERVAL = 60_000; // 60 detik — minimum sesuai aturan egress
let pollingActive = false;

// Cross-tab broadcast
let broadcastChannel: BroadcastChannel | null = null;
const BROADCAST_CHANNEL_NAME = 'admin-notifications-sync';

// ========================================
// HELPERS
// ========================================

// Sound notification helper
const playNotificationSound = (type: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'paid_order' || type === 'paid_rent') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else {
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

// Calculate exponential backoff delay
const getReconnectDelay = (attempt: number): number => {
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
};

// Update connection status globally and notify listeners
const setConnectionStatus = (status: ConnectionStatus) => {
  if (globalConnectionStatus === status) return;
  globalConnectionStatus = status;
  connectionListeners.forEach(listener => listener(status));
};

// Notify all notification listeners
const notifyListeners = (event: RealtimeEvent) => {
  listeners.forEach(listener => listener(globalNotifications, event));
};

// ========================================
// CROSS-TAB BROADCAST (Enhancement H)
// ========================================

interface BroadcastMessage {
  type: 'MARK_READ' | 'MARK_ALL_READ' | 'DELETE' | 'REFRESH' | 'INSERT';
  payload?: any;
  tabId: string;
}

const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const initBroadcastChannel = () => {
  if (broadcastChannel || typeof BroadcastChannel === 'undefined') return;
  
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, payload, tabId } = event.data;
      
      // Ignore messages from self
      if (tabId === TAB_ID) return;
      
      switch (type) {
        case 'MARK_READ': {
          const id = payload?.id;
          if (id) {
            globalNotifications = globalNotifications.map(n =>
              n.id === id ? { ...n, is_read: true } : n
            );
            notifyListeners('UPDATE');
          }
          break;
        }
        case 'MARK_ALL_READ': {
          globalNotifications = globalNotifications.map(n => ({ ...n, is_read: true }));
          notifyListeners('UPDATE');
          break;
        }
        case 'DELETE': {
          const id = payload?.id;
          if (id) {
            globalNotifications = globalNotifications.filter(n => n.id !== id);
            notifyListeners('DELETE');
          }
          break;
        }
        case 'INSERT': {
          const notif = payload?.notification as AdminNotification | undefined;
          if (notif && !globalNotifications.find(n => n.id === notif.id)) {
            globalNotifications = [notif, ...globalNotifications];
            notifyListeners('INSERT');
          }
          break;
        }
        case 'REFRESH': {
          // Another tab requested a refresh - invalidate cache and reload
          adminNotificationService.clearCache();
          break;
        }
      }
    };
  } catch {
    // BroadcastChannel not supported - silently ignore
  }
};

const broadcastAction = (message: Omit<BroadcastMessage, 'tabId'>) => {
  try {
    broadcastChannel?.postMessage({ ...message, tabId: TAB_ID });
  } catch {
    // Broadcast failed - non-critical
  }
};

// ========================================
// FALLBACK POLLING (Enhancement C)
// ========================================

const startPolling = () => {
  if (pollingActive) return;
  pollingActive = true;
  console.info('[AdminNotifications] Realtime disconnected — starting fallback polling (30s)');
  
  pollingTimer = setInterval(async () => {
    try {
      // Always get fresh data when polling
      adminNotificationService.clearCache();
      const data = await adminNotificationService.getAdminNotifications(50);
      if (data) {
        globalNotifications = data;
        notifyListeners('REFRESH');
      }
    } catch (err) {
      console.warn('[AdminNotifications] Polling failed:', err);
    }
  }, POLLING_INTERVAL);
};

const stopPolling = () => {
  if (!pollingActive) return;
  pollingActive = false;
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  console.info('[AdminNotifications] Realtime reconnected — stopping fallback polling');
};

// ========================================
// RECONNECTION LOGIC (Enhancement A)
// ========================================

const scheduleReconnect = () => {
  if (reconnectTimer) return; // Already scheduled
  
  const delay = getReconnectDelay(reconnectAttempt);
  reconnectAttempt++;
  setConnectionStatus('reconnecting');
  
  console.info(`[AdminNotifications] Scheduling reconnect attempt ${reconnectAttempt} in ${delay}ms`);
  
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    
    // Teardown existing channel
    if (sharedChannel) {
      try {
        sharedChannel.unsubscribe();
      } catch {
        // Ignore teardown errors
      }
      sharedChannel = null;
    }
    
    // Re-create and subscribe
    createRealtimeChannel();
  }, delay);
};

// Start fallback polling if disconnected for too long (>30s)
const startDisconnectWatchdog = () => {
  // Start polling as fallback immediately when we detect disconnect
  startPolling();
};

// ========================================
// REALTIME CHANNEL SETUP (Enhanced)
// ========================================

const createRealtimeChannel = () => {
  if (!supabase || sharedChannel) return;
  
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
        // Enhancement G: Filter only non-archived notifications
        filter: 'metadata->>archived=is.null',
      },
      (payload) => {
        const newNotif = payload.new as AdminNotification;
        
        // Skip if already in list (dedup)
        if (globalNotifications.find(n => n.id === newNotif.id)) return;
        
        globalNotifications = [newNotif, ...globalNotifications];
        
        // Enhancement B: Invalidate cache on realtime event
        adminNotificationService.clearCache();
        
        notifyListeners('INSERT');
        
        // Enhancement H: Broadcast to other tabs 
        broadcastAction({ type: 'INSERT', payload: { notification: newNotif } });
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
        
        // Enhancement B: Invalidate cache on realtime event
        adminNotificationService.clearCache();
        
        notifyListeners('UPDATE');
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
        
        // Enhancement B: Invalidate cache on realtime event
        adminNotificationService.clearCache();
        
        notifyListeners('DELETE');
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Enhancement A: Reset reconnect state on successful subscribe
        reconnectAttempt = 0;
        setConnectionStatus('connected');
        
        // Enhancement C: Stop fallback polling when realtime reconnects
        stopPolling();
        
        // Refresh data after reconnect to catch events missed during downtime
        if (globalNotifications.length > 0) {
          adminNotificationService.clearCache();
          adminNotificationService.getAdminNotifications(50).then(data => {
            if (data) {
              globalNotifications = data;
              notifyListeners('REFRESH');
            }
          }).catch(() => { /* Ignore refresh errors during reconnect */ });
        }
        
        console.info('[AdminNotifications] Realtime connected ✓');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[AdminNotifications] Realtime channel error — scheduling reconnect');
        setConnectionStatus('reconnecting');
        
        // Enhancement A: Schedule reconnection with exponential backoff
        sharedChannel = null;
        scheduleReconnect();
        
        // Enhancement C: Start fallback polling
        startDisconnectWatchdog();
      } else if (status === 'TIMED_OUT') {
        console.warn('[AdminNotifications] Realtime subscription timed out — scheduling reconnect');
        setConnectionStatus('reconnecting');
        sharedChannel = null;
        scheduleReconnect();
        startDisconnectWatchdog();
      } else if (status === 'CLOSED') {
        // Channel was closed (e.g., by server) — only reconnect if we still have subscribers
        if (subscriberCount > 0) {
          console.warn('[AdminNotifications] Realtime channel closed — scheduling reconnect');
          setConnectionStatus('offline');
          sharedChannel = null;
          scheduleReconnect();
          startDisconnectWatchdog();
        }
      }
    });
};

// ========================================
// PRESENCE TRACKING (Enhancement F)
// ========================================

const setupPresenceChannel = () => {
  if (!supabase || presenceChannel) return;
  
  // Get admin info from localStorage
  const adminData = (() => {
    try {
      const raw = localStorage.getItem('admin_user') || localStorage.getItem('session_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  
  if (!adminData) return;
  
  presenceChannel = supabase
    .channel('admin-presence', {
      config: {
        presence: { key: adminData.id || adminData.user_id || 'unknown' },
      },
    })
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const admins: AdminPresenceState[] = [];
      
      for (const key of Object.keys(state)) {
        const presences = state[key];
        if (Array.isArray(presences) && presences.length > 0) {
          const latest = presences[presences.length - 1];
          admins.push({
            user_id: key,
            name: latest.name || 'Admin',
            role: latest.role || 'admin',
            online_at: latest.online_at || new Date().toISOString(),
          });
        }
      }
      
      globalOnlineAdmins = admins;
      presenceListeners.forEach(listener => listener(admins));
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          name: adminData.name || adminData.full_name || 'Admin',
          role: adminData.role || 'admin',
          online_at: new Date().toISOString(),
        });
      }
    });
};

const teardownPresenceChannel = () => {
  if (presenceChannel) {
    try {
      presenceChannel.unsubscribe();
    } catch { /* ignore */ }
    presenceChannel = null;
    globalOnlineAdmins = [];
  }
};

// ========================================
// MAIN HOOK
// ========================================

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
  const [isConnected, setIsConnected] = useState(globalConnectionStatus === 'connected');
  const [connectionStatus, setLocalConnectionStatus] = useState<ConnectionStatus>(globalConnectionStatus);
  const [onlineAdmins, setOnlineAdmins] = useState<AdminPresenceState[]>(globalOnlineAdmins);
  
  const mountedRef = useRef(true);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  
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
  }, [enableSound, enableBrowserNotifications]);

  // Connection status listener
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    if (!mountedRef.current) return;
    setLocalConnectionStatus(status);
    setIsConnected(status === 'connected');
  }, []);

  // Presence listener
  const updatePresence = useCallback((admins: AdminPresenceState[]) => {
    if (!mountedRef.current) return;
    setOnlineAdmins(admins);
  }, []);

  // Subscribe to global listeners
  useEffect(() => {
    listeners.add(updateLocalState);
    connectionListeners.add(updateConnectionStatus);
    presenceListeners.add(updatePresence);
    
    // Initial sync with global state
    if (globalNotifications.length > 0) {
      updateLocalState(globalNotifications, 'INITIAL_LOAD');
    }
    // Sync connection status
    updateConnectionStatus(globalConnectionStatus);
    // Sync presence
    updatePresence(globalOnlineAdmins);
    
    return () => {
      listeners.delete(updateLocalState);
      connectionListeners.delete(updateConnectionStatus);
      presenceListeners.delete(updatePresence);
    };
  }, [updateLocalState, updateConnectionStatus, updatePresence]);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      globalLoading = true;
      setLoading(true);
      globalError = null;
      setError(null);
      
      // Enhancement B: Clear cache before fetching for manual refresh
      adminNotificationService.clearCache();
      const data = await adminNotificationService.getAdminNotifications(limitRef.current);
      globalNotifications = data || [];
      
      notifyListeners('INITIAL_LOAD');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      globalError = message;
      setError(message);
    } finally {
      globalLoading = false;
      setLoading(false);
    }
  }, []);

  // Setup shared realtime subscription + presence + cross-tab sync
  useEffect(() => {
    mountedRef.current = true;
    subscriberCount++;
    
    // Only create channels if they don't exist
    if (!sharedChannel && supabase) {
      createRealtimeChannel();
    }
    
    // Enhancement F: Setup presence
    if (!presenceChannel && supabase) {
      setupPresenceChannel();
    }
    
    // Enhancement H: Setup cross-tab broadcast
    initBroadcastChannel();
    
    // Initial load
    if (globalNotifications.length === 0 && !globalLoading) {
      loadNotifications();
    } else {
      updateLocalState(globalNotifications, 'INITIAL_LOAD');
    }

    return () => {
      mountedRef.current = false;
      subscriberCount--;
      
      // Only unsubscribe when no more subscribers
      if (subscriberCount === 0) {
        // Teardown realtime channel
        if (sharedChannel) {
          sharedChannel.unsubscribe();
          sharedChannel = null;
        }
        
        // Teardown presence
        teardownPresenceChannel();
        
        // Teardown broadcast channel
        if (broadcastChannel) {
          broadcastChannel.close();
          broadcastChannel = null;
        }
        
        // Stop polling and reconnect timers
        stopPolling();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        
        setConnectionStatus('offline');
        reconnectAttempt = 0;
      }
    };
  }, [loadNotifications, updateLocalState]);

  // Manual refresh
  const refresh = useCallback(async () => {
    // Enhancement B: Clear cache before manual refresh  
    adminNotificationService.clearCache();
    await loadNotifications();
    // Enhancement H: Tell other tabs to refresh too
    broadcastAction({ type: 'REFRESH' });
  }, [loadNotifications]);

  // Optimistic mark as read
  const markAsRead = useCallback(async (id: string) => {
    const previousState = [...globalNotifications];
    
    globalNotifications = globalNotifications.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    notifyListeners('UPDATE');
    
    // Enhancement H: Broadcast to other tabs
    broadcastAction({ type: 'MARK_READ', payload: { id } });
    
    try {
      await adminNotificationService.markAsRead(id);
    } catch (err) {
      globalNotifications = previousState;
      notifyListeners('UPDATE');
      throw err;
    }
  }, []);

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    const previousState = [...globalNotifications];
    
    globalNotifications = globalNotifications.map(n => ({ ...n, is_read: true }));
    notifyListeners('UPDATE');
    
    // Enhancement H: Broadcast to other tabs
    broadcastAction({ type: 'MARK_ALL_READ' });
    
    try {
      await adminNotificationService.markAllAsRead();
    } catch (err) {
      globalNotifications = previousState;
      notifyListeners('UPDATE');
      throw err;
    }
  }, []);

  // Optimistic delete
  const deleteNotification = useCallback(async (id: string) => {
    const previousState = [...globalNotifications];
    
    globalNotifications = globalNotifications.filter(n => n.id !== id);
    notifyListeners('DELETE');
    
    // Enhancement H: Broadcast to other tabs
    broadcastAction({ type: 'DELETE', payload: { id } });
    
    try {
      await adminNotificationService.deleteNotification(id);
    } catch (err) {
      globalNotifications = previousState;
      notifyListeners('DELETE');
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
    connectionStatus,
    onlineAdmins,
  };
}

export default useAdminRealtimeNotifications;
