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
  History
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { ChatMessageView } from './ChatMessageView';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatInputForm } from './ChatInputForm';
import { ChatActivityLog } from './ChatActivityLog';
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

/** Panel chat utama dengan header aksi, area pesan, dan sidebar */
export const ChatPanel: React.FC<ChatPanelProps> = ({
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
    <div className="col-span-12 md:col-span-8 bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
      {selectedConversation ? (
        <>
          {/* Header Chat */}
          <div className="p-4 border-b border-[var(--admin-border)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--admin-text)]">
                  {selectedConversation.customerName || selectedConversation.customerEmail}
                </h3>
                <p className="text-sm text-[var(--admin-text-secondary)]">
                  {selectedConversation.customerEmail}
                  {selectedConversation.customerPhone && ` • ${selectedConversation.customerPhone}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Daftar Partisipan */}
            {participants.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-4 h-4 text-[var(--admin-text-muted)]" />
                <span className="text-xs text-[var(--admin-text-muted)]">
                  {participants.map(p => p.admin?.name || p.admin?.email).filter(Boolean).join(', ')}
                </span>
              </div>
            )}
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
        <div className="flex-1 flex items-center justify-center">
          <AdminEmptyState
            icon={<MessageSquare className="w-16 h-16" />}
            title="Pilih Percakapan"
            description="Pilih percakapan dari daftar untuk mulai chat"
          />
        </div>
      )}
    </div>
  );
};
