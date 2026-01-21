import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden animate-pulse">
    <div className="aspect-[4/5] bg-pink-900/20" />
    <div className="p-3">
      <div className="h-3 bg-pink-500/10 rounded w-full mb-1" />
      <div className="h-3 bg-pink-500/10 rounded w-2/3 mb-1.5" />
      <div className="h-4 bg-pink-500/10 rounded w-1/2 mb-2" />
      <div className="h-9 bg-pink-500/10 rounded-xl" />
    </div>
  </div>
);

export default ProductCardSkeleton;
