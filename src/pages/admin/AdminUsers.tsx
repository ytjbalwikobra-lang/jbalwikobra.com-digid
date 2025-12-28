import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { RefreshCw, Plus, Users, Shield, UserCheck, Clock, Edit, Trash2, Eye } from 'lucide-react';
// Removed AdminLayout import as we now use reusable components directly
import { 
  AdminPageHeaderV2, 
  AdminStatCard, 
  AdminFilters, 
  StatusBadge 
} from './components/ui';
import type { AdminFiltersConfig } from './components/ui';
import { AdminDSTable, type DSTableColumn, type DSTableAction } from './components/ui/AdminDSTable';

type UserRow = {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { push } = useToast();

  // Filter state for our AdminFilters component
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Filter configuration for our AdminFilters component
  const filtersConfig: AdminFiltersConfig = {
    searchPlaceholder: 'Cari pengguna berdasarkan nama, email, atau telepon...',
    filters: [
      {
        key: 'role',
        label: 'Peran',
        options: [
          { value: 'all', label: 'Semua Peran' },
          { value: 'user', label: 'User' },
          { value: 'admin', label: 'Admin' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'Semua Status' },
          { value: 'active', label: 'Aktif' },
          { value: 'inactive', label: 'Tidak Aktif' }
        ]
      }
    ],
    sortOptions: [
      { value: 'created_at', label: 'Tanggal Dibuat' },
      { value: 'full_name', label: 'Nama' },
      { value: 'email', label: 'Email' },
      { value: 'last_sign_in_at', label: 'Terakhir Masuk' }
    ]
  };

  // Filter handling
  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
  };

  // Apply filters to users
  const filteredUsers = users.filter(user => {
    // Search filter
    if (filterValues.search) {
      const searchTerm = filterValues.search.toLowerCase();
      if (
        !user.full_name?.toLowerCase().includes(searchTerm) &&
        !user.email?.toLowerCase().includes(searchTerm) &&
        !user.phone?.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }
    }

    // Role filter
    if (filterValues.role !== 'all') {
      if (filterValues.role === 'admin' && user.role !== 'admin') return false;
      if (filterValues.role === 'user' && user.role !== 'user') return false;
    }

    // Status filter
    if (filterValues.status !== 'all') {
      if (filterValues.status === 'active' && !user.is_active) return false;
      if (filterValues.status === 'inactive' && user.is_active) return false;
    }

    return true;
  }).sort((a, b) => {
    const sortBy = filterValues.sortBy;
    const order = filterValues.sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy === 'created_at' || sortBy === 'last_sign_in_at') {
      const aDate = new Date(a[sortBy] || 0).getTime();
      const bDate = new Date(b[sortBy] || 0).getTime();
      return (aDate - bDate) * order;
    }
    
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    return aValue.localeCompare(bValue) * order;
  });

  // Statistics calculation
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admin: users.filter(u => u.role === 'admin').length,
    recent: users.filter(u => {
      if (!u.created_at) return false;
      const createdDate = new Date(u.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length
  };

  // Table columns configuration
  const columns: DSTableColumn<UserRow>[] = [
    {
      key: 'avatar',
      header: 'Avatar',
      render: (_value, user) => (
        <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full">
          <Users size={16} className="text-blue-400" />
        </div>
      )
    },
    {
      key: 'full_name',
      header: 'Nama',
      render: (_value, user) => (
        <div>
          <div className="font-medium text-ds-text">{user.full_name || 'N/A'}</div>
          <div className="text-sm text-ds-text-secondary">{user.email}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Telepon',
      render: (_value, user) => user.phone || 'N/A'
    },
    {
      key: 'role',
      header: 'Peran',
      render: (_value, user) => (
        <StatusBadge
          status={user.role === 'admin' ? 'active' : 'pending'}
          customLabel={user.role === 'admin' ? 'Admin' : 'User'}
        />
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (_value, user) => (
        <StatusBadge
          status={user.is_active ? 'active' : 'inactive'}
        />
      )
    },
    {
      key: 'created_at',
      header: 'Dibuat',
      render: (_value, user) => user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : 'N/A'
    },
    {
      key: 'last_sign_in_at',
      header: 'Terakhir Masuk',
      render: (_value, user) => user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') : 'Tidak Pernah'
    }
  ];

  // Table actions configuration
  const actions: DSTableAction<UserRow>[] = [
    {
      key: 'view',
      label: 'Lihat',
      icon: Eye,
      onClick: (user) => {
        push(`Viewing user: ${user.full_name}`, 'info');
      },
      variant: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (user) => {
        push(`Edit user functionality coming soon for: ${user.full_name}`, 'info');
      },
      variant: 'primary'
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: Trash2,
      onClick: (user) => {
        if (confirm(`Yakin ingin menghapus pengguna: ${user.full_name}?`)) {
          push(`Delete user functionality coming soon for: ${user.full_name}`, 'error');
        }
      },
      variant: 'danger'
    }
  ];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin?action=users');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      // Map API response to UserRow format
      const mappedUsers = (result.data || []).map((user: any) => ({
        ...user,
        full_name: user.name || user.full_name || 'Unknown',
        role: user.is_admin ? 'admin' : 'user',
        last_sign_in_at: user.last_login || null
      }));
      
      setUsers(mappedUsers);
    } catch (e: any) {
      const message = e?.message || String(e);
      setError(message);
      push(`Gagal memuat users: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = () => {
    loadUsers();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeaderV2
        title="Manajemen Pengguna"
        subtitle="Kelola akun pengguna dan perizinan"
        icon={Users}
        actions={[
          {
            key: 'refresh',
            label: 'Muat ulang',
            onClick: handleRefresh,
            variant: 'secondary',
            icon: RefreshCw,
            loading: loading
          },
          {
            key: 'add',
            label: 'Tambah Pengguna',
            onClick: () => push('Fitur tambah pengguna segera hadir!', 'info'),
            variant: 'primary',
            icon: Plus
          }
        ]}
      />

      {/* Error Display */}
      {error && (
        <div className="p-stack-md text-sm text-yellow-400 bg-yellow-400/20 border border-yellow-400/30 rounded-md">
          {error.includes('permission') || error.includes('RLS') ? (
            <span>Akses dibatasi oleh RLS. Pastikan kebijakan RLS untuk tabel users mengizinkan admin melihat semua data.</span>
          ) : (
            <span>{error}</span>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          iconColor="text-blue-400"
          iconBgColor="bg-blue-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="Active Users"
          value={stats.active}
          icon={UserCheck}
          iconColor="text-green-400"
          iconBgColor="bg-green-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="Admin Users"
          value={stats.admin}
          icon={Shield}
          iconColor="text-purple-400"
          iconBgColor="bg-purple-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="New This Month"
          value={stats.recent}
          icon={Clock}
          iconColor="text-orange-400"
          iconBgColor="bg-orange-500/20"
          subtitle="Last 30 days"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <AdminFilters
        config={filtersConfig}
        values={filterValues}
        onFiltersChange={handleFilterChange}
        totalItems={users.length}
        filteredItems={filteredUsers.length}
  loading={loading}
  defaultCollapsed={true}
      />

      {/* Users Table */}
      <AdminDSTable<UserRow>
        data={filteredUsers}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="Tidak ada pengguna."
      />
    </div>
  );
};

export default AdminUsers;
