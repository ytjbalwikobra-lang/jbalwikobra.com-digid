/**
 * ChatRatingView.tsx
 * Tampilan form rating setelah percakapan selesai — desain modern
 */

import React from 'react';
import { StarIcon } from './ChatIcons';

interface ChatRatingViewProps {
  /** Nilai rating yang dipilih (1-5) */
  rating: number;
  /** Teks feedback opsional */
  feedback: string;
  /** Status loading */
  isLoading: boolean;
  /** Pesan error */
  error: string | null;
  /** Apakah rating sudah berhasil dikirim */
  ratingSubmitted: boolean;
  /** Handler perubahan rating */
  onRatingChange: (value: number) => void;
  /** Handler perubahan feedback */
  onFeedbackChange: (value: string) => void;
  /** Handler submit rating */
  onSubmit: () => void;
  /** Handler kembali ke chat */
  onBack: () => void;
}

/** Label emoji sesuai rating */
const RATING_LABELS: Record<number, string> = {
  1: '😞 Buruk',
  2: '😐 Kurang',
  3: '🙂 Cukup',
  4: '😊 Bagus',
  5: '🤩 Sangat Bagus!'
};

/** Tampilan form rating dengan bintang dan feedback opsional */
export const ChatRatingView: React.FC<ChatRatingViewProps> = ({
  rating,
  feedback,
  isLoading,
  error,
  ratingSubmitted,
  onRatingChange,
  onFeedbackChange,
  onSubmit,
  onBack
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {ratingSubmitted ? (
        <div className="text-center animate-in fade-in">
          <div className="w-16 h-16 bg-[var(--cyber-success)]/15 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-[var(--cyber-success)]/10">
            <svg className="w-8 h-8 text-[var(--cyber-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--cyber-text-primary)] mb-2">
            Terima Kasih! 🎉
          </h3>
          <p className="text-sm text-[var(--cyber-text-secondary)]">
            Feedback Anda sangat berarti bagi kami.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          {/* Ikon dan judul */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[var(--cyber-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[var(--cyber-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--cyber-text-primary)] mb-1">
              Beri Rating
            </h3>
            <p className="text-sm text-[var(--cyber-text-secondary)]">
              Bagaimana pengalaman chat Anda?
            </p>
          </div>
          
          {/* Bintang Rating */}
          <div className="flex justify-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(star)}
                className="transition-transform hover:scale-125 active:scale-95 touch-manipulation p-0.5"
              >
                <StarIcon filled={star <= rating} />
              </button>
            ))}
          </div>
          
          {/* Label rating */}
          <p className="text-center text-sm font-medium text-[var(--cyber-text-secondary)] mb-4 h-5">
            {rating > 0 ? RATING_LABELS[rating] : ''}
          </p>

          {/* Textarea Feedback */}
          <textarea
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-xl text-[var(--cyber-text-primary)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] focus:ring-1 focus:ring-[var(--cyber-accent)]/30 transition-all resize-none text-base sm:text-sm mb-4"
            placeholder="Ceritakan pengalaman Anda (opsional)..."
          />

          {error && (
            <div className="flex items-center gap-2 p-2 mb-3 bg-[var(--cyber-error)]/10 rounded-lg">
              <svg className="w-3.5 h-3.5 text-[var(--cyber-error)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[var(--cyber-error)]">{error}</p>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 border border-[var(--cyber-border)] text-[var(--cyber-text-primary)] rounded-xl hover:bg-[var(--cyber-bg-surface)] active:scale-[0.98] transition-all touch-manipulation font-medium text-sm"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={rating === 0 || isLoading}
              className="flex-1 py-2.5 bg-[var(--cyber-accent)] text-white rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 touch-manipulation font-semibold text-sm shadow-lg shadow-[var(--cyber-accent)]/20"
            >
              {isLoading ? 'Mengirim...' : 'Kirim Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
