/**
 * admin/index.ts
 * Barrel re-export — merakit adminService object dari sub-modul
 * Backward compatible: semua consumer tetap import { adminService } dari sini
 */

// Re-export semua tipe
export type {
  AdminStats, Order, User, Product, Review, Banner, FlashSale,
  PaginatedResponse, FeedPost, AdminNotification,
  OrderDayStat, OrderStatusDayStat, TopProductStat, OrderItem, UserItem
} from './types';

// Import implementasi dari sub-modul
import * as orderUser from './orderUserOps';
import * as product from './productOps';
import * as dashboard from './dashboardOps';
import * as content from './contentOps';
import * as search from './searchOps';
import * as whatsapp from './whatsappOps';

/**
 * Objek adminService — API tetap sama dengan sebelumnya
 * Semua consumer existing tidak perlu diubah
 */
export const adminService = {
  // === Orders & Users ===
  completeOrder: orderUser.completeOrder,
  getOrders: orderUser.getOrders,
  getUsers: orderUser.getUsers,

  // === Products & Reviews ===
  updateProductFields: product.updateProductFields,
  toggleProductActive: product.toggleProductActive,
  deleteProduct: product.deleteProduct,
  getProducts: product.getProducts,
  getProductStats: product.getProductStats,
  getReviews: product.getReviews,
  createProduct: product.createProduct,
  updateProduct: product.updateProduct,

  // === Dashboard & Analytics ===
  getAdminStats: dashboard.getAdminStats,
  clearStatsCache: dashboard.clearStatsCache,
  clearOrdersCache: dashboard.clearOrdersCache,
  clearUsersCache: dashboard.clearUsersCache,
  invalidateCache: dashboard.invalidateCache,
  prefetchDashboardData: dashboard.prefetchDashboardData,
  getDashboardStats: dashboard.getDashboardStats,
  getOrdersTimeSeries: dashboard.getOrdersTimeSeries,
  getOrderStatusTimeSeries: dashboard.getOrderStatusTimeSeries,
  getTopProducts: dashboard.getTopProducts,
  getNotifications: dashboard.getNotifications,

  // === Flash Sales ===
  getFlashSales: content.getFlashSales,
  createFlashSale: content.createFlashSale,
  updateFlashSale: content.updateFlashSale,
  deleteFlashSale: content.deleteFlashSale,
  getFlashSaleStats: content.getFlashSaleStats,

  // === Banners ===
  getBanners: content.getBanners,
  createBanner: content.createBanner,
  updateBanner: content.updateBanner,
  deleteBanner: content.deleteBanner,
  getBannerStats: content.getBannerStats,
  toggleBannerStatus: content.toggleBannerStatus,
  reorderBanners: content.reorderBanners,

  // === Feed Posts ===
  getFeedPosts: content.getFeedPosts,
  deleteFeedPost: content.deleteFeedPost,
  createFeedPost: content.createFeedPost,
  updateFeedPost: content.updateFeedPost,
  toggleFeedPostPin: content.toggleFeedPostPin,
  deleteFeedPostPermanent: content.deleteFeedPostPermanent,

  // === Search ===
  searchAll: search.searchAll,
  searchOrders: search.searchOrders,
  searchUsers: search.searchUsers,
  searchProducts: search.searchProducts,
  searchReviews: search.searchReviews,
  createSampleReviews: search.createSampleReviews,

  // === Lookups ===
  getCategories: search.getCategories,
  getGameTitles: search.getGameTitles,
  getTiers: search.getTiers,

  // === WhatsApp ===
  getWhatsAppSettings: whatsapp.getWhatsAppSettings,
  getWhatsAppGroups: whatsapp.getWhatsAppGroups,
  updateWhatsAppApiKey: whatsapp.updateWhatsAppApiKey,
  updateWhatsAppConfig: whatsapp.updateWhatsAppConfig,
  sendTestWhatsAppMessage: whatsapp.sendTestWhatsAppMessage,
  getWhatsAppStats: whatsapp.getWhatsAppStats,
};
