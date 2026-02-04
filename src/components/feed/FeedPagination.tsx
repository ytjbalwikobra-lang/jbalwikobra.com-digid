import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const FeedPagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, loading }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="relative">
      {/* Clean container with black background */}
      <div className="bg-black/80 rounded-2xl p-4 border border-pink-500/20">
        <div className="flex items-center justify-center gap-2 lg:gap-3">
          {/* Enhanced Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={`
              rounded-xl transition-all duration-300 group min-h-[48px] min-w-[48px] flex items-center justify-center
              ${currentPage === 1 || loading 
                ? 'bg-gray-600/20 text-[var(--cyber-text-muted)] cursor-not-allowed border border-gray-600/20' 
                : 'bg-pink-500/10 hover:bg-pink-500/20 text-white border border-pink-500/30 hover:border-pink-500/50 hover:scale-105'
              }
            `}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>

          {/* Enhanced Page Numbers */}
          <div className="flex items-center gap-1 lg:gap-2 mx-2 lg:mx-4">
            {getPageNumbers().map((pageNum, idx) => (
              <button
                key={`${pageNum}-${idx}`}
                onClick={() => typeof pageNum === 'number' ? onPageChange(pageNum) : undefined}
                disabled={pageNum === '...' || loading}
                className={`
                  rounded-xl font-bold text-sm lg:text-base transition-all duration-300 
                  flex items-center justify-center group relative overflow-hidden
                  min-h-[48px] min-w-[48px]
                  ${pageNum === currentPage
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 scale-110 border-2 border-pink-400/50'
                    : pageNum === '...'
                    ? 'text-white/50 cursor-default bg-transparent'
                    : 'bg-pink-500/10 hover:bg-pink-500/20 text-white border border-pink-500/30 hover:border-pink-500/50 hover:scale-105 hover:shadow-lg'
                  }
                `}
              >
                {/* Active page background animation */}
                {pageNum === currentPage && (
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-purple-400/20 animate-pulse rounded-xl"></div>
                )}
                
                {/* Content */}
                <span className="relative z-10">
                  {pageNum === '...' ? <MoreHorizontal className="w-4 h-4" /> : pageNum}
                </span>
              </button>
            ))}
          </div>

          {/* Enhanced Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={`
              rounded-xl transition-all duration-300 group min-h-[48px] min-w-[48px] flex items-center justify-center
              ${currentPage === totalPages || loading 
                ? 'bg-gray-600/20 text-[var(--cyber-text-muted)] cursor-not-allowed border border-gray-600/20' 
                : 'bg-pink-500/10 hover:bg-pink-500/20 text-white border border-pink-500/30 hover:border-pink-500/50 hover:scale-105'
              }
            `}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
        
        {/* Page info */}
        <div className="text-center mt-3 text-sm text-[var(--cyber-text-muted)]">
          Halaman <span className="text-white font-semibold">{currentPage}</span> dari <span className="text-white font-semibold">{totalPages}</span>
        </div>
      </div>
    </div>
  );
};

export default FeedPagination;
