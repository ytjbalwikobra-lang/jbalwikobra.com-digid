import React, { memo, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/TraditionalAuthContext';

/**
 * Cyber-Compact Bottom Navigation
 * 
 * Native-App First navigation with:
 * - 5 primary actions: Home, Catalog, Search, Cart, Profile
 * - Cart badge with item count
 * - Active state with neon glow indicator
 * - 56px min height for touch accessibility
 * - Haptic-feel tap animations
 * - Hidden on admin pages
 * - Auth-aware profile/login link
 */

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  showBadge?: boolean;
}

const CyberBottomNav: React.FC = memo(() => {
  const location = useLocation();
  const { totalItems, toggleCart } = useCart();
  const { user } = useAuth();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS

  // Dynamic nav items based on auth state
  const navItems: NavItem[] = useMemo(() => [
    { id: 'home', label: 'Beranda', path: '/', icon: Home },
    { id: 'catalog', label: 'Produk', path: '/products', icon: Grid3X3 },
    { id: 'search', label: 'Cari', path: '/products', icon: Search }, // Search goes to products with search UI
    { id: 'cart', label: 'Keranjang', path: '#cart', icon: ShoppingCart, showBadge: true },
    { id: 'profile', label: user ? 'Profil' : 'Masuk', path: user ? '/profile' : '/auth', icon: User },
  ], [user]);

  const isActive = useCallback((path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    if (path === '#cart') return false; // Cart is never "active" as a page
    if (path === '/auth' && !user) {
      return location.pathname.includes('/auth') || location.pathname.includes('/login');
    }
    return location.pathname.startsWith(path);
  }, [location.pathname, user]);

  const handleNavClick = useCallback((e: React.MouseEvent, item: NavItem) => {
    // Special handling for cart - open bottom sheet instead of navigating
    if (item.id === 'cart') {
      e.preventDefault();
      toggleCart();
    }
  }, [toggleCart]);

  // Hide on admin pages (AFTER all hooks)
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <nav 
        className="cyber-bottom-nav lg:hidden"
        role="navigation"
        aria-label="Navigasi utama"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={cn(
                  'cyber-nav-item',
                  active && 'active'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon 
                    size={22} 
                    strokeWidth={active ? 2.5 : 2}
                    className="transition-all duration-100"
                  />
                  {/* Cart Badge */}
                  {item.showBadge && totalItems > 0 && (
                    <span 
                      className="cyber-cart-badge"
                      aria-label={`${totalItems} item di keranjang`}
                    >
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </div>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
});

CyberBottomNav.displayName = 'CyberBottomNav';

export default CyberBottomNav;
