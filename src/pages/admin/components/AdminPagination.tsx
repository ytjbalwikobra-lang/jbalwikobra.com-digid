/**
 * Admin Pagination Component - V3 Design System
 * Reusable pagination component for admin tables
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// Design system: cyber-compact.css (loaded via index.css)

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  loading?: boolean;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="admin-pagination">
      {/* Items per page */}
      <div className="admin-pagination-info">
        <span className="text-[var(--admin-text-secondary)] text-sm">
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
        <div className="flex items-center gap-2 ml-4">
          <label className="text-[var(--admin-text-secondary)] text-sm">Per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="admin-select-sm"
            disabled={loading}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Page navigation */}
      <div className="admin-pagination-nav">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="admin-pagination-button"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="admin-pagination-pages">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                disabled={loading}
                className={`admin-pagination-page ${currentPage === page ? 'active' : ''}`}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="admin-pagination-ellipsis">
                {page}
              </span>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="admin-pagination-button"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
