/**
 * Admin Shell - Consistent Layout Wrapper
 * Provides navigation and consistent layout for all admin pages
 * Uses CSS variables from cyber-compact.css (--admin-* namespace)
 */

import React, { useState, useEffect } from 'react';
import { AdminNavigation } from './components/AdminNavigation';
import { Menu, Bell, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/TraditionalAuthContext';
import { AdminToastProvider } from './components/ui/AdminToast';
import AdminNotificationPanel from './components/AdminNotificationPanel';
import AdminFloatingNotifications from './AdminFloatingNotifications';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { AdminDataProvider } from '../../contexts/AdminDataContext';
import { prefetchManager } from '../../services/intelligentPrefetch';
// Design system: cyber-compact.css (loaded via index.css)

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Use unified realtime notifications hook - single subscription pattern
  const { unreadCount } = useAdminRealtimeNotifications({ limit: 50 });

  // Track page changes for intelligent prefetching
  useEffect(() => {
    const pageName = location.pathname.split('/').pop() || 'dashboard';
    prefetchManager.setCurrentPage(pageName);
  }, [location.pathname]);

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
      <AdminToastProvider>
        <div className="min-h-screen bg-black text-white">
          {/* Navigation Sidebar */}
          <AdminNavigation
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

        {/* Main Content Area */}
        <div className="lg:ml-64">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-40 border-b bg-black/80 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} className="text-white/60" />
            </button>

            {/* Desktop: Empty space for alignment */}
            <div className="hidden lg:block" />

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
                  aria-label="Notifications"
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
                
                {/* Notification Panel */}
                <AdminNotificationPanel
                  isOpen={notificationPanelOpen}
                  onClose={() => setNotificationPanelOpen(false)}
                />
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
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
    </AdminDataProvider>
  );
};

export default AdminShell;
