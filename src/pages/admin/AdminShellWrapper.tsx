/**
 * Admin Shell - Consistent Layout Wrapper
 * Provides navigation and consistent layout for all admin pages
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavigation } from './components/AdminNavigation';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { AdminColors } from './design-tokens';
import { useNavigate } from 'react-router-dom';
import { AdminToastProvider } from './components/ui/AdminToast';
import AdminNotificationPanel from './components/AdminNotificationPanel';
import { adminNotificationService } from '../../services/adminNotificationService';
import { supabase } from '../../services/supabase';
import '../../styles/admin-design-system-v3.css';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Fetch initial unread count on mount
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await adminNotificationService.getAdminNotifications(50);
      if (data) {
        const count = data.filter(n => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Load unread count on mount and set up realtime subscription
  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new notifications for badge update
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('admin-notifications-badge')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications'
          },
          () => {
            // Increment count for new notification
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    // Clear auth and redirect
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
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
                  onNotificationCountChange={setUnreadCount}
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
    </div>
    </AdminToastProvider>
  );
};

export default AdminShell;
