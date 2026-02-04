/* eslint-disable react/prop-types */
/**
 * CyberDesignSystem - Lightweight UI primitives using Cyber-Compact tokens
 * Theme: OLED black background, pink primary accents, gaming vibe
 * Uses CSS custom properties from cyber-compact.css for consistency
 * This module is self-contained and not used by admin to avoid side effects.
 */
import React from 'react';
import { cn } from '../../utils/cn';

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
      'bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-cyber-2xl backdrop-blur-sm',
      'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

// Spinner Component
export const PNSpinner: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    className={cn('animate-spin', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const PNButton: React.FC<ButtonProps & { loading?: boolean }> = ({
  className,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading = false,
  disabled,
  ...rest
}) => (
  <button
  className={cn(
      'rounded-cyber-lg font-semibold transition-all duration-150 active:scale-[0.98]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      fullWidth && 'w-full',
      size === 'lg' && 'px-6 py-3.5 text-base min-h-[48px]',
      size === 'md' && 'px-5 py-3 text-sm min-h-[44px]',
      size === 'sm' && 'px-4 py-2.5 text-xs min-h-[44px]', // Changed from 36px to meet touch target
      variant === 'primary' && 'bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white hover:shadow-cyber-md',
      variant === 'secondary' && 'bg-[var(--cyber-bg-elevated)] text-white hover:bg-[var(--cyber-bg-card)] border border-[var(--cyber-border-hover)]',
      variant === 'ghost' && 'bg-transparent text-white hover:bg-[var(--cyber-pink-ghost)] border border-[var(--cyber-border)]',
      loading && 'relative',
      className
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <PNSpinner size={size === 'lg' ? 20 : size === 'md' ? 16 : 14} />
        <span>Memproses...</span>
      </span>
    ) : children}
  </button>
);

export const PNHeading: React.FC<{ 
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'base';
  className?: string;
  gradient?: boolean;
} & DivProps> = ({ level = 2, size, className, gradient, children, ...rest }) => {
  const Tag = (`h${level}` as unknown) as React.ElementType;
  
  // If size is explicitly provided, use it; otherwise use default based on level
  const sizeClass = size ? cn(
    size === '4xl' && 'text-3xl sm:text-4xl lg:text-5xl font-extrabold',
    size === '3xl' && 'text-2xl sm:text-3xl lg:text-4xl font-extrabold',
    size === '2xl' && 'text-xl sm:text-2xl lg:text-3xl font-bold',
    size === 'xl' && 'text-lg sm:text-xl lg:text-2xl font-bold',
    size === 'lg' && 'text-base sm:text-lg lg:text-xl font-semibold',
    size === 'base' && 'text-sm sm:text-base lg:text-lg font-semibold'
  ) : cn(
    level === 1 && 'text-2xl sm:text-3xl font-extrabold',
    level === 2 && 'text-xl sm:text-2xl font-bold',
    level === 3 && 'text-lg sm:text-xl font-semibold',
    level === 4 && 'text-base sm:text-lg font-semibold',
    level === 5 && 'text-sm sm:text-base font-medium',
    level === 6 && 'text-xs sm:text-sm font-medium'
  );
  
  const grad = gradient
    ? 'bg-gradient-to-r from-[var(--cyber-pink-secondary)] via-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] bg-clip-text text-transparent'
    : 'text-[var(--cyber-text-primary)]';
    
  return (
    <Tag className={cn(sizeClass, grad, className)} {...rest}>{children}</Tag>
  );
};

export const PNText: React.FC<DivProps & { color?: 'muted' | 'secondary' }>
  = ({ className, children, color = 'secondary', ...rest }) => (
  <p
    className={cn(
      color === 'secondary' && 'text-[var(--cyber-text-secondary)]',
      color === 'muted' && 'text-[var(--cyber-text-muted)]',
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
      'px-3 py-2 rounded-cyber-lg text-xs font-medium whitespace-nowrap select-none',
      'border transition-colors',
      active 
        ? 'bg-[var(--cyber-pink-muted)] border-[var(--cyber-pink-primary)] text-white' 
        : 'bg-[var(--cyber-bg-surface)] border-[var(--cyber-border)] text-[var(--cyber-text-secondary)]',
      'hover:bg-[var(--cyber-pink-subtle)] hover:border-[var(--cyber-pink-secondary)]',
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
        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--cyber-pink-secondary)] via-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] bg-clip-text text-transparent">{title}</div>
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
          className="block text-sm font-medium text-[var(--cyber-text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cyber-text-muted)] pointer-events-none" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full px-4 py-3.5 min-h-[48px]',
            'bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] rounded-cyber-lg',
            'text-[var(--cyber-text-primary)] placeholder:text-[var(--cyber-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-muted)] focus:border-[var(--cyber-pink-primary)]',
            'transition-all duration-150',
            icon ? 'pl-12' : '',
            error ? 'border-[var(--cyber-error)] focus:ring-[var(--cyber-error)]/50 focus:border-[var(--cyber-error)]' : '',
            className
          )}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-[var(--cyber-error)]" role="alert">
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
      'flex bg-[var(--cyber-bg-surface)] rounded-cyber-lg p-1 border border-[var(--cyber-border)]',
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
          'flex-1 py-3 px-4 min-h-[44px] rounded-cyber-lg text-sm font-medium transition-all duration-150',
          activeTab === tab.key
            ? 'bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white shadow-cyber-sm'
            : 'text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-elevated)]'
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
    <div className="flex-1 h-px bg-[var(--cyber-border)]" />
    {text && <span className="text-sm text-[var(--cyber-text-muted)]">{text}</span>}
    <div className="flex-1 h-px bg-[var(--cyber-border)]" />
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
      variant === 'primary' && 'text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)]',
      variant === 'muted' && 'text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-secondary)]',
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
