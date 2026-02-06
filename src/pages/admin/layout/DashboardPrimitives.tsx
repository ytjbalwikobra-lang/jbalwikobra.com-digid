import React from 'react';
import { cn } from '../../../utils/cn';

/* Typography scale tokens (can be extended) */
export const typeScale = {
  h1: 'text-3xl md:text-4xl font-bold tracking-tight',
  h2: 'text-2xl md:text-3xl font-semibold tracking-tight',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
  body: 'text-sm md:text-base',
  caption: 'text-xs font-medium uppercase tracking-wide',
};

/* Section wrapper controls spacing above/below and optional title slot */
interface DashboardSectionProps {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bleed?: boolean; // allow full-width beyond container
  dense?: boolean; // reduce vertical spacing
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  actions,
  children,
  className,
  bleed = false,
  dense = false,
}) => {
  return (
    <section className={cn('dashboard-section', bleed && 'dashboard-section-bleed', dense && 'dashboard-section-dense', className)}>
      {(title || actions) && (
        <div className="dashboard-section-header">
          <div>
            {typeof title === 'string' ? <h2 className={cn(typeScale.h3, 'm-0 text-[var(--admin-text)] dark:text-white')}>{title}</h2> : title}
            {subtitle && <p className="mt-1 text-xs md:text-sm text-[var(--admin-text-disabled)] dark:text-[var(--admin-text-secondary)]">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="dashboard-section-body">{children}</div>
    </section>
  );
};

interface StatGridProps { children: React.ReactNode; columns?: 2 | 3 | 4 | 6; className?: string; }
export const StatGrid: React.FC<StatGridProps> = ({ children, columns = 4, className }) => (
  <div className={cn('dashboard-stat-grid', `cols-${columns}`, className)}>{children}</div>
);

interface DataPanelProps { children: React.ReactNode; className?: string; padded?: boolean; }
export const DataPanel: React.FC<DataPanelProps> = ({ children, className, padded = true }) => (
  <div className={cn('dashboard-data-panel', padded && 'padded', className)}>{children}</div>
);

export default { DashboardSection, StatGrid, DataPanel, typeScale };
