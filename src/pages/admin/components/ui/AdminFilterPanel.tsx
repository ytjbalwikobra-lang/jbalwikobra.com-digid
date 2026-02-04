import React, { useState } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { adminInputBase, cx } from './InputStyles';

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect';
  placeholder?: string;
  options?: { value: string; label: string }[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

interface AdminFilterPanelProps {
  fields: FilterField[];
  onReset?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  resultCount?: number;
  totalCount?: number;
}

export const AdminFilterPanel: React.FC<AdminFilterPanelProps> = ({
  fields,
  onReset,
  collapsible = true,
  defaultCollapsed = false,
  resultCount,
  totalCount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder}
            value={field.value as string}
            onChange={(e) => field.onChange(e.target.value)}
            className={cx(adminInputBase, 'px-stack-sm py-stack-sm')}
          />
        );
      
      case 'select':
        return (
          <select
            value={field.value as string}
            onChange={(e) => field.onChange(e.target.value)}
            className={cx(adminInputBase, 'px-stack-sm py-stack-sm')}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return null;
    }
  };

  return (
  <div className="dashboard-data-panel padded rounded-cyber-lg p-stack-lg surface-glass-md">
      {collapsible ? (
        <div className="p-stack-lg">
          <div className="flex items-center justify-between mb-stack-lg">
            <div className="flex items-center gap-cluster-xs">
              <Filter size={20} className="text-surface-tint-pink" />
              <h3 className="heading-md text-white">Filters</h3>
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-ghost btn-sm inline-flex items-center gap-cluster-xs"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              {isCollapsed ? 'Show' : 'Hide'}
            </button>
          </div>
          
          {!isCollapsed && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-lg">
                {fields.map(field => (
                  <div key={field.id} className="space-y-stack-xs">
                    <label className="block fs-sm font-medium text-surface-tint-gray">
                      {field.label}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              
              {onReset && (
                <div className="flex justify-end mt-stack-lg pt-stack-lg border-t border-surface-tint-gray/30">
                  <button
                    onClick={onReset}
                    className="btn btn-secondary btn-sm"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Results Info */}
          {(resultCount !== undefined || totalCount !== undefined) && (
            <div className="flex justify-between items-center pt-stack-lg border-t border-surface-tint-gray/30">
              <div className="fs-sm text-surface-tint-gray">
                {resultCount !== undefined && totalCount !== undefined ? (
                  <>
                    Showing {resultCount} of {totalCount} items
                    {resultCount !== totalCount && ` (filtered)`}
                  </>
                ) : resultCount !== undefined ? (
                  `${resultCount} items found`
                ) : (
                  `${totalCount} total items`
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-stack-lg space-y-stack-lg">
          <div className="flex items-center gap-cluster-xs mb-stack-lg">
            <Search size={20} className="text-surface-tint-pink" />
            <h3 className="heading-md text-white">Search & Filter</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-lg">
            {fields.map(field => (
              <div key={field.id} className="space-y-stack-xs">
                <label className="block fs-sm font-medium text-surface-tint-gray">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
          
          {/* Results Info */}
          {(resultCount !== undefined || totalCount !== undefined) && (
            <div className="flex justify-between items-center pt-stack-lg border-t border-surface-tint-gray/30">
              <div className="fs-sm text-surface-tint-gray">
                {resultCount !== undefined && totalCount !== undefined ? (
                  <>
                    Showing {resultCount} of {totalCount} items
                    {resultCount !== totalCount && ` (filtered)`}
                  </>
                ) : resultCount !== undefined ? (
                  `${resultCount} items found`
                ) : (
                  `${totalCount} total items`
                )}
              </div>
              {onReset && (
                <button
                  onClick={onReset}
                  className="btn btn-secondary btn-sm"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
