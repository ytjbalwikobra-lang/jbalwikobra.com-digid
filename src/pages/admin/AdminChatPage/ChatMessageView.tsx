/**
 * ChatMessageView.tsx
 * Komponen tampilan daftar pesan chat dengan bubble
 */

import { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import { formatTime } from './chatHelpers';
import type { ChatMessage } from '../../../types/chat';

interface ChatMessageViewProps {
  /** Daftar pesan untuk ditampilkan */
  messages: ChatMessage[];
  /** Status loading pesan */
  loading: boolean;
}

/** Tampilan daftar pesan dengan bubble dan auto-scroll */
export const ChatMessageView = forwardRef<HTMLDivElement, ChatMessageViewProps>(
  ({ messages, loading }, ref) => {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <AdminLoadingState message="Memuat pesan..." />
        ) : messages.length === 0 ? (
          <p className="text-center text-[var(--admin-text-muted)] py-8">
            Belum ada pesan
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.senderType === 'admin' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2',
                  msg.senderType === 'admin'
                    ? 'bg-[var(--admin-accent)] text-white'
                    : msg.senderType === 'system'
                    ? 'bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] text-sm italic'
                    : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text)]'
                )}
              >
                {/* Nama pengirim untuk pesan pelanggan */}
                {msg.senderType !== 'admin' && msg.senderType !== 'system' && (
                  <p className="text-xs font-medium text-[var(--admin-accent)] mb-1">
                    {msg.senderName}
                  </p>
                )}
                {/* Nama pengirim untuk pesan admin */}
                {msg.senderType === 'admin' && (
                  <p className="text-xs font-medium text-white/80 mb-1">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={cn(
                  'text-xs mt-1',
                  msg.senderType === 'admin' ? 'text-white/70' : 'text-[var(--admin-text-muted)]'
                )}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        {/* Elemen scroll anchor */}
        <div ref={ref} />
      </div>
    );
  }
);

ChatMessageView.displayName = 'ChatMessageView';
