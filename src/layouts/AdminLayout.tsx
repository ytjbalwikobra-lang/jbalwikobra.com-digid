import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Zap, ListOrdered, Image as ImageIcon, Settings as SettingsIcon, Gamepad2, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/TraditionalAuthContext';
import AdminFloatingNotifications from '../pages/admin/AdminFloatingNotifications';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const isSuper = user?.isAdmin || false;
  const [open, setOpen] = React.useState(false);

  const links = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/products', label: 'Produk', icon: Package },
    { to: '/admin/flash-sales', label: 'Flash Sale', icon: Zap },
    { to: '/admin/posts', label: 'Posts', icon: LayoutDashboard },
    { to: '/admin/game-titles', label: 'Game Titles', icon: Gamepad2 },
    { to: '/admin/orders', label: 'Orders', icon: ListOrdered },
    { to: '/admin/banners', label: 'Banners', icon: ImageIcon },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];
  if (isSuper) links.push({ to: '/admin/users', label: 'Users', icon: Users } as any);

  return (
  <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white">
      {/* Top bar */}
  <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-[var(--cyber-border)] pt-safe-top">
        <div className="h-16 px-4 md:px-6 flex items-center justify-between">
          <button onClick={() => setOpen(!open)} className="md:hidden text-white p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-surface)] transition-colors" aria-label="Menu">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-pink-500 rounded-cyber-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="hidden md:block">
              <div className="font-semibold text-white">Admin Panel</div>
              <div className="text-xs text-[var(--cyber-text-muted)] -mt-1">JB Alwikobra</div>
            </div>
          </div>
          <button
            onClick={async ()=>{ await logout(); window.location.href='/' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-cyber-lg bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] hover:bg-[var(--cyber-bg-elevated)] hover:border-[var(--cyber-border)] text-sm text-white transition-all duration-200"
            title="Keluar"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Shell with sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
  <aside className={`bg-black/60 border-r border-[var(--cyber-border)] md:sticky md:top-16 md:h-[calc(100vh-64px)] overflow-y-auto ${open ? 'block' : 'hidden'} md:block`}>
          <nav className="py-4 px-2">
            {links.map((l) => {
              const Icon = l.icon as any;
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={(l as any).end}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-3 mb-1 text-sm font-medium rounded-cyber-lg transition-all duration-200 ${isActive ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-[var(--cyber-text-muted)] hover:text-white hover:bg-[var(--cyber-bg-surface)]'}`}
                >
                  <Icon size={18} />
                  <span>{l.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
  <main className="p-6 md:p-8 text-white min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
      
      {/* AdminFloatingNotifications - muncul di semua halaman admin */}
      <AdminFloatingNotifications />
    </div>
  );
};

export default AdminLayout;
