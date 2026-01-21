/* eslint-disable react/prop-types */
/**
 * PinkNeonDesignSystem - lightweight UI primitives for homepage only
 * Theme: black background, pink primary accents, gaming vibe
 * This module is self-contained and not used by admin to avoid side effects.
 */
import React from 'react';
// Minimal className combiner to avoid extra deps
function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const PNSection: React.FC<DivProps & { padding?: 'sm' | 'md' | 'lg' }>
  = ({ className, children, padding = 'md', ...rest }) => (
  <section
    className={cn(
      padding === 'lg' && 'px-4 py-8',
      padding === 'md' && 'px-4 py-6',
      padding === 'sm' && 'px-4 py-4',
      className
    )}
    {...rest}
  >
    {children}
  </section>
);

export const PNContainer: React.FC<DivProps> = ({ className, children, ...rest }) => (
  <div className={cn('max-w-7xl mx-auto', className)} {...rest}>{children}</div>
);

export const PNCard: React.FC<DivProps> = ({ className, children, ...rest }) => (
  <div
    className={cn(
      'bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm',
      'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

export const PNButton: React.FC<ButtonProps> = ({
  className,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ...rest
}) => (
  <button
  className={cn(
      'rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
      fullWidth && 'w-full',
      size === 'lg' && 'px-6 py-3.5 text-base min-h-[48px]',
      size === 'md' && 'px-5 py-3 text-sm min-h-[44px]',
      size === 'sm' && 'px-4 py-2.5 text-xs min-h-[36px]',
      variant === 'primary' && 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:from-pink-600 hover:to-fuchsia-700 shadow-lg shadow-pink-500/25',
      variant === 'secondary' && 'bg-white/10 text-white hover:bg-white/15 border border-white/20',
      variant === 'ghost' && 'bg-transparent text-white hover:bg-white/10 border border-white/30',
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

export const PNHeading: React.FC<{ level?: 1 | 2 | 3; className?: string; gradient?: boolean } & DivProps>
  = ({ level = 2, className, gradient, children, ...rest }) => {
  const Tag = (`h${level}` as unknown) as React.ElementType;
  const base = cn(
    level === 1 && 'text-2xl sm:text-3xl font-extrabold',
    level === 2 && 'text-xl sm:text-2xl font-bold',
    level === 3 && 'text-lg sm:text-xl font-semibold'
  );
  const grad = gradient
    ? 'bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-600 bg-clip-text text-transparent'
    : 'text-white';
  return (
    <Tag className={cn(base, grad, className)} {...rest}>{children}</Tag>
  );
};

export const PNText: React.FC<DivProps & { color?: 'muted' | 'secondary' }>
  = ({ className, children, color = 'secondary', ...rest }) => (
  <p
    className={cn(
      color === 'secondary' && 'text-gray-200',
      color === 'muted' && 'text-gray-300',
      className
    )}
    {...rest}
  >
    {children}
  </p>
);

export const PNPill: React.FC<DivProps & { active?: boolean }>
  = ({ className, children, active, ...rest }) => (
  <div
    className={cn(
      'px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap select-none',
      'border',
      active ? 'bg-pink-500/20 border-pink-400 text-white' : 'bg-black/40 border-white/10 text-gray-200',
      'hover:bg-pink-500/10 hover:border-pink-400/70 transition-colors',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

export const PNSectionHeader: React.FC<{ title: React.ReactNode; subtitle?: string; action?: React.ReactNode; padX?: boolean }>
  = ({ title, subtitle, action, padX = true }) => (
  <div className={cn('mb-5 flex items-end justify-between gap-4', padX ? 'px-1' : '')}>
    <div className="flex-1 min-w-0">
      {typeof title === 'string' ? (
        <PNHeading level={2} gradient>{title}</PNHeading>
      ) : (
        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-600 bg-clip-text text-transparent">{title}</div>
      )}
      {subtitle && <PNText color="muted" className="mt-1 text-sm">{subtitle}</PNText>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export default {
  PNSection,
  PNContainer,
  PNCard,
  PNButton,
  PNHeading,
  PNText,
  PNPill,
  PNSectionHeader,
};
