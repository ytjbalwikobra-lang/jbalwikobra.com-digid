/**
 * ChatActivityLog.tsx
 * Komponen sidebar log aktivitas percakapan
 */

import React from 'react';
import { History } from 'lucide-react';
import { formatDate, getActivityLabel } from './chatHelpers';
import type { ChatActivityLog as ActivityLogType } from '../../../types/chat';

interface ChatActivityLogProps {
  /** Daftar log aktivitas percakapan */
  activityLogs: ActivityLogType[];
}

/** Sidebar yang menampilkan riwayat aktivitas percakapan */
export const ChatActivityLog: React.FC<ChatActivityLogProps> = ({ activityLogs }) => {
  return (
    <div className="w-72 overflow-y-auto p-4">
      <h4 className="font-medium text-[var(--admin-text)] mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        Log Aktivitas
      </h4>
      {activityLogs.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)]">
          Belum ada aktivitas
        </p>
      ) : (
        <div className="space-y-3">
          {activityLogs.map((log) => (
            <div key={log.id} className="text-sm">
              <p className="text-[var(--admin-text)]">
                <span className="font-medium">{log.actorName || log.actorType}</span>
                {' '}{getActivityLabel(log.action)}
              </p>
              <p className="text-xs text-[var(--admin-text-muted)]">
                {formatDate(log.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
