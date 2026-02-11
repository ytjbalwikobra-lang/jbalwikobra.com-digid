/**
 * ChatView.tsx
 * Tampilan pesan chat dengan input dan indikator mengetik
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
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-[var(--cyber-text-muted)] text-sm py-8">
            Belum ada pesan
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.senderType === 'customer'
                  ? 'bg-[var(--cyber-accent)] text-white'
                  : msg.senderType === 'system'
                  ? 'bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] text-sm italic'
                  : 'bg-[var(--cyber-bg-surface)] text-[var(--cyber-text)]'
              }`}
            >
              {/* Nama admin pengirim */}
              {msg.senderType === 'admin' && (
                <p className="text-xs font-medium text-[var(--cyber-accent)] mb-1">
                  {msg.senderName}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              <p className={`text-xs mt-1 ${
                msg.senderType === 'customer' ? 'text-white/70' : 'text-[var(--cyber-text-muted)]'
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
        <div className="px-4 py-1.5 border-t border-[var(--cyber-border)]">
          <p className="text-xs text-[var(--cyber-text-secondary)] flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Admin sedang mengetik...
          </p>
        </div>
      )}

      {/* Input Pesan — padding bawah ekstra untuk safe area iOS */}
      <form onSubmit={onSubmit} className="p-3 border-t border-[var(--cyber-border)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="text-xs text-[var(--cyber-error)] mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => onInputChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] text-base sm:text-sm"
            placeholder="Ketik pesan..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="px-3 py-2 bg-[var(--cyber-accent)] text-white rounded-lg hover:bg-[var(--cyber-accent)]/90 active:scale-95 transition-all disabled:opacity-50 touch-manipulation"
          >
            <SendIcon />
          </button>
        </div>
        <button
          type="button"
          onClick={onEndChat}
          className="w-full mt-2 text-xs text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text)] transition-colors"
        >
          Selesaikan Chat
        </button>
      </form>
    </div>
  );
};
