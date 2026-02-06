/**
 * Admin Page Header Component - Cyber Compact Design System
 * WCAG 2.1 AA Compliant | Strict 4px Grid Spacing
 * 
 * Design Constitution Rules:
 * - Base unit: 4px (Tailwind's default)
 * - All spacing multiples of 4: gap-4 (16px), gap-6 (24px)
 * - Title: text-2xl font-bold (20px)
 * - Description: text-sm (14px) text-muted
 * - Button spacing: gap-4 (16px)
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminButton } from './AdminButton';

interface AdminPageHeaderProps {
  /** Page title - displayed as h1 */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Action buttons to display on the right */
  actions?: React.ReactNode;
  /** Optional refresh callback - adds refresh button */
  onRefresh?: () => void;
  /** Loading state for refresh button */
  loading?: boolean;
}

/**
 * Standardized Page Header for all Admin pages
 * Enforces consistent layout: Title left, Actions right
 * Mobile: stacks vertically with proper spacing
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  actions,
  onRefresh,
  loading = false
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--admin-text-muted)] font-medium">
            {description}
          </p>
        )}
      </div>

      {/* Actions Section - gap-4 ensures proper 16px spacing between buttons */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {onRefresh && (
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </AdminButton>
        )}
        {actions}
      </div>
    </div>
  );
};

export default AdminPageHeader;
