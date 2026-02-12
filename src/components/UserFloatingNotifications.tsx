import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { customerNotificationService, CustomerNotification } from '../services/customerNotificationService';
import { supabase } from '../services/supabase';

type NotificationItem = CustomerNotification & { _ts: number };

const UserFloatingNotifications: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const lastSeenRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const canRealtime = useMemo(() => !!supabase, []);

  useEffect(() => {
    let channel: any = null;

    async function bootstrap() {
      try {
        const latest = await customerNotificationService.getLatest(5, user?.id);
        if (latest?.length) {
          lastSeenRef.current = latest[0].created_at;
        }
      } catch { /* ignore */ }

      if (canRealtime && supabase) {
        // Subscribe hanya ke notifikasi untuk user ini (filter server-side)
        // Jika tidak ada user_id, subscribe ke global notifications saja (user_id IS NULL)
        const filterConfig = user?.id
          ? { event: 'INSERT' as const, schema: 'public', table: 'customer_notifications', filter: `user_id=eq.${user.id}` }
          : { event: 'INSERT' as const, schema: 'public', table: 'customer_notifications', filter: `user_id=is.null` };

        channel = supabase
          .channel(`customer_notifications:${user?.id || 'global'}`)
          .on(
            'postgres_changes',
            filterConfig,
            (payload: any) => {
              const n = payload?.new as CustomerNotification;
              push(n);
            }
          )
          .subscribe();
      }

      // Fallback polling if realtime not available
      if (!canRealtime) {
        pollingRef.current = window.setInterval(async () => {
          try {
              const latest = await customerNotificationService.getLatest(1, user?.id);
            const newest = latest?.[0];
            if (newest && (!lastSeenRef.current || new Date(newest.created_at).getTime() > new Date(lastSeenRef.current).getTime())) {
              lastSeenRef.current = newest.created_at;
              push(newest);
            }
          } catch { /* ignore */ }
        }, 60000); // 60 detik (sebelumnya 15 detik — hemat egress 4x)
      }
    }

    bootstrap();

    return () => {
      try { channel && supabase?.removeChannel(channel); } catch { /* noop */ }
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canRealtime]);

  function push(n: CustomerNotification) {
    const item: NotificationItem = { ...n, _ts: Date.now() };
    setItems((prev) => [item, ...prev].slice(0, 6));
    // Auto-dismiss after 8s
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x._ts !== item._ts));
    }, 8000);
  }

  function dismiss(ts: number) {
    setItems((prev) => prev.filter((x) => x._ts !== ts));
  }

  function onClick(item: NotificationItem) {
    if (item.link_url) {
      window.location.href = item.link_url;
    }
  }

  if (!items.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] space-y-2 max-w-sm" role="region" aria-live="polite" aria-label="Notifikasi baru">
      {items.map((n) => (
        <div key={n._ts} className="bg-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] rounded-cyber-lg shadow-lg border-l-4 border-[var(--cyber-pink-primary)] overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="p-1 rounded-full text-white bg-[var(--cyber-pink-primary)]">
                  {/* simple dot/icon */}
                  <span className="block w-3 h-3 rounded-full bg-[var(--cyber-bg-surface)]/90" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(n)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{n.title}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--cyber-bg-elevated)] shrink-0">Baru</span>
                  </div>
                  {n.body ? (
                    <p className="text-xs text-[var(--cyber-text-disabled)] line-clamp-2">{n.body}</p>
                  ) : null}
                  <p className="text-[11px] text-[var(--cyber-text-muted)] mt-1">
                    {new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button onClick={() => dismiss(n._ts)} className="h-6 w-6 shrink-0 rounded hover:bg-[var(--cyber-bg-card)] flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {items.length > 5 && (
        <div className="bg-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] rounded-cyber-lg shadow-lg">
          <div className="p-2 text-center">
            <p className="text-xs text-[var(--cyber-text-disabled)]">+{items.length - 5} notifikasi lainnya</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFloatingNotifications;
