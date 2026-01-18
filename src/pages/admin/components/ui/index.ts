// Admin UI Components - Modern Design System V3
// WCAG 2.1 AA Compliant

// Core Layout Components
export { AdminPageHeader } from './AdminPageHeader';
export { AdminFilterPanel } from './AdminFilterPanel';
export { AdminDataTable } from './AdminDataTable';
export { AdminStats } from './AdminStats';
export { AdminModal, ModalActions } from './AdminModal';

// State Components - Loading, Empty, Error
export { AdminLoadingState } from './AdminLoadingState';
export { AdminEmptyState } from './AdminEmptyState';
export { AdminErrorState } from './AdminErrorState';

// Modern Design System V3 Components
export { default as AdminButton } from './AdminButton';
export { default as AdminCard, AdminCardHeader, AdminCardBody, AdminCardFooter } from './AdminCard';
export { default as AdminStatusBadge } from './AdminStatusBadge';
export type { ButtonVariant, ButtonSize } from './AdminButton';
export type { StatusType } from './AdminStatusBadge';

// Reusable Admin Components
export { AdminStatCard } from './AdminStatCard';
export { AdminFilters } from './AdminFilters';
export { AdminTable } from './AdminTable';
export { AdminPageHeader as AdminPageHeaderV2 } from './AdminPageHeaderComponent';
export { AdminBadge, StatusBadge, PaymentBadge } from './AdminBadge';

// Input styles for consistency
export * from './InputStyles';

// Types for common use cases
export type { TableColumn, TableAction } from './AdminDataTable';
export type { FilterField } from './AdminFilterPanel';
export type { StatItem } from './AdminStats';

// New component types
export type { FilterOption, SortOption, AdminFiltersConfig } from './AdminFilters';
export type { TableColumn as TableColumnV2, TableAction as TableActionV2 } from './AdminTable';
export type { PageHeaderAction } from './AdminPageHeaderComponent';
export type { BadgeProps } from './AdminBadge';

