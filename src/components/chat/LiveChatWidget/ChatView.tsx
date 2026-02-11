/**
 * ChatView.tsx
 * Tampilan pesan chat dengan input, avatar, dan indikator mengetik
 */

import React from 'react';
import { SendIcon } from './ChatIcons';
import type { ChatMessage } from '../../../types/chat';

interface ChatViewProps {
  /** Daftar pesan */
  messages: ChatMessage[];
  /** Teks pesan baru */
  newMessage: string;
  /** Status loading */
  isLoading: boolean;
  /** Pesan error */
  error: string | null;
  /** Apakah admin sedang mengetik */
  adminTyping: boolean;
  /** Ref untuk scroll ke bawah */
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Ref untuk input pesan */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Handler perubahan input pesan */
  onInputChange: (value: string) => void;
  /** Handler submit pesan */
  onSubmit: (e: React.FormEvent) => void;
  /** Handler selesaikan chat */
  onEndChat: () => void;
}

/** Ambil inisial nama (1-2 huruf) */
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** Format waktu ke format Indonesia */
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/** Tampilan percakapan chat dengan daftar pesan, input, dan indikator mengetik */
export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  newMessage,
  isLoading,
  error,
  adminTyping,
  messagesEndRef,
  inputRef,
  onInputChange,
  onSubmit,
  onEndChat
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Daftar Pesan */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Pesan selamat datang saat kosong */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--cyber-accent)]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--cyber-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--cyber-text-muted)] text-center">
              Percakapan dimulai — ketik pesan pertama Anda
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Avatar admin/system (kiri) */}
            {msg.senderType !== 'customer' && msg.senderType !== 'system' && (
              <div className="w-7 h-7 rounded-full bg-[var(--cyber-accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[var(--cyber-accent)]">
                  {getInitials(msg.senderName || 'CS')}
                </span>
              </div>
            )}

            <div
              className={`max-w-[75%] px-3 py-2 ${
                msg.senderType === 'customer'
                  ? 'bg-[var(--cyber-accent)] text-white rounded-2xl rounded-br-md'
                  : msg.senderType === 'system'
                  ? 'bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] text-sm italic rounded-lg mx-auto max-w-[90%]'
                  : 'bg-[var(--cyber-bg-surface)] text-[var(--cyber-text-primary)] rounded-2xl rounded-bl-md border border-[var(--cyber-border)]'
              }`}
            >
              {/* Nama admin pengirim */}
              {msg.senderType === 'admin' && (
                <p className="text-[10px] font-semibold text-[var(--cyber-accent)] mb-0.5">
                  {msg.senderName}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              <p className={`text-[10px] mt-1 ${
                msg.senderType === 'customer' ? 'text-white/60' : 'text-[var(--cyber-text-muted)]'
              }`}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Indikator Admin Mengetik */}
      {adminTyping && (
        <div className="px-4 py-2 border-t border-[var(--cyber-border)]">
          <p className="text-xs text-[var(--cyber-text-secondary)] flex items-center gap-2">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Admin sedang mengetik...
          </p>
        </div>
      )}

      {/* Input Pesan — padding bawah ekstra untuk safe area iOS */}
      <form onSubmit={onSubmit} className="p-3 border-t border-[var(--cyber-border)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && (
          <div className="flex items-center gap-2 p-2 mb-2 bg-[var(--cyber-error)]/10 rounded-lg">
            <svg className="w-3.5 h-3.5 text-[var(--cyber-error)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-[var(--cyber-error)]">{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => onInputChange(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-xl text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] focus:ring-1 focus:ring-[var(--cyber-accent)]/30 transition-all text-base sm:text-sm"
            placeholder="Ketik pesan..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="w-10 h-10 bg-[var(--cyber-accent)] text-white rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 touch-manipulation flex items-center justify-center shrink-0"
          >
            <SendIcon />
          </button>
        </div>
        {/* Tombol selesaikan chat — lebih jelas */}
        <button
          type="button"
          onClick={onEndChat}
          className="w-full mt-2 py-1.5 text-xs text-[var(--cyber-text-muted)] hover:text-[var(--cyber-error)] hover:bg-[var(--cyber-error)]/5 rounded-lg transition-all touch-manipulation"
        >
          Selesaikan Chat
        </button>
      </form>
    </div>
  );
};
