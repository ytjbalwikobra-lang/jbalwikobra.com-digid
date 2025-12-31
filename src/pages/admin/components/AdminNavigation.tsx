/**
 * Admin Navigation Sidebar Component
 * WCAG 2.1 AA Compliant Navigation
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  MessageSquare,
  Image,
  Zap,
  Settings,
  Menu,
  X,
  Star,
  Gamepad2,
} from 'lucide-react';
import { AdminColors } from '../design-tokens';

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

const navigationItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/game-titles', label: 'Game Titles', icon: Gamepad2 },
  { path: '/admin/flash-sales', label: 'Flash Sales', icon: Zap },
  { path: '/admin/banners', label: 'Banners', icon: Image },
  { path: '/admin/feed', label: 'Feed', icon: MessageSquare },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminNavigationProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 z-40"
        style={{
          backgroundColor: AdminColors.primary.light,
          borderRight: `1px solid ${AdminColors.border.DEFAULT}`,
        }}
        role="navigation"
        aria-label="Admin Navigation"
      >
        {/* Logo/Header */}
        <div
          className="p-6 border-b"
          style={{ borderColor: AdminColors.border.DEFAULT }}
        >
          <h1
            className="text-xl font-bold"
            style={{ color: AdminColors.accent.DEFAULT }}
          >
            Admin Panel
          </h1>
          <p className="text-sm mt-1" style={{ color: AdminColors.text.tertiary }}>
            Management System
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto" aria-label="Main Navigation">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: active
                        ? AdminColors.accent.DEFAULT
                        : 'transparent',
                      color: active
                        ? 'white'
                        : AdminColors.text.secondary,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor =
                          AdminColors.primary.lighter;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 z-50 lg:hidden
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          backgroundColor: AdminColors.primary.light,
          borderRight: `1px solid ${AdminColors.border.DEFAULT}`,
        }}
        role="navigation"
        aria-label="Mobile Admin Navigation"
      >
        {/* Mobile Header */}
        <div
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: AdminColors.border.DEFAULT }}
        >
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: AdminColors.accent.DEFAULT }}
            >
              Admin Panel
            </h1>
            <p className="text-sm mt-1" style={{ color: AdminColors.text.tertiary }}>
              Management System
            </p>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={24} style={{ color: AdminColors.text.primary }} />
          </button>
        </div>

        {/* Mobile Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: active
                        ? AdminColors.accent.DEFAULT
                        : 'transparent',
                      color: active
                        ? 'white'
                        : AdminColors.text.secondary,
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default AdminNavigation;
