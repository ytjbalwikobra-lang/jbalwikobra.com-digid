/**
 * ConversationListView.tsx
 * Daftar percakapan aktif milik user yang login.
 * Hanya menampilkan percakapan dengan status open/assigned.
 */

import React from 'react';
import type { CustomerConversationSummary } from '../../../services/chatCustomerService';
import { ArrowRightIcon } from './ChatIcons';

/** Label topik yang mudah dibaca */
const TOPIC_LABELS: Record<string, string> = {
  pembelian_rental: '🛒 Pembelian/Rental',
  jual_akun: '💰 Jual Akun',
  lainnya: '💬 Lainnya',
};

/** Format waktu relatif singkat */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

interface ConversationListViewProps {
  /** Daftar percakapan */
  conversations: CustomerConversationSummary[];
  /** Status loading */
  isLoading: boolean;
  /** Handler saat percakapan dipilih */
  onSelectConversation: (conv: CustomerConversationSummary) => void;
  /** Handler untuk mulai percakapan baru */
  onNewConversation: () => void;
}

/** Tampilan daftar percakapan aktif milik pelanggan */
export const ConversationListView: React.FC<ConversationListViewProps> = ({
  conversations,
  isLoading,
  onSelectConversation,
  onNewConversation
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header info */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-[var(--cyber-text-secondary)] leading-relaxed">
          Percakapan aktif Anda. Pilih salah satu untuk melanjutkan, atau mulai percakapan baru.
        </p>
      </div>

      {/* Daftar percakapan */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-6 h-6 text-[var(--cyber-accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--cyber-accent)]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--cyber-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm text-[var(--cyber-text-muted)] text-center">
              Belum ada percakapan aktif
            </p>
          </div>
        )}

        {!isLoading && conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className="w-full text-left p-3 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-xl hover:border-[var(--cyber-accent)]/40 hover:bg-[var(--cyber-bg-elevated)] active:scale-[0.98] transition-all touch-manipulation group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Subjek atau topik */}
                <p className="text-sm font-medium text-[var(--cyber-text-primary)] truncate">
                  {conv.subject || TOPIC_LABELS[conv.topic || ''] || 'Percakapan'}
                </p>
                {/* Preview pesan terakhir */}
                {conv.lastMessagePreview && (
                  <p className="text-xs text-[var(--cyber-text-muted)] truncate mt-0.5">
                    {conv.lastMessageSender === 'admin' ? '🟢 ' : ''}
                    {conv.lastMessagePreview}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {/* Waktu */}
                <span className="text-[10px] text-[var(--cyber-text-muted)]">
                  {timeAgo(conv.lastMessageAt || conv.updatedAt)}
                </span>
                {/* Badge unread */}
                {(conv.unreadCount ?? 0) > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-[var(--cyber-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
            {/* Status badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                conv.status === 'assigned' 
                  ? 'bg-[var(--cyber-success)]/10 text-[var(--cyber-success)]' 
                  : 'bg-[var(--cyber-warning)]/10 text-[var(--cyber-warning)]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  conv.status === 'assigned' ? 'bg-[var(--cyber-success)]' : 'bg-[var(--cyber-warning)]'
                }`} />
                {conv.status === 'assigned' ? 'Sedang ditangani' : 'Menunggu'}
              </span>
              {conv.topic && (
                <span className="text-[10px] text-[var(--cyber-text-muted)]">
                  {TOPIC_LABELS[conv.topic] || conv.topic}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Tombol percakapan baru */}
      <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full py-3 bg-[var(--cyber-accent)] text-white font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2 shadow-lg shadow-[var(--cyber-accent)]/20"
        >
          Mulai Percakapan Baru
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};
