/**
 * ChatActivityLog.tsx
 * Komponen sidebar log aktivitas percakapan dengan timeline visual
 */

import React from 'react';
import { History, UserPlus, UserMinus, CheckCircle, XCircle, MessageSquare, Star, Upload, RotateCcw } from 'lucide-react';
import { formatDate, getActivityLabel } from './chatHelpers';
import type { ChatActivityLog as ActivityLogType } from '../../../types/chat';

interface ChatActivityLogProps {
  /** Daftar log aktivitas percakapan */
  activityLogs: ActivityLogType[];
}

/** Konfigurasi warna & ikon per tipe aksi */
function getActionConfig(action: string): { color: string; Icon: React.FC<{ className?: string }> } {
  switch (action) {
    case 'conversation_started':
      return { color: 'var(--admin-info)', Icon: MessageSquare };
    case 'conversation_assigned':
    case 'admin_joined':
      return { color: 'var(--admin-warning)', Icon: UserPlus };
    case 'conversation_resolved':
      return { color: 'var(--admin-success)', Icon: CheckCircle };
    case 'conversation_closed':
      return { color: 'var(--admin-text-muted)', Icon: XCircle };
    case 'conversation_reopened':
      return { color: 'var(--admin-info)', Icon: RotateCcw };
    case 'admin_left':
    case 'conversation_reassigned':
      return { color: 'var(--admin-orange)', Icon: UserMinus };
    case 'file_uploaded':
      return { color: 'var(--admin-purple)', Icon: Upload };
    case 'rating_submitted':
      return { color: 'var(--admin-accent)', Icon: Star };
    default:
      return { color: 'var(--admin-text-muted)', Icon: History };
  }
}

/** Sidebar timeline riwayat aktivitas percakapan */
export const ChatActivityLog: React.FC<ChatActivityLogProps> = ({ activityLogs }) => {
  return (
    <div className="overflow-y-auto p-4">
      {/* Header — hanya ditampilkan di desktop (mobile punya header sendiri di ChatPanel) */}
      <h4 className="hidden lg:flex font-medium text-[var(--admin-text)] mb-3 items-center gap-2">
        <History className="w-4 h-4" />
        Log Aktivitas
      </h4>
      {activityLogs.length === 0 ? (
        <div className="flex flex-col items-center py-6">
          <History className="w-8 h-8 text-[var(--admin-text-muted)] mb-2 opacity-40" />
          <p className="text-xs text-[var(--admin-text-muted)]">Belum ada aktivitas</p>
        </div>
      ) : (
        <div className="relative">
          {/* Garis timeline */}
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[var(--admin-border)]" />
          <div className="space-y-4">
            {activityLogs.map((log) => {
              const { color, Icon } = getActionConfig(log.action);
              return (
                <div key={log.id} className="relative flex gap-3 pl-0">
                  {/* Dot timeline */}
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 z-[1]"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, var(--admin-bg-card))` }}
                  >
                    <span style={{ color }}><Icon className="w-2.5 h-2.5" /></span>
                  </div>
                  {/* Konten log */}
                  <div className="min-w-0 flex-1 -mt-0.5">
                    <p className="text-xs text-[var(--admin-text)]">
                      <span className="font-medium">{log.actorName || log.actorType}</span>
                      {' '}{getActivityLabel(log.action)}
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
