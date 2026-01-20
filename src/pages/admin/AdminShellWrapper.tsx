/**
 * Admin Shell - Consistent Layout Wrapper
 * Provides navigation and consistent layout for all admin pages
 */

import React, { useState } from 'react';
import { AdminNavigation } from './components/AdminNavigation';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { AdminColors } from './design-tokens';
import { useNavigate } from 'react-router-dom';
import { AdminToastProvider } from './components/ui/AdminToast';
import AdminNotificationPanel from './components/AdminNotificationPanel';
import AdminFloatingNotifications from './AdminFloatingNotifications';
import { useAdminRealtimeNotifications } from '../../hooks/useAdminRealtimeNotifications';
import { AdminDataProvider } from '../../contexts/AdminDataContext';
import '../../styles/admin-design-system-v3.css';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const navigate = useNavigate();

  // Use unified realtime notifications hook - single subscription pattern
  const { unreadCount } = useAdminRealtimeNotifications({ limit: 50 });

  const handleLogout = () => {
    // Clear auth and redirect
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <AdminDataProvider>
      <AdminToastProvider>
        <div className="min-h-screen" style={{ backgroundColor: AdminColors.primary.DEFAULT }}>
          {/* Navigation Sidebar */}
          <AdminNavigation
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

        {/* Main Content Area */}
        <div className="lg:ml-64">
          {/* Top Header Bar */}
          <header
            className="sticky top-0 z-40 border-b"
            style={{
              backgroundColor: AdminColors.primary.light,
              borderColor: AdminColors.border.DEFAULT,
            }}
          >
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} style={{ color: AdminColors.text.primary }} />
            </button>

            {/* Desktop: Empty space for alignment */}
            <div className="hidden lg:block" />

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} style={{ color: AdminColors.text.secondary }} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ 
                        backgroundColor: AdminColors.error.DEFAULT,
                        color: 'white',
                        padding: '0 4px'
                      }}
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

              {/* User Profile */}
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="User profile"
              >
                <User size={20} style={{ color: AdminColors.text.secondary }} />
                <span
                  className="hidden sm:inline text-sm font-medium"
                  style={{ color: AdminColors.text.primary }}
                >
                  Admin
                </span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={20} style={{ color: AdminColors.text.secondary }} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
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
