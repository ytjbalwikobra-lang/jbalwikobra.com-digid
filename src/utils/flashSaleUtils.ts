/**
 * Flash Sale Utility Functions
 * Centralized logic for flash sale status checking and sorting
 * Ensures consistency across all components
 */

import { Product } from '../types';

/**
 * Check if a product's flash sale is currently active
 * @param product - Product to check
 * @returns true if flash sale is active (not expired)
 */
export const isFlashSaleActive = (product: Pick<Product, 'isFlashSale' | 'flashSaleEndTime'>): boolean => {
  if (!product.isFlashSale) return false;
  if (!product.flashSaleEndTime) return false;
  return new Date(product.flashSaleEndTime).getTime() > Date.now();
};

/**
 * Sort items by flash sale end time (nearest first)
 * Pre-computes timestamps for O(n) instead of O(n log n) Date operations
 * @param items - Array of items with flashSaleEndTime or endTime
 * @returns Sorted array (new array, doesn't mutate original)
 */
export const sortByFlashSaleEndTime = <T extends { flashSaleEndTime?: string | null; endTime?: string }>(
  items: T[]
): T[] => {
  // Pre-compute timestamps once (O(n)) instead of during sort (O(n log n))
  const withTimestamps = items.map(item => ({
    item,
    timestamp: item.flashSaleEndTime 
      ? new Date(item.flashSaleEndTime).getTime() 
      : item.endTime 
        ? new Date(item.endTime).getTime() 
        : Infinity
  }));
  
  withTimestamps.sort((a, b) => a.timestamp - b.timestamp);
  
  return withTimestamps.map(({ item }) => item);
};

/**
 * Filter out products with active flash sales from regular catalog
 * Used to prevent duplicate display between catalog and flash sales section
 * @param products - Array of products to filter
 * @returns Products without active flash sales
 */
export const excludeActiveFlashSales = <T extends Pick<Product, 'isFlashSale' | 'flashSaleEndTime'>>(
  products: T[]
): T[] => {
  const now = Date.now();
  return products.filter(product => {
    if (!product.isFlashSale) return true;
    if (!product.flashSaleEndTime) return true;
    // Exclude if flash sale end time is in the future (active)
    return new Date(product.flashSaleEndTime).getTime() <= now;
  });
};
