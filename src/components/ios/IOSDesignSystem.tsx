/**
 * Unified iOS Design System Components
 * Ensures consistent design across all pages following iOS Human Interface Guidelines
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
const standardClasses = { container:{boxed:'mx-auto w-full max-w-7xl px-4'} };

// iOS Design System Types
export interface IOSColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface IOSSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface IOSRadius {
  small: string;
  medium: string;
  large: string;
  card: string;
}

// iOS Design Tokens
export const iosDesignTokens = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    accent: '#FF2D92',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    border: '#38383A',
    success: '#30D158',
    warning: '#FF9500',
    error: '#FF3B30'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  radius: {
    small: '8px',
    medium: '12px',
    large: '16px',
    card: '20px'
  },
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.15)',
    large: '0 8px 32px rgba(0, 0, 0, 0.2)'
  }
} as const;

// iOS Button Component
interface IOSButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const IOSButton: React.FC<IOSButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  children,
  onClick,
  className = ''
}) => {
  const baseClasses = `
    ios-button
    inline-flex items-center justify-center
    font-semibold text-center
    transition-all duration-200 ease-out
    min-h-[44px] touch-manipulation
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
  `;

  const variantClasses = {
    primary: 'bg-pink-500 text-white border border-transparent',
    secondary: 'bg-black text-white border border-gray-700',
    destructive: 'bg-ios-error text-white border border-transparent',
    ghost: 'bg-transparent text-pink-500 border border-transparent'
  };

  const sizeClasses = {
    small: 'px-4 py-2 text-sm rounded-xl',
    medium: 'px-6 py-3 text-base rounded-xl',
    large: 'px-8 py-4 text-lg rounded-2xl'
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={20} className="mr-2" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={20} className="ml-2" />}
        </>
      )}
    </button>
  );
};

// iOS Badge Component
interface IOSBadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  size?: 'small' | 'medium';
  className?: string;
  children: React.ReactNode;
}

export const IOSBadge: React.FC<IOSBadgeProps> = ({
  variant = 'primary',
  size = 'small',
  className = '',
  children
}) => {
  const variantClasses = {
    primary: 'bg-pink-500 text-white',
    secondary: 'bg-black text-white border border-gray-700',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    destructive: 'bg-red-500 text-white'
  };

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center justify-center
      font-medium rounded-full
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};

// iOS Card Component
interface IOSCardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const IOSCard: React.FC<IOSCardProps> = ({
  variant = 'default',
  padding = 'medium',
  className = '',
  children,
  onClick
}) => {
  // Adaptive surface tokens (light/dark) with subtle depth & pink accent potential
  const baseClasses = `
    ios-card relative overflow-hidden group
    rounded-2xl
    transition-all duration-400 ease-out
    backdrop-blur-sm
    bg-gradient-to-br from-white/70 to-white/30 dark:from-[#161618] dark:via-[#121214] dark:to-[#0b0b0c]
    ring-1 ring-black/10 dark:ring-white/5
    shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_4px_18px_-6px_rgba(0,0,0,0.25)]
    dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_24px_-4px_rgba(0,0,0,0.55)]
    ${onClick ? 'cursor-pointer active:scale-[0.985]' : ''}
    hover:shadow-[0_0_0_1px_rgba(236,72,153,0.25),0_6px_28px_-6px_rgba(236,72,153,0.35)]
    hover:ring-pink-500/40
  `;

  const variantClasses = {
    default: '',
    elevated: 'shadow-lg dark:shadow-[0_8px_40px_-10px_rgba(0,0,0,0.8)]',
    outlined: 'ring-1 ring-pink-500/30 dark:ring-pink-500/20'
  };

  const paddingClasses = {
    none: '',
    small: 'p-4',
    medium: 'p-4',
    large: 'p-6'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
    >
      {/* Accent shimmer overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(236,72,153,0.08),transparent_60%)]" />
        <div className="absolute -inset-px rounded-[inherit] ring-1 ring-inset ring-white/10 dark:ring-white/5 mix-blend-overlay" />
      </div>
      {children}
    </div>
  );
};

// iOS Grid System
interface IOSGridProps {
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'small' | 'medium' | 'large';
  className?: string;
  children: React.ReactNode;
}

export const IOSGrid: React.FC<IOSGridProps> = ({
  columns = 2,
  gap = 'medium',
  className = '',
  children
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  const gapClasses = {
    small: 'gap-3',
    medium: 'gap-4',
    large: 'gap-6'
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

// iOS Section Header
interface IOSSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const IOSSectionHeader: React.FC<IOSSectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = ''
}) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      {subtitle && (
        <p className="text-whiteSecondary text-sm">{subtitle}</p>
      )}
    </div>
    {action && (
      <IOSButton
        variant="ghost"
        size="small"
        onClick={action.onClick}
      >
        {action.label}
      </IOSButton>
    )}
  </div>
);

// iOS Hero Section
interface IOSHeroProps {
  title: string;
  subtitle?: string;
  backgroundGradient?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export const IOSHero: React.FC<IOSHeroProps> = ({
  title,
  subtitle,
  backgroundGradient = 'from-ios-accent via-pink-500 to-rose-500',
  icon: Icon,
  children,
  className = ''
}) => (
  <section className={`bg-gradient-to-r ${backgroundGradient} py-12 lg:py-16 ${className}`}>
    <div className={cn(standardClasses.container.boxed, 'text-center')}>
      {Icon && (
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-black/20 rounded-xl flex items-center justify-center border border-gray-700">
            <Icon className="text-white" size={32} />
          </div>
        </div>
      )}
      <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  </section>
);

// iOS Loading Skeleton
interface IOSSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const IOSSkeleton: React.FC<IOSSkeletonProps> = ({
  className = '',
  variant = 'rectangular'
}) => {
  const baseClasses = 'animate-pulse bg-ios-border';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

// iOS Container
interface IOSContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const IOSContainer: React.FC<IOSContainerProps> = ({
  maxWidth = 'xl',
  padding = true,
  className = '',
  children
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  return (
    <div className={`
      ${maxWidthClasses[maxWidth]} 
      mx-auto 
      ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} 
      ${className}
    `}>
      {children}
    </div>
  );
};

// Export all design tokens and components (legacy IOSPagination removed after V2 migration)
export * from './IOSDesignSystemV2';
export { IOSAvatar } from './IOSAvatar';
export { IOSImageUploader } from './IOSImageUploader';
