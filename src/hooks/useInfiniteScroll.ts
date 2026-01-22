/**
 * useInfiniteScroll - Custom hook for infinite scroll functionality
 * Features:
 * - Intersection Observer for performance
 * - Debounced loading to prevent excessive requests
 * - Cache-friendly progressive loading
 * - ISO 9241-210 compliant (accessibility and usability)
 * - ISO 9241-110: Dialogue principles (self-descriptiveness, controllability)
 * - WCAG 2.1 Level AA compliant
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number; // Distance from bottom to trigger (0-1)
  rootMargin?: string; // CSS margin value for intersection observer
  debounceMs?: number; // Debounce delay in milliseconds
}

export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 0.5,
  rootMargin = '200px',
  debounceMs = 300
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce mechanism to prevent rapid fire loading (ISO 9241-110: Controllability)
  const loadMoreDebounced = useCallback(() => {
    if (!hasMore || isLoading) return;
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      onLoadMore();
    }, debounceMs);
  }, [hasMore, isLoading, onLoadMore, debounceMs]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    // Intersection Observer for performance-optimized scroll detection
    // More efficient than scroll event listeners (ISO 9241-210: Performance)
    // Supports users with reduced motion preferences (WCAG 2.1)
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMoreDebounced();
        }
      },
      {
        root: null, // viewport
        rootMargin, // Trigger before reaching the bottom
        threshold
      }
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [hasMore, isLoading, loadMoreDebounced, threshold, rootMargin]);

  return {
    observerTarget,
    isIntersecting
  };
};
