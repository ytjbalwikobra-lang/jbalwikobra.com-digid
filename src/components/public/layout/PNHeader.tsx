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
      <div className="bg-black/80 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/20">
        <PNContainer className="px-6">
          <div className="h-16 lg:h-[72px] flex items-center justify-between gap-6">
            {/* Left: burger + logo */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-pink-500/40 transition-all duration-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <span className="text-white text-sm font-bold">JB</span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-white font-semibold text-[15px] leading-tight group-hover:text-pink-300 transition-colors">
                    {settings?.siteName || 'JBalwikobra'}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">Digital Store</div>
                </div>
              </Link>
            </div>

            {/* Center: nav (desktop) */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cx(
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    'hover:bg-white/10 text-white/80 hover:text-white',
                    isActive(item.path) && 'text-white bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 border border-pink-500/25 shadow-sm'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: search + actions */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="hidden lg:block">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari akun, game, produk..."
                    className="w-80 h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/30 transition-all duration-200"
                  />
                  <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </form>
              
              {/* Action icons with consistent sizing */}
              <div className="flex items-center gap-1">
                <Link to="/wishlist" className="p-2.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" aria-label="Wishlist">
                  <Heart className="w-5 h-5" />
                </Link>
                <Link to="/notifications" className="relative p-2.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" aria-label="Notifikasi">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-[10px] font-medium text-white flex items-center justify-center shadow-lg">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="p-2.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" aria-label="Pesanan">
                  <Receipt className="w-5 h-5" />
                </Link>
              </div>
              
              <Link
                to={user ? '/profile' : '/auth'}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:from-pink-600 hover:to-fuchsia-700 transition-all duration-200 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
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
        <div className="mx-4 mt-2 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40">
          <div className="p-4 border-b border-white/10">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari akun, game, produk..."
                  className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
                <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </form>
          </div>
          <nav className="p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cx(
                  'flex items-center px-4 py-3.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors',
                  isActive(item.path) && 'bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 border border-pink-500/25'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 pt-2">
            <Link to={user ? '/profile' : '/auth'} className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold shadow-lg shadow-pink-500/20 transition-all duration-200 hover:from-pink-600 hover:to-fuchsia-700">
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
