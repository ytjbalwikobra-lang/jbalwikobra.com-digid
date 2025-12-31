/**
 * Admin Filter Component - V3 Design System
 * Reusable filter component for admin pages
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { AdminButton } from './ui/AdminButton';
import '../../../styles/admin-design-system-v3.css';

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

export const AdminFilter: React.FC<AdminFilterProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onRefresh,
  loading = false
}) => {
  return (
    <div className="admin-filter-container">
      {/* Search Bar */}
      <div className="admin-search-wrapper">
        <Search className="admin-search-icon" size={20} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="admin-input admin-search-input"
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.length > 0 && (
        <div className="admin-filter-grid">
          {filters.map((filter, index) => (
            <div key={index}>
              <label className="admin-label">{filter.label}</label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="admin-select"
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
        <div className="admin-filter-actions">
          <AdminButton
            variant="secondary"
            onClick={onRefresh}
            disabled={loading}
            icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />}
          >
            Refresh
          </AdminButton>
        </div>
      )}
    </div>
  );
};
