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
  Store
} from 'lucide-react';
import { IOSButton } from '../../../components/ios/IOSDesignSystemV2';
import ThemeToggle from '../../../components/ui/ThemeToggle';
import { AdminStats } from '../../../services/adminService';
const cn = (...c: any[]) => c.filter(Boolean).join(' ');
import { AdminTab } from './structure/adminTypes';

interface NavigationItem {
  id: AdminTab;
  label: string;
  icon: any; // Simplified for now
  badge: keyof AdminStats | null;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: null },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: 'totalOrders' },
  { id: 'users', label: 'Users', icon: Users, badge: 'totalUsers' },
  { id: 'products', label: 'Products', icon: Package, badge: 'totalProducts' },
  { id: 'banners', label: 'Banners', icon: ImageIcon, badge: null },
  { id: 'flash-sales', label: 'Flash Sales', icon: Zap, badge: null },
  { id: 'reviews', label: 'Reviews', icon: Star, badge: 'totalReviews' },
];

interface AdminHeaderProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  stats: AdminStats | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onRefreshStats?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval as NodeJS.Timeout);
  }, []);

  const [dispatchOpenEvent] = useState(() => () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  });

  useEffect(() => {
    const handler = () => dispatchOpenEvent();
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatchOpenEvent();
      }
    };
    window.addEventListener('open-command-palette', handler as EventListener);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('open-command-palette', handler as EventListener);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [dispatchOpenEvent]);
  
  const getBadgeValue = (badge: keyof AdminStats | null) => {
    if (!badge || !stats) return null;
    const value = stats[badge];
    return typeof value === 'number' && value > 0 ? value : null;
  };

  return (
    <>
      {/* Header - Fixed positioning */}
  <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-700/50 surface-glass-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo & Back to Store */}
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold tracking-tight heading-brand">
                JB Admin
              </div>
              <IOSButton
                variant="ghost"
                size="sm"
                onClick={() => window.open('/', '_blank')}
                className="hidden md:inline-flex items-center space-x-2 text-gray-300 hover:text-white"
              >
                <Store size={16} />
                <span className="text-sm">Back to Store</span>
              </IOSButton>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 cluster-sm">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeValue = getBadgeValue(item.badge);

                return (
                  <IOSButton
                    key={item.id}
                    variant={isActive ? "primary" : "ghost"}
                    size="md"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-pink-600 text-white shadow-lg"
                        : "text-gray-100 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-gray-900 dark:hover:bg-gray-900"
                    )}
                  >
                    <Icon size={18} className="mr-2" />
                    {item.label}
                    {/* Notification badge removed per request */}
                  </IOSButton>
                );
              })}
            </nav>

            {/* Right: Current Time & Mobile Menu */}
            <div className="flex items-center gap-3">
              {/* Current Date & Time */}
              <div className="hidden md:flex flex-col items-end text-right">
                <div className="text-sm text-white font-medium">
                  {currentTime.toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-gray-400">
                  {currentTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} WIB
                </div>
              </div>

              {/* Theme Toggle - ensure consistent alignment/size */}
              <div className="flex items-center justify-center w-12 h-8">
                <ThemeToggle />
              </div>
              
              {/* Mobile menu button */}
              <IOSButton
                variant="ghost"
                size="md"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X size={20} />
                ) : (
                  <Menu size={20} />
                )}
              </IOSButton>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700 bg-black/95 backdrop-blur-md">
            <div className="px-4 py-2 space-y-1">
              {/* Mobile Back to Store Button */}
              <IOSButton
                variant="ghost"
                size="md"
                onClick={() => window.open('/', '_blank')}
                className="w-full justify-start text-sm font-medium text-gray-300 hover:text-white mb-2"
              >
                <Store size={18} className="mr-3" />
                Back to Store
              </IOSButton>
              
              {/* Mobile Date & Time */}
              <div className="py-2 px-3 mb-2 text-center border border-gray-700 rounded-lg">
                <div className="text-sm text-white font-medium">
                  {currentTime.toLocaleDateString('id-ID', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-gray-400">
                  {currentTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} WIB
                </div>
              </div>
              
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeValue = getBadgeValue(item.badge);

                return (
                  <IOSButton
                    key={item.id}
                    variant={isActive ? "primary" : "ghost"}
                    size="md"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full justify-start relative px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-pink-600 text-white"
                        : "text-gray-100 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-gray-900 dark:hover:bg-gray-900"
                    )}
                  >
                    <Icon size={18} className="mr-3" />
                    {item.label}
                    {/* Notification badge removed per request */}
                  </IOSButton>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default AdminHeader;
