/**
 * ChatInputForm.tsx
 * Komponen form input pesan dengan picker template respon cepat dan upload gambar
 */

import React, { useRef, useState, useCallback } from 'react';
import { Send, Zap, Image as ImageIcon, X } from 'lucide-react';
import { compressImage } from '../../../utils/imageCompression';
import type { ChatCannedResponse, ChatConversationStatus } from '../../../types/chat';

interface ChatInputFormProps {
  /** Teks pesan yang sedang diketik */
  newMessage: string;
  /** Status sedang mengirim pesan */
  sendingMessage: boolean;
  /** Status percakapan saat ini */
  conversationStatus: ChatConversationStatus;
  /** Tampilkan picker template */
  showCannedPicker: boolean;
  /** Daftar template yang sudah difilter */
  filteredCannedResponses: ChatCannedResponse[];
  /** Semua template respon cepat */
  cannedResponses: ChatCannedResponse[];
  /** Ref untuk input pesan */
  inputRef: React.RefObject<HTMLInputElement>;
  /** File lampiran yang dipilih */
  selectedFile: File | null;
  /** Status uploading lampiran */
  isUploading: boolean;
  /** Handler perubahan teks pesan */
  onMessageChange: (value: string) => void;
  /** Handler submit form */
  onSubmit: (e: React.FormEvent) => void;
  /** Handler pemilihan template */
  onSelectCannedResponse: (response: ChatCannedResponse) => void;
  /** Handler toggle picker template */
  onToggleCannedPicker: () => void;
  /** Handler tutup picker template */
  onCloseCannedPicker: () => void;
  /** Handler pemilihan file */
  onFileSelect: (file: File | null) => void;
  /** Handler kirim lampiran gambar */
  onSendImage: () => void;
}

/** Form input pesan dengan integrasi template respon cepat dan upload gambar */
export const ChatInputForm: React.FC<ChatInputFormProps> = ({
  newMessage,
  sendingMessage,
  conversationStatus,
  showCannedPicker,
  filteredCannedResponses,
  cannedResponses,
  inputRef,
  selectedFile,
  isUploading,
  onMessageChange,
  onSubmit,
  onSelectCannedResponse,
  onToggleCannedPicker,
  onCloseCannedPicker,
  onFileSelect,
  onSendImage
}) => {
  const isDisabled = !['open', 'assigned'].includes(conversationStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /** Handler pilih file */
  const attachImage = useCallback(async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return;
    const compressed = await compressImage(file);
    if (compressed.size > 3 * 1024 * 1024) return;
    onFileSelect(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      attachImage(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await attachImage(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file) await attachImage(file);
  };

  /** Batalkan file */
  const handleCancelFile = () => {
    onFileSelect(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  return (
    <div className="relative">
      {/* Picker Template Respon Cepat */}
      {showCannedPicker && filteredCannedResponses.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mx-4 mb-1 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          <div className="p-2 border-b border-[var(--admin-border)]">
            <p className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Quick Responses - ketik / untuk filter
            </p>
          </div>
          {filteredCannedResponses.slice(0, 8).map((cr) => (
            <button
              key={cr.id}
              type="button"
              onClick={() => onSelectCannedResponse(cr)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--admin-bg-surface)] transition-colors border-b border-[var(--admin-border)] last:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--admin-accent)]">
                      {cr.shortcut}
                    </span>
                    <span className="text-sm font-medium text-[var(--admin-text)] truncate">
                      {cr.title}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--admin-text-muted)] truncate mt-0.5">
                    {cr.message}
                  </p>
                </div>
                {cr.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg-surface)] text-[var(--admin-text-tertiary)] shrink-0">
                    {cr.category}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
        className="p-3 border-t border-[var(--admin-border)] bg-[var(--admin-bg-card)]"
      >
        {/* Preview lampiran */}
        {selectedFile && previewUrl && (
          <div className="mb-2 relative inline-block">
            <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-[var(--admin-border)]" />
            {isUploading ? (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <button type="button" onClick={handleCancelFile} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--admin-error)] text-white rounded-full flex items-center justify-center hover:brightness-110">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Tombol upload gambar */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMessage || isDisabled || isUploading}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/10 transition-colors disabled:opacity-50 shrink-0"
            title="Upload gambar"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={sendingMessage || isDisabled || isUploading}
              className="w-full px-4 py-2.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-full text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] disabled:opacity-50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onCloseCannedPicker();
                }
              }}
            />
            {!showCannedPicker && cannedResponses.length > 0 && (
              <button
                type="button"
                onClick={onToggleCannedPicker}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] transition-colors"
                title="Template pesan cepat"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
          </div>
          {selectedFile ? (
            <button
              type="button"
              disabled={sendingMessage || isUploading}
              onClick={onSendImage}
              className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim() || isDisabled}
              className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
