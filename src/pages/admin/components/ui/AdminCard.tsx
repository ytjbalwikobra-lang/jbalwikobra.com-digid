/**
 * Modern Admin Card Component
 * WCAG 2.1 AA Compliant
 * 
 * @description Reusable card component with consistent styling
 */

import React from 'react';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
}

interface AdminCardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

interface AdminCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface AdminCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = true,
  onClick,
  role,
  ariaLabel,
}) => {
  const paddingClass = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  const hoverClass = hover ? 'hover:border-[var(--admin-border-light)] hover:shadow-lg hover:-translate-y-1' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`admin-card ${paddingClass} ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export const AdminCardHeader: React.FC<AdminCardHeaderProps> = ({
  title,
  subtitle,
  actions,
  icon,
}) => {
  return (
    <div className="admin-card-header">
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div 
            className="flex-shrink-0 w-10 h-10 rounded-cyber-lg flex items-center justify-center bg-[var(--admin-accent-subtle)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="admin-card-title">{title}</h3>
          {subtitle && (
            <p className="text-sm mt-1 text-[var(--admin-text-tertiary)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export const AdminCardBody: React.FC<AdminCardBodyProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`admin-card-body ${className}`}>
      {children}
    </div>
  );
};

export const AdminCardFooter: React.FC<AdminCardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-6 pt-6 border-t border-[var(--admin-border)] ${className}`}>
      {children}
    </div>
  );
};

// Export all as named exports
export default AdminCard;
