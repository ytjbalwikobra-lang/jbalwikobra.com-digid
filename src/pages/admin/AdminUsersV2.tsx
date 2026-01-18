import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, Shield, Clock, Plus, Edit, Trash2, Mail, Phone, Calendar, RotateCcw, TrendingUp, ArrowUpRight } from 'lucide-react';
import { adminService, User } from '../../services/adminService';
import { useToast } from '../../components/Toast';
import { AdminButton } from './components/ui/AdminButton';
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui/AdminCard';
import { AdminStatusBadge } from './components/ui/AdminStatusBadge';
import { AdminFilter } from './components/AdminFilter';
import { formatDate as formatDateHelper } from '../../utils/helpers';
import '../../styles/admin-design-system-v3.css';

interface UserStats {
  total: number;
  active: number;
  admin: number;
  recent: number;
}

interface UserFilters {
  role: 'all' | 'admin' | 'user';
  status: 'all' | 'active' | 'inactive';
  search: string;
}

// Remove old MetricCard - now using AdminCard from V3

const AdminUsersV2: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    status: 'all',
    search: ''
  });
  const [realStats, setRealStats] = useState<UserStats>({
    total: 0,
    active: 0,
    admin: 0,
    recent: 0
  });
  const { push } = useToast();

  // Cache for instant loading between page navigations
  const [cachedData, setCachedData] = useState<{
    users: User[];
    stats: UserStats;
    timestamp: number;
  } | null>(null);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Use real stats from API instead of calculating from paginated array
  const stats = realStats;

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (filters.role === 'admin' && !user.is_admin) return false;
      if (filters.role === 'user' && user.is_admin) return false;

      // Status filter
      if (filters.status === 'active' && !user.last_login) return false;
      if (filters.status === 'inactive' && user.last_login) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [users, filters]);

  const loadUsers = async (forceRefresh = false) => {
    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      console.log('[AdminUsersV2] Using cached data');
      setUsers(cachedData.users);
      setRealStats(cachedData.stats);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Load stats and users in parallel for speed
      const [dashboardStats, usersResult] = await Promise.all([
        adminService.getDashboardStats().catch(() => null),
        adminService.getUsers(1, 100)
      ]);
      
      // Calculate stats from loaded data
      const adminCount = usersResult.data.filter(u => u.is_admin).length;
      const activeCount = usersResult.data.filter(u => u.last_login).length;
      const totalUsers = dashboardStats?.totalUsers || usersResult.data.length;
      
      // Calculate proportions
      const adminRatio = usersResult.data.length > 0 ? adminCount / usersResult.data.length : 0;
      const activeRatio = usersResult.data.length > 0 ? activeCount / usersResult.data.length : 0;
      
      // Calculate 30-day recent users
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = usersResult.data.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;
      const recentRatio = usersResult.data.length > 0 ? recentCount / usersResult.data.length : 0;
      
      const stats: UserStats = {
        total: totalUsers,
        admin: Math.round(totalUsers * adminRatio),
        active: Math.round(totalUsers * activeRatio),
        recent: Math.round(totalUsers * recentRatio)
      };
      
      setRealStats(stats);
      setUsers(usersResult.data);
      
      // Cache the results
      setCachedData({
        users: usersResult.data,
        stats,
        timestamp: now
      });
      
      console.log('[AdminUsersV2] Loaded and cached users:', usersResult.data.length);
    } catch (err: any) {
      const message = err?.message || 'Failed to load users';
      setError(message);
      push(`Failed to load users: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers(true); // Force refresh
    setRefreshing(false);
  };

  const handleEditUser = (user: User) => {
    push(`Edit functionality coming soon for: ${user.name}`, 'info');
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pengguna: ${user.name}?`)) {
      push(`Delete functionality coming soon for: ${user.name}`, 'error');
    }
  };

  // Use shared formatter from utils/helpers
  const formatDate = (dateString: string) => formatDateHelper(dateString);
  const formatLastLogin = (lastLogin?: string) => lastLogin ? formatDateHelper(lastLogin) : 'Never';

  return (
    <div className="admin-page space-y-8">
      {/* Dashboard-Style Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-400 mt-1">Manage user accounts, permissions and analytics</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 hover:bg-pink-500/20 transition-all duration-200 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Modern Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-white">{loading ? "..." : stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-green-600">{loading ? "..." : stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-green-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Admin Users</p>
                  <p className="text-3xl font-bold text-purple-600">{loading ? "..." : stats.admin}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="text-purple-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>

          <AdminCard hover>
            <AdminCardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">New This Month</p>
                  <p className="text-3xl font-bold text-orange-600">{loading ? "..." : stats.recent}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-orange-600" size={24} />
                </div>
              </div>
            </AdminCardBody>
          </AdminCard>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <AdminCard>
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => push('Add user functionality coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-pink-500/10 hover:border-pink-500/30 border border-gray-700 text-gray-300 hover:text-pink-400 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Add New User</p>
                    <p className="text-xs text-gray-500">Create a new user account</p>
                  </div>
                </button>
                <button
                  onClick={() => push('Export functionality coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-blue-500/10 hover:border-blue-500/30 border border-gray-700 text-gray-300 hover:text-blue-400 transition-all duration-200"
                >
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Export Users</p>
                    <p className="text-xs text-gray-500">Download user data</p>
                  </div>
                </button>
                <button
                  onClick={() => push('Bulk actions coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-green-500/10 hover:border-green-500/30 border border-gray-700 text-gray-300 hover:text-green-400 transition-all duration-200"
                >
                  <Shield className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Manage Permissions</p>
                    <p className="text-xs text-gray-500">Bulk permission updates</p>
                  </div>
                </button>
              </div>
            </AdminCard>
          </div>

          {/* User Analytics Preview */}
          <div className="lg:col-span-2">
            <AdminCard>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">User Analytics</h3>
                </div>
                <button className="flex items-center space-x-2 text-sm text-pink-400 hover:text-pink-300 transition-colors">
                  <span>View Details</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-black border border-gray-800 rounded-xl">
                  <p className="text-2xl font-bold text-white mb-1">{Math.round((stats.active / stats.total) * 100) || 0}%</p>
                  <p className="text-sm text-gray-400">Activity Rate</p>
                </div>
                <div className="text-center p-4 bg-black border border-gray-800 rounded-xl">
                  <p className="text-2xl font-bold text-white mb-1">{Math.round((stats.admin / stats.total) * 100) || 0}%</p>
                  <p className="text-sm text-gray-400">Admin Ratio</p>
                </div>
                <div className="text-center p-4 bg-black border border-gray-800 rounded-xl">
                  <p className="text-2xl font-bold text-white mb-1">{Math.round((stats.recent / stats.total) * 100) || 0}%</p>
                  <p className="text-sm text-gray-400">Growth Rate</p>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>

        {/* Filters */}
        <AdminFilter
          searchTerm={filters.search}
          onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
          searchPlaceholder="Search users by name, email, or phone..."
          filters={[
            {
              label: 'Role',
              value: filters.role,
              onChange: (value) => setFilters(prev => ({ ...prev, role: value as any })),
              options: [
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin Only' },
                { value: 'user', label: 'Users Only' }
              ]
            },
            {
              label: 'Status',
              value: filters.status,
              onChange: (value) => setFilters(prev => ({ ...prev, status: value as any })),
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' }
              ]
            }
          ]}
          onRefresh={handleRefresh}
          loading={refreshing}
        />
        
        {/* Results Count */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/30 rounded-lg">
          <span className="text-slate-400 text-sm">
            Showing <span className="font-semibold text-white">{filteredUsers.length}</span> of <span className="font-semibold text-white">{users.length}</span> users
          </span>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <AdminCard key={user.id} hover>
                {/* User Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold">{user.name}</h3>
                      <div className="flex items-center gap-2">
                        {user.is_admin && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                            Admin
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.last_login
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {user.last_login ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  
                  {user.phone && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(user.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Last login: {formatLastLogin(user.last_login)}</span>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>
  );
};

export default AdminUsersV2;
