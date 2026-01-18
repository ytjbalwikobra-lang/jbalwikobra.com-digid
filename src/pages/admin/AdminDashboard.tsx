import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, DollarSign, Package, ShoppingCart, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import '../../styles/admin-design-system-v3.css';
import { AdminColors } from './design-tokens';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  completedOrders: number;
  pendingOrders: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  colorClass: string;
  ariaLabel: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, colorClass, ariaLabel }) => (
  <div className="admin-stat-card" role="article" aria-label={ariaLabel}>
    <div className="admin-stat-icon" style={{ backgroundColor: colorClass }}>
      {icon}
    </div>
    <p className="admin-stat-label">{title}</p>
    <h3 className="admin-stat-value">{value}</h3>
    {trend && (
      <div className="admin-stat-change positive">
        <TrendingUp size={14} aria-hidden="true" />
        <span>{trend}</span>
      </div>
    )}
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    completedOrders: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await adminService.getDashboardStats();
      
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        totalUsers: data.totalUsers || 0,
        totalProducts: data.totalProducts || 0,
        completedOrders: data.completedOrders || 0,
        pendingOrders: data.pendingOrders || 0,
      });
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError(err.message || 'Gagal memuat statistik dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center" role="status" aria-live="polite">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: AdminColors.accent.DEFAULT }}
              aria-hidden="true"
            ></div>
            <p style={{ color: AdminColors.text.secondary }}>Memuat data dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
          <div 
            className="admin-section" 
            style={{ 
              backgroundColor: AdminColors.error.bg,
              borderColor: AdminColors.error.border 
            }}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: AdminColors.error.light }}>
              <Activity size={20} aria-hidden="true" />
              <h3 className="font-semibold">Gagal Memuat Dashboard</h3>
            </div>
            <p className="text-sm mb-3" style={{ color: AdminColors.error.light }}>{error}</p>
            <button
              onClick={loadDashboardStats}
              className="admin-btn admin-btn-danger"
              aria-label="Coba muat ulang dashboard"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Coba Lagi
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="admin-page space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-gray-400 mt-1">
            Ringkasan statistik dan aktivitas terkini
          </p>
        </div>
      </div>

        {/* Stats Grid */}
        <section aria-label="Statistik Dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Pesanan"
              value={stats.totalOrders}
              icon={<ShoppingCart size={24} />}
              colorClass={AdminColors.info.bg}
              ariaLabel={`Total Pesanan: ${stats.totalOrders}`}
            />
            
            <StatCard
              title="Total Pendapatan"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign size={24} />}
              colorClass={AdminColors.success.bg}
              ariaLabel={`Total Pendapatan: ${formatCurrency(stats.totalRevenue)}`}
            />
            
            <StatCard
              title="Total Pengguna"
              value={stats.totalUsers}
              icon={<Users size={24} />}
              colorClass="rgba(236, 72, 153, 0.2)"
              ariaLabel={`Total Pengguna: ${stats.totalUsers}`}
            />
            
            <StatCard
              title="Total Produk"
              value={stats.totalProducts}
              icon={<Package size={24} />}
              colorClass={AdminColors.warning.bg}
              ariaLabel={`Total Produk: ${stats.totalProducts}`}
            />
            
            <StatCard
              title="Pesanan Selesai"
              value={stats.completedOrders}
              icon={<Activity size={24} />}
              colorClass={AdminColors.success.bg}
              ariaLabel={`Pesanan Selesai: ${stats.completedOrders}`}
            />
            
            <StatCard
              title="Pesanan Pending"
              value={stats.pendingOrders}
              icon={<Activity size={24} />}
              colorClass={AdminColors.warning.bg}
              ariaLabel={`Pesanan Pending: ${stats.pendingOrders}`}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="admin-section" aria-label="Aksi Cepat">
          <h2 className="text-xl font-semibold mb-6" style={{ color: AdminColors.text.primary }}>
            Aksi Cepat
          </h2>
          <nav aria-label="Navigasi Aksi Cepat">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/admin/orders"
                className="admin-card text-center group"
                style={{ padding: '1.5rem' }}
                aria-label="Kelola Pesanan"
              >
                <ShoppingCart 
                  className="mx-auto mb-3 transition-transform group-hover:scale-110" 
                  size={32} 
                  style={{ color: AdminColors.info.DEFAULT }}
                  aria-hidden="true"
                />
                <p className="font-medium" style={{ color: AdminColors.text.primary }}>
                  Kelola Pesanan
                </p>
              </Link>
              
              <Link
                to="/admin/products"
                className="admin-card text-center group"
                style={{ padding: '1.5rem' }}
                aria-label="Kelola Produk"
              >
                <Package 
                  className="mx-auto mb-3 transition-transform group-hover:scale-110" 
                  size={32} 
                  style={{ color: AdminColors.warning.DEFAULT }}
                  aria-hidden="true"
                />
                <p className="font-medium" style={{ color: AdminColors.text.primary }}>
                  Kelola Produk
                </p>
              </Link>
              
              <Link
                to="/admin/users"
                className="admin-card text-center group"
                style={{ padding: '1.5rem' }}
                aria-label="Kelola Pengguna"
              >
                <Users 
                  className="mx-auto mb-3 transition-transform group-hover:scale-110" 
                  size={32} 
                  style={{ color: AdminColors.accent.DEFAULT }}
                  aria-hidden="true"
                />
                <p className="font-medium" style={{ color: AdminColors.text.primary }}>
                  Kelola Pengguna
                </p>
              </Link>
              
              <Link
                to="/admin/settings"
                className="admin-card text-center group"
                style={{ padding: '1.5rem' }}
                aria-label="Pengaturan"
              >
                <Activity 
                  className="mx-auto mb-3 transition-transform group-hover:scale-110" 
                  size={32} 
                  style={{ color: AdminColors.gray[400] }}
                  aria-hidden="true"
                />
                <p className="font-medium" style={{ color: AdminColors.text.primary }}>
                  Pengaturan
                </p>
              </Link>
            </div>
          </nav>
        </section>
    </div>
  );
};

export default AdminDashboard;
