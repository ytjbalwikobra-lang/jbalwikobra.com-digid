/**
 * Admin Empty State Component - V4 Cyber Design System
 * Polished empty states matching the public catalog aesthetic
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  hasFilters?: boolean;
  filterHint?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  variant?: 'table-row' | 'centered';
  colSpan?: number;
  className?: string;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon,
  title,
  description,
  hasFilters = false,
  filterHint = 'Try adjusting your filters to see more results.',
  action,
  variant = 'centered',
  colSpan = 6,
  className
}) => {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'text-center py-12 px-6',
        'bg-white/5 backdrop-blur-sm',
        'border border-white/[0.08] rounded-2xl',
        className
      )}
    >
      {/* Icon — accent-tinted pill, matching catalog style */}
      <div className="w-14 h-14 bg-[rgba(245,0,87,0.1)] rounded-2xl mx-auto mb-5 flex items-center justify-center text-[#F50057]">
        {icon}
      </div>

      {/* Title — bright white like public page */}
      <h3 className="text-base font-semibold text-white/90 mb-1.5 tracking-tight">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-white/40 mb-5 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {/* Filter hint (replaces description when active) */}
      {hasFilters && (
        <p className="text-sm text-white/40 mb-5 max-w-xs mx-auto leading-relaxed">
          {filterHint}
        </p>
      )}

      {/* CTA button — neon accent, matching catalog PNButton style */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5',
            'text-sm font-medium text-white rounded-full',
            'bg-[#F50057] hover:bg-[#ff1a6d]',
            'shadow-[0_0_20px_rgba(245,0,87,0.25)]',
            'hover:shadow-[0_0_28px_rgba(245,0,87,0.35)]',
            'transition-all duration-200'
          )}
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );

  if (variant === 'table-row') {
    return (
      <tr>
        <td colSpan={colSpan}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
};

export default AdminEmptyState;
