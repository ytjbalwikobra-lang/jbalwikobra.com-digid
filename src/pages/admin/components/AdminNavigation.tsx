/**
 * Admin Navigation Sidebar Component - Cyber Design System V4
 * WCAG 2.1 AA Compliant Navigation
 * 
 * Design Constitution Rules:
 * - Sidebar background: bg-black (seamless pitch black, no distinct color)
 * - Must match Desktop ↔ Mobile exactly
 * - Navigation items: 12px padding, 8px gap
 * - Active state: bg-[var(--admin-accent)] = #F50057 (Neon Pink)
 * - Hover state: bg-white/5 (glass hover)
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Image,
  Zap,
  Settings,
  X,
  MessageCircle,
} from 'lucide-react';
import { adminCache } from '../../../services/adminCache';
import { adminService } from '../../../services/adminService';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const navigationItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/flash-sales', label: 'Flash Sales', icon: Zap },
  { path: '/admin/banners', label: 'Banners', icon: Image },
  { path: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminNavigationProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/**
 * Standardized Navigation Component
 * Desktop: Fixed sidebar w-64
 * Mobile: Slide-out drawer with overlay
 */
export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  // Prefetch data on hover for instant navigation
  const handleMouseEnter = (path: string) => {
    const page = path.split('/').pop();
    
    // Prefetch based on page type
    switch (page) {
      case 'dashboard':
        adminCache.prefetch('admin:stats', () => adminService.getDashboardStats());
        break;
      case 'orders':
        adminCache.prefetch('admin:orders:1:20:all', () => adminService.getOrders(1, 20));
        break;
      case 'products':
        adminCache.prefetch('admin:products:1:20:', () => adminService.getProducts(1, 20));
        adminCache.prefetch('admin:product-stats', () => adminService.getProductStats());
        break;
      case 'users':
        adminCache.prefetch('admin:users:1:20:', () => adminService.getUsers(1, 20));
        break;
      case 'banners':
        adminCache.prefetch('admin:banners:1:100:', () => adminService.getBanners(1, 100));
        break;
      case 'flash-sales':
        adminCache.prefetch('admin:flash-sales:1:100:', () => adminService.getFlashSales(1, 100));
        break;
    }
  };

  // Shared navigation item styles - DRY principle - COMPACT VERSION
  const getNavItemClasses = (active: boolean) => `
    w-full flex items-center gap-2 px-3 py-2 rounded-lg
    transition-all duration-200 text-xs font-medium
    ${active
      ? 'bg-[var(--admin-accent)] text-white shadow-[0_0_20px_rgba(245,0,87,0.25)]'
      : 'text-white/50 hover:bg-white/[0.05] hover:text-white'
    }
  `;

  // Shared header component - DRY principle - COMPACT VERSION
  const SidebarHeader = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="p-4 border-b border-white/10 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-[#F50057] tracking-tight">
          Admin Panel
        </h1>
        <p className="text-[10px] mt-0.5 text-white/30">
          Management System
        </p>
      </div>
      {showClose && (
        <button
          onClick={onMobileClose}
          className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
          aria-label="Close menu"
        >
          <X size={20} className="text-white/50" />
        </button>
      )}
    </div>
  );

  // Shared navigation list - DRY principle - COMPACT VERSION
  const NavigationList = () => (
    <nav className="flex-1 p-3 overflow-y-auto" aria-label="Main Navigation">
      <ul className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <li key={item.path}>
              <button
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => handleMouseEnter(item.path)}
                className={getNavItemClasses(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed left, hidden on mobile */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 z-40 bg-black border-r border-white/10"
        role="navigation"
        aria-label="Admin Navigation"
      >
        <SidebarHeader />
        <NavigationList />
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar - Slide-out drawer, MUST match desktop exactly */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 z-50 lg:hidden
          transform transition-transform duration-300 ease-out
          bg-black border-r border-white/10
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Mobile Admin Navigation"
      >
        <SidebarHeader showClose />
        <NavigationList />
      </aside>
    </>
  );
};

export default AdminNavigation;
