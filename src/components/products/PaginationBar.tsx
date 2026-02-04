/**
 * PaginationBar - Compact pagination component
 * Uses CyberDesignSystem for consistent styling
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = '' 
}) => {
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
  };

  const buildPages = () => {
    const pages: (number | string)[] = [];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);
    
    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    
    return pages;
  };

  const buttonBase = "w-10 h-10 flex items-center justify-center rounded-xl transition-colors";
  const buttonActive = "bg-[var(--cyber-pink-primary)] text-white";
  const buttonInactive = "bg-white/5 border border-white/10 text-[var(--cyber-text-secondary)] hover:bg-white/10";
  const buttonDisabled = "opacity-50 cursor-not-allowed";

  return (
    <nav 
      className={`flex items-center justify-center gap-2 py-8 ${className}`} 
      aria-label="Paginasi katalog"
    >
      <button
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${buttonBase} ${buttonInactive} ${currentPage === 1 ? buttonDisabled : ''}`}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} />
      </button>
      
      <div className="flex items-center gap-1">
        {buildPages().map((p, i) => p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-[var(--cyber-text-muted)]">...</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p as number)}
            className={`${buttonBase} ${p === currentPage ? buttonActive : buttonInactive}`}
            aria-current={p === currentPage ? 'page' : undefined}
            aria-label={p === currentPage ? `Halaman ${p}, saat ini` : `Ke halaman ${p}`}
          >
            {p}
          </button>
        ))}
      </div>
      
      <button
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${buttonBase} ${buttonInactive} ${currentPage === totalPages ? buttonDisabled : ''}`}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};

export default PaginationBar;
