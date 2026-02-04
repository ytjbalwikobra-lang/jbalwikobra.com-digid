/**
 * Admin Dashboard - V3 Design System
 * WCAG 2.1 AA Compliant | ISO Standard UI/UX
 * 
 * Uses shared components: DashboardMetricsOverview, OrderAnalyticsChart
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  Zap,
  Image
} from 'lucide-react';
import { DashboardMetricsOverview } from './components/DashboardMetricsOverview';
import { OrderAnalyticsChart } from './components/OrderAnalyticsChart';
// Design system: cyber-compact.css (loaded via index.css)

interface QuickActionProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ to, icon, label, color }) => (
  <Link
    to={to}
    className="group relative overflow-hidden bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg p-4 text-center hover:border-[var(--cyber-pink-primary)]/30 transition-all duration-300 hover:transform hover:scale-[1.02]"
    aria-label={label}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
    <div className="relative z-10">
      <div className="mx-auto mb-3 w-12 h-12 rounded-cyber-lg bg-[var(--cyber-bg-surface)] flex items-center justify-center group-hover:bg-[var(--cyber-bg-elevated)] transition-colors">
        {icon}
      </div>
      <p className="font-medium text-white text-sm">{label}</p>
    </div>
  </Link>
);

const AdminDashboard: React.FC = () => {
  const quickActions = [
    {
      to: '/admin/orders',
      icon: <ShoppingCart className="w-6 h-6 text-blue-400" />,
      label: 'Kelola Pesanan',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      to: '/admin/products',
      icon: <Package className="w-6 h-6 text-purple-400" />,
      label: 'Kelola Produk',
      color: 'from-purple-500 to-violet-500'
    },
    {
      to: '/admin/users',
      icon: <Users className="w-6 h-6 text-[var(--cyber-pink-primary)]" />,
      label: 'Kelola Pengguna',
      color: 'from-[var(--cyber-pink-primary)] to-rose-500'
    },
    {
      to: '/admin/flash-sales',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      label: 'Flash Sales',
      color: 'from-amber-500 to-orange-500'
    },
    {
      to: '/admin/banners',
      icon: <Image className="w-6 h-6 text-emerald-400" />,
      label: 'Kelola Banner',
      color: 'from-emerald-500 to-green-500'
    },
    {
      to: '/admin/settings',
      icon: <Settings className="w-6 h-6 text-[var(--cyber-text-muted)]" />,
      label: 'Pengaturan',
      color: 'from-gray-500 to-slate-500'
    }
  ];

  return (
    <div className="admin-page space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-[var(--cyber-text-muted)] mt-1">
            Ringkasan statistik dan aktivitas terkini
          </p>
        </div>
      </header>

      {/* Metrics Overview - Uses MetricsGrid with data loading */}
      <DashboardMetricsOverview />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <section 
          className="lg:col-span-1 bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)] p-6"
          aria-label="Aksi Cepat"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--cyber-pink-primary)]" />
            Aksi Cepat
          </h2>
          <nav aria-label="Navigasi Aksi Cepat">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </div>
          </nav>
        </section>

        {/* Order Analytics Chart */}
        <div className="lg:col-span-2">
          <OrderAnalyticsChart />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
