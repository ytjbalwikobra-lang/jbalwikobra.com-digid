import React from 'react';
import { cn } from '../../../../utils/cn';

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  size?: 'normal' | 'large';
  className?: string;
}

const variantStyles: Record<string, { container: string; iconWrap: string; gradient: string; ring: string; }>= {
  default: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-accent-subtle)] via-[var(--admin-accent-subtle)]/50 to-[var(--admin-accent-subtle)]/25',
    iconWrap: 'bg-accent-soft ring-accent text-accent',
    gradient: 'from-white to-pink-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  success: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-success)]/10 via-[var(--admin-success)]/5 to-[var(--admin-success)]/5',
    iconWrap: 'bg-[var(--admin-success)]/15 ring-1 ring-[var(--admin-success)]/40 text-[var(--admin-success)]',
    gradient: 'from-white to-emerald-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  info: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-info)]/10 via-[var(--admin-info)]/5 to-[var(--admin-info)]/5',
    iconWrap: 'bg-[var(--admin-info)]/15 ring-1 ring-[var(--admin-info)]/40 text-[var(--admin-info)]',
    gradient: 'from-white to-cyan-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  warning: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-warning)]/15 via-[var(--admin-warning)]/10 to-[var(--admin-warning)]/5',
    iconWrap: 'bg-[var(--admin-warning)]/20 ring-1 ring-[var(--admin-warning)]/40 text-[var(--admin-warning)]',
    gradient: 'from-white to-amber-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  danger: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-error)]/15 via-[var(--admin-error)]/10 to-[var(--admin-error)]/5',
    iconWrap: 'bg-[var(--admin-error)]/20 ring-1 ring-[var(--admin-error)]/40 text-[var(--admin-error)]',
    gradient: 'from-white to-pink-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  neutral: {
    container: 'surface-glass-md bg-gradient-to-br from-[var(--admin-bg-surface)]/10 via-[var(--admin-bg-surface)]/5 to-[var(--admin-bg-card)]/5',
    iconWrap: 'bg-[var(--admin-bg-surface)]/20 ring-1 ring-[var(--admin-border)]/30 text-[var(--admin-text-muted)]',
    gradient: 'from-white to-gray-200',
    ring: 'ring-1 ring-inset ring-white/10'
  }
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  sub,
  icon,
  variant = 'default',
  size = 'normal',
  className
}) => {
  const styles = variantStyles[variant];
  return (
    <div className={cn(
      'relative rounded-cyber-2xl overflow-hidden transition-soft hover:scale-[1.02] hover:shadow-xl',
      'p-5 flex flex-col justify-between min-h-[140px]',
      size === 'large' && 'lg:col-span-2 min-h-[180px] p-6',
      styles.container,
      className
    )}>
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_25%_75%,rgba(255,255,255,0.35),transparent_70%)]" />
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-3 flex-1">
          <p className="heading-micro text-faint tracking-wider">{label}</p>
          <h3 className={cn('font-bold bg-gradient-to-r bg-clip-text text-transparent', styles.gradient, size === 'large' ? 'text-4xl xl:text-5xl' : 'text-2xl xl:text-3xl')}>{value}</h3>
          {sub && <p className="typography-footnote text-white/60 font-medium">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('w-14 h-14 rounded-cyber-2xl flex items-center justify-center backdrop-blur-sm', styles.iconWrap)}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn('absolute inset-0 pointer-events-none rounded-cyber-2xl', styles.ring)} />
    </div>
  );
};

export default AdminStatCard;
