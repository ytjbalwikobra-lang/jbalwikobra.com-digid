/**
 * ChatRatingView.tsx
 * Tampilan form rating setelah percakapan selesai
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
    <div className="p-6 text-center">
      {ratingSubmitted ? (
        <div>
          <div className="w-16 h-16 bg-[var(--cyber-success)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--cyber-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--cyber-text)] mb-2">
            Terima Kasih!
          </h3>
          <p className="text-sm text-[var(--cyber-text-secondary)]">
            Feedback Anda sangat berarti bagi kami.
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-[var(--cyber-text)] mb-2">
            Beri Rating
          </h3>
          <p className="text-sm text-[var(--cyber-text-secondary)] mb-4">
            Bagaimana pengalaman chat Anda?
          </p>
          
          {/* Bintang Rating */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(star)}
                className="transition-transform hover:scale-110"
              >
                <StarIcon filled={star <= rating} />
              </button>
            ))}
          </div>

          {/* Textarea Feedback */}
          <textarea
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] resize-none text-sm mb-4"
            placeholder="Tulis feedback (opsional)..."
          />

          {error && (
            <p className="text-sm text-[var(--cyber-error)] mb-4">{error}</p>
          )}

          {/* Tombol Aksi */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2 border border-[var(--cyber-border)] text-[var(--cyber-text)] rounded-lg hover:bg-[var(--cyber-bg-surface)] transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={rating === 0 || isLoading}
              className="flex-1 py-2 bg-[var(--cyber-accent)] text-white rounded-lg hover:bg-[var(--cyber-accent)]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Mengirim...' : 'Kirim'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
