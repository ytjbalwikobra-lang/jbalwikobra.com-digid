/**
 * Admin Utility Functions
 * Shared utilities for admin pages to eliminate duplication
 */

/**
 * Copy text to clipboard with feedback
 * @param text - Text to copy
 * @param onSuccess - Callback when copy succeeds
 */
export const copyToClipboard = (text: string, onSuccess?: () => void): void => {
  navigator.clipboard.writeText(text).then(() => {
    onSuccess?.();
  }).catch((err) => {
    console.error('Failed to copy to clipboard:', err);
  });
};

/**
 * Mask sensitive API key for display
 * Shows first 8 characters, masks the rest
 * @param key - API key to mask
 * @returns Masked API key
 */
export const maskApiKey = (key: string): string => {
  if (!key || key.length < 8) return key;
  return key.substring(0, 8) + '•'.repeat(Math.min(key.length - 8, 24));
};

/**
 * Parse error messages with context-aware handling
 * @param error - Error object or string
 * @returns User-friendly error message
 */
export const parseErrorMessage = (error: unknown): string => {
  // Check network status first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Device offline. Please check your internet connection.';
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // WhatsApp-specific errors
  if (errorMessage.includes('SERVICE_OFF') || errorMessage.toLowerCase().includes('scan qr')) {
    return 'Device offline. Scan QR code on WooWA dashboard.';
  }
  
  // Authentication errors
  if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('401')) {
    return 'Invalid credentials. Please check your API key or login again.';
  }
  
  // Network errors
  if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  // Validation errors
  if (errorMessage.toLowerCase().includes('validation')) {
    return errorMessage; // Keep validation errors as-is
  }
  
  // Generic errors
  return errorMessage || 'An unexpected error occurred';
};

/**
 * Format number with Indonesian locale (thousand separators)
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.234.567")
 */
export const formatNumberID = (value: number | null | undefined): string => {
  const n = Number(value || 0);
  return n.toLocaleString('id-ID');
};

/**
 * Format time for "Last Updated" displays
 * @param date - Date object or null
 * @returns Formatted time string (e.g., "14:30")
 */
export const formatLastUpdatedTime = (date: Date | null): string => {
  if (!date) return '-';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get localized error message (Indonesian)
 * @param action - Action that failed (e.g., 'memuat', 'menyimpan', 'menghapus')
 * @param entity - Entity name (e.g., 'pengaturan', 'banner', 'flash sale')
 * @param error - Optional error object
 * @returns Localized error message
 */
export const getLocalizedError = (
  action: 'memuat' | 'menyimpan' | 'menghapus' | 'memperbarui',
  entity: string,
  error?: unknown
): string => {
  const baseMessage = `Gagal ${action} ${entity}`;
  if (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return `${baseMessage}: ${detail}`;
  }
  return baseMessage;
};

/**
 * Format analytics card value consistently
 * @param value - Number or string value
 * @returns Formatted display value
 */
export const formatAnalyticsValue = (value: number | string): string => {
  if (typeof value === 'number') {
    return value.toLocaleString('id-ID');
  }
  return value;
};
