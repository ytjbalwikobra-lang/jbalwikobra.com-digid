/**
 * Modern Admin Status Badge Component
 * WCAG 2.1 AA Compliant
 * Uses CSS variables from cyber-compact.css (--admin-* namespace)
 * 
 * @description Reusable status badge with consistent styling and accessibility
 */

import React from 'react';
import { Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

export type StatusType = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'cancelled' 
  | 'active'  
  | 'inactive'
  | 'paid';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

// Map status to icons, labels, and explicit Tailwind classes
const statusConfig = {
  pending: {
    icon: Clock,
    defaultLabel: 'Pending',
    classes: 'bg-[var(--admin-warning-bg)] border-[var(--admin-warning-border)] text-[var(--admin-warning-light)]',
  },
  processing: {
    icon: Loader,
    defaultLabel: 'Processing',
    classes: 'bg-[var(--admin-info-bg)] border-[var(--admin-info-border)] text-[var(--admin-info-light)]',
  },
  paid: {
    icon: CreditCard,
    defaultLabel: 'Paid',
    classes: 'bg-[var(--admin-info-bg)] border-[var(--admin-info-border)] text-[var(--admin-info-light)]',
  },
  completed: {
    icon: CheckCircle,
    defaultLabel: 'Completed',
    classes: 'bg-[var(--admin-success-bg)] border-[var(--admin-success-border)] text-[var(--admin-success-light)]',
  },
  cancelled: {
    icon: XCircle,
    defaultLabel: 'Cancelled',
    classes: 'bg-[var(--admin-error-bg)] border-[var(--admin-error-border)] text-[var(--admin-error-light)]',
  },
  active: {
    icon: CheckCircle,
    defaultLabel: 'Active',
    classes: 'bg-[var(--admin-success-bg)] border-[var(--admin-success-border)] text-[var(--admin-success-light)]',
  },
  inactive: {
    icon: AlertCircle,
    defaultLabel: 'Inactive',
    classes: 'bg-[var(--admin-muted-bg)] border-[var(--admin-muted-border)] text-[var(--admin-muted-light)]',
  },
};

export const AdminStatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label,
  showIcon = true,
  className = '' 
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <span 
      className={`admin-badge inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide border ${config.classes} ${className}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {showIcon && <Icon size={12} aria-hidden="true" />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default AdminStatusBadge;
