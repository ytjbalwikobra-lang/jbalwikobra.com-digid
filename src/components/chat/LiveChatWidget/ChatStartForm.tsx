/**
 * ChatStartForm.tsx
 * Form untuk memulai percakapan chat baru
 */

import React from 'react';

interface ChatStartFormProps {
  /** Nama pelanggan */
  customerName: string;
  /** Email pelanggan */
  customerEmail: string;
  /** Subjek percakapan */
  subject: string;
  /** Pesan awal */
  initialMessage: string;
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
  /** Handler submit form */
  onSubmit: (e: React.FormEvent) => void;
}

/** Form memulai percakapan baru dengan data pelanggan */
export const ChatStartForm: React.FC<ChatStartFormProps> = ({
  customerName,
  customerEmail,
  subject,
  initialMessage,
  isLoading,
  error,
  onNameChange,
  onEmailChange,
  onSubjectChange,
  onMessageChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Nama
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] text-base sm:text-sm"
          placeholder="Nama Anda"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Email
        </label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] text-base sm:text-sm"
          placeholder="email@example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Subjek
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] text-base sm:text-sm"
          placeholder="Bagaimana kami bisa membantu?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Pesan
        </label>
        <textarea
          value={initialMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] resize-none text-base sm:text-sm"
          placeholder="Tulis pesan Anda..."
          required
        />
      </div>
      {error && (
        <p className="text-sm text-[var(--cyber-error)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-[var(--cyber-accent)] text-white font-medium rounded-lg hover:bg-[var(--cyber-accent)]/90 active:scale-[0.98] transition-all disabled:opacity-50 touch-manipulation"
      >
        {isLoading ? 'Memulai...' : 'Mulai Chat'}
      </button>
    </form>
  );
};
