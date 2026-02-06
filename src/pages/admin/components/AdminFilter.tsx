/**
 * Admin Filter Component - Cyber Compact Design System
 * WCAG 2.1 AA Compliant
 * 
 * Design Constitution Rules:
 * - Search icon: absolute, left-3, top-1/2, -translate-y-1/2
 * - Input height: h-10 (40px)
 * - Input border: border-white/10, focus:ring-primary/50
 * - Button spacing: gap-4 (16px)
 */

import { forwardRef } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { AdminButton } from './ui/AdminButton';

interface FilterOption {
  value: string;
  label: string;
}

interface AdminFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
  }>;
  onRefresh?: () => void;
  loading?: boolean;
}

/**
 * Standardized Filter Bar for Admin Pages
 * Search icon positioned absolutely INSIDE the input (Shopee-style)
 */
export const AdminFilter = forwardRef<HTMLInputElement, AdminFilterProps>(({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onRefresh,
  loading = false
}, ref) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search Bar - Icon absolutely positioned inside */}
      <div className="relative flex-1 min-w-[200px] max-w-[400px]">
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10" 
          size={18} 
        />
        <input
          ref={ref}
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="
            w-full h-10 pl-11 pr-4
            bg-white/10
            border border-transparent
            rounded-full
            text-sm text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500
            transition-all duration-200
          "
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {filters.map((filter, index) => (
            <div key={index} className="min-w-[150px]">
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">
                {filter.label}
              </label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="
                  w-full h-10 px-4
                  bg-white/10
                  border border-transparent
                  rounded-full
                  text-sm text-white
                  focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500
                  transition-all duration-200
                "
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <div className="ml-auto">
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </AdminButton>
        </div>
      )}
    </div>
  );
});

AdminFilter.displayName = 'AdminFilter';

export default AdminFilter;
