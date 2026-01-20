/**
 * useDebounce - Custom hook for debouncing values
 * 
 * ISO 9241-110 compliance: Prevents excessive API calls and improves UX
 * by waiting for user to stop typing before processing input.
 */

import { useState, useEffect } from 'react';

/**
 * Debounces a value by the specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
