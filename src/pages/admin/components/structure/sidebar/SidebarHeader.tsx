import React from 'react';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ 
  collapsed, 
  onToggle 
}) => {
  return (
    <div className={`
      flex items-center transition-all duration-300 mb-stack-lg
      ${collapsed ? 'justify-center' : 'justify-between'}
    `}>
      {/* Logo and Title */}
      {!collapsed && (
        <div className="cluster-md">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-purple)] flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div className="stack-xs">
            <h1 className="text-xl font-bold text-ds-text">JB Alwikobra</h1>
            <p className="text-sm text-ds-text-secondary">Admin Panel</p>
          </div>
        </div>
      )}
      
      {/* Collapsed Logo */}
      {collapsed && (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-purple)] flex items-center justify-center shadow-lg">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
      )}
      
      {/* Collapse Button */}
      {!collapsed && (
        <button
          onClick={onToggle}
          className="btn btn-ghost btn-sm hover:bg-neutral-700/40"
        >
          <ChevronLeft className="w-5 h-5 text-ds-text-secondary" />
        </button>
      )}
    </div>
  );
};
