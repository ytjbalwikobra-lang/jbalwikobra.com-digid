/**
 * ChatMessageView.tsx
 * Tampilan pesan chat ala LINE — bubble terpisah, avatar, grouping tanggal, gambar, lightbox
 */

import { forwardRef, useState, useMemo } from 'react';
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

/** Kelompokkan pesan berdasarkan tanggal untuk separator */
function groupMessagesByDate(messages: ChatMessage[]): { date: string; msgs: ChatMessage[] }[] {
  const groups: { date: string; msgs: ChatMessage[] }[] = [];
  let current: { date: string; msgs: ChatMessage[] } | null = null;

  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const dateKey = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!current || current.date !== dateKey) {
      current = { date: dateKey, msgs: [] };
      groups.push(current);
    }
    current.msgs.push(msg);
  }
  return groups;
}

/** Tampilan daftar pesan LINE-style dengan bubble, avatar, tanggal, gambar, dan auto-scroll */
export const ChatMessageView = forwardRef<HTMLDivElement, ChatMessageViewProps>(
  ({ messages, loading }, ref) => {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const dateGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

    return (
      <>
      {/* Latar belakang chat LINE-style dengan pattern halus */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a2e] relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 14px)',
        }} />
        
        <div className="relative z-[1] px-3 py-4 space-y-1">
        {loading ? (
          <AdminLoadingState message="Memuat pesan..." />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-[var(--admin-accent)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Belum ada pesan dalam percakapan ini
            </p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.date}>
              {/* Separator tanggal — sticky & centered */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 bg-black/50 text-white/80 text-[11px] font-medium rounded-full backdrop-blur-sm shadow-sm">
                  {group.date}
                </span>
              </div>

              {group.msgs.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const isSameSender = prevMsg?.senderType === msg.senderType && prevMsg?.senderId === msg.senderId;
                const isAdmin = msg.senderType === 'admin';
                const isSystem = msg.senderType === 'system';
                const isCustomer = msg.senderType === 'customer';

                // Pesan sistem — center, pill
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3 py-1 bg-black/40 text-white/70 text-[11px] rounded-full backdrop-blur-sm max-w-[85%] text-center">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-1.5',
                      isAdmin ? 'justify-end' : 'justify-start',
                      isSameSender ? 'mt-0.5' : 'mt-3'
                    )}
                  >
                    {/* Avatar pelanggan (kiri) */}
                    {isCustomer && (
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm',
                        isSameSender ? 'invisible' : 'visible'
                      )}>
                        <span className="text-[11px] font-bold">
                          {getInitials(msg.senderName || 'CU')}
                        </span>
                      </div>
                    )}

                    {/* Blok bubble + waktu — waktu di samping bubble */}
                    <div className={cn(
                      'flex items-end gap-1.5 max-w-[72%]',
                      isAdmin ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      {/* Bubble pesan */}
                      <div
                        className={cn(
                          'relative px-3 py-2 shadow-sm',
                          isAdmin
                            ? 'bg-[#06C755] text-white rounded-2xl rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm'
                        )}
                      >
                        {/* Nama pengirim */}
                        {isCustomer && !isSameSender && (
                          <p className="text-[10px] font-semibold text-blue-600 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        {isAdmin && !isSameSender && (
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
                        {msg.message && (
                          <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        )}
                      </div>

                      {/* Waktu — di samping bubble ala LINE */}
                      <span className="text-[10px] text-white/40 shrink-0 pb-0.5 select-none">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Avatar admin (kanan) */}
                    {isAdmin && (
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        'bg-gradient-to-br from-[var(--admin-accent)] to-purple-500 text-white shadow-sm',
                        isSameSender ? 'invisible' : 'visible'
                      )}>
                        <span className="text-[11px] font-bold">
                          {getInitials(msg.senderName || 'AD')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        {/* Elemen scroll anchor */}
        <div ref={ref} />
        </div>
      </div>

      {/* Lightbox gambar — fullscreen overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/15 text-white rounded-full flex items-center justify-center text-lg hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Gambar penuh"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      </>
    );
  }
);

ChatMessageView.displayName = 'ChatMessageView';
