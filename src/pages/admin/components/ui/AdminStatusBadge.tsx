/**
 * Modern Admin Status Badge Component
 * WCAG 2.1 AA Compliant
 * 
 * @description Reusable status badge with consistent styling and accessibility
 */

import React from 'react';
import { Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { AdminStatusColors } from '../../design-tokens';

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

const statusConfig = {
  pending: {
    icon: Clock,
    defaultLabel: 'Pending',
    colors: AdminStatusColors.pending,
  },
  processing: {
    icon: Loader,
    defaultLabel: 'Processing',
    colors: AdminStatusColors.processing,
  },
  paid: {
    icon: CreditCard,
    defaultLabel: 'Paid',
    colors: AdminStatusColors.processing,
  },
  completed: {
    icon: CheckCircle,
    defaultLabel: 'Completed',
    colors: AdminStatusColors.completed,
  },
  cancelled: {
    icon: XCircle,
    defaultLabel: 'Cancelled',
    colors: AdminStatusColors.cancelled,
  },
  active: {
    icon: CheckCircle,
    defaultLabel: 'Active',
    colors: AdminStatusColors.active,
  },
  inactive: {
    icon: AlertCircle,
    defaultLabel: 'Inactive',
    colors: AdminStatusColors.inactive,
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
      className={`admin-badge inline-flex items-center gap-2 ${className}`}
      style={{
        backgroundColor: config.colors.bg,
        borderColor: config.colors.border,
        color: config.colors.text,
        border: `1px solid ${config.colors.border}`,
      }}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {showIcon && <Icon size={12} aria-hidden="true" />}
      <span className="font-medium uppercase tracking-wide text-xs">
        {displayLabel}
      </span>
    </span>
  );
};

export default AdminStatusBadge;
