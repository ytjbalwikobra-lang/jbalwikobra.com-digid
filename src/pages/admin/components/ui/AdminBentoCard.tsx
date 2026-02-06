/**
 * AdminBentoCard - Cyberpunk Compact Card Component
 * 
 * Ultra-compact bento grid card matching public pages DNA:
 * - Compact padding (p-2 = 8px)
 * - Pink glow hover effects
 * - Touch-optimized interactions
 * - Matches BentoProductCard visual language
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

interface AdminBentoCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  glowOnHover?: boolean;
  selected?: boolean;
  disabled?: boolean;
  as?: 'div' | 'button';
}

export const AdminBentoCard: React.FC<AdminBentoCardProps> = ({
  children,
  onClick,
  className,
  glowOnHover = true,
  selected = false,
  disabled = false,
  as: Component = 'div'
}) => {
  return (
    <Component
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        // Base styles (matches BentoProductCard DNA)
        'bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)]',
        'rounded-cyber-lg overflow-hidden',
        'transition-all duration-200',
        
        // Compact padding (8px vs admin's old 24px)
        'p-2',
        
        // Interactive states
        onClick && !disabled && 'cursor-pointer',
        
        // Cyberpunk hover effects (pink glow)
        onClick && !disabled && glowOnHover && 'hover:border-[var(--cyber-pink-primary)]',
        onClick && !disabled && 'hover:scale-[1.02]',
        onClick && !disabled && glowOnHover && 'hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
        
        // Active tap effect (Mobile-first)
        onClick && !disabled && 'active:scale-[0.98]',
        
        // Selected state
        selected && 'border-[var(--cyber-pink-primary)] bg-[var(--cyber-pink-subtle)]',
        
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        
        className
      )}
    >
      {children}
    </Component>
  );
};

// Preset variants for common patterns
interface AdminBentoMetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

export const AdminBentoMetricCard: React.FC<AdminBentoMetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  onClick
}) => {
  return (
    <AdminBentoCard onClick={onClick} glowOnHover={!!onClick}>
      <div className="flex items-start justify-between gap-2">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--cyber-pink-subtle)] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] text-[var(--cyber-text-muted)] uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-lg font-bold text-white mt-0.5">
            {value}
          </p>
          {trend && trendValue && (
            <p className={cn(
              'text-[10px] font-medium mt-0.5',
              trend === 'up' && 'text-[var(--cyber-success)]',
              trend === 'down' && 'text-[var(--cyber-error)]',
              trend === 'neutral' && 'text-[var(--cyber-text-muted)]'
            )}>
              {trend === 'up' && '↑'} {trend === 'down' && '↓'} {trendValue}
            </p>
          )}
        </div>
      </div>
    </AdminBentoCard>
  );
};

export default AdminBentoCard;
