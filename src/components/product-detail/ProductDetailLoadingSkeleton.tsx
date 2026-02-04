/**
 * ProductDetailLoadingSkeleton - Loading skeleton for product detail page
 * Provides visual feedback during product data loading
 */

import React from 'react';

export const ProductDetailLoadingSkeleton = React.memo(() => {
  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-4 w-16 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-4 w-1 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-4 w-20 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-4 w-1 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-4 w-32 bg-[var(--cyber-bg-elevated)] rounded"></div>
        </div>

        {/* Back Button Skeleton */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-5 w-5 bg-[var(--cyber-bg-elevated)] rounded"></div>
          <div className="h-4 w-32 bg-[var(--cyber-bg-elevated)] rounded"></div>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Image Gallery Skeleton */}
          <div>
            {/* Main Image */}
            <div className="aspect-[4/5] bg-[var(--cyber-bg-card)] rounded-xl mb-4"></div>
            
            {/* Thumbnails */}
            <div className="flex space-x-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-24 aspect-[4/5] bg-[var(--cyber-bg-card)] rounded-xl"></div>
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="mt-6 lg:mt-0">
            {/* Tags */}
            <div className="flex space-x-3 mb-6">
              <div className="h-8 w-24 bg-[var(--cyber-bg-elevated)] rounded-full"></div>
              <div className="h-8 w-20 bg-[var(--cyber-bg-elevated)] rounded-full"></div>
            </div>

            {/* Product Name */}
            <div className="h-10 w-3/4 bg-[var(--cyber-bg-elevated)] rounded mb-4"></div>

            {/* Price */}
            <div className="h-12 w-48 bg-[var(--cyber-bg-elevated)] rounded mb-6"></div>

            {/* Account Details */}
            <div className="p-4 bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-xl mb-6">
              <div className="h-6 w-32 bg-[var(--cyber-bg-elevated)] rounded mb-2"></div>
              <div className="h-4 w-48 bg-[var(--cyber-bg-elevated)] rounded"></div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <div className="h-14 w-full bg-[var(--cyber-bg-elevated)] rounded-xl"></div>
              <div className="h-14 w-full bg-[var(--cyber-bg-elevated)] rounded-xl"></div>
            </div>

            {/* Additional Actions */}
            <div className="flex space-x-4 mb-8">
              <div className="h-6 w-16 bg-[var(--cyber-bg-elevated)] rounded"></div>
              <div className="h-6 w-16 bg-[var(--cyber-bg-elevated)] rounded"></div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-[var(--cyber-bg-elevated)] rounded"></div>
                  <div className="h-4 w-20 bg-[var(--cyber-bg-elevated)] rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description Skeleton */}
        <div className="mt-12 bg-[var(--cyber-bg-card)] rounded-xl border border-[var(--cyber-border)] p-6">
          <div className="h-8 w-48 bg-[var(--cyber-bg-elevated)] rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-[var(--cyber-bg-elevated)] rounded"></div>
            <div className="h-4 w-full bg-[var(--cyber-bg-elevated)] rounded"></div>
            <div className="h-4 w-3/4 bg-[var(--cyber-bg-elevated)] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductDetailLoadingSkeleton.displayName = 'ProductDetailLoadingSkeleton';
