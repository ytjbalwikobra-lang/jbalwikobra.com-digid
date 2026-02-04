import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, Bell, Menu, X, User, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { SettingsService } from '../../../services/settingsService';
import type { WebsiteSettings } from '../../../types';
import type { Product } from '../../../types';
import { PNContainer } from '../../ui/CyberDesignSystem';
import { notificationService } from '../../../services/notificationService';
import { getAuthUserId } from '../../../services/authService';
import { prefetchRoute } from '../../../utils/linkPrefetch';
import { SearchDropdown } from '../../search';
import { ProductService } from '../../../services/productService';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

interface NavItem { path: string; label: string; }

const navItems: NavItem[] = [
  { path: '/', label: 'Beranda' },
  { path: '/products', label: 'Produk' },
  { path: '/flash-sales', label: 'Flash Sale' },
  { path: '/help', label: 'Bantuan' },
];

const PNHeader: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<number>(0);
  
  // Search dropdown state
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load products for instant search
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const products = await ProductService.getAllProducts();
        if (mounted) {
          setAllProducts(products.filter(p => 
            p.stock > 0 && 
            (p.isActive !== false) && 
            !p.soldChannel
          ));
        }
      } catch (err) {
        console.error('Failed to load products for search:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // close drawer on route change
    setOpen(false);
  }, [location.pathname]);

  // Load unread notifications count and poll lightly
  useEffect(() => {
    let active = true;
    let timer: any;
    const load = async () => {
      try {
        const uid = await getAuthUserId();
        const count = await notificationService.getUnreadCount(uid);
        if (active) setUnread(count);
      } catch {}
      timer = setTimeout(load, 20000); // 20s
    };
    load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setQuery('');
      setShowDropdown(false);
    }
  };

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setShowDropdown(true);

    searchTimeoutRef.current = setTimeout(() => {
      const q = value.toLowerCase().trim();
      const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.gameTitleData?.name.toLowerCase().includes(q)
      ).slice(0, 10); // Get top 10 matches
      
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 300);
  }, [allProducts]);

  const handleSelectProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
    setQuery('');
    setShowDropdown(false);
  };

  const handleViewAllResults = () => {
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setQuery('');
      setShowDropdown(false);
    }
  };

  const isActive = useMemo(() => (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    // Hidden on mobile, visible from md and up
    <header className="sticky top-0 z-50 hidden md:block">
      <div className="bg-black/80 backdrop-blur-2xl border-b border-[var(--cyber-border)] shadow-lg shadow-black/20">
        <PNContainer className="px-6">
          <div className="h-16 lg:h-[72px] flex items-center justify-between gap-6">
            {/* Left: burger + logo */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2.5 rounded-cyber-lg text-[var(--cyber-text-secondary)] hover:text-white hover:bg-[var(--cyber-bg-elevated)] transition-colors"
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/" className="flex items-center gap-3 group">
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.siteName || 'Logo'}
                    className="w-10 h-10 rounded-cyber-lg object-cover ring-2 ring-[var(--cyber-border)] group-hover:ring-[var(--cyber-pink-muted)] transition-all duration-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-cyber-lg bg-gradient-to-br from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] flex items-center justify-center shadow-lg shadow-[var(--cyber-pink-muted)]">
                    <span className="text-white text-sm font-bold">JB</span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-white font-semibold text-[15px] leading-tight group-hover:text-[var(--cyber-pink-secondary)] transition-colors">
                    {settings?.siteName || 'JBalwikobra'}
                  </div>
                  <div className="text-xs text-[var(--cyber-text-muted)] mt-0.5">Digital Store</div>
                </div>
              </Link>
            </div>

            {/* Center: nav (desktop) */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => prefetchRoute(item.path)}
                  onFocus={() => prefetchRoute(item.path)}
                  className={cx(
                    'px-4 py-2.5 rounded-cyber-lg text-sm font-medium transition-all duration-200',
                    'hover:bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:text-white',
                    isActive(item.path) && 'text-white bg-gradient-to-r from-[var(--cyber-pink-muted)] to-[var(--cyber-pink-subtle)] border border-[var(--cyber-pink-subtle)] shadow-sm'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: search + actions */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="hidden lg:block relative">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
                    placeholder="Cari akun, game, produk..."
                    className="w-80 h-10 rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-sm text-white placeholder:text-[var(--cyber-text-muted)] pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-muted)] focus:border-[var(--cyber-pink-muted)] transition-all duration-200"
                    autoComplete="off"
                  />
                  <Search className="w-4 h-4 text-[var(--cyber-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                
                {/* Search Dropdown */}
                <SearchDropdown
                  isOpen={showDropdown}
                  results={searchResults}
                  totalResults={searchResults.length}
                  query={query}
                  loading={searchLoading}
                  onSelect={handleSelectProduct}
                  onViewAll={handleViewAllResults}
                  onClose={() => setShowDropdown(false)}
                />
              </form>
              
              {/* Action icons with consistent sizing */}
              <div className="flex items-center gap-1">
                <Link to="/wishlist" className="p-2.5 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:text-white transition-colors" aria-label="Wishlist">
                  <Heart className="w-5 h-5" />
                </Link>
                <Link to="/notifications" className="relative p-2.5 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:text-white transition-colors" aria-label="Notifikasi">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--cyber-pink-primary)] text-[10px] font-medium text-white flex items-center justify-center shadow-lg">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="p-2.5 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:text-white transition-colors" aria-label="Pesanan">
                  <Receipt className="w-5 h-5" />
                </Link>
              </div>
              
              <Link
                to={user ? '/profile' : '/auth'}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-cyber-lg text-sm font-semibold bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white hover:opacity-90 transition-all duration-200 shadow-lg shadow-[var(--cyber-pink-muted)] hover:shadow-[var(--cyber-pink-muted)]"
              >
                <User className="w-4 h-4" />
                {user ? 'Profil' : 'Masuk'}
              </Link>
            </div>
          </div>
        </PNContainer>
      </div>

      {/* Tablet Drawer (md-lg breakpoint) */}
      <div className={cx(
        'lg:hidden fixed inset-x-0 top-16 z-40 origin-top',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none',
        'transition-all duration-200 ease-out'
      )}>
        <div className="mx-4 mt-2 rounded-cyber-2xl bg-black/90 backdrop-blur-2xl border border-[var(--cyber-border)] shadow-2xl shadow-black/40">
          <div className="p-4 border-b border-[var(--cyber-border)]">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
                  placeholder="Cari akun, game, produk..."
                  className="w-full h-11 rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] text-sm text-white placeholder:text-[var(--cyber-text-muted)] pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-muted)]"
                  autoComplete="off"
                />
                <Search className="w-4 h-4 text-[var(--cyber-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              
              {/* Search Dropdown for mobile */}
              <SearchDropdown
                isOpen={showDropdown}
                results={searchResults}
                totalResults={searchResults.length}
                query={query}
                loading={searchLoading}
                onSelect={handleSelectProduct}
                onViewAll={handleViewAllResults}
                onClose={() => setShowDropdown(false)}
              />
            </form>
          </div>
          <nav className="p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cx(
                  'flex items-center px-4 py-3.5 rounded-cyber-lg text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-elevated)] transition-colors',
                  isActive(item.path) && 'bg-gradient-to-r from-[var(--cyber-pink-muted)] to-[var(--cyber-pink-subtle)] border border-[var(--cyber-pink-subtle)]'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 pt-2">
            <Link to={user ? '/profile' : '/auth'} className="flex items-center justify-center gap-2 w-full h-12 rounded-cyber-lg bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white font-semibold shadow-lg shadow-[var(--cyber-pink-muted)] transition-all duration-200 hover:opacity-90">
              <User className="w-4 h-4" />
              {user ? 'Buka Profil' : 'Masuk / Daftar'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PNHeader;
