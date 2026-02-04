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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 text-center max-w-md w-full">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-xl font-bold text-white mb-2">Gagal Memuat Produk</h2>
        <p className="text-gray-400 mb-6 text-sm">{error}</p>
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
