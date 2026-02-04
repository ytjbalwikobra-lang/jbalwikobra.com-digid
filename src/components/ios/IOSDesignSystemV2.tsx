/**
 * Enhanced iOS Design System V2
 * Mobile-First Components Following iOS HIG & Android Material Design 3
 * 
 * Key Features:
 * - Native-like touch interactions and animations
 * - Optimized spacing and typography for mobile
 * - Accessibility-first approach
 * - Performance optimized components
 * - Dark mode native support
 * - Platform-specific adaptations
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

// Enhanced design tokens following platform guidelines
export const iosDesignTokens = {
  // Color system with semantic naming
  colors: {
    // Primary brand colors
    primary: {
      50: '#fdf2f8',
      100: '#fce7f3', 
      500: '#ec4899', // Main pink
      600: '#db2777',
      700: '#be185d',
      900: '#831843'
    },
    // Semantic colors
    semantic: {
      success: '#10b981',
      warning: '#f59e0b', 
      error: '#ef4444',
      info: '#3b82f6'
    },
    // Surface colors for dark theme
    surface: {
      background: '#000000',
      primary: '#111111',
      secondary: '#1a1a1a',
      tertiary: '#262626',
      border: '#404040',
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#a3a3a3',
      tertiary: '#737373',
      inverse: '#000000'
    }
  },
  
  // Spacing system following 8pt grid
  spacing: {
    xs: '4px',   // 0.5rem
    sm: '8px',   // 1rem  
    md: '12px',  // 1.5rem
    lg: '16px',  // 2rem
    xl: '24px',  // 3rem
    xxl: '32px', // 4rem
    xxxl: '48px' // 6rem
  },
  
  // Border radius following platform standards
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px', 
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    full: '9999px'
  },
  
  // Typography scale
  typography: {
    // Headlines
    h1: 'text-3xl font-bold leading-tight',
    h2: 'text-2xl font-bold leading-tight', 
    h3: 'text-xl font-semibold leading-tight',
    h4: 'text-lg font-medium leading-tight',
    
    // Body text
    body: 'text-base leading-relaxed',
    bodyLarge: 'text-lg leading-relaxed',
    bodySmall: 'text-sm leading-relaxed',
    
    // Labels and captions
    label: 'text-sm font-medium',
    caption: 'text-xs',
    
    // Interactive elements
    button: 'text-base font-semibold',
    buttonSmall: 'text-sm font-medium'
  },
  
  // Shadow system
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  
  // Animation timing
  animation: {
    fast: '150ms',
    normal: '300ms', 
    slow: '500ms',
    easings: {
      easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  },
  
  // Touch targets (minimum 44pt/dp)
  touchTarget: {
    minimum: '44px',
    comfortable: '48px',
    large: '56px'
  }
} as const;

// Enhanced Button Component
interface IOSButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const IOSButton: React.FC<IOSButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  children,
  onClick,
  className = '',
  type = 'button'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black active:scale-95';
  
  const variantClasses = {
    primary: 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-500 text-white shadow-lg',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 focus:ring-zinc-500 text-white border border-zinc-700',
    tertiary: 'bg-zinc-900/50 hover:bg-zinc-800/50 focus:ring-zinc-500 text-white border border-zinc-800',
    ghost: 'hover:bg-zinc-800/50 focus:ring-zinc-500 text-zinc-300 hover:text-white',
    destructive: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[36px] min-w-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px] min-w-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[48px] min-w-[48px]'
  };
  
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon size={iconSizes[size]} className="mr-2" />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSizes[size]} className="ml-2" />
          )}
        </>
      )}
    </button>
  );
};

// Enhanced Card Component
interface IOSCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const IOSCard: React.FC<IOSCardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  onClick,
  hoverable = false
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200';
  
  const variantClasses = {
    default: 'bg-zinc-900/50 backdrop-blur-sm border border-zinc-800',
    elevated: 'bg-zinc-900/80 backdrop-blur-md shadow-xl border border-zinc-800/50',
    outlined: 'bg-transparent border-2 border-zinc-700',
    filled: 'bg-zinc-800'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const interactiveClasses = hoverable || onClick 
    ? 'hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/10 cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${interactiveClasses}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Container Component with consistent spacing
interface IOSContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const IOSContainer: React.FC<IOSContainerProps> = ({
  size = 'lg',
  padding = true,
  className = '',
  children
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl', 
    xl: 'max-w-6xl',
    full: 'max-w-full'
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      mx-auto 
      ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} 
      ${className}
    `}>
      {children}
    </div>
  );
};

// Grid Component with responsive breakpoints
interface IOSGridProps {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const IOSGrid: React.FC<IOSGridProps> = ({
  cols = 2,
  gap = 'md',
  className = '',
  children
}) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
  };
  
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`
      grid 
      ${colClasses[cols]} 
      ${gapClasses[gap]} 
      ${className}
    `}>
      {children}
    </div>
  );
};

// Section Header Component
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
}) => {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        {subtitle && (
          <p className="text-gray-400 text-sm">{subtitle}</p>
        )}
      </div>
      
      {action && (
        <button
          onClick={action.onClick}
          className="text-pink-500 hover:text-pink-400 font-medium text-sm transition-colors flex items-center space-x-1"
        >
          <span>{action.label}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Loading Skeleton Component
interface IOSSkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string;
  height?: string;
  className?: string;
}

export const IOSSkeleton: React.FC<IOSSkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = ''
}) => {
  const variantClasses = {
    text: 'rounded h-4',
    rectangular: 'rounded-xl',
    circular: 'rounded-full'
  };
  return (
    <div
      className={`bg-zinc-800/60 animate-pulse ${variantClasses[variant]} ${!width ? 'w-full' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};

// Input Component
interface IOSInputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: string;
  label?: string;
  helperText?: string;
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline' | 'subtle';
}

export const IOSInputField: React.FC<IOSInputFieldProps> = ({
  leadingIcon,
  trailingIcon,
  error,
  label,
  helperText,
  fullWidth = true,
  inputSize = 'md',
  variant = 'filled',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-10 text-sm px-3',
    md: 'h-12 text-base px-4',
    lg: 'h-14 text-lg px-5'
  };
  const paddingLeft = leadingIcon ? 'pl-11' : '';
  const paddingRight = trailingIcon ? 'pr-11' : '';
  const variantClasses = {
    filled: 'bg-zinc-900/60 border border-zinc-800 focus:border-pink-500',
    outline: 'bg-transparent border border-zinc-700 focus:border-pink-500',
    subtle: 'bg-zinc-900/40 border border-transparent focus:border-pink-500'
  };
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && <label className="block mb-2 text-sm font-medium text-gray-300">{label}</label>}
      <div className="relative">
        {leadingIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leadingIcon}
          </div>
        )}
        <input
          className={`w-full rounded-xl outline-none focus:ring-2 focus:ring-pink-500/40 transition-all text-white placeholder-gray-500 ${sizeClasses[inputSize]} ${variantClasses[variant]} ${paddingLeft} ${paddingRight} ${error ? 'border-red-500 focus:ring-red-500/40' : ''}`}
          {...props}
        />
        {trailingIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {trailingIcon}
          </div>
        )}
      </div>
      {(helperText || error) && <p className={`mt-2 text-xs ${error ? 'text-red-400' : 'text-gray-400'}`}>{error || helperText}</p>}
    </div>
  );
};

// Hero V2 Component
interface IOSHeroV2Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  gradient?: string;
  children?: React.ReactNode;
  className?: string;
  size?: 'default' | 'compact';
}

export const IOSHeroV2: React.FC<IOSHeroV2Props> = ({
  title,
  subtitle,
  icon: Icon,
  gradient = 'from-pink-600 via-rose-600 to-purple-700',
  children,
  className = '',
  size = 'default'
}) => {
  const padding = size === 'compact' ? 'py-10' : 'py-14 lg:py-20';
  return (
    <section className={`relative overflow-hidden rounded-none ${padding} bg-gradient-to-br ${gradient} ${className}`}>
  <IOSContainer size="xl" padding className="relative z-10 text-center">
        {Icon && (
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center">
            <Icon className="text-white" size={36} />
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-zinc-100/90 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </IOSContainer>
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.15),transparent_60%)]" />
    </section>
  );
};

// Backward compatibility alias
export const IOSInput = IOSInputField;

// Toast Component for notifications
interface IOSToastProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const IOSToast: React.FC<IOSToastProps> = ({
  variant = 'info',
  title,
  message,
  onClose
}) => {
  const variantClasses = {
    success: 'bg-green-900/90 border-green-500/50 text-green-100',
    error: 'bg-red-900/90 border-red-500/50 text-red-100',
    warning: 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100',
    info: 'bg-blue-900/90 border-pink-500/50 text-blue-100'
  };

  return (
    <div className={`
      fixed top-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-md max-w-sm
      ${variantClasses[variant]}
      animate-in slide-in-from-right duration-300
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <p className="text-sm">{message}</p>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-current hover:opacity-75 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Export all components and tokens
export {
  iosDesignTokens as designTokens
};
