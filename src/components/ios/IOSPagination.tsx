import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IOSButton } from './IOSDesignSystem';
import { cn } from '../../utils/cn';
import { scrollToPaginationContent } from '../../utils/scrollUtils';

interface IOSPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemsPerPageSelector?: boolean;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  className?: string;
}

export const IOSPagination: React.FC<IOSPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemsPerPageSelector = false,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  className = ''
}) => {
  if (totalPages <= 1 && !showItemsPerPageSelector) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Handle page change with automatic scroll to pagination content
  const handlePageChange = (page: number) => {
    onPageChange(page);
    scrollToPaginationContent();
  };

  const getVisiblePages = () => {
    const delta = 2;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      pages.push(1);
      
      if (currentPage > 4) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={cn(
      'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
      'px-6 py-4 bg-black border-t border-gray-700',
      className
    )}>
      {/* Items info and per-page selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-sm text-white-secondary font-medium">
          Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of {totalItems.toLocaleString()} results
        </div>
        
        {showItemsPerPageSelector && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white-secondary">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className={cn(
                'px-3 py-1.5 text-sm rounded-xl border',
                'bg-black text-white border-gray-700',
                'focus:ring-2 focus:ring-ios-accent focus:border-transparent',
                'transition-colors duration-200'
              )}
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <span className="text-sm text-white-secondary">per page</span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <IOSButton
            variant="ghost"
            size="small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-3 py-2"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </IOSButton>

          <div className="flex items-center gap-1">
            {getVisiblePages().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-3 py-2 text-white-secondary text-sm">...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page as number)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-xl transition-all duration-200',
                      currentPage === page
                        ? 'bg-pink-500 text-white shadow-lg'
                        : 'text-white hover:bg-black-secondary active:scale-95'
                    )}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          <IOSButton
            variant="ghost"
            size="small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-3 py-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </IOSButton>
        </div>
      )}
    </div>
  );
};
