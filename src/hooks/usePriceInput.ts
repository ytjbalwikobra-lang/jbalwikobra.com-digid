/**
 * usePriceInput Hook - Reusable Price Input Formatting
 * 
 * Purpose: Eliminates 50+ lines of duplicate price formatting logic
 * across admin components (ProductModal, FlashSaleModal, AdminProductsDirect)
 * 
 * Features:
 * - Automatic thousand separator formatting (Indonesian Rupiah format)
 * - Parse user input to numeric values
 * - Optional "Rp" prefix
 * - Type-safe with TypeScript
 * - ISO Standard: Locale-aware formatting
 * 
 * Usage:
 * ```tsx
 * const priceInput = usePriceInput(initialValue, { prefix: true });
 * <input 
 *   value={priceInput.formatted} 
 *   onChange={(e) => priceInput.handleChange(e.target.value)}
 * />
 * // Get numeric value: priceInput.value
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import { formatNumberID, parseNumberID } from '../utils/helpers';

interface UsePriceInputOptions {
  /** Show "Rp" prefix in formatted value (default: false) */
  prefix?: boolean;
  /** Allow zero values (default: true) */
  allowZero?: boolean;
  /** Callback when value changes */
  onChange?: (value: number) => void;
  /** Minimum allowed value (default: 0) */
  min?: number;
  /** Maximum allowed value (default: Infinity) */
  max?: number;
}

interface UsePriceInputReturn {
  /** Numeric value */
  value: number;
  /** Formatted display value with thousand separators */
  formatted: string;
  /** Raw input value (for controlled inputs) */
  rawValue: string;
  /** Handle input change */
  handleChange: (input: string) => void;
  /** Set value programmatically */
  setValue: (value: number) => void;
  /** Reset to initial value */
  reset: () => void;
  /** Check if value is valid */
  isValid: boolean;
  /** Validation error message */
  error: string | null;
}

export const usePriceInput = (
  initialValue: number = 0,
  options: UsePriceInputOptions = {}
): UsePriceInputReturn => {
  const {
    prefix = false,
    allowZero = true,
    onChange,
    min = 0,
    max = Infinity
  } = options;

  const [value, setValueState] = useState<number>(initialValue);
  const [rawValue, setRawValue] = useState<string>(
    initialValue > 0 ? formatNumberID(initialValue) : ''
  );

  // Format value for display
  const formatted = useMemo(() => {
    if (!value && !allowZero) return '';
    if (value === 0 && !allowZero) return '';
    
    const formattedNumber = formatNumberID(value);
    return prefix ? `Rp ${formattedNumber}` : formattedNumber;
  }, [value, prefix, allowZero]);

  // Validation
  const { isValid, error } = useMemo(() => {
    if (!allowZero && value === 0) {
      return { isValid: false, error: 'Value cannot be zero' };
    }
    if (value < min) {
      return { isValid: false, error: `Value must be at least ${formatNumberID(min)}` };
    }
    if (value > max) {
      return { isValid: false, error: `Value cannot exceed ${formatNumberID(max)}` };
    }
    return { isValid: true, error: null };
  }, [value, min, max, allowZero]);

  // Handle input change
  const handleChange = useCallback((input: string) => {
    // Parse numeric value from input
    const numericValue = parseNumberID(input);
    
    // Update raw value (what user typed)
    setRawValue(input);
    
    // Update numeric value
    setValueState(numericValue);
    
    // Trigger callback
    onChange?.(numericValue);
  }, [onChange]);

  // Set value programmatically
  const setValue = useCallback((newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));
    setValueState(clampedValue);
    setRawValue(clampedValue > 0 ? formatNumberID(clampedValue) : '');
    onChange?.(clampedValue);
  }, [min, max, onChange]);

  // Reset to initial value
  const reset = useCallback(() => {
    setValueState(initialValue);
    setRawValue(initialValue > 0 ? formatNumberID(initialValue) : '');
    onChange?.(initialValue);
  }, [initialValue, onChange]);

  return {
    value,
    formatted,
    rawValue,
    handleChange,
    setValue,
    reset,
    isValid,
    error
  };
};

/**
 * Simplified hook for basic price inputs without validation
 */
export const useSimplePriceInput = (initialValue: number = 0) => {
  return usePriceInput(initialValue, { allowZero: true });
};

/**
 * Hook for price inputs that require non-zero values (e.g., product prices)
 */
export const useRequiredPriceInput = (initialValue: number = 0) => {
  return usePriceInput(initialValue, { allowZero: false, min: 1 });
};
