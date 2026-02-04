import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export type DSTableSortOrder = 'asc' | 'desc';

export interface DSTableColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

export interface DSTableAction<T = any> {
  key: string;
  label: string;
  icon?: LucideIcon;
  onClick: (item: T) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

export interface AdminDSTableProps<T = any> {
  columns: DSTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  rowKey?: (item: T, index: number) => React.Key;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string;
  // Sorting
  sortBy?: string;
  sortOrder?: DSTableSortOrder;
  onSort?: (key: string, order: DSTableSortOrder) => void;
  // Pagination
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  // Row actions (right-most)
  actions?: DSTableAction<T>[];
  className?: string;
  stickyHeader?: boolean;
  // Optional custom content on the left side of the pagination footer (e.g., page-size selector)
  footerStart?: React.ReactNode;
  // Optional custom status text on the left of the pagination footer
  statusTextRenderer?: (info: { start: number; end: number; total: number; pageSize: number; currentPage: number; totalPages: number; }) => React.ReactNode;
  // Optional i18n labels for pagination controls
  previousLabel?: string;
  nextLabel?: string;
  pageLabel?: (info: { currentPage: number; totalPages: number; }) => React.ReactNode;
}

function actionBtnClass(variant: DSTableAction['variant']) {
  const base = 'p-2 rounded-xl transition-colors';
  switch (variant) {
    case 'primary':
      return `${base} bg-ds-pink text-white hover:bg-ds-pink/90`;
    case 'danger':
      return `${base} bg-red-500 text-white hover:bg-red-600`;
    case 'secondary':
    default:
      return `${base} bg-[var(--bg-tertiary)] text-ds-text-secondary hover:text-ds-text hover:bg-[var(--bg-secondary)]`;
  }
}

export function AdminDSTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Tidak ada data tersedia',
  emptyIcon: EmptyIcon,
  rowKey,
  onRowClick,
  rowClassName,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  actions = [],
  className,
  stickyHeader = true,
  footerStart,
  statusTextRenderer,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel,
}: AdminDSTableProps<T>) {
  const getSortGlyph = (key: string, sortable?: boolean) => {
    if (!sortable) return null;
    if (sortBy === key) return sortOrder === 'asc' ? '↑' : '↓';
    return '↕';
  };

  if (loading) {
    return (
      <div className={cn('dashboard-data-panel padded rounded-xl p-stack-lg', className)}>
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-surface-tint-light rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-ds-text-secondary font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={cn('dashboard-data-panel padded rounded-xl p-stack-lg', className)}>
        <div className="p-12 text-center">
          {EmptyIcon && <EmptyIcon className="w-16 h-16 text-ds-text-tertiary mx-auto mb-4" />}
          <p className="text-ds-text-secondary font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const showPagination =
    typeof currentPage === 'number' &&
    typeof pageSize === 'number' &&
    typeof totalItems === 'number' &&
    !!onPageChange;

  const totalPages = showPagination ? Math.max(1, Math.ceil((totalItems as number) / (pageSize as number))) : 1;

  return (
    <div className={cn('dashboard-data-panel padded rounded-xl p-stack-lg', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead className={stickyHeader ? 'sticky top-0 bg-surface-glass-light' : undefined}>
            <tr className="border-b border-surface-tint-light" role="row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'py-stack-md px-stack-lg fs-sm font-medium text-ds-text-secondary',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}
                  style={{ width: col.width }}
                  onClick={() => {
                    if (!col.sortable || !onSort) return;
                    const next = sortBy === col.key && sortOrder === 'asc' ? 'desc' : 'asc';
                    onSort(col.key, next);
                  }}
                >
                  <div className={cn('flex items-center gap-2', (col.align === 'right') && 'justify-end', (col.align === 'center') && 'justify-center')}>
                    <span className={col.sortable ? 'cursor-pointer hover:text-ds-text transition-colors' : undefined}>
                      {col.header}
                    </span>
                    {col.sortable && (
                      <span className="text-xs opacity-60 select-none">{getSortGlyph(col.key, col.sortable)}</span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="py-stack-md px-stack-lg fs-sm font-medium text-ds-text-secondary text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const rowId = rowKey ? rowKey(item, index) : (item.id ?? index);
              const visibleActions = actions.filter((a) => !a.hidden || !a.hidden(item));
              return (
                <tr
                  key={rowId}
                  className={cn(
                    'border-b border-surface-tint-light hover:bg-[var(--bg-secondary)] transition-colors',
                    onRowClick && 'cursor-pointer',
                    rowClassName && rowClassName(item, index),
                  )}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('py-stack-md px-stack-lg text-ds-text',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className,
                      )}
                      style={{ width: col.width }}
                    >
                      {col.render ? col.render((item as any)[col.key], item, index) : (item as any)[col.key]}
                    </td>
                  ))}
                  {visibleActions.length > 0 && (
                    <td className="py-stack-md px-stack-lg">
                      <div className="flex items-center justify-end gap-2">
                        {visibleActions.map((action) => {
                          const Icon = action.icon;
                          const disabled = action.disabled?.(item);
                          return (
                            <button
                              key={action.key}
                              type="button"
                              title={action.label}
                              disabled={!!disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!disabled) action.onClick(item);
                              }}
                              className={cn(actionBtnClass(action.variant), disabled && 'opacity-50 cursor-not-allowed')}
                            >
                              {Icon ? <Icon className="w-4 h-4" /> : action.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-6 pt-6 border-t border-surface-tint-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-ds-text-secondary" role="status" aria-live="polite">
              {footerStart && (
                <div className="mr-2">
                  {footerStart}
                </div>
              )}
              {(() => {
                const start = (currentPage! - 1) * pageSize! + 1;
                const end = Math.min(currentPage! * pageSize!, totalItems!);
                const info = { start, end, total: totalItems!, pageSize: pageSize!, currentPage: currentPage!, totalPages };
                return statusTextRenderer ? statusTextRenderer(info) : `Showing ${start}-${end} of ${totalItems}`;
              })()}
            </div>
            <nav className="flex items-center gap-4" role="navigation" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange!(Math.max(1, (currentPage ?? 1) - 1))}
                disabled={(currentPage ?? 1) <= 1}
              >
                {previousLabel}
              </button>
              <span className="text-sm text-ds-text-secondary px-2">
                {pageLabel ? pageLabel({ currentPage: currentPage!, totalPages }) : (
                  <>Page {currentPage} of {totalPages}</>
                )}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange!(Math.min(totalPages, (currentPage ?? 1) + 1))}
                disabled={(currentPage ?? 1) >= totalPages}
              >
                {nextLabel}
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDSTable;
