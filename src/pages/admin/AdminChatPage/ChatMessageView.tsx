/**
 * ChatMessageView.tsx
 * Komponen tampilan daftar pesan chat dengan bubble, avatar, gambar, dan grouping
 */

import { forwardRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import { formatTime, getInitials } from './chatHelpers';
import type { ChatMessage } from '../../../types/chat';

interface ChatMessageViewProps {
  /** Daftar pesan untuk ditampilkan */
  messages: ChatMessage[];
  /** Status loading pesan */
  loading: boolean;
}

/** Tampilan daftar pesan dengan bubble, avatar, gambar, dan auto-scroll */
export const ChatMessageView = forwardRef<HTMLDivElement, ChatMessageViewProps>(
  ({ messages, loading }, ref) => {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    return (
      <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <AdminLoadingState message="Memuat pesan..." />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--admin-accent)]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Belum ada pesan dalam percakapan ini
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Deteksi apakah pesan sebelumnya dari pengirim yang sama (grouping)
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isSameSender = prevMsg?.senderType === msg.senderType && prevMsg?.senderId === msg.senderId;
            
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2',
                  msg.senderType === 'admin' ? 'justify-end' : 'justify-start',
                  isSameSender ? 'mt-0.5' : 'mt-3',
                  msg.senderType === 'system' && 'justify-center'
                )}
              >
                {/* Avatar pelanggan (kiri) */}
                {msg.senderType !== 'admin' && msg.senderType !== 'system' && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--admin-info)]/15',
                    isSameSender ? 'invisible' : 'visible'
                  )}>
                    <span className="text-[10px] font-bold text-[var(--admin-info)]">
                      {getInitials(msg.senderName || 'CU')}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[70%] px-3 py-2',
                    msg.senderType === 'admin'
                      ? 'bg-[var(--admin-accent)] text-white rounded-2xl rounded-br-md'
                      : msg.senderType === 'system'
                      ? 'bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] text-xs italic rounded-full px-4 py-1.5 max-w-none'
                      : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text)] rounded-2xl rounded-bl-md border border-[var(--admin-border)]'
                  )}
                >
                  {/* Nama pengirim — hanya tampilkan saat bukan grouped */}
                  {msg.senderType !== 'admin' && msg.senderType !== 'system' && !isSameSender && (
                    <p className="text-[10px] font-semibold text-[var(--admin-info)] mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  {msg.senderType === 'admin' && !isSameSender && (
                    <p className="text-[10px] font-semibold text-white/80 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  {/* Lampiran gambar */}
                  {msg.messageType === 'image' && msg.attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(msg.attachmentUrl!)}
                      className="block mb-1 rounded-lg overflow-hidden max-w-[220px] cursor-zoom-in"
                    >
                      <img
                        src={msg.attachmentUrl}
                        alt={msg.attachmentName || 'Gambar'}
                        className="w-full h-auto rounded-lg"
                        loading="lazy"
                      />
                    </button>
                  )}
                  {msg.senderType !== 'system' && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  )}
                  {msg.senderType === 'system' && (
                    <span>{msg.message}</span>
                  )}
                  {msg.senderType !== 'system' && (
                    <p className={cn(
                      'text-[10px] mt-1',
                      msg.senderType === 'admin' ? 'text-white/60' : 'text-[var(--admin-text-muted)]'
                    )}>
                      {formatTime(msg.createdAt)}
                    </p>
                  )}
                </div>

                {/* Avatar admin (kanan) */}
                {msg.senderType === 'admin' && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--admin-accent)]/15',
                    isSameSender ? 'invisible' : 'visible'
                  )}>
                    <span className="text-[10px] font-bold text-[var(--admin-accent)]">
                      {getInitials(msg.senderName || 'AD')}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Elemen scroll anchor */}
        <div ref={ref} />
      </div>

      {/* Lightbox gambar — fullscreen overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center text-lg hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Gambar penuh"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      </>
    );
  }
);

ChatMessageView.displayName = 'ChatMessageView';
