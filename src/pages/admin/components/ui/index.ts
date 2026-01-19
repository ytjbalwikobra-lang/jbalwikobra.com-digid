// Admin UI Components - Modern Design System V3
// WCAG 2.1 AA Compliant

// Core Layout Components
export { AdminPageHeader } from './AdminPageHeader';
export { AdminFilterPanel } from './AdminFilterPanel';
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

// Input styles for consistency
export * from './InputStyles';

// Types for common use cases
export type { FilterField } from './AdminFilterPanel';
export type { StatItem } from './AdminStats';

