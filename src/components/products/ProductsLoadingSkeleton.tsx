/**
 * ProductsLoadingSkeleton - Loading skeleton component for products page
 * Optimized for mobile-first design with smooth animations
 */

import React from 'react';
const standardClasses = { container:{ boxed:'mx-auto w-full max-w-7xl px-4'} };

export const ProductsLoadingSkeleton = React.memo(() => (
  <div className="min-h-screen bg-[var(--cyber-bg-pure)]">
    {/* Header skeleton */}
    <div className={standardClasses.container.boxed}>
      <div className="h-8 bg-[var(--cyber-bg-card)] rounded-cyber-lg w-48 mb-4 animate-pulse"></div>
      <div className="h-10 bg-[var(--cyber-bg-card)] rounded-cyber-lg mb-4 animate-pulse"></div>
    </div>
    
    {/* Filter bar skeleton */}
    <div className={standardClasses.container.boxed}>
      <div className="flex space-x-3">
        <div className="h-10 bg-[var(--cyber-bg-card)] rounded-cyber-lg flex-1 animate-pulse"></div>
        <div className="h-10 w-10 bg-[var(--cyber-bg-card)] rounded-cyber-lg animate-pulse"></div>
      </div>
    </div>
    
    {/* Products grid skeleton */}
    <div className={standardClasses.container.boxed}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-[var(--cyber-bg-pure)]/50 rounded-cyber-2xl p-3 animate-pulse">
            <div className="aspect-square bg-[var(--cyber-bg-card)] rounded-cyber-lg mb-3"></div>
            <div className="h-4 bg-[var(--cyber-bg-card)] rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-[var(--cyber-bg-card)] rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-[var(--cyber-bg-card)] rounded-cyber-lg"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

ProductsLoadingSkeleton.displayName = 'ProductsLoadingSkeleton';
