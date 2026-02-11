/**
 * ChatConversationList.tsx
 * Komponen daftar percakapan dengan filter status dan pencarian
 */

import React from 'react';
import { MessageSquare, Search, RefreshCw } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { STATUS_OPTIONS, formatDate, type FilterStatus } from './chatHelpers';
import type { ChatConversation, ChatConversationStatus } from '../../../types/chat';

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

/** Badge status percakapan dengan warna sesuai */
const StatusBadge: React.FC<{ status: ChatConversationStatus }> = ({ status }) => {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{
        backgroundColor: `color-mix(in srgb, ${option?.color || 'var(--admin-text)'} 15%, transparent)`,
        color: option?.color || 'var(--admin-text)'
      }}
    >
      {option?.label || status}
    </span>
  );
};

/** Daftar percakapan dengan pencarian dan filter */
export const ChatConversationList: React.FC<ChatConversationListProps> = ({
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
    <div className="col-span-12 md:col-span-4 bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
      {/* Header Daftar */}
      <div className="p-4 border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari percakapan..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-[var(--admin-bg-surface)] hover:bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Filter Status */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                statusFilter === option.value
                  ? 'bg-[var(--admin-accent)] text-white'
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
          <AdminLoadingState message="Memuat percakapan..." />
        ) : conversations.length === 0 ? (
          <AdminEmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="Tidak ada percakapan"
            description="Belum ada percakapan yang sesuai filter"
          />
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  'w-full p-4 text-left hover:bg-[var(--admin-bg-surface)] transition-colors',
                  selectedConversation?.id === conv.id && 'bg-[var(--admin-bg-surface)]'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-[var(--admin-text)] truncate">
                    {conv.customerName || conv.customerEmail || 'Anonymous'}
                  </span>
                  <StatusBadge status={conv.status} />
                </div>
                {conv.subject && (
                  <p className="text-sm text-[var(--admin-text-secondary)] truncate mb-1">
                    {conv.subject}
                  </p>
                )}
                <p className="text-xs text-[var(--admin-text-muted)]">
                  {formatDate(conv.lastMessageAt || conv.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
