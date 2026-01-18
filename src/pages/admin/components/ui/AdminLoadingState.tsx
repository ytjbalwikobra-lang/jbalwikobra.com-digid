/**
 * Admin Loading State Component - V3 Design System
 * Unified loading states for admin pages
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

interface AdminLoadingStateProps {
  variant?: 'spinner' | 'skeleton-table' | 'skeleton-cards' | 'full-page';
  message?: string;
  rows?: number;
  columns?: number;
  cards?: number;
  className?: string;
}

export const AdminLoadingState: React.FC<AdminLoadingStateProps> = ({
  variant = 'spinner',
  message = 'Loading...',
  rows = 5,
  columns = 5,
  cards = 4,
  className
}) => {
  // Full-page spinner
  if (variant === 'full-page') {
    return (
      <div className={cn("flex items-center justify-center min-h-[60vh]", className)} role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4" />
          <p className="text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  // Simple spinner (for inline use)
  if (variant === 'spinner') {
    return (
      <div className={cn("text-center py-12", className)} role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto" />
        <p className="text-gray-400 mt-4">{message}</p>
      </div>
    );
  }

  // Skeleton cards
  if (variant === 'skeleton-cards') {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)} role="status" aria-label="Loading cards">
        {[...Array(cards)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-700 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-700/70 rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Skeleton table rows
  if (variant === 'skeleton-table') {
    return (
      <>
        {[...Array(rows)].map((_, i) => (
          <tr key={i} className="animate-pulse" role="row" aria-label="Loading row">
            {[...Array(columns)].map((_, j) => (
              <td key={j} className="px-6 py-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  {j === 0 && <div className="h-3 bg-gray-800 rounded w-1/2" />}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  return null;
};

export default AdminLoadingState;
