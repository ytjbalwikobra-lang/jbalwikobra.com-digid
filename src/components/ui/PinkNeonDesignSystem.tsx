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
      'px-4 sm:px-6 lg:px-8',
      padding === 'lg' && 'py-6 sm:py-8 lg:py-10',
      padding === 'md' && 'py-5 sm:py-6',
      padding === 'sm' && 'py-3 sm:py-4',
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
  <div className={cn('mb-6 flex items-end justify-between gap-4', padX ? 'px-1' : '')}>
    <div className="flex-1 min-w-0">
      {typeof title === 'string' ? (
        <PNHeading level={2} gradient>{title}</PNHeading>
      ) : (
        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-600 bg-clip-text text-transparent">{title}</div>
      )}
      {subtitle && <PNText color="muted" className="mt-1.5 text-sm">{subtitle}</PNText>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// Form Input Component - consistent styling for auth forms
// ISO/WCAG Accessibility: proper label association, error announcements
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const PNInput: React.FC<InputProps> = ({ 
  label, 
  error, 
  icon,
  className,
  id,
  ...rest 
}) => {
  // Generate unique ID for label association if not provided
  const inputId = id || `pn-input-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).slice(2)}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-white/80"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full px-4 py-3.5 min-h-[48px]',
            'bg-white/5 border border-white/10 rounded-xl',
            'text-white placeholder:text-white/40',
            'focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50',
            'transition-all duration-200',
            icon ? 'pl-12' : '',
            error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : '',
            className
          )}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Tab Switcher Component - for login/signup mode switching
// ISO/WCAG Accessibility: proper ARIA roles for tab navigation
type TabItem = { key: string; label: string };
type TabSwitcherProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
};

export const PNTabSwitcher: React.FC<TabSwitcherProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  className,
  ariaLabel = "Login method"
}) => (
  <div 
    role="tablist"
    aria-label={ariaLabel}
    className={cn(
      'flex bg-white/5 rounded-xl p-1 border border-white/10',
      className
    )}
  >
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.key}
        aria-controls={`tabpanel-${tab.key}`}
        id={`tab-${tab.key}`}
        onClick={() => onTabChange(tab.key)}
        className={cn(
          'flex-1 py-3 px-4 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200',
          activeTab === tab.key
            ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// Divider with text
export const PNDivider: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <div className={cn('flex items-center gap-4', className)}>
    <div className="flex-1 h-px bg-white/10" />
    {text && <span className="text-sm text-white/40">{text}</span>}
    <div className="flex-1 h-px bg-white/10" />
  </div>
);

// Link button - for "Already have account?" etc
export const PNLinkButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'muted' }> = ({ 
  children, 
  variant = 'primary',
  className, 
  ...rest 
}) => (
  <button
    type="button"
    className={cn(
      'text-sm font-medium transition-colors',
      variant === 'primary' && 'text-pink-400 hover:text-pink-300',
      variant === 'muted' && 'text-white/60 hover:text-white/80',
      className
    )}
    {...rest}
  >
    {children}
  </button>
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
  PNInput,
  PNTabSwitcher,
  PNDivider,
  PNLinkButton,
};
