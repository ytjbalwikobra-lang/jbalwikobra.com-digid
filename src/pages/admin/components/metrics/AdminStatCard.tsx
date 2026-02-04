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
    container: 'surface-glass-md bg-gradient-to-br from-[var(--cyber-pink-subtle)] via-[var(--cyber-pink-subtle)]/50 to-[var(--cyber-pink-subtle)]/25',
    iconWrap: 'bg-accent-soft ring-accent text-accent',
    gradient: 'from-white to-pink-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  success: {
    container: 'surface-glass-md bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-emerald-700/5',
    iconWrap: 'bg-emerald-500/15 ring-1 ring-emerald-400/40 text-emerald-300',
    gradient: 'from-white to-emerald-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  info: {
    container: 'surface-glass-md bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-blue-700/5',
    iconWrap: 'bg-blue-500/15 ring-1 ring-blue-400/40 text-blue-300',
    gradient: 'from-white to-blue-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  warning: {
    container: 'surface-glass-md bg-gradient-to-br from-amber-500/15 via-amber-600/10 to-amber-700/5',
    iconWrap: 'bg-amber-500/20 ring-1 ring-amber-400/40 text-amber-300',
    gradient: 'from-white to-amber-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  danger: {
    container: 'surface-glass-md bg-gradient-to-br from-red-500/15 via-red-600/10 to-red-700/5',
    iconWrap: 'bg-red-500/20 ring-1 ring-red-400/40 text-red-300',
    gradient: 'from-white to-red-100',
    ring: 'ring-1 ring-inset ring-white/10'
  },
  neutral: {
    container: 'surface-glass-md bg-gradient-to-br from-gray-600/10 via-gray-700/5 to-gray-800/5',
    iconWrap: 'bg-[var(--cyber-bg-surface)]/20 ring-1 ring-[var(--cyber-border)]/30 text-[var(--cyber-text-muted)]',
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
