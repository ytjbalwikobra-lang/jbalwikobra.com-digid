import React, { useEffect, useRef, useState } from 'react';

interface HorizontalScrollerProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  itemGapClass?: string; // e.g., 'gap-4'
  scrollBy?: number; // pixels to scroll per click; if not provided, uses container width * 0.9
  showButtons?: boolean;
}

const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({
  children,
  ariaLabel = 'Daftar',
  className = '',
  itemGapClass = 'gap-4',
  scrollBy,
  showButtons = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = (dir: 'prev' | 'next') => {
    const el = containerRef.current;
    if (!el) return;
    const delta = scrollBy ?? Math.floor(el.clientWidth * 0.9);
    const to = dir === 'next' ? el.scrollLeft + delta : el.scrollLeft - delta;
    el.scrollTo({ left: to, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      // Hide if there is no overflow or we are at the far right
      setShowRightFade(maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1);
    };

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId as number);
      rafId = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [children]);

  return (
    <div className={`relative ${className}`} aria-label={ariaLabel}>
      {showButtons && (
        <>
          <button
            aria-label="Scroll left"
            onClick={() => handleScroll('prev')}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 border border-[var(--cyber-border)] text-white hover:bg-[var(--cyber-bg-pure)]/20 backdrop-blur shadow-md"
          >
            ‹
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => handleScroll('next')}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 border border-[var(--cyber-border)] text-white hover:bg-[var(--cyber-bg-pure)]/20 backdrop-blur shadow-md"
          >
            ›
          </button>
        </>
      )}

      {/* Edge fade — right side only, auto-hides at end */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent transition-opacity duration-200 ${
          showRightFade ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={containerRef}
        className={`no-scrollbar flex ${itemGapClass} overflow-x-auto pb-2 snap-x snap-mandatory`}
        style={{ scrollPaddingLeft: '1rem' }}
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalScroller;
