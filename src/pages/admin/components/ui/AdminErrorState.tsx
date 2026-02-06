/**
 * Admin Error State Component - Cyberpunk Pink Mode
 * Ultra-compact error display with neon pink/magenta glow aesthetic
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
  // Full-page error — centered, transparent bg, subtle red border
  if (variant === 'full-page') {
    return (
      <div className={cn("bg-pink-500/5 border border-pink-500/20 rounded-2xl p-8 text-center max-w-md mx-auto", className)} role="alert">
        <div className="w-14 h-14 bg-pink-500/10 rounded-full mx-auto mb-5 flex items-center justify-center">
          <XCircle className="w-7 h-7 text-pink-400" />
        </div>
        <h2 className="text-lg font-semibold text-white/90 mb-1.5">{title}</h2>
        <p className="text-sm text-white/40 mb-6 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 transition-all duration-200"
          >
            <RefreshCw size={16} />
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  // Banner error — minimalist: transparent bg, left red border accent
  if (variant === 'banner') {
    return (
      <div className={cn("bg-pink-500/5 border border-pink-500/20 rounded-2xl flex items-center gap-3 p-4", className)} role="alert">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-pink-400" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-pink-400 text-sm">{title}</p>
          <p className="text-sm mt-0.5 text-pink-400/60 truncate">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 text-sm font-medium rounded-full transition-colors border border-pink-500/20"
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  // Inline error (for form fields or small areas)
  return (
    <div className={cn("flex items-center gap-2 text-pink-400 text-sm", className)} role="alert">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default AdminErrorState;
