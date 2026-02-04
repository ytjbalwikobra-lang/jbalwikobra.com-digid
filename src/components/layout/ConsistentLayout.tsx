import React from 'react';

interface ConsistentLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
  className?: string;
}

/**
 * Consistent layout container that matches flash-sales page structure
 * Ensures proper width constraints and consistent spacing across all pages
 */
export const ConsistentLayout: React.FC<ConsistentLayoutProps> = ({
  children,
  fullWidth = false,
  noPadding = false,
  className = ''
}) => {
  const containerClasses = fullWidth 
    ? 'w-full'
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
  
  const paddingClasses = noPadding ? '' : 'py-6';

  return (
    <div className={`${containerClasses} ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Page wrapper with consistent background and minimum height
 */
export const PageWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`min-h-screen bg-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] ${className}`}>
    {children}
  </div>
);

/**
 * Content section with consistent styling
 */
export const ContentSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  background?: 'default' | 'surface' | 'gradient';
}> = ({
  children,
  className = '',
  background = 'default'
}) => {
  const bgClasses = {
    default: '',
    surface: 'bg-[var(--cyber-bg-pure)] border-b border-[var(--cyber-border)]',
    gradient: 'bg-gradient-to-r from-pink-600 via-pink-500 to-rose-500'
  };

  return (
    <section className={`${bgClasses[background]} ${className}`}>
      {children}
    </section>
  );
};

/**
 * Grid container with responsive layout options
 */
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  columns?: '2' | '3' | '4' | '6';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  children,
  columns = '4',
  gap = 'md',
  className = ''
}) => {
  const gridClasses = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-2 lg:grid-cols-4',
    '6': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6'
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default ConsistentLayout;
