import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden animate-pulse">
    <div className="aspect-[4/5] bg-[var(--cyber-pink-subtle)]" />
    <div className="p-3">
      <div className="h-3 bg-[var(--cyber-pink-subtle)] rounded w-full mb-1" />
      <div className="h-3 bg-[var(--cyber-pink-subtle)] rounded w-2/3 mb-1.5" />
      <div className="h-4 bg-[var(--cyber-pink-subtle)] rounded w-1/2 mb-2" />
      <div className="h-9 bg-[var(--cyber-pink-subtle)] rounded-xl" />
    </div>
  </div>
);

export default ProductCardSkeleton;
