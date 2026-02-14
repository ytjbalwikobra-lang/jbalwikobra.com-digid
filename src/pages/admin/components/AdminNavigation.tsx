/**
 * Admin Navigation Sidebar Component - Cyber Design System V4
 * WCAG 2.1 AA Compliant Navigation
 * 
 * Design Constitution Rules:
 * - Sidebar background: bg-black (seamless pitch black, no distinct color)
 * - Must match Desktop ↔ Mobile exactly
 * - Navigation items: min 44px touch target on mobile
 * - Active state: bg-[var(--admin-accent)] = #F50057 (Neon Pink)
 * - Hover state: bg-white/5 (glass hover)
 * - Settings group: collapsible submenu
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Bell,
  MessageSquare,
  FileText,
  Clock,
  KeyRound,
  Activity,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { adminCache } from '../../../services/adminCache';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { hasAccessToPath } from '../../../components/RequireRole';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

/** Item navigasi utama — tanpa settings-related items */
const mainNavItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/flash-sales', label: 'Flash Sales', icon: Zap },
  { path: '/admin/banners', label: 'Banners', icon: Image },
  { path: '/admin/chat', label: 'Live Chat', icon: MessageSquare },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  { path: '/admin/rental-tracking', label: 'Rental', icon: KeyRound },
  { path: '/admin/activity-log', label: 'Activity Log', icon: Activity },
];

/** Item Settings submenu — semua pengaturan di satu grup */
const settingsNavItems: NavItem[] = [
  { path: '/admin/settings', label: 'Umum', icon: Settings },
  { path: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { path: '/admin/canned-responses', label: 'Template Respon', icon: FileText },
  { path: '/admin/chat-settings', label: 'Chat Settings', icon: Clock },
];

interface AdminNavigationProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Standardized Navigation Component
 * Desktop: Fixed sidebar w-64
 * Mobile: Slide-out drawer with overlay + body scroll lock
 */
export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Cek apakah salah satu settings path sedang aktif
  const isSettingsActive = settingsNavItems.some(item => location.pathname === item.path);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  // Buka settings group otomatis saat navigasi ke halaman settings
  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
  }, [isSettingsActive]);

  const isActive = (path: string) => location.pathname === path;

  // Filter item navigasi berdasarkan role user
  const filteredMainItems = mainNavItems.filter(item => 
    hasAccessToPath(user?.role, item.path)
  );
  const filteredSettingsItems = settingsNavItems.filter(item => 
    hasAccessToPath(user?.role, item.path)
  );

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    onMobileClose?.();
  }, [navigate, onMobileClose]);

  // Body scroll lock saat mobile drawer terbuka
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Prefetch data on hover for instant navigation
  const handleMouseEnter = (path: string) => {
    const page = path.split('/').pop();
    
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

  // Style untuk nav item — py-2.5 = 44px touch target minimum
  const getNavItemClasses = (active: boolean, isCollapsed: boolean = collapsed) => `
    w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2.5 ${isCollapsed ? 'px-0 py-2.5' : 'px-3 py-2.5'} rounded-lg
    transition-all duration-200 text-[13px] font-medium touch-manipulation
    ${active
      ? 'bg-[var(--admin-accent)] text-white shadow-[0_0_20px_rgba(245,0,87,0.25)]'
      : 'text-white/50 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08]'
    }
  `;

  // Style untuk settings sub-item — sedikit lebih kecil
  const getSubItemClasses = (active: boolean, isCollapsed: boolean = collapsed) => `
    w-full flex items-center gap-2.5 ${isCollapsed ? 'px-0 py-2 justify-center' : 'pl-9 pr-3 py-2'} rounded-lg
    transition-all duration-200 text-xs font-medium touch-manipulation
    ${active
      ? 'bg-[var(--admin-accent)]/80 text-white'
      : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70 active:bg-white/[0.08]'
    }
  `;

  // Header sidebar
  const SidebarHeader = ({ showClose = false }: { showClose?: boolean }) => (
    <div className={`p-4 border-b border-white/10 flex items-center ${collapsed && !showClose ? 'justify-center' : 'justify-between'}`}>
      {collapsed && !showClose ? (
        <h1 className="text-lg font-bold text-[#F50057] tracking-tight">A</h1>
      ) : (
        <div>
          <h1 className="text-lg font-bold text-[#F50057] tracking-tight">
            Admin Panel
          </h1>
          <p className="text-[10px] mt-0.5 text-white/30">
            Management System
          </p>
        </div>
      )}
      {showClose && (
        <button
          onClick={onMobileClose}
          className="p-2.5 -mr-1 rounded-lg hover:bg-white/[0.05] transition-colors touch-manipulation active:bg-white/10"
          aria-label="Tutup menu"
        >
          <X size={20} className="text-white/50" />
        </button>
      )}
    </div>
  );

  // Daftar navigasi dengan settings group
  // Parameter forceExpanded: mobile drawer selalu tampil expanded (dengan teks)
  const NavigationList = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const isCollapsed = forceExpanded ? false : collapsed;
    return (
    <nav className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'} overflow-y-auto`} aria-label="Main Navigation">
      {/* Item utama */}
      <ul className="space-y-0.5">
        {filteredMainItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => handleMouseEnter(item.path)}
                className={getNavItemClasses(active, isCollapsed)}
                aria-current={active ? 'page' : undefined}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={isCollapsed ? 18 : 16} aria-hidden="true" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Separator + Settings group */}
      {filteredSettingsItems.length > 0 && (
        <>
          <div className="my-3 border-t border-white/[0.06]" />
          <div>
            {/* Settings trigger */}
            <button
              onClick={() => isCollapsed ? handleNavigate('/admin/settings') : setSettingsOpen(prev => !prev)}
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2.5 ${isCollapsed ? 'px-0 py-2.5' : 'px-3 py-2.5'} rounded-lg
                transition-all duration-200 text-[13px] font-medium touch-manipulation
                ${isSettingsActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08]'
                }
              `}
              title={isCollapsed ? 'Settings' : undefined}
              aria-expanded={settingsOpen}
            >
              <Settings size={isCollapsed ? 18 : 16} aria-hidden="true" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Settings</span>
                  {settingsOpen ? (
                    <ChevronDown size={14} className="text-white/30" />
                  ) : (
                    <ChevronRight size={14} className="text-white/30" />
                  )}
                </>
              )}
            </button>
            {/* Sub-item settings */}
            {!isCollapsed && settingsOpen && (
              <ul className="mt-0.5 space-y-0.5">
                {filteredSettingsItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={getSubItemClasses(active, isCollapsed)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon size={14} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </nav>
    );
  };

  return (
    <>
      {/* Desktop Sidebar - Fixed left, hidden on mobile */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-black border-r border-white/10 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        role="navigation"
        aria-label="Admin Navigation"
      >
        <SidebarHeader />
        <NavigationList />
        {/* Tombol toggle collapse */}
        {onToggleCollapse && (
          <div className="p-2 border-t border-white/10">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:bg-white/[0.05] hover:text-white/60 transition-all text-xs"
              title={collapsed ? 'Perluas sidebar' : 'Kecilkan sidebar'}
            >
              {collapsed ? (
                <ChevronsRight size={16} />
              ) : (
                <>
                  <ChevronsLeft size={16} />
                  <span>Minimize</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar - Slide-out drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-72 z-[60] lg:hidden
          transform transition-transform duration-300 ease-out
          bg-black border-r border-white/10
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Mobile Admin Navigation"
      >
        <SidebarHeader showClose />
        <NavigationList forceExpanded />
      </aside>
    </>
  );
};

export default AdminNavigation;
