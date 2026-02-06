/**
 * Admin Dashboard - Cyberpunk Compact Design
 * Redesigned to match public pages DNA:
 * - Ultra-compact spacing (gap-3, p-2)
 * - Bento grid layout (4 columns)
 * - Cyberpunk hero section with glow
 * - Pink accent interactions
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
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminBentoCard } from './components/ui/AdminBentoCard';
// Design system: cyber-compact.css (loaded via index.css)

interface QuickActionProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ to, icon, label }) => (
  <Link to={to}>
    <AdminBentoCard glowOnHover>
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--cyber-pink-subtle)] flex items-center justify-center">
          {icon}
        </div>
        <p className="text-[10px] font-medium text-white leading-tight">{label}</p>
      </div>
    </AdminBentoCard>
  </Link>
);

const AdminDashboard: React.FC = () => {
  const quickActions = [
    {
      to: '/admin/orders',
      icon: <ShoppingCart size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Pesanan'
    },
    {
      to: '/admin/products',
      icon: <Package size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Produk'
    },
    {
      to: '/admin/users',
      icon: <Users size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Pengguna'
    },
    {
      to: '/admin/flash-sales',
      icon: <Zap size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Flash Sales'
    },
    {
      to: '/admin/banners',
      icon: <Image size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Banner'
    },
    {
      to: '/admin/settings',
      icon: <Settings size={16} className="text-[var(--cyber-pink-primary)]" />,
      label: 'Settings'
    }
  ];

  return (
    <div className="admin-page space-y-4">
      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="Dashboard Admin"
        subtitle="Ringkasan statistik dan aktivitas terkini"
        badge="Live Updates"
        badgeColor="pink"
      />

      {/* Metrics Overview - Compact spacing */}
      <DashboardMetricsOverview />

      {/* Main Content - Compact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Quick Actions - Now takes 1 column, 4-col grid inside */}
        <section 
          className="lg:col-span-1 bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-border)] p-3"
          aria-label="Aksi Cepat"
        >
          <h2 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />
            Aksi Cepat
          </h2>
          <nav aria-label="Navigasi Aksi Cepat">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </div>
          </nav>
        </section>

        {/* Order Analytics Chart - Takes 3 columns */}
        <div className="lg:col-span-3">
          <OrderAnalyticsChart />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
