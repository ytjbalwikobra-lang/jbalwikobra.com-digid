/**
 * FlashSaleProductDetailLoadingSkeleton - Loading skeleton for flash sale product detail page
 * Provides visual feedback during flash sale product data loading
 */

import React from 'react';

export const FlashSaleProductDetailLoadingSkeleton = React.memo(() => {
  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--cyber-border)]">
        <div className="h-6 w-6 bg-[var(--cyber-bg-elevated)] rounded"></div>
        <div className="h-6 w-32 bg-[var(--cyber-bg-elevated)] rounded"></div>
        <div className="flex space-x-4">
          <div className="h-6 w-6 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-6 w-6 bg-[var(--cyber-bg-elevated)] rounded"></div>
        </div>
      </div>

      {/* Content with bottom safe area */}
      <div style={{ paddingBottom: 'calc(var(--bottom-nav-height, 72px) + 140px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Gallery Skeleton */}
        <div className="px-4 pt-4">
          <div className="aspect-[4/5] bg-[var(--cyber-bg-card)] rounded-xl mb-4"></div>
          <div className="flex space-x-2 overflow-x-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-20 aspect-[4/5] bg-[var(--cyber-bg-card)] rounded-xl"></div>
            ))}
          </div>
        </div>

        {/* Product Info Skeleton */}
        <div className="px-4 py-6 space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <div className="h-8 w-full bg-[var(--cyber-bg-elevated)] rounded"></div>
            <div className="h-8 w-3/4 bg-[var(--cyber-bg-elevated)] rounded"></div>
          </div>

          {/* Flash Sale Timer & Price */}
          <div className="bg-gradient-to-r from-pink-900/30 to-fuchsia-900/30 rounded-2xl p-4 space-y-4">
            {/* Timer */}
            <div className="text-center space-y-2">
              <div className="h-4 w-32 bg-[var(--cyber-bg-elevated)] rounded mx-auto"></div>
              <div className="flex justify-center space-x-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-[var(--cyber-bg-card)] rounded-xl p-3">
                    <div className="h-6 w-8 bg-[var(--cyber-bg-elevated)] rounded"></div>
                    <div className="h-3 w-6 bg-[var(--cyber-bg-elevated)] rounded mt-1"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prices */}
            <div className="text-center space-y-2">
              <div className="h-8 w-40 bg-[var(--cyber-bg-elevated)] rounded mx-auto"></div>
              <div className="flex justify-center items-center space-x-3">
                <div className="h-5 w-24 bg-[var(--cyber-bg-elevated)] rounded"></div>
                <div className="h-4 w-12 bg-[var(--cyber-bg-elevated)] rounded"></div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <div className="h-6 w-32 bg-[var(--cyber-bg-elevated)] rounded"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-[var(--cyber-bg-elevated)] rounded"></div>
              <div className="h-4 w-full bg-[var(--cyber-bg-elevated)] rounded"></div>
              <div className="h-4 w-2/3 bg-[var(--cyber-bg-elevated)] rounded"></div>
            </div>
          </div>

          {/* Rental Options */}
          <div className="bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-2xl p-4 space-y-4">
            <div className="h-6 w-24 bg-[var(--cyber-bg-elevated)] rounded"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[var(--cyber-bg-card)] rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-[var(--cyber-bg-elevated)] rounded"></div>
                      <div className="h-5 w-24 bg-[var(--cyber-bg-elevated)] rounded"></div>
                    </div>
                    <div className="h-4 w-4 bg-[var(--cyber-bg-elevated)] rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--cyber-bg-pure)] border-t border-[var(--cyber-border)] p-4">
        <div className="flex space-x-3">
          <div className="flex-1 h-12 bg-[var(--cyber-bg-elevated)] rounded-xl"></div>
          <div className="flex-1 h-12 bg-[var(--cyber-bg-elevated)] rounded-xl"></div>
        </div>
      </div>
    </div>
  );
});

FlashSaleProductDetailLoadingSkeleton.displayName = 'FlashSaleProductDetailLoadingSkeleton';
