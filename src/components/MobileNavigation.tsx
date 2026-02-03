/**
 * MobileNavigation - Unified bottom navigation using PinkNeon design system
 * Features: Clean design, WCAG 2.1 AA compliant, 44px touch targets, consistent with homepage
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, User } from 'lucide-react';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { prefetchRoute } from '../utils/linkPrefetch';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigationItems: NavigationItem[] = [
    { path: '/', label: 'Beranda', icon: Home },
    { path: '/products', label: 'Produk', icon: Package },
    { path: user ? '/profile' : '/auth', label: user ? 'Profil' : 'Masuk', icon: User },
  ];

  // Hide on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    if (path === '/auth' && !user) {
      return location.pathname.includes('/auth') || location.pathname.includes('/login') || location.pathname.includes('/register');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        role="navigation"
        aria-label="Navigasi utama"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      >
        <div className="mx-3 mb-2 rounded-3xl border border-white/10 bg-gray-950/90 backdrop-blur-xl px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)] shadow-lg shadow-pink-500/10">
          <ul className="flex items-center justify-around" role="list">
            {navigationItems.map(item => {
              const active = isActive(item.path);
              const Icon = item.icon;
              
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    to={item.path}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    onTouchStart={() => prefetchRoute(item.path)}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                      active 
                        ? 'text-white bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 border border-pink-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon 
                      size={20} 
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-medium">
                      {item.label}
                    </span>
                    {active && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-400" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      {/* Spacer */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
};

export default React.memo(MobileNavigation);
