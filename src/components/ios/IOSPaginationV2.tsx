import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IOSButton } from './IOSDesignSystemV2';
import { cn } from '../../utils/cn';
import { scrollToPaginationContent } from '../../utils/scrollUtils';

export interface IOSPaginationV2Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  compact?: boolean;
}

/*
 * IOSPaginationV2
 * - Menggunakan design tokens V2 (surface-glass, tint, ds spacing)
 * - Label Indonesia (Sebelumnya / Berikutnya)
 * - Aksesibilitas: role="navigation", aria-label, aria-current pada halaman aktif
 */
export const IOSPaginationV2: React.FC<IOSPaginationV2Props> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
  compact = false,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
    scrollToPaginationContent();
  };

  const getPages = () => {
    const delta = 2;
    const raw: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) raw.push(i);
    } else {
      raw.push(1);
      if (currentPage - delta > 2) raw.push('...');
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);
      for (let i = start; i <= end; i++) raw.push(i);
      if (currentPage + delta < totalPages - 1) raw.push('...');
      raw.push(totalPages);
    }
    // Deduplicate any accidental duplicates (numbers or ellipsis) and keep order
    const pages: (number | string)[] = [];
    for (const item of raw) {
      if (pages.length === 0 || pages[pages.length - 1] !== item) {
        pages.push(item);
      }
    }
    return pages;
  };

  return (
    <nav
      className={cn(
        'w-full flex flex-col gap-sm pt-md border-t border-white/10',
        compact ? 'px-sm pb-sm' : 'px-lg pb-lg',
        'bg-gradient-to-b from-black/40 to-black/20 backdrop-blur-sm',
        className
      )}
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-md text-xs text-white/60">
        <span className="font-medium tracking-wide">
          Menampilkan {startItem.toLocaleString()} - {endItem.toLocaleString()} dari {totalItems.toLocaleString()} data
        </span>
        <div className="flex items-center gap-2">
          <IOSButton
            variant="tertiary"
            size={compact ? 'sm' : 'md'}
            aria-label="Halaman sebelumnya"
            disabled={currentPage === 1}
            onClick={()=>handlePageChange(currentPage - 1)}
            className="min-w-[42px]"
          >
            <ChevronLeft className="w-4 h-4" />
            {!compact && <span className="ml-1">Sebelumnya</span>}
          </IOSButton>
          <div className="flex items-center gap-1" aria-live="polite">
            {getPages().map((p, i) => p === '...'
              ? (
                <span key={`ellipsis-${i}`} className="px-2 text-white/40 select-none">…</span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => handlePageChange(p as number)}
                  aria-current={currentPage === p ? 'page' : undefined}
                  className={cn(
                    'relative px-3 h-10 rounded-xl text-sm font-medium transition-soft focus:outline-none focus:ring-2 focus:ring-pink-500/40',
                    currentPage === p
                      ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-900/30'
                      : 'bg-white/5 hover:bg-white/10 text-white/80'
                  )}
                >
                  {p}
                </button>
              ))}
          </div>
          <IOSButton
            variant="tertiary"
            size={compact ? 'sm' : 'md'}
            aria-label="Halaman berikutnya"
            disabled={currentPage === totalPages}
            onClick={()=>handlePageChange(currentPage + 1)}
            className="min-w-[42px]"
          >
            {!compact && <span className="mr-1">Berikutnya</span>}
            <ChevronRight className="w-4 h-4" />
          </IOSButton>
        </div>
      </div>
    </nav>
  );
};

export default IOSPaginationV2;
