/**
 * ChatView.tsx
 * Tampilan pesan chat dengan input, avatar, lampiran gambar, dan indikator mengetik
 */

import React, { useRef, useState } from 'react';
import { SendIcon } from './ChatIcons';
import type { ChatMessage } from '../../../types/chat';

/** Ikon lampiran gambar (SVG inline) */
const ImageAttachIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

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
  /** File lampiran yang dipilih */
  selectedFile: File | null;
  /** Status uploading lampiran */
  isUploading: boolean;
  /** Ref untuk scroll ke bawah */
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Ref untuk input pesan */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Handler perubahan input pesan */
  onInputChange: (value: string) => void;
  /** Handler submit pesan */
  onSubmit: (e: React.FormEvent) => void;
  /** Handler pemilihan file */
  onFileSelect: (file: File | null) => void;
  /** Handler kirim lampiran gambar */
  onSendImage: () => void;
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

/** Tampilan percakapan chat dengan daftar pesan, input, lampiran gambar, dan indikator mengetik */
export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  newMessage,
  isLoading,
  error,
  adminTyping,
  selectedFile,
  isUploading,
  messagesEndRef,
  inputRef,
  onInputChange,
  onSubmit,
  onFileSelect,
  onSendImage,
  onEndChat
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  /** Handler pilih file dari input */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi tipe
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        return;
      }
      // Validasi ukuran (3MB)
      if (file.size > 3 * 1024 * 1024) {
        return;
      }
      onFileSelect(file);
      // Generate preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    // Reset input agar bisa pilih file yang sama lagi
    e.target.value = '';
  };

  /** Batalkan pilihan file */
  const handleCancelFile = () => {
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
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
              {/* Lampiran gambar */}
              {msg.messageType === 'image' && msg.attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxUrl(msg.attachmentUrl!)}
                  className="block mb-1 rounded-lg overflow-hidden max-w-[200px] cursor-zoom-in"
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
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              )}
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

        {/* Preview lampiran yang dipilih */}
        {selectedFile && previewUrl && (
          <div className="mb-2 relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-[var(--cyber-border)]"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            {!isUploading && (
              <button
                type="button"
                onClick={handleCancelFile}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--cyber-error)] text-white rounded-full flex items-center justify-center text-xs hover:brightness-110 touch-manipulation"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {/* Tombol upload gambar */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            className="w-10 h-10 text-[var(--cyber-text-muted)] hover:text-[var(--cyber-accent)] hover:bg-[var(--cyber-accent)]/10 rounded-xl transition-all disabled:opacity-40 touch-manipulation flex items-center justify-center shrink-0"
            title="Kirim gambar"
          >
            <ImageAttachIcon />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => onInputChange(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-xl text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] focus:ring-1 focus:ring-[var(--cyber-accent)]/30 transition-all text-base sm:text-sm"
            placeholder="Ketik pesan..."
            disabled={isLoading || isUploading}
          />
          <button
            type={selectedFile ? 'button' : 'submit'}
            onClick={selectedFile ? onSendImage : undefined}
            disabled={(isLoading || isUploading) || (!selectedFile && !newMessage.trim())}
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
    </div>
  );
};
