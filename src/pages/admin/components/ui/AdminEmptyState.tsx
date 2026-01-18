/**
 * Admin Empty State Component - V3 Design System
 * Unified empty states for admin pages
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
    <div className={cn("text-center py-12", className)}>
      <div className="w-16 h-16 text-gray-600 mx-auto mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-400 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-4">{description}</p>
      )}
      {hasFilters && (
        <p className="text-gray-500 text-sm mb-4">{filterHint}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors"
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
