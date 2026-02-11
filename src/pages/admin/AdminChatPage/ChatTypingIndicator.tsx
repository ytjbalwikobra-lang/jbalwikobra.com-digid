/**
 * ChatTypingIndicator.tsx
 * Komponen indikator mengetik untuk tampilan admin
 */

import React from 'react';
import type { ChatTypingIndicator as TypingIndicatorType } from '../../../types/chat';

interface ChatTypingIndicatorProps {
  /** Daftar pengguna yang sedang mengetik */
  typingUsers: TypingIndicatorType[];
}

/** Menampilkan animasi titik-titik dan nama pengguna yang sedang mengetik */
export const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-1.5 border-t border-[var(--admin-border)] bg-[var(--admin-bg-surface)]">
      <p className="text-xs text-[var(--admin-text-secondary)] flex items-center gap-1.5">
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        {typingUsers.map(u => u.userName || 'Pelanggan').join(', ')} sedang mengetik...
      </p>
    </div>
  );
};
