/**
 * index.ts — Barrel module untuk ProductService
 * Menyusun kembali class ProductService dari modul terpisah
 * agar backward-compatible dengan semua consumer yang import { ProductService }
 */

// Re-export types yang dibutuhkan consumer
export { sampleProducts, sampleTiers, sampleGameTitles } from './sampleData';

// Import fungsi dari setiap modul
import { invalidateCategoryCache, resetCapabilities } from './helpers';
import { detectSchemaCapabilities } from './schemaDetection';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductRentalStatus,
  getBatchRentalStatuses,
} from './productOps';
import {
  getFlashSales,
  getActiveFlashSaleByProductId,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
} from './flashSaleOps';
import {
  getTiers,
  getGameTitles,
  getCategories,
  getPopularGames,
  getCategoryList,
} from './catalogOps';

/**
 * Class ProductService — facade statis yang mendelegasikan ke modul terpisah
 * Menjaga backward-compatibility: semua consumer tetap bisa pakai ProductService.methodName()
 */
export class ProductService {
  // --- Helpers & Cache ---
  static invalidateCategoryCache = invalidateCategoryCache;
  static resetCapabilities = resetCapabilities;
  static detectSchemaCapabilities = detectSchemaCapabilities;

  // --- Product CRUD ---
  static getAllProducts = getAllProducts;
  static getProductById = getProductById;
  static createProduct = createProduct;
  static updateProduct = updateProduct;
  static deleteProduct = deleteProduct;
  static getProductRentalStatus = getProductRentalStatus;
  static getBatchRentalStatuses = getBatchRentalStatuses;

  // --- Flash Sale ---
  static getFlashSales = getFlashSales;
  static getActiveFlashSaleByProductId = getActiveFlashSaleByProductId;
  static createFlashSale = createFlashSale;
  static updateFlashSale = updateFlashSale;
  static deleteFlashSale = deleteFlashSale;

  // --- Katalog ---
  static getTiers = getTiers;
  static getGameTitles = getGameTitles;
  static getCategories = getCategories;
  static getPopularGames = getPopularGames;
  static getCategoryList = getCategoryList;
}
