/**
 * ChatInputForm.tsx
 * Komponen form input pesan dengan picker template respon cepat dan upload gambar
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Zap, Image as ImageIcon, X, Lock, ShieldAlert } from 'lucide-react';
import { cn } from '../../../utils/cn';
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
  /** Apakah percakapan di-lock karena ditangani admin lain (bukan kita/bukan super_admin) */
  isLockedByOtherAdmin?: boolean;
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
  onSendImage,
  isLockedByOtherAdmin = false
}) => {
  const isDisabled = conversationStatus !== 'assigned' || isLockedByOtherAdmin;
  const isUnassigned = conversationStatus === 'open';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // H1: Cleanup blob URL saat unmount untuk mencegah memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /** Tipe MIME yang diizinkan untuk lampiran */
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

  /** Handler pilih file — gambar dikompresi, dokumen langsung */
  const attachFile = useCallback(async (file: File) => {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Tipe file tidak didukung. Hanya JPEG, PNG, GIF, WebP, PDF, DOC, DOCX.');
      return;
    }
    // Gambar: kompresi dulu
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const compressed = await compressImage(file);
      if (compressed.size > 3 * 1024 * 1024) {
        setFileError('File terlalu besar (maks 3MB setelah kompresi)');
        return;
      }
      onFileSelect(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } else {
      // Dokumen: langsung tanpa kompresi
      if (file.size > 3 * 1024 * 1024) {
        setFileError('File terlalu besar (maks 3MB)');
        return;
      }
      onFileSelect(file);
      setPreviewUrl(null); // Tidak ada preview gambar untuk dokumen
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      attachFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await attachFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file) await attachFile(file);
  };

  /** Batalkan file */
  const handleCancelFile = () => {
    onFileSelect(null);
    setFileError(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  return (
    <div className="relative">
      {/* Picker Template Respon Cepat */}
      {showCannedPicker && (
        <div className="absolute bottom-full left-0 right-0 mx-4 mb-1 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          <div className="p-2 border-b border-[var(--admin-border)] flex items-center justify-between">
            <p className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Quick Responses — ketik / untuk filter
            </p>
            <button
              type="button"
              onClick={onCloseCannedPicker}
              className="p-0.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {filteredCannedResponses.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[var(--admin-text-muted)]">
                {cannedResponses.length === 0
                  ? 'Belum ada template respon. Buat di menu Template Respon.'
                  : 'Tidak ada template yang cocok dengan filter.'}
              </p>
            </div>
          ) : (
            filteredCannedResponses.slice(0, 8).map((cr) => (
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
            ))
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
        className="p-3 border-t border-[var(--admin-border)] bg-[var(--admin-bg-card)]"
      >
        {/* Error feedback saat file ditolak */}
        {fileError && (
          <div className="mb-2 px-3 py-1.5 bg-[var(--admin-error)]/15 border border-[var(--admin-error)]/30 rounded-lg flex items-center justify-between">
            <p className="text-xs text-[var(--admin-error)]">{fileError}</p>
            <button type="button" onClick={() => setFileError(null)} className="text-[var(--admin-error)] hover:brightness-125 ml-2 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Preview lampiran */}
        {selectedFile && (previewUrl || !selectedFile.type.startsWith('image/')) && (
          <div className="mb-2 relative inline-block">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-[var(--admin-border)]" />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--admin-bg-surface)] rounded-xl border border-[var(--admin-border)]">
                <svg className="w-5 h-5 text-[var(--admin-accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-[var(--admin-text)] truncate max-w-[150px]">{selectedFile.name}</span>
              </div>
            )}
            {isUploading ? (
              <div className="absolute inset-0 bg-[var(--admin-bg-pure)]/50 rounded-xl flex items-center justify-center">
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
        {/* Banner info: percakapan belum ditangani */}
        {isUnassigned && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--admin-warning)]/10 border border-[var(--admin-warning)]/30 rounded-xl mb-0">
            <Lock className="w-4 h-4 text-[var(--admin-warning)] shrink-0" />
            <span className="text-xs text-[var(--admin-warning)]">Tangani percakapan ini terlebih dahulu untuk mulai membalas.</span>
          </div>
        )}
        {/* Banner info: percakapan ditangani admin lain */}
        {isLockedByOtherAdmin && !isUnassigned && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--admin-error)]/10 border border-[var(--admin-error)]/30 rounded-xl mb-0">
            <ShieldAlert className="w-4 h-4 text-[var(--admin-error)] shrink-0" />
            <span className="text-xs text-[var(--admin-error)]">Percakapan ini sedang ditangani admin lain. Anda hanya bisa melihat.</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Tombol upload gambar */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMessage || isDisabled || isUploading}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/10 transition-colors disabled:opacity-50 shrink-0 touch-manipulation active:scale-95"
            title="Upload file"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder={isUnassigned ? 'Tangani percakapan dulu...' : 'Ketik pesan...'}
              disabled={sendingMessage || isDisabled || isUploading}
              className="w-full px-4 py-2.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-full text-base sm:text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] disabled:opacity-50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onCloseCannedPicker();
                }
              }}
            />
            {cannedResponses.length > 0 && (
              <button
                type="button"
                onClick={showCannedPicker ? onCloseCannedPicker : onToggleCannedPicker}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors',
                  showCannedPicker
                    ? 'text-[var(--admin-accent)]'
                    : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)]'
                )}
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
              className="w-10 h-10 rounded-full bg-[var(--admin-success)] text-white flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 shrink-0 shadow-sm active:scale-95 touch-manipulation"
              aria-label="Kirim gambar"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim() || isDisabled}
              className="w-10 h-10 rounded-full bg-[var(--admin-success)] text-white flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 shrink-0 shadow-sm active:scale-95 touch-manipulation"
              aria-label="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
