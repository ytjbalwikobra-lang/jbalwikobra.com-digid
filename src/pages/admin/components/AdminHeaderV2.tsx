import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  Star, 
  Image as ImageIcon, 
  Zap,
  Menu,
  X,
  ArrowLeft,
  Store,
  Search,
  Bell,
  Settings,
  LogOut,
  Check,
  Clock,
  DollarSign
} from 'lucide-react';
import { AdminStats, AdminNotification, adminService } from '../../../services/adminService';
import { SettingsService } from '../../../services/settingsService';
import { supabase } from '../../../services/supabase';
import { adminNotificationService } from '../../../services/adminNotificationService';
import { WebsiteSettings } from '../../../types';
import { AdminTab } from './structure/adminTypes';

interface NavigationItem {
  id: AdminTab;
  label: string;
  icon: any;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'flash-sales', label: 'Flash Sales', icon: Zap },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AdminHeaderV2Props {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  stats: AdminStats | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onRefreshStats?: () => void;
}

export const AdminHeaderV2: React.FC<AdminHeaderV2Props> = ({
  activeTab,
  setActiveTab,
  stats,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onRefreshStats
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  
  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1 through Alt+9 for quick tab switching
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < navigationItems.length) {
          setActiveTab(navigationItems[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Load website settings for logo
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch (e) {
        console.warn('Failed to load settings for admin header:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load notifications
  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await adminService.getNotifications(1, 5);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load notifications on mount and every 30 seconds
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-button')) {
        setShowNotifications(false);
      }
      if (!target.closest('.settings-dropdown') && !target.closest('.settings-button')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Command palette integration
  const [dispatchOpenEvent] = useState(() => () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  });

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      // Make API call
      await adminNotificationService.markAsRead(notificationId);
      console.log(`✅ AdminHeaderV2: Successfully marked notification ${notificationId} as read`);
      
      // Reload notifications to sync with server state
      loadNotifications();
    } catch (error) {
      console.error('❌ AdminHeaderV2: Failed to mark notification as read:', error);
      // Reload notifications on error to get correct state
      loadNotifications();
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      // Make API call
      await adminNotificationService.markAllAsRead();
      console.log('✅ AdminHeaderV2: Successfully marked all notifications as read');
      
      // Reload notifications to sync with server state
      loadNotifications();
    } catch (error) {
      console.error('❌ AdminHeaderV2: Failed to mark all notifications as read:', error);
      // Reload notifications on error to get correct state
      loadNotifications();
    }
  };

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatchOpenEvent();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [dispatchOpenEvent]);

  return (
    <>
      {/* Modern Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-pink-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {settings?.logoUrl ? (
                  <div className="relative">
                    <img
                      src={settings.logoUrl}
                      alt={settings.siteName || 'Logo'}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20 shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg font-bold">J</span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
                    JB Admin
                  </h1>
                  <p className="text-xs text-gray-400 -mt-1">Management Panel</p>
                </div>
              </div>
            </div>

            {/* Center: Search Bar (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => dispatchOpenEvent()}
                  onFocus={() => dispatchOpenEvent()}
                  placeholder="Search anything... (Ctrl+K)"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-xl bg-gray-900/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                  readOnly
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              {/* Back to Store */}
              <button
                onClick={() => window.open('/', '_blank')}
                className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
              >
                <Store className="w-4 h-4" />
                <span className="text-sm">Store</span>
              </button>

              {/* Notifications */}
              <div className="relative notification-button">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-gray-800/50 hover:bg-pink-500/10 text-gray-300 hover:text-pink-400 transition-all duration-200"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 notification-dropdown">
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Notifications</h3>
                        <span className="text-xs text-gray-400">{unreadCount} unread</span>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-4 text-center text-gray-400">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400">No notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markNotificationAsRead(notification.id)}
                            className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-pink-500/5' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${
                                notification.type === 'new_order' ? 'bg-blue-500/20 text-blue-400' :
                                notification.type === 'paid_order' ? 'bg-green-500/20 text-green-400' :
                                notification.type === 'cancelled_order' ? 'bg-red-500/20 text-red-400' :
                                notification.type === 'new_user' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {notification.type === 'new_order' && <ShoppingCart className="w-4 h-4" />}
                                {notification.type === 'paid_order' && <DollarSign className="w-4 h-4" />}
                                {notification.type === 'cancelled_order' && <X className="w-4 h-4" />}
                                {notification.type === 'new_user' && <Users className="w-4 h-4" />}
                                {notification.type === 'new_review' && <Star className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{notification.title}</p>
                                <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.created_at).toLocaleString('id-ID')}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-700 space-y-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllNotificationsAsRead();
                          }}
                          className="w-full text-center text-xs text-pink-400 hover:text-pink-300 transition-colors py-1 px-2 rounded hover:bg-pink-500/10"
                        >
                          Mark All as Read ({unreadCount})
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setActiveTab('notifications');
                          setShowNotifications(false);
                        }}
                        className="w-full text-center text-xs text-gray-400 hover:text-gray-300 transition-colors py-1"
                      >
                        View All Notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="relative settings-button">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 settings-dropdown">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-white font-semibold">Settings</h3>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setActiveTab('settings');
                          setShowSettings(false);
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Admin Settings</span>
                      </button>
                      <button 
                        onClick={() => {
                          onRefreshStats?.();
                          setShowSettings(false);
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Refresh Data</span>
                      </button>
                      <button 
                        onClick={() => {
                          loadNotifications();
                          setShowSettings(false);
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="text-sm">Refresh Notifications</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout */}
              <button 
                onClick={async () => {
                  try {
                    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                      // Clear any stored admin sessions
                      localStorage.removeItem('adminAuth');
                      localStorage.removeItem('adminSession');
                      localStorage.removeItem('adminCache');
                      
                      // If using Supabase auth
                      if (supabase?.auth) {
                        await supabase.auth.signOut();
                      }
                      
                      // Redirect to login or home page
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Force redirect even if auth cleanup fails
                    window.location.href = '/';
                  }
                }}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:block border-t border-gray-800/50 bg-gray-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 py-3" role="navigation" aria-label="Main navigation">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const shortcut = index < 9 ? `${index + 1}` : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-label={`${item.label}${shortcut ? ` (Alt+${shortcut})` : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      isActive
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveTab(item.id);
                      }
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {shortcut && (
                      <span className="ml-auto text-xs text-gray-500">Alt+{shortcut}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Navigation</h2>
              <nav className="space-y-2" role="navigation" aria-label="Mobile navigation">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        isActive
                          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Search */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={() => dispatchOpenEvent()}
                    onFocus={() => dispatchOpenEvent()}
                    placeholder="Search anything..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                    readOnly
                  />
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
                >
                  <Store className="w-5 h-5" />
                  <span>Back to Store</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={async () => {
                    try {
                      if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                        // Clear any stored admin sessions
                        localStorage.removeItem('adminAuth');
                        localStorage.removeItem('adminSession');
                        localStorage.removeItem('adminCache');
                        
                        // If using Supabase auth
                        if (supabase?.auth) {
                          await supabase.auth.signOut();
                        }
                        
                        // Redirect to login or home page
                        window.location.href = '/';
                      }
                    } catch (error) {
                      console.error('Logout error:', error);
                      // Force redirect even if auth cleanup fails
                      window.location.href = '/';
                    }
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-24" />
    </>
  );
};

export default AdminHeaderV2;
