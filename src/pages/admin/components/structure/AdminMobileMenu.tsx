import React from 'react';
import { X, LayoutDashboard } from 'lucide-react';
import { navigationItems } from './navigationConfig';
import { AdminTab } from './adminTypes';
import { cn } from '../../../../utils/cn';

interface AdminMobileMenuProps {
  open: boolean;
  activeTab: AdminTab;
  onClose(): void;
  onSelect(tab: AdminTab): void;
}

export const AdminMobileMenu: React.FC<AdminMobileMenuProps> = ({ open, activeTab, onClose, onSelect }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 surface-glass-lg shadow-2xl border-r border-token">
        <div className="p-md">
          <div className="cluster-md mb-lg">
            <div className="cluster-md">
              <div className="badge-circle lg surface-tint-pink badge-ring">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <div className="stack-xs">
                <h1 className="heading-brand fs-xl">
                  JB Alwikobra
                </h1>
                <p className="fs-sm text-secondary">Admin Panel</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="btn btn-ghost btn-sm surface-tint-pink hover:bg-[var(--cyber-pink-primary)]/25 transition-soft"
            >
              <X className="w-5 h-5 text-accent" />
            </button>
          </div>
          <nav className="stack-sm">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.id); onClose(); }}
                  className={cn(
                    'w-full cluster-md px-lg py-md rounded-cyber-2xl transition-soft fs-base font-semibold relative group',
                    isActive
                      ? 'surface-accent text-primary shadow-lg ring-2 ring-accent/50'
                      : 'text-secondary hover:surface-tint-pink hover:text-accent hover:shadow-md hover:ring-1 hover:ring-accent/30'
                  )}
                >
                  <Icon className={cn(
                    'w-6 h-6 transition-soft',
                    isActive ? 'text-primary drop-shadow-sm' : 'text-accent group-hover:text-accent'
                  )} />
                  <span className="fs-base font-semibold tracking-wide">{item.label}</span>
                  {isActive && (
                    <div className="absolute right-3 w-2 h-2 bg-primary rounded-full shadow-sm animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-lg pt-lg border-t border-token fs-sm font-medium text-secondary text-center">
            Version 2.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMobileMenu;
