/**
 * ChatConversationList.tsx
 * Komponen daftar percakapan dengan filter, pencarian, preview pesan terakhir, dan badge unread
 */

import React from 'react';
import { Search, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import { STATUS_OPTIONS, formatRelativeTime, getInitials, type FilterStatus } from './chatHelpers';
import type { ChatConversation, ChatConversationStatus, ChatTopic } from '../../../types/chat';

/** Helper untuk styling badge topic */
function getTopicStyle(topic: ChatTopic): string {
  return topic === 'pembelian_rental'
    ? 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]'
    : 'bg-[var(--admin-orange)]/15 text-[var(--admin-orange)]';
}

/** Helper untuk icon badge topic */
function getTopicIcon(topic: ChatTopic): string {
  return topic === 'pembelian_rental' ? '🛒' : '💰';
}

/** Helper untuk label badge topic */
function getTopicLabel(topic: ChatTopic): string {
  return topic === 'pembelian_rental' ? 'Beli' : 'Jual';
}

interface ChatConversationListProps {
  /** Daftar percakapan yang sudah difilter */
  conversations: ChatConversation[];
  /** Percakapan yang sedang dipilih */
  selectedConversation: ChatConversation | null;
  /** Status loading */
  loading: boolean;
  /** Filter status aktif */
  statusFilter: FilterStatus;
  /** Teks pencarian */
  searchTerm: string;
  /** Handler perubahan pencarian */
  onSearchChange: (value: string) => void;
  /** Handler perubahan filter status */
  onStatusFilterChange: (status: FilterStatus) => void;
  /** Handler pemilihan percakapan */
  onSelectConversation: (conversation: ChatConversation) => void;
  /** Handler refresh daftar */
  onRefresh: () => void;
}

/** Badge status percakapan dengan warna sesuai — dimemoize */
const StatusBadge: React.FC<{ status: ChatConversationStatus }> = React.memo(({ status }) => {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return (
    <span
      className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase"
      style={{
        backgroundColor: `color-mix(in srgb, ${option?.color || 'var(--admin-text)'} 15%, transparent)`,
        color: option?.color || 'var(--admin-text)'
      }}
    >
      {option?.label || status}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

/** Daftar percakapan dengan pencarian, filter, preview, dan badge unread — dimemoize */
export const ChatConversationList = React.memo<ChatConversationListProps>(({
  conversations,
  selectedConversation,
  loading,
  statusFilter,
  searchTerm,
  onSearchChange,
  onStatusFilterChange,
  onSelectConversation,
  onRefresh
}) => {
  return (
    <div className="h-full bg-[var(--admin-bg-card)] sm:rounded-xl sm:border sm:border-[var(--admin-border)] flex flex-col overflow-hidden">
      {/* Header Daftar */}
      <div className="p-3 border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari percakapan..."
              aria-label="Cari percakapan"
              className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-lg text-base sm:text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] transition-colors"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-[var(--admin-bg-surface)] hover:bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] transition-colors active:scale-95 touch-manipulation"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Filter Status — compact scrollable pills */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                'px-2.5 py-1.5 text-[11px] font-medium rounded-full whitespace-nowrap transition-all',
                statusFilter === option.value
                  ? 'bg-[var(--admin-accent)] text-white shadow-sm shadow-[var(--admin-accent)]/20'
                  : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Percakapan */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <AdminLoadingState message="Memuat percakapan..." />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--admin-accent)]/10 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-[var(--admin-accent)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-1">
              Tidak ada percakapan
            </h3>
            <p className="text-xs text-[var(--admin-text-muted)] text-center max-w-[200px]">
              Belum ada percakapan yang sesuai filter. Coba ubah filter di atas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {conversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const hasUnread = (conv.unreadCount || 0) > 0;
              const displayName = conv.customerName || conv.customerEmail || 'Anonim';
              
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    'w-full p-3 text-left transition-all border-l-2 active:scale-[0.99] touch-manipulation',
                    isSelected
                      ? 'bg-[var(--admin-accent)]/5 border-l-[var(--admin-accent)]'
                      : 'border-l-transparent hover:bg-[var(--admin-bg-surface)]',
                    hasUnread && !isSelected && 'bg-[var(--admin-bg-surface)]/50'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Avatar inisial */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      conv.status === 'open'
                        ? 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]'
                        : conv.status === 'assigned'
                        ? 'bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]'
                        : 'bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)]'
                    )}>
                      {getInitials(displayName)}
                    </div>
                    
                    {/* Info percakapan */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={cn(
                          'font-medium text-sm truncate',
                          hasUnread ? 'text-[var(--admin-text)] font-semibold' : 'text-[var(--admin-text)]'
                        )}>
                          {displayName}
                        </span>
                        <span className="text-[10px] text-[var(--admin-text-muted)] shrink-0">
                          {formatRelativeTime(conv.lastMessageAt || conv.createdAt)}
                        </span>
                      </div>
                      
                      {/* Subjek + Topik */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {conv.topic && conv.topic !== 'lainnya' && (
                          <span className={`inline-flex items-center gap-0.5 px-1 py-0 text-[9px] font-medium rounded shrink-0 ${
                            getTopicStyle(conv.topic)
                          }`}>
                            {getTopicIcon(conv.topic)}
                            {getTopicLabel(conv.topic)}
                          </span>
                        )}
                        {conv.subject && (
                          <p className="text-xs text-[var(--admin-text-secondary)] truncate">
                            {conv.subject}
                          </p>
                        )}
                      </div>
                      
                      {/* Preview pesan terakhir + badge */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          'text-xs truncate',
                          hasUnread ? 'text-[var(--admin-text-secondary)] font-medium' : 'text-[var(--admin-text-muted)]'
                        )}>
                          {conv.lastMessage ? (
                            <>
                              {/* Prefix nama pengirim */}
                              {conv.lastMessage.senderType === 'admin' && (
                                <span className="text-[var(--admin-accent)]">Anda: </span>
                              )}
                              {conv.lastMessage.messageType === 'image'
                                ? '📷 Gambar'
                                : conv.lastMessage.messageType === 'file'
                                ? '📎 File'
                                : conv.lastMessage.message || '...'}
                            </>
                          ) : (
                            <span className="italic">Belum ada pesan</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasUnread && (
                            <span className="min-w-[18px] h-[18px] px-1 bg-[var(--admin-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {(conv.unreadCount || 0) > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                          <StatusBadge status={conv.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

ChatConversationList.displayName = 'ChatConversationList';
