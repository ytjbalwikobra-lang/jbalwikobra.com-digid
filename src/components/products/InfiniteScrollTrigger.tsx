/**
 * InfiniteScrollTrigger - Accessible infinite scroll trigger component
 * ISO 9241-210 compliant with proper ARIA labels and loading states
 * ISO 9241-110: Dialogue principles (self-descriptiveness, controllability, error tolerance)
 * WCAG 2.1 Level AA compliant
 * 
 * Features:
 * - Automatic loading via Intersection Observer
 * - Manual load button as fallback (accessibility)
 * - Progress indicator for transparency
 * - Keyboard accessible (Tab + Enter/Space)
 * - Screen reader announcements
 */

import React, { useEffect, useRef } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { PNButton } from '../ui/PinkNeonDesignSystem';

interface InfiniteScrollTriggerProps {
  observerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  totalDisplayed: number;
  totalItems: number;
}

export const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({
  observerRef,
  isLoading,
  hasMore,
  onLoadMore,
  totalDisplayed,
  totalItems
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce loading state changes to screen readers (WCAG 2.1: 4.1.3)
  useEffect(() => {
    if (announcerRef.current && !isLoading && hasMore) {
      announcerRef.current.textContent = `${totalDisplayed} dari ${totalItems} produk dimuat. ${totalItems - totalDisplayed} produk tersisa.`;
    }
  }, [totalDisplayed, totalItems, isLoading, hasMore]);

  if (!hasMore) {
    return (
      <div 
        className="py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" aria-hidden="true"></div>
          <p className="text-sm text-gray-400">
            Menampilkan semua {totalItems} produk
          </p>
        </div>
        
        {/* Screen reader only announcement */}
        <div className="sr-only" role="status" aria-live="polite">
          Anda telah mencapai akhir katalog. Total {totalItems} produk ditampilkan.
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={observerRef}
      className="py-8 flex flex-col items-center gap-4"
      role="region"
      aria-label="Muat lebih banyak produk"
    >
      {/* Screen reader announcer (WCAG 2.1: Status Messages) */}
      <div 
        ref={announcerRef}
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      />

      {isLoading ? (
        <div 
          className="flex flex-col items-center gap-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 
            className="w-8 h-8 text-pink-500 animate-spin" 
            aria-hidden="true"
          />
          <p className="text-sm text-gray-400">
            Memuat produk...
          </p>
          {/* Screen reader only */}
          <span className="sr-only">Sedang memuat produk tambahan, mohon tunggu.</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {/* Progress indicator (ISO 9241-110: Self-descriptiveness) */}
          <div className="text-center w-full">
            <p className="text-sm text-gray-400 mb-2">
              Menampilkan {totalDisplayed} dari {totalItems} produk
            </p>
            <div 
              className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={totalDisplayed}
              aria-valuemin={0}
              aria-valuemax={totalItems}
              aria-label={`Progress pemuatan: ${totalDisplayed} dari ${totalItems} produk dimuat, ${Math.round((totalDisplayed / totalItems) * 100)}%`}
            >
              <div 
                className="h-full bg-gradient-to-r from-pink-600 to-purple-600 transition-all duration-500"
                style={{ width: `${(totalDisplayed / totalItems) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Manual load button - accessibility fallback (ISO 9241-110: Controllability) */}
          <PNButton
            variant="secondary"
            size="md"
            onClick={onLoadMore}
            className="min-w-[200px] group"
            aria-label={`Muat ${Math.min(20, totalItems - totalDisplayed)} produk lagi. Tekan Enter atau Space untuk memuat.`}
          >
            <span className="flex items-center gap-2">
              Muat Lebih Banyak
              <ChevronDown 
                size={16} 
                className="group-hover:translate-y-0.5 transition-transform"
                aria-hidden="true"
              />
            </span>
          </PNButton>
          
          <p className="text-xs text-gray-500 text-center">
            Atau scroll ke bawah untuk memuat otomatis
          </p>
        </div>
      )}
    </div>
  );
};
