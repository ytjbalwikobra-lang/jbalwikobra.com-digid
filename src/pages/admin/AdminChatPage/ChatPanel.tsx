/**
 * ChatPanel.tsx
 * Panel chat utama dengan header, daftar pesan, input, dan sidebar log aktivitas.
 * Menampilkan detail percakapan yang dipilih.
 */

import React from 'react';
import {
  MessageSquare,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Users,
  History,
  Clock
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AdminButton } from '../components/ui/AdminButton';
import { ChatMessageView } from './ChatMessageView';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatInputForm } from './ChatInputForm';
import { ChatActivityLog } from './ChatActivityLog';
import { STATUS_OPTIONS, formatRelativeTime } from './chatHelpers';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog as ActivityLogType,
  ChatConversationStatus,
  ChatTypingIndicator as TypingIndicatorType,
  ChatCannedResponse
} from '../../../types/chat';

interface ChatPanelProps {
  /** Percakapan yang sedang dipilih */
  selectedConversation: ChatConversation | null;
  /** Daftar pesan */
  messages: ChatMessage[];
  /** Daftar partisipan admin */
  participants: ChatAdminParticipant[];
  /** Log aktivitas percakapan */
  activityLogs: ActivityLogType[];
  /** Status loading pesan */
  messageLoading: boolean;
  /** Status sedang mengirim pesan */
  sendingMessage: boolean;
  /** Pengguna yang sedang mengetik */
  typingUsers: TypingIndicatorType[];
  /** Teks pesan baru */
  newMessage: string;
  /** Tampilkan sidebar log aktivitas */
  showActivityLog: boolean;
  /** Tampilkan picker template */
  showCannedPicker: boolean;
  /** Template respon cepat yang sudah difilter */
  filteredCannedResponses: ChatCannedResponse[];
  /** Semua template respon cepat */
  cannedResponses: ChatCannedResponse[];
  /** Ref scroll ke bawah pesan */
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Ref input pesan */
  messageInputRef: React.RefObject<HTMLInputElement>;
  /** Handler perubahan input pesan */
  onMessageChange: (value: string) => void;
  /** Handler kirim pesan */
  onSendMessage: (e: React.FormEvent) => void;
  /** Handler pemilihan template */
  onSelectCannedResponse: (response: ChatCannedResponse) => void;
  /** Handler toggle picker template */
  onToggleCannedPicker: () => void;
  /** Handler tutup picker template */
  onCloseCannedPicker: () => void;
  /** Handler ubah status percakapan */
  onStatusChange: (status: ChatConversationStatus) => void;
  /** Handler bergabung ke percakapan */
  onAssignToSelf: () => void;
  /** Handler keluar dari percakapan */
  onLeaveConversation: () => void;
  /** Handler toggle log aktivitas */
  onToggleActivityLog: () => void;
}

/** Panel chat utama dengan header aksi, area pesan, dan sidebar — dimemoize */
export const ChatPanel = React.memo<ChatPanelProps>(({
  selectedConversation,
  messages,
  participants,
  activityLogs,
  messageLoading,
  sendingMessage,
  typingUsers,
  newMessage,
  showActivityLog,
  showCannedPicker,
  filteredCannedResponses,
  cannedResponses,
  messagesEndRef,
  messageInputRef,
  onMessageChange,
  onSendMessage,
  onSelectCannedResponse,
  onToggleCannedPicker,
  onCloseCannedPicker,
  onStatusChange,
  onAssignToSelf,
  onLeaveConversation,
  onToggleActivityLog
}) => {
  return (
    <div className="col-span-1 md:col-span-8 h-[380px] md:h-full bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
      {selectedConversation ? (
        <>
          {/* Header Chat */}
          <div className="p-4 border-b border-[var(--admin-border)]">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-[var(--admin-text)] truncate">
                    {selectedConversation.customerName || selectedConversation.customerEmail}
                  </h3>
                  {/* Badge status inline */}
                  {(() => {
                    const opt = STATUS_OPTIONS.find(o => o.value === selectedConversation.status);
                    return (
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${opt?.color || 'var(--admin-text)'} 15%, transparent)`,
                          color: opt?.color || 'var(--admin-text)'
                        }}
                      >
                        {opt?.label || selectedConversation.status}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--admin-text-muted)]">
                  <span>{selectedConversation.customerEmail}</span>
                  {selectedConversation.subject && (
                    <span className="truncate">• {selectedConversation.subject}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {/* Tombol Aksi Status */}
                {selectedConversation.status === 'open' && (
                  <AdminButton
                    variant="primary"
                    size="sm"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={onAssignToSelf}
                  >
                    Tangani
                  </AdminButton>
                )}
                {selectedConversation.status === 'assigned' && (
                  <>
                    <AdminButton
                      variant="success"
                      size="sm"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={() => onStatusChange('resolved')}
                    >
                      Selesai
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      icon={<UserMinus className="w-4 h-4" />}
                      onClick={onLeaveConversation}
                    >
                      Keluar
                    </AdminButton>
                  </>
                )}
                {selectedConversation.status === 'resolved' && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => onStatusChange('closed')}
                  >
                    Tutup
                  </AdminButton>
                )}
                
                {/* Toggle Log Aktivitas */}
                <button
                  onClick={onToggleActivityLog}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showActivityLog
                      ? 'bg-[var(--admin-accent)] text-white'
                      : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
                  )}
                  aria-label="Toggle log aktivitas"
                  title="Log Aktivitas"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Daftar Partisipan + Waktu */}
            <div className="flex items-center gap-3 mt-2">
              {participants.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--admin-text-muted)]" />
                  <span className="text-[11px] text-[var(--admin-text-muted)]">
                    {participants.map(p => p.admin?.name || p.admin?.email).filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--admin-text-muted)]" />
                <span className="text-[11px] text-[var(--admin-text-muted)]">
                  {formatRelativeTime(selectedConversation.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Area Pesan */}
            <div className={cn(
              'flex-1 flex flex-col overflow-hidden',
              showActivityLog && 'border-r border-[var(--admin-border)]'
            )}>
              <ChatMessageView
                messages={messages}
                loading={messageLoading}
                ref={messagesEndRef}
              />

              <ChatTypingIndicator typingUsers={typingUsers} />

              <ChatInputForm
                newMessage={newMessage}
                sendingMessage={sendingMessage}
                conversationStatus={selectedConversation.status}
                showCannedPicker={showCannedPicker}
                filteredCannedResponses={filteredCannedResponses}
                cannedResponses={cannedResponses}
                inputRef={messageInputRef}
                onMessageChange={onMessageChange}
                onSubmit={onSendMessage}
                onSelectCannedResponse={onSelectCannedResponse}
                onToggleCannedPicker={onToggleCannedPicker}
                onCloseCannedPicker={onCloseCannedPicker}
              />
            </div>

            {/* Sidebar Log Aktivitas */}
            {showActivityLog && (
              <ChatActivityLog activityLogs={activityLogs} />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-[var(--admin-accent)]/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-[var(--admin-accent)]" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-1">
              Pilih Percakapan
            </h3>
            <p className="text-sm text-[var(--admin-text-muted)] max-w-xs">
              Pilih percakapan dari daftar di samping untuk mulai merespon pelanggan
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';
