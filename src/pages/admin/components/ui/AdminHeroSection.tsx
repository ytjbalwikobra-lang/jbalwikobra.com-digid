/**
 * AdminHeroSection - Cyberpunk Hero Component
 * 
 * Gradient glow hero section matching public pages DNA:
 * - Animated pink glow orbs
 * - Gradient text effects
 * - Live status badges
 * - Compact padding
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

interface AdminHeroSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'pink' | 'success' | 'warning' | 'info';
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const badgeColorClasses = {
  pink: {
    bg: 'bg-[var(--cyber-pink-subtle)]',
    border: 'border-[var(--cyber-pink-muted)]',
    text: 'text-[var(--cyber-pink-secondary)]',
    dot: 'bg-[var(--cyber-pink-primary)]'
  },
  success: {
    bg: 'bg-[var(--cyber-success)]/10',
    border: 'border-[var(--cyber-success)]/30',
    text: 'text-[var(--cyber-success)]',
    dot: 'bg-[var(--cyber-success)]'
  },
  warning: {
    bg: 'bg-[var(--cyber-warning)]/10',
    border: 'border-[var(--cyber-warning)]/30',
    text: 'text-[var(--cyber-warning)]',
    dot: 'bg-[var(--cyber-warning)]'
  },
  info: {
    bg: 'bg-[var(--cyber-info)]/10',
    border: 'border-[var(--cyber-info)]/30',
    text: 'text-[var(--cyber-info)]',
    dot: 'bg-[var(--cyber-info)]'
  }
};

export const AdminHeroSection: React.FC<AdminHeroSectionProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = 'pink',
  children,
  className,
  compact = false
}) => {
  const badgeColors = badgeColorClasses[badgeColor];
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-cyber-2xl border border-[var(--cyber-border)]',
        'bg-gradient-to-br from-[var(--cyber-bg-pure)] via-[var(--cyber-bg-surface)] to-[var(--cyber-bg-pure)]',
        compact ? 'px-3 py-3 sm:px-4 sm:py-4' : 'px-3 py-4 sm:px-5 sm:py-6',
        className
      )}
    >
      {/* Animated glow orbs (Cyberpunk DNA) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div 
          className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--cyber-pink-muted)] rounded-full blur-[100px] animate-pulse" 
        />
        <div 
          className="absolute -bottom-24 -right-24 w-64 h-64 bg-[var(--cyber-pink-subtle)] rounded-full blur-[100px] animate-pulse" 
          style={{ animationDelay: '1s' }}
        />
      </div>
      
      <div className="relative z-10">
        {badge && (
          <div className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3',
            badgeColors.bg,
            badgeColors.border,
            'border'
          )}>
            <span className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              badgeColors.dot
            )} />
            <span className={cn(
              'text-[10px] font-medium tracking-wide uppercase',
              badgeColors.text
            )}>
              {badge}
            </span>
          </div>
        )}
        
        <h1 className={cn(
          'font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent',
          compact ? 'text-xl md:text-2xl mb-1' : 'text-2xl md:text-3xl mb-2'
        )}>
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-xs text-[var(--cyber-text-muted)]">
            {subtitle}
          </p>
        )}
        
        {children && (
          <div className={compact ? 'mt-3' : 'mt-4'}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHeroSection;
