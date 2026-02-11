/**
 * adminService.ts — Barrel re-export
 * 
 * File asli (2395 baris) telah dipecah menjadi modul-modul di src/services/admin/:
 * - types.ts: Semua interface/tipe
 * - helpers.ts: fetchWithRetry, fetchProductNames, fetchUserNames
 * - orderUserOps.ts: Operasi order dan user
 * - productOps.ts: CRUD produk dan review
 * - dashboardOps.ts: Statistik dashboard dan analytics
 * - contentOps.ts: Flash sales, banners, feed posts
 * - searchOps.ts: Pencarian global dan lookup data
 * - whatsappOps.ts: Konfigurasi WhatsApp
 * - index.ts: Barrel yang merakit adminService object
 * 
 * Import tetap sama: import { adminService } from '../services/adminService'
 */

export { adminService } from './admin';

// Re-export semua tipe untuk backward compatibility
export type {
  AdminStats,
  Order,
  User,
  Product,
  Review,
  Banner,
  FlashSale,
  PaginatedResponse,
  FeedPost,
  AdminNotification,
  OrderDayStat,
  OrderStatusDayStat,
  TopProductStat,
  OrderItem,
  UserItem,
} from './admin';
