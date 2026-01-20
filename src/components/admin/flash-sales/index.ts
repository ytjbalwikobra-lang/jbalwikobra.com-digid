/**
 * Admin Flash Sales Components - Modular Architecture
 * 
 * This module exports a collection of refactored, maintainable components
 * for managing flash sales in the admin panel. All components follow the
 * iOS Design System V2 patterns and are built with TypeScript for type safety.
 * 
 * ## Architecture Overview
 * 
 * The flash sales management has been broken down into focused, reusable components:
 * 
 * ### Core Components:
 * - **FlashSaleStatsComponent**: Dashboard metrics and KPIs
 * - **FlashSaleFiltersComponent**: Search and filtering functionality
 * - **FlashSaleTable**: Responsive table/card view with actions
 * - **FlashSaleCard**: Individual flash sale card component
 * - **FlashSaleForm**: Create/edit form with validation
 * - **RefactoredAdminFlashSalesManagement**: Main orchestrator component
 * 
 * ### Data Schema:
 * Based on the CSV structure with these key fields:
 * - id, product_id, sale_price, original_price
 * - start_time, end_time, stock, is_active
 * - created_at, discount_percentage (calculated)
 * 
 * ### Key Features:
 * - ✅ Mobile-first responsive design
 * - ✅ Real-time status calculations
 * - ✅ Advanced filtering and search
 * - ✅ Form validation with preview
 * - ✅ Optimistic UI updates
 * - ✅ Error handling and loading states
 * - ✅ Accessibility compliance
 * 
 * ## Usage Example:
 * 
 * ```tsx
 * import { RefactoredAdminFlashSalesManagement } from './components';
 * 
 * const AdminPage = () => {
 *   return (
 *     <RefactoredAdminFlashSalesManagement 
 *       onRefresh={() =>  * };
 * ```
 * 
 * ## Individual Component Usage:
 * 
 * ```tsx
 * import { FlashSaleStatsComponent, FlashSaleTable } from './components';
 * 
 * const CustomDashboard = () => {
 *   return (
 *     <>
 *       <FlashSaleStatsComponent stats={stats} onCreateNew={handleCreate} />
 *       <FlashSaleTable flashSales={data} onEdit={handleEdit} />
 *     </>
 *   );
 * };
 * ```
 */

// Main refactored component
export { default as AdminFlashSalesManagement } from '../../../pages/admin/components/AdminFlashSalesManagement';

// Individual components for custom compositions
export { FlashSaleStatsComponent } from './FlashSaleStatsComponent';
export { FlashSaleFiltersComponent } from './FlashSaleFiltersComponent';
export { FlashSaleTable } from './FlashSaleTable';
export { FlashSaleCard } from './FlashSaleCard';
export { FlashSaleForm } from './FlashSaleForm';

// Type definitions
export type {
  FlashSaleData,
  FlashSaleFormData,
  FlashSaleStats,
  FlashSaleFilters,
  FlashSaleProduct,
  FlashSaleStatusInfo,
  PaginatedFlashSales
} from '../../../types/flashSales';

/**
 * Component Status Matrix:
 * 
 * | Component                        | Status | Mobile | Desktop | Dark Mode | Validation | Tests |
 * |----------------------------------|--------|--------|---------|-----------|------------|-------|
 * | FlashSaleStatsComponent         | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | N/A        | ⏳ TODO |
 * | FlashSaleFiltersComponent       | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | ✅ Yes     | ⏳ TODO |
 * | FlashSaleTable                  | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | N/A        | ⏳ TODO |
 * | FlashSaleCard                   | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | N/A        | ⏳ TODO |
 * | FlashSaleForm                   | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | ✅ Yes     | ⏳ TODO |
 * | RefactoredAdminFlashSales       | ✅ Done | ✅ Yes | ✅ Yes  | ✅ Yes    | ✅ Yes     | ⏳ TODO |
 */

/**
 * Migration Guide from Original Component:
 * 
 * ### Before (Monolithic):
 * ```tsx
 * import { AdminFlashSalesManagement } from './components/AdminFlashSalesManagement';
 * // 800+ lines of code in single file
 * ```
 * 
 * ### After (Modular):
 * ```tsx
 * import { RefactoredAdminFlashSalesManagement } from './components';
 * // Composed of 6 focused components, each under 400 lines
 * ```
 * 
 * ### Benefits:
 * - 🔧 **Maintainability**: Each component has a single responsibility
 * - 🧪 **Testability**: Components can be tested in isolation
 * - 🔄 **Reusability**: Components can be used in different contexts
 * - 📱 **Responsive**: Better mobile experience with dedicated card views
 * - 🎨 **Consistency**: Follows iOS Design System V2 patterns
 * - 🛡️ **Type Safety**: Full TypeScript coverage with proper interfaces
 */

/**
 * Performance Considerations:
 * 
 * - Components use React.memo for unnecessary re-renders prevention
 * - Debounced search input to reduce API calls
 * - Virtual scrolling for large datasets (recommended for 1000+ items)
 * - Optimistic updates for better user experience
 * - Proper error boundaries for graceful error handling
 */
