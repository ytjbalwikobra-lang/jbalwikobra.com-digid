/**
 * Navigation Utilities
 * Safe navigation helpers to prevent /products/undefined issues
 */

import { NavigateFunction } from 'react-router-dom';

/**
 * Safely navigates to a product detail page
 * Validates the product ID before navigation to prevent /products/undefined
 */
export function safeNavigateToProduct(
  navigate: NavigateFunction,
  productId: string | undefined | null,
  options?: {
    state?: any;
    replace?: boolean;
    fallbackRoute?: string;
  }
): boolean {
  const { state, replace = false, fallbackRoute = '/products' } = options || {};

  // Validate product ID
  if (!productId || 
      typeof productId !== 'string' || 
      productId.trim() === '' || 
      productId.trim() === 'undefined' || 
      productId.trim() === 'null') {
    
    console.error('[Navigation] Invalid product ID detected:', productId);
    
    // Navigate to fallback route instead
    navigate(fallbackRoute, { replace });
    return false;
  }

  const trimmedId = productId.trim();
  
  try {
    navigate(`/products/${trimmedId}`, {
      state,
      replace
    });
    return true;
  } catch (error) {
    console.error('[Navigation] Error navigating to product:', error);
    navigate(fallbackRoute, { replace });
    return false;
  }
}

/**
 * Safely navigates to a flash sale product detail page
 */
export function safeNavigateToFlashSaleProduct(
  navigate: NavigateFunction,
  productId: string | undefined | null,
  options?: {
    state?: any;
    replace?: boolean;
    fallbackRoute?: string;
  }
): boolean {
  const { state, replace = false, fallbackRoute = '/flash-sales' } = options || {};

  // Validate product ID
  if (!productId || 
      typeof productId !== 'string' || 
      productId.trim() === '' || 
      productId.trim() === 'undefined' || 
      productId.trim() === 'null') {
    
    console.error('[Navigation] Invalid flash sale product ID detected:', productId);
    
    navigate(fallbackRoute, { replace });
    return false;
  }

  const trimmedId = productId.trim();
  
  try {
    navigate(`/flash-sales/${trimmedId}`, {
      state,
      replace
    });
    return true;
  } catch (error) {
    console.error('[Navigation] Error navigating to flash sale product:', error);
    navigate(fallbackRoute, { replace });
    return false;
  }
}

/**
 * Validates a product ID without navigation
 */
export function isValidProductId(productId: string | undefined | null): boolean {
  return !!(
    productId && 
    typeof productId === 'string' && 
    productId.trim() !== '' && 
    productId.trim() !== 'undefined' && 
    productId.trim() !== 'null'
  );
}

/**
 * Sanitizes a product ID for safe use
 */
export function sanitizeProductId(productId: string | undefined | null): string | null {
  if (!isValidProductId(productId)) {
    return null;
  }
  return (productId as string).trim();
}
