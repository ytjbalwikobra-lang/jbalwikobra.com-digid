/**
 * Flash Sales Admin Demo/Example Usage
 * 
 * This file demonstrates how to use the new refactored flash sales components
 * in different scenarios and configurations.
 */

import React from 'react';
import { 
  AdminFlashSalesManagement,
  FlashSaleStatsComponent,
  FlashSaleTable,
  FlashSaleFiltersComponent 
} from '../components/admin/flash-sales';
import type { FlashSaleFilters } from '../types/flashSales';

/**
 * Example 1: Complete Flash Sales Management (Recommended)
 * 
 * Use the main refactored component that includes all functionality:
 * - Stats dashboard
 * - Search and filters
 * - Responsive table/cards
 * - Create/edit forms
 * - Error handling
 */
export const CompleteFlashSalesExample: React.FC = () => {
  const handleRefresh = () => {
    // Additional refresh logic if needed
  };

  return (
    <div className="p-6">
      <AdminFlashSalesManagement 
        onRefresh={handleRefresh}
      />
    </div>
  );
};

/**
 * Example 2: Custom Dashboard with Individual Components
 * 
 * Use individual components to create custom layouts and functionality
 */
export const CustomFlashSalesDashboard: React.FC = () => {
  // Mock data - replace with real API calls
  const stats = {
    totalFlashSales: 42,
    activeFlashSales: 8,
    scheduledFlashSales: 5,
    expiredFlashSales: 29,
    averageDiscount: 23.5
  };

  const filters = {
    searchTerm: '',
    statusFilter: 'all' as const,
    discountFilter: 'all' as const,
    sortBy: 'created_at' as const,
    sortOrder: 'desc' as const
  };

  const flashSales = []; // Your flash sales data

  const handleCreateNew = () => {
  };

  const handleFiltersChange = (newFilters: FlashSaleFilters) => {
  };

  const handleEdit = (flashSale: any) => {
  };

  const handleDelete = (id: string) => {
  };

  const handleToggleStatus = (id: string, status: boolean) => {
  };

  return (
    <div className="space-y-8 p-6">
      {/* Custom header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Custom Flash Sales Dashboard
        </h1>
        <p className="text-gray-400">
          Built with modular components
        </p>
      </div>

      {/* Stats component */}
      <FlashSaleStatsComponent
        stats={stats}
        loading={false}
      />

      {/* Filters component */}
      <FlashSaleFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showFilters={true}
        onToggleFilters={() => {}}
        resultCount={flashSales.length}
      />

      {/* Table component */}
      <FlashSaleTable
        flashSales={flashSales}
        loading={false}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
};

/**
 * Example 3: Stats-Only Component
 * 
 * Use just the stats component for a dashboard overview
 */
export const StatsOnlyExample: React.FC = () => {
  const stats = {
    totalFlashSales: 156,
    activeFlashSales: 12,
    scheduledFlashSales: 8,
    expiredFlashSales: 136,
    averageDiscount: 28.7
  };

  return (
    <div className="p-6">
      <FlashSaleStatsComponent
        stats={stats}
        loading={false}
      />
    </div>
  );
};

/**
 * Example 4: Integration with Next.js Page
 * 
 * How to integrate with a Next.js page router
 */
export const NextJSPageExample = () => {
  return (
    <>
      <head>
        <title>Flash Sales Management - Admin</title>
        <meta name="description" content="Manage flash sales and time-limited promotions" />
      </head>
      
      <main className="min-h-screen bg-black">
        <AdminFlashSalesManagement />
      </main>
    </>
  );
};

/**
 * Example 5: Error Boundary Integration
 * 
 * How to wrap components with error boundaries for better error handling
 */
class FlashSalesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Flash Sales Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-black text-white">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-4">
            {this.state.error?.message || 'An error occurred loading flash sales'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundaryExample: React.FC = () => {
  return (
    <FlashSalesErrorBoundary>
      <AdminFlashSalesManagement />
    </FlashSalesErrorBoundary>
  );
};

/**
 * Usage Tips:
 * 
 * 1. **Performance**: For large datasets (1000+ flash sales), consider implementing
 *    virtual scrolling or pagination at the API level.
 * 
 * 2. **Real-time Updates**: Consider integrating with WebSockets or polling
 *    for real-time status updates, especially for active flash sales.
 * 
 * 3. **Permissions**: Add role-based access control for different admin levels:
 *    - View only: Can see stats and list
 *    - Editor: Can create and edit
 *    - Admin: Full access including delete
 * 
 * 4. **Analytics**: Track user interactions for better UX:
 *    - Which filters are used most
 *    - Common editing patterns
 *    - Error frequencies
 * 
 * 5. **Testing**: Each component can be tested independently:
 *    ```tsx
 *    import { render, screen } from '@testing-library/react';
 *    import { FlashSaleStatsComponent } from './components';
 *    
 *    test('displays flash sale stats', () => {
 *      const stats = { totalFlashSales: 10, ... };
 *      render(<FlashSaleStatsComponent stats={stats} />);
 *      expect(screen.getByText('10')).toBeInTheDocument();
 *    });
 *    ```
 */
