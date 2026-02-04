/**
 * ProductsErrorState - Error state component
 * Shows error message with retry functionality
 */

import React from 'react';

interface ProductsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ProductsErrorState = React.memo(({
  error,
  onRetry
}: ProductsErrorStateProps) => {
  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] flex items-center justify-center px-4">
      <div className="bg-[var(--cyber-bg-pure)]/50 backdrop-blur-sm border border-[var(--cyber-border)] rounded-2xl p-8 text-center max-w-md w-full">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-xl font-bold text-white mb-2">Gagal Memuat Produk</h2>
        <p className="text-[var(--cyber-text-muted)] mb-6 text-sm">{error}</p>
        <button
          onClick={onRetry}
          className="cyber-btn cyber-btn-primary w-full"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
});

ProductsErrorState.displayName = 'ProductsErrorState';
