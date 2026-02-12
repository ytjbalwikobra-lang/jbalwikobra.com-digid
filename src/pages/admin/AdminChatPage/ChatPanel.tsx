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
  Clock,
  ChevronLeft,
  X
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ChatMessageView } from './ChatMessageView';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatInputForm } from './ChatInputForm';
import { ChatActivityLog } from './ChatActivityLog';
import { STATUS_OPTIONS, formatRelativeTime, getInitials } from './chatHelpers';
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
  /** File gambar yang dipilih untuk dikirim */
  selectedFile: File | null;
  /** Status sedang mengunggah gambar */
  isUploading: boolean;
  /** Handler pemilihan file gambar */
  onFileSelect: (file: File | null) => void;
  /** Handler kirim gambar */
  onSendImage: () => void;
  /** Handler ubah status percakapan */
  onStatusChange: (status: ChatConversationStatus) => void;
  /** Handler bergabung ke percakapan */
  onAssignToSelf: () => void;
  /** Handler keluar dari percakapan */
  onLeaveConversation: () => void;
  /** Handler toggle log aktivitas */
  onToggleActivityLog: () => void;
  /** Handler kembali ke list (mobile) */
  onBack?: () => void;
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
  selectedFile,
  isUploading,
  onFileSelect,
  onSendImage,
  onStatusChange,
  onAssignToSelf,
  onLeaveConversation,
  onToggleActivityLog,
  onBack
}) => {
  return (
    <div className="h-full bg-[var(--admin-bg-card)] sm:rounded-xl sm:border sm:border-[var(--admin-border)] flex flex-col overflow-hidden">
      {selectedConversation ? (
        <>
          {/* Header Chat — responsive compact */}
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tombol kembali — hanya mobile */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 -ml-1 rounded-lg text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-surface)] active:scale-95 touch-manipulation"
                  aria-label="Kembali"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Avatar pelanggan */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                <span className="text-xs sm:text-sm font-bold text-white">
                  {getInitials(selectedConversation.customerName || selectedConversation.customerEmail || 'U')}
                </span>
              </div>

              {/* Info kontak */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="font-semibold text-sm text-[var(--admin-text)] truncate">
                    {selectedConversation.customerName || selectedConversation.customerEmail}
                  </h3>
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
                <div className="flex items-center gap-2 text-[11px] text-[var(--admin-text-muted)]">
                  <span className="truncate">{selectedConversation.customerEmail}</span>
                  {selectedConversation.topic && selectedConversation.topic !== 'lainnya' && (
                    <span className={`hidden sm:inline-flex shrink-0 px-1 py-0 text-[9px] font-medium rounded ${
                      selectedConversation.topic === 'pembelian_rental'
                        ? 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]'
                        : 'bg-[var(--admin-orange)]/15 text-[var(--admin-orange)]'
                    }`}>
                      {selectedConversation.topic === 'pembelian_rental' ? '🛒 Beli' : '💰 Jual'}
                    </span>
                  )}
                  {selectedConversation.gameTitle && (
                    <span className="hidden lg:inline text-[10px] text-[var(--admin-purple)] shrink-0">🎮 {selectedConversation.gameTitle}</span>
                  )}
                </div>
              </div>

              {/* Tombol aksi — icon-only on mobile, labeled on sm+ */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {selectedConversation.status === 'open' && (
                  <button
                    onClick={onAssignToSelf}
                    className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg bg-[var(--admin-accent)] text-white text-xs font-medium hover:brightness-110 active:scale-95 touch-manipulation transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tangani</span>
                  </button>
                )}
                {selectedConversation.status === 'assigned' && (
                  <>
                    <button
                      onClick={() => onStatusChange('resolved')}
                      className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg bg-[var(--admin-success)]/15 text-[var(--admin-success)] text-xs font-medium hover:bg-[var(--admin-success)]/25 active:scale-95 touch-manipulation transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Selesai</span>
                    </button>
                    <button
                      onClick={onLeaveConversation}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--admin-text-secondary)] text-xs hover:bg-[var(--admin-bg-surface)] active:scale-95 touch-manipulation transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Keluar</span>
                    </button>
                  </>
                )}
                {selectedConversation.status === 'resolved' && (
                  <button
                    onClick={() => onStatusChange('closed')}
                    className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-[var(--admin-text-secondary)] text-xs hover:bg-[var(--admin-bg-surface)] active:scale-95 touch-manipulation transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tutup</span>
                  </button>
                )}

                {/* Toggle log aktivitas */}
                <button
                  onClick={onToggleActivityLog}
                  className={cn(
                    'p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation',
                    showActivityLog
                      ? 'bg-[var(--admin-accent)] text-white'
                      : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
                  )}
                  aria-label="Log aktivitas"
                  title="Log Aktivitas"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Partisipan & Waktu — hidden on mobile */}
            <div className="hidden lg:flex items-center gap-3 mt-2">
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

          <div className="flex flex-1 overflow-hidden relative">
            {/* Area Pesan */}
            <div className={cn(
              'flex-1 flex flex-col overflow-hidden',
              showActivityLog && 'lg:border-r border-[var(--admin-border)]'
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
                selectedFile={selectedFile}
                isUploading={isUploading}
                onMessageChange={onMessageChange}
                onSubmit={onSendMessage}
                onSelectCannedResponse={onSelectCannedResponse}
                onToggleCannedPicker={onToggleCannedPicker}
                onCloseCannedPicker={onCloseCannedPicker}
                onFileSelect={onFileSelect}
                onSendImage={onSendImage}
              />
            </div>

            {/* Log Aktivitas — overlay on mobile/tablet, inline sidebar on desktop */}
            {showActivityLog && (
              <>
                {/* Backdrop — mobile/tablet only */}
                <div
                  className="fixed inset-0 bg-black/50 z-[200] lg:hidden"
                  onClick={onToggleActivityLog}
                />
                <div className={cn(
                  'overflow-y-auto bg-[var(--admin-bg-card)] border-l border-[var(--admin-border)]',
                  'fixed right-0 top-0 bottom-0 w-[280px] z-[201] shadow-2xl',
                  'lg:static lg:w-72 lg:z-auto lg:shadow-none'
                )}>
                  {/* Header overlay — mobile/tablet */}
                  <div className="flex items-center justify-between p-3 border-b border-[var(--admin-border)] lg:hidden">
                    <h4 className="font-semibold text-sm text-[var(--admin-text)] flex items-center gap-2">
                      <History className="w-4 h-4" /> Log Aktivitas
                    </h4>
                    <button
                      onClick={onToggleActivityLog}
                      className="p-1.5 rounded-lg hover:bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] touch-manipulation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ChatActivityLog activityLogs={activityLogs} />
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--admin-accent)]/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--admin-accent)]" />
          </div>
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold text-[var(--admin-text)] mb-1">
              Pilih Percakapan
            </h3>
            <p className="text-xs sm:text-sm text-[var(--admin-text-muted)] max-w-xs">
              Pilih percakapan dari daftar untuk mulai merespon pelanggan
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';
