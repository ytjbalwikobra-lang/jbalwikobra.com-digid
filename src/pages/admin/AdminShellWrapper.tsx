/**
 * Admin Shell - Consistent Layout Wrapper
 * Provides navigation and consistent layout for all admin pages
 * Uses CSS variables from cyber-compact.css (--admin-* namespace)
 * Enhanced with realtime connection status indicator and admin presence
 */

import React, { useState, useEffect } from 'react';
import { AdminNavigation } from './components/AdminNavigation';
import { Menu, Bell, LogOut, Wifi, WifiOff, RefreshCw, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/TraditionalAuthContext';
import { AdminToastProvider } from './components/ui/AdminToast';
import AdminFloatingNotifications from './AdminFloatingNotifications';
import { useAdminRealtimeNotifications, ConnectionStatus } from '../../hooks/useAdminRealtimeNotifications';
import { AdminDataProvider } from '../../contexts/AdminDataContext';
import { ConfirmDialogProvider } from '../../contexts/ConfirmDialogContext';
import { prefetchManager } from '../../services/intelligentPrefetch';
// Design system: cyber-compact.css (loaded via index.css)

interface AdminShellProps {
  children: React.ReactNode;
}

// Enhancement E: Connection Status Indicator Component
const ConnectionStatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  if (status === 'connected') {
    return (
      <div 
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        title="Realtime connected"
        role="status"
        aria-label="Koneksi realtime aktif"
      >
        <Wifi size={12} className="text-emerald-400" />
        <span className="hidden sm:inline text-[10px] font-medium text-emerald-400">Live</span>
      </div>
    );
  }
  
  if (status === 'reconnecting') {
    return (
      <div 
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse"
        title="Reconnecting to realtime..."
        role="status"
        aria-label="Sedang menghubungkan ulang"
      >
        <RefreshCw size={12} className="text-amber-400 animate-spin" />
        <span className="hidden sm:inline text-[10px] font-medium text-amber-400">Reconnecting</span>
      </div>
    );
  }
  
  // offline
  return (
    <div 
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20"
      title="Realtime disconnected — using polling fallback"
      role="status"
      aria-label="Koneksi realtime terputus, menggunakan polling"
    >
      <WifiOff size={12} className="text-red-400" />
      <span className="hidden sm:inline text-[10px] font-medium text-red-400">Offline</span>
    </div>
  );
};

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Baca preferensi dari localStorage, default collapsed pada layar < 1280px
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth < 1280;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Use unified realtime notifications hook - single subscription pattern
  const { unreadCount, connectionStatus, onlineAdmins } = useAdminRealtimeNotifications({ limit: 50 });

  // Track page changes for intelligent prefetching
  useEffect(() => {
    const pageName = location.pathname.split('/').pop() || 'dashboard';
    prefetchManager.setCurrentPage(pageName);
  }, [location.pathname]);

  // Auto-collapse sidebar pada layar kecil
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      // Hanya auto-toggle jika user belum set preferensi manual
      if (saved === null) {
        setSidebarCollapsed(window.innerWidth < 1280);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      // Use proper auth logout which clears all session data
      await logout();
      // Navigate to admin login after logout
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if logout fails
      navigate('/admin/login');
    }
  };

  return (
    <AdminDataProvider>
      <ConfirmDialogProvider>
      <AdminToastProvider>
        <div className="min-h-screen bg-black text-white">
          {/* Navigation Sidebar */}
          <AdminNavigation
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />

        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {/* Top Header Bar */}
          <header className="sticky top-0 z-40 border-b bg-black/80 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-14 sm:h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2.5 -ml-1 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
              aria-label="Buka menu"
            >
              <Menu size={22} className="text-white/60" />
            </button>

            {/* Desktop: Empty space for alignment */}
            <div className="hidden lg:block" />

            {/* Right Side Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Enhancement E: Connection Status Indicator */}
              <ConnectionStatusIndicator status={connectionStatus} />
              
              {/* Enhancement F: Online Admins Indicator */}
              {onlineAdmins.length > 0 && (
                <div 
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10"
                  title={`Admin online: ${onlineAdmins.map(a => a.name).join(', ')}`}
                >
                  <Users size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-medium text-white/60">
                    {onlineAdmins.length}
                  </span>
                </div>
              )}

              {/* Notifications */}
              <button
                onClick={() => navigate('/admin/notifications')}
                className="relative p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
                aria-label="Notifikasi"
              >
                <Bell size={20} className="text-white/60" />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-[var(--admin-error)] text-white px-1"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={20} className="text-white/60" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content - Compact spacing */}
        <main className="p-3 lg:p-4">
          {children}
        </main>
        </div>
        
        {/* Floating Notifications - appears on all admin pages */}
        <AdminFloatingNotifications />
      </div>
      </AdminToastProvider>
      </ConfirmDialogProvider>
    </AdminDataProvider>
  );
};

export default AdminShell;
