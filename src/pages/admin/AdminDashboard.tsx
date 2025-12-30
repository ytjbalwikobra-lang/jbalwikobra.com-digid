import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { adminService } from '../../services/adminService';

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
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, colorClass }) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp size={14} />
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full ${colorClass}`}>
        {icon}
      </div>
    </div>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <Activity size={20} />
            <h3 className="font-semibold">Gagal Memuat Dashboard</h3>
          </div>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <button
            onClick={loadDashboardStats}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h1>
        <p className="text-gray-600">Ringkasan statistik dan aktivitas terkini</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={<ShoppingCart size={24} className="text-blue-600" />}
          colorClass="bg-blue-100"
        />
        
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign size={24} className="text-green-600" />}
          colorClass="bg-green-100"
        />
        
        <StatCard
          title="Total Pengguna"
          value={stats.totalUsers}
          icon={<Users size={24} className="text-purple-600" />}
          colorClass="bg-purple-100"
        />
        
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          icon={<Package size={24} className="text-orange-600" />}
          colorClass="bg-orange-100"
        />
        
        <StatCard
          title="Pesanan Selesai"
          value={stats.completedOrders}
          icon={<Activity size={24} className="text-teal-600" />}
          colorClass="bg-teal-100"
        />
        
        <StatCard
          title="Pesanan Pending"
          value={stats.pendingOrders}
          icon={<Activity size={24} className="text-yellow-600" />}
          colorClass="bg-yellow-100"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/admin/orders"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <ShoppingCart className="mx-auto mb-2 text-blue-600" size={24} />
            <p className="font-medium text-gray-900">Kelola Pesanan</p>
          </a>
          
          <a
            href="/admin/products"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-center"
          >
            <Package className="mx-auto mb-2 text-orange-600" size={24} />
            <p className="font-medium text-gray-900">Kelola Produk</p>
          </a>
          
          <a
            href="/admin/users"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-center"
          >
            <Users className="mx-auto mb-2 text-purple-600" size={24} />
            <p className="font-medium text-gray-900">Kelola Pengguna</p>
          </a>
          
          <a
            href="/admin/settings"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all text-center"
          >
            <Activity className="mx-auto mb-2 text-gray-600" size={24} />
            <p className="font-medium text-gray-900">Pengaturan</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
