/**
 * Notification Skeleton Loader
 * Provides visual feedback during loading with animated placeholders
 * WCAG 2.1 AA compliant with reduced motion support
 */

import React from 'react';
import { prefersReducedMotion } from '../utils/accessibility';

interface NotificationSkeletonProps {
  count?: number;
  variant?: 'panel' | 'page';
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

/**
 * Single skeleton item for notification list
 */
const SkeletonItem: React.FC<{ variant: 'panel' | 'page' }> = ({ variant }) => {
  const reduceMotion = prefersReducedMotion();
  const animationClass = reduceMotion ? 'opacity-50' : 'animate-pulse';
  
  if (variant === 'page') {
    return (
      <div 
        className={cn(
          'rounded-2xl border border-gray-800 bg-black/20 p-6',
          animationClass
        )}
        role="presentation"
        aria-hidden="true"
      >
        <div className="flex items-start gap-4">
          {/* Icon skeleton */}
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gray-700/50" />
          
          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title and badge */}
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-700/50 rounded-lg w-48" />
              <div className="h-5 bg-gray-700/50 rounded-lg w-20" />
            </div>
            
            {/* Time */}
            <div className="h-4 bg-gray-700/30 rounded w-24" />
            
            {/* Message */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/30 rounded w-full" />
              <div className="h-4 bg-gray-700/30 rounded w-3/4" />
            </div>
            
            {/* Meta info */}
            <div className="flex gap-3">
              <div className="h-7 bg-gray-700/20 rounded-lg w-28" />
              <div className="h-7 bg-gray-700/20 rounded-lg w-24" />
            </div>
            
            {/* Button */}
            <div className="h-9 bg-gray-700/20 rounded-xl w-40" />
          </div>
        </div>
      </div>
    );
  }

  // Panel variant (compact)
  return (
    <div 
      className={cn(
        'p-4 border-b border-gray-800',
        animationClass
      )}
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex gap-3">
        {/* Icon skeleton */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-700/50" />
        
        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <div className="h-4 bg-gray-700/50 rounded w-32" />
            <div className="w-2 h-2 rounded-full bg-gray-700/50" />
          </div>
          
          {/* Message */}
          <div className="h-3 bg-gray-700/30 rounded w-full" />
          <div className="h-3 bg-gray-700/30 rounded w-2/3" />
          
          {/* Time */}
          <div className="h-3 bg-gray-700/20 rounded w-16" />
        </div>
      </div>
    </div>
  );
};

/**
 * Notification skeleton loader component
 * Displays animated placeholder content while notifications load
 */
export const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({ 
  count = 3, 
  variant = 'panel' 
}) => {
  return (
    <div 
      className={variant === 'page' ? 'space-y-3' : ''}
      role="status" 
      aria-label="Memuat notifikasi..."
    >
      {/* Screen reader only loading text */}
      <span className="sr-only">Memuat notifikasi, mohon tunggu...</span>
      
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} variant={variant} />
      ))}
    </div>
  );
};

export default NotificationSkeleton;
