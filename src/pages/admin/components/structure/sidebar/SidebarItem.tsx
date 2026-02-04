import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AdminTab } from '../adminTypes';

interface SidebarItemProps {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  collapsed: boolean;
  onClick: (tab: AdminTab) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  id,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
}) => {
  return (
    <div className="relative group">
      <button
        onClick={() => onClick(id)}
        className={`
          w-full flex items-center transition-all duration-200 text-base font-semibold rounded-xl
          ${collapsed ? 'justify-center p-3 aspect-square' : 'gap-3 px-4 py-3'}
          ${isActive
            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg ring-2 ring-pink-500/30 scale-[1.02]'
            : 'text-ds-text-secondary hover:bg-surface-tint-light hover:text-ds-text hover:scale-[1.01] hover:shadow-md'
          }
        `}
      >
        <Icon className={`
          w-6 h-6 flex-shrink-0 transition-all duration-200
          ${isActive ? 'text-white' : 'text-pink-500'}
        `} />
        
        {!collapsed && (
          <span className="text-base font-semibold tracking-wide">{label}</span>
        )}
        
        {!collapsed && isActive && (
          <div className="absolute right-3 w-2 h-2 bg-white rounded-full shadow-sm animate-pulse" />
        )}
      </button>
      
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-surface-glass-dark text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-surface-tint-light shadow-xl">
          {label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-surface-glass-dark rotate-45 border-l border-b border-surface-tint-light"></div>
        </div>
      )}
    </div>
  );
};
