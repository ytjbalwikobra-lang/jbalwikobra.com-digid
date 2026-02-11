/**
 * ChatStartForm.tsx
 * Form untuk memulai percakapan chat baru — desain mobile-first
 * Mendukung pemilihan topik: Pembelian/Rental (+ Order ID), Jual Akun (+ Game Selector), Lainnya
 */

import React from 'react';
import { UserIcon, MailIcon, TagIcon, MessageIcon, ArrowRightIcon } from './ChatIcons';
import type { ChatTopic } from '../../../types/chat';
import type { GameTitle } from '../../../types';

/** Opsi topik chat yang tersedia */
const TOPIC_OPTIONS: { value: ChatTopic; label: string; icon: string }[] = [
  { value: 'pembelian_rental', label: 'Pembelian / Rental', icon: '🛒' },
  { value: 'jual_akun', label: 'Jual Akun', icon: '💰' },
  { value: 'lainnya', label: 'Lainnya', icon: '💬' },
];

interface ChatStartFormProps {
  /** Nama pelanggan */
  customerName: string;
  /** Email pelanggan */
  customerEmail: string;
  /** Subjek percakapan */
  subject: string;
  /** Pesan awal */
  initialMessage: string;
  /** Topik percakapan */
  topic: ChatTopic;
  /** Order ID (untuk topik pembelian/rental) */
  orderId: string;
  /** Judul game terpilih (untuk topik jual akun) */
  gameTitle: string;
  /** Daftar game tersedia */
  gameTitles: GameTitle[];
  /** Status loading */
  isLoading: boolean;
  /** Pesan error */
  error: string | null;
  /** Handler perubahan nama */
  onNameChange: (value: string) => void;
  /** Handler perubahan email */
  onEmailChange: (value: string) => void;
  /** Handler perubahan subjek */
  onSubjectChange: (value: string) => void;
  /** Handler perubahan pesan awal */
  onMessageChange: (value: string) => void;
  /** Handler perubahan topik */
  onTopicChange: (value: ChatTopic) => void;
  /** Handler perubahan order ID */
  onOrderIdChange: (value: string) => void;
  /** Handler perubahan game title */
  onGameTitleChange: (value: string) => void;
  /** Handler submit form */
  onSubmit: (e: React.FormEvent) => void;
}

/** Form memulai percakapan baru dengan data pelanggan dan topik */
export const ChatStartForm: React.FC<ChatStartFormProps> = ({
  customerName,
  customerEmail,
  subject,
  initialMessage,
  topic,
  orderId,
  gameTitle,
  gameTitles,
  isLoading,
  error,
  onNameChange,
  onEmailChange,
  onSubjectChange,
  onMessageChange,
  onTopicChange,
  onOrderIdChange,
  onGameTitleChange,
  onSubmit
}) => {
  /** Kelas input yang konsisten */
  const inputCls = "w-full pl-9 pr-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] focus:ring-1 focus:ring-[var(--cyber-accent)]/30 transition-all text-base sm:text-sm";

  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full overflow-y-auto">
      {/* Teks sambutan */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-[var(--cyber-text-secondary)] leading-relaxed">
          Halo! 👋 Isi form di bawah untuk memulai percakapan dengan tim support kami.
        </p>
      </div>

      {/* Form fields */}
      <div className="px-4 space-y-3 flex-1">
        {/* Nama — wajib */}
        <div>
          <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
            Nama <span className="text-[var(--cyber-error)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-muted)]">
              <UserIcon />
            </span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onNameChange(e.target.value)}
              className={inputCls}
              placeholder="Nama Anda"
              required
            />
          </div>
        </div>

        {/* Email — wajib */}
        <div>
          <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
            Email <span className="text-[var(--cyber-error)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-muted)]">
              <MailIcon />
            </span>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              className={inputCls}
              placeholder="email@example.com"
              required
            />
          </div>
        </div>

        {/* Topik — wajib, pill selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
            Topik <span className="text-[var(--cyber-error)]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTopicChange(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all touch-manipulation active:scale-95 ${
                  topic === opt.value
                    ? 'bg-[var(--cyber-accent)]/15 border-[var(--cyber-accent)] text-[var(--cyber-accent)]'
                    : 'bg-[var(--cyber-bg-surface)] border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:border-[var(--cyber-border-hover)]'
                }`}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order ID — tampil jika topik = pembelian_rental */}
        {topic === 'pembelian_rental' && (
          <div>
            <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
              Order ID <span className="text-[var(--cyber-text-muted)]">(opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-muted)]">
                <TagIcon />
              </span>
              <input
                type="text"
                value={orderId}
                onChange={(e) => onOrderIdChange(e.target.value)}
                className={inputCls}
                placeholder="Contoh: ORD-XXXXXX"
              />
            </div>
          </div>
        )}

        {/* Game Selector — tampil jika topik = jual_akun */}
        {topic === 'jual_akun' && (
          <div>
            <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
              Pilih Game <span className="text-[var(--cyber-error)]">*</span>
            </label>
            {gameTitles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                {gameTitles.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onGameTitleChange(g.name)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all touch-manipulation active:scale-95 ${
                      gameTitle === g.name
                        ? 'bg-[var(--cyber-accent)]/15 border-[var(--cyber-accent)] text-[var(--cyber-accent)]'
                        : 'bg-[var(--cyber-bg-surface)] border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:border-[var(--cyber-border-hover)]'
                    }`}
                  >
                    {g.logoUrl ? (
                      <img
                        src={g.logoUrl}
                        alt={g.name}
                        className="w-5 h-5 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm">{g.icon}</span>
                    )}
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--cyber-text-muted)] py-2">
                Memuat daftar game...
              </p>
            )}
          </div>
        )}

        {/* Subjek — opsional */}
        <div>
          <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
            Subjek
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cyber-text-muted)]">
              <TagIcon />
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className={inputCls}
              placeholder="Detail tambahan (opsional)"
            />
          </div>
        </div>

        {/* Pesan — wajib */}
        <div>
          <label className="block text-xs font-medium text-[var(--cyber-text-secondary)] mb-1.5">
            Pesan <span className="text-[var(--cyber-error)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-[var(--cyber-text-muted)]">
              <MessageIcon />
            </span>
            <textarea
              value={initialMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={3}
              className="w-full pl-9 pr-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] focus:ring-1 focus:ring-[var(--cyber-accent)]/30 transition-all resize-none text-base sm:text-sm"
              placeholder="Jelaskan kendala Anda..."
              required
            />
          </div>
        </div>
      </div>

      {/* Footer — error + tombol CTA */}
      <div className="px-4 py-4 mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <div className="flex items-center gap-2 p-2.5 mb-3 bg-[var(--cyber-error)]/10 border border-[var(--cyber-error)]/20 rounded-lg">
            <svg className="w-4 h-4 text-[var(--cyber-error)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[var(--cyber-error)]">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading || (topic === 'jual_akun' && !gameTitle)}
          className="w-full py-3 bg-[var(--cyber-accent)] text-white font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2 shadow-lg shadow-[var(--cyber-accent)]/20"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memulai...
            </>
          ) : (
            <>
              Mulai Chat
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
