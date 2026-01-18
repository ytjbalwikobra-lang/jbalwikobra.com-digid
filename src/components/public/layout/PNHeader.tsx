import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, Bell, Menu, X, User, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { SettingsService } from '../../../services/settingsService';
import type { WebsiteSettings } from '../../../types';
import { PNContainer } from '../../ui/PinkNeonDesignSystem';
import { notificationService } from '../../../services/notificationService';
import { getAuthUserId } from '../../../services/authService';

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
    }
  };

  const isActive = useMemo(() => (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    // Hidden on mobile, visible from md and up
    <header className="sticky top-0 z-50 hidden md:block">
      <div className="bg-black/60 backdrop-blur-xl border-b border-white/10">
        <PNContainer className="px-4">
          <div className="h-14 md:h-16 flex items-center justify-between">
            {/* Left: burger + logo */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/" className="flex items-center gap-2 group">
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.siteName || 'Logo'}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/15 group-hover:ring-pink-500/40 transition"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">JB</span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-white font-semibold leading-4 group-hover:text-pink-300 transition-colors">
                    {settings?.siteName || 'JBalwikobra'}
                  </div>
                  <div className="text-[11px] text-white/70">Digital Store</div>
                </div>
              </Link>
            </div>

            {/* Center: nav (desktop) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cx(
                    'px-3 py-2 rounded-xl text-sm transition-all',
                    'hover:bg-white/10 text-white/80 hover:text-white',
                    isActive(item.path) && 'text-white bg-gradient-to-r from-pink-500/15 to-fuchsia-500/15 border border-pink-500/20'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: search + actions */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="hidden lg:block">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari akun, game, produk..."
                    className="w-72 h-9 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/50 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  />
                  <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </form>
              <Link to="/wishlist" className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white" aria-label="Wishlist">
                <Heart className="w-5 h-5" />
              </Link>
              <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white" aria-label="Notifikasi">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-[10px] text-white flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              {/* Replace cart with Orders/Transactions */}
              <Link to="/orders" className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white" aria-label="Pesanan">
                <Receipt className="w-5 h-5" />
              </Link>
              <Link
                to={user ? '/profile' : '/auth'}
                className="inline-flex md:inline-flex items-center h-9 px-3 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:from-pink-600 hover:to-fuchsia-700"
              >
                {user ? 'Profil' : 'Masuk'}
              </Link>
            </div>
          </div>
        </PNContainer>
      </div>

      {/* Mobile Drawer */}
      <div className={cx(
        'lg:hidden fixed inset-x-0 top-14 md:top-16 z-40 origin-top',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none',
        'transition-all duration-200'
      )}>
        <div className="mx-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-lg">
          <div className="p-3 border-b border-white/10">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari akun, game, produk..."
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/50 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
                <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </form>
          </div>
          <nav className="p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cx(
                  'block px-3 py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10',
                  isActive(item.path) && 'bg-gradient-to-r from-pink-500/15 to-fuchsia-500/15 border border-pink-500/20'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 flex items-center gap-2">
            <Link to={user ? '/profile' : '/auth'} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-center flex items-center justify-center font-medium">
              {user ? 'Buka Profil' : 'Masuk / Daftar'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PNHeader;
