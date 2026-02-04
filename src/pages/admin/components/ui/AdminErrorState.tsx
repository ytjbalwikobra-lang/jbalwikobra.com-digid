/**
 * Admin Error State Component - V3 Design System
 * Unified error display for admin pages
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface AdminErrorStateProps {
  variant?: 'full-page' | 'banner' | 'inline';
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  variant = 'banner',
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className
}) => {
  // Full-page error
  if (variant === 'full-page') {
    return (
      <div className={cn("bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center", className)} role="alert">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
          >
            <RefreshCw size={18} />
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  // Banner error (for page-level notifications)
  if (variant === 'banner') {
    return (
      <div className={cn("bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300", className)} role="alert">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm mt-1 text-red-300/80">{message}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-shrink-0 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-200 text-sm font-medium rounded transition-colors"
            >
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline error (for form fields or small areas)
  return (
    <div className={cn("flex items-center gap-2 text-red-400 text-sm", className)} role="alert">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default AdminErrorState;
