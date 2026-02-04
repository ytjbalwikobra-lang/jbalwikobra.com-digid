import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, UserCheck, Shield, Clock, Plus, Edit, Eye, Mail, Phone, Calendar, RotateCcw, TrendingUp, ArrowUpRight } from 'lucide-react';
import { adminService, User } from '../../services/adminService';
import { useToast } from '../../components/Toast';
import { AdminCard } from './components/ui/AdminCard';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminPageHeader } from './components/ui/AdminPageHeader';
import { AdminAnalyticsCards, AnalyticsStat } from './components/ui/AdminAnalyticsCards';
import { AdminButton } from './components/ui/AdminButton';
import { AdminFilter } from './components/AdminFilter';
import { AdminUserModal } from './components/AdminUserModal';
import { formatDate as formatDateHelper } from '../../utils/helpers';
import { formatPhoneNumber } from '../../utils/phoneUtils';
// Design system: cyber-compact.css (loaded via index.css)

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
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;
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

  const loadUsers = useCallback(async (forceRefresh = false, page = currentPage) => {
    // Use cache if available and not expired (only for page 1)
    const now = Date.now();
    if (!forceRefresh && page === 1 && cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      setUsers(cachedData.users);
      setRealStats(cachedData.stats);
      setTotalCount(cachedData.stats.total);
      setTotalPages(Math.ceil(cachedData.stats.total / PAGE_SIZE));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Fetch paginated users with actual count
      const usersResult = await adminService.getUsers(page, PAGE_SIZE);
      const usersData = usersResult.data || [];
      const actualTotal = usersResult.count || 0;

      // Calculate stats from loaded data (approximation for current page)
      const adminCount = usersData.filter(u => u.is_admin).length;
      const activeCount = usersData.filter(u => u.last_login).length;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = usersData.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

      // Use actual total from database, not usersData.length
      const stats: UserStats = {
        total: actualTotal,
        admin: adminCount,
        active: activeCount,
        recent: recentCount
      };
      
      setRealStats(stats);
      setUsers(usersData);
      setTotalCount(actualTotal);
      setTotalPages(usersResult.totalPages || Math.ceil(actualTotal / PAGE_SIZE));
      setCurrentPage(page);
      
      // Cache page 1 results
      if (page === 1) {
        setCachedData({
          users: usersData,
          stats,
          timestamp: now
        });
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to load users';
      setError(message);
      push(`Failed to load users: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [cachedData, push, currentPage, PAGE_SIZE]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers(true); // Force refresh
    setRefreshing(false);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    loadUsers(true); // Force refresh to get updated data
  };

  // Use shared formatter from utils/helpers
  const formatLastLogin = (lastLogin?: string) => lastLogin ? formatDateHelper(lastLogin) : 'Never';

  // Analytics stats config
  const analyticsStats: AnalyticsStat[] = useMemo(() => [
    {
      label: 'Total Users',
      value: realStats.total,
      icon: Users,
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-500/10',
      format: 'number'
    },
    {
      label: 'Active Users',
      value: realStats.active,
      icon: UserCheck,
      iconColor: 'text-green-400',
      iconBgColor: 'bg-green-500/10',
      format: 'number'
    },
    {
      label: 'Admin Users',
      value: realStats.admin,
      icon: Shield,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/10',
      format: 'number'
    },
    {
      label: 'New This Month',
      value: realStats.recent,
      icon: Clock,
      iconColor: 'text-orange-400',
      iconBgColor: 'bg-orange-500/10',
      format: 'number'
    }
  ], [realStats]);

  // Header actions
  const headerActions = (
    <AdminButton
      variant="secondary"
      onClick={handleRefresh}
      disabled={refreshing}
      icon={<RotateCcw className={refreshing ? 'animate-spin' : ''} size={18} />}
    >
      Refresh
    </AdminButton>
  );

  return (
    <div className="admin-page space-y-8">
      {/* User Edit Modal */}
      <AdminUserModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        user={selectedUser}
        mode={modalMode}
      />
      
      {/* Dashboard-Style Header - Using AdminPageHeader */}
      <AdminPageHeader
        title="User Management"
        description="Manage user accounts, permissions and analytics"
        actions={headerActions}
      />

        {/* Error Display */}
        {error && (
          <AdminErrorState 
            variant="banner"
            message={error}
          />
        )}

        {/* Modern Metrics Grid - Using AdminAnalyticsCards */}
        <AdminAnalyticsCards stats={analyticsStats} loading={loading} columns={4} />

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <AdminCard>
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-pink-500/10 rounded-cyber-lg">
                  <TrendingUp className="w-5 h-5 text-[var(--cyber-pink-primary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--cyber-text-primary)]">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => push('Add user functionality coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-cyber-lg bg-[var(--cyber-bg-elevated)]/50 hover:bg-pink-500/10 hover:border-[var(--cyber-pink-primary)]/30 border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-pink-primary)] transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Add New User</p>
                    <p className="text-xs text-[var(--cyber-text-muted)]">Create a new user account</p>
                  </div>
                </button>
                <button
                  onClick={() => push('Export functionality coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-cyber-lg bg-[var(--cyber-bg-elevated)]/50 hover:bg-blue-500/10 hover:border-blue-500/30 border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:text-blue-400 transition-all duration-200"
                >
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Export Users</p>
                    <p className="text-xs text-[var(--cyber-text-muted)]">Download user data</p>
                  </div>
                </button>
                <button
                  onClick={() => push('Bulk actions coming soon!', 'info')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-cyber-lg bg-[var(--cyber-bg-elevated)]/50 hover:bg-green-500/10 hover:border-green-500/30 border border-[var(--cyber-border)] text-[var(--cyber-text-secondary)] hover:text-green-400 transition-all duration-200"
                >
                  <Shield className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Manage Permissions</p>
                    <p className="text-xs text-[var(--cyber-text-muted)]">Bulk permission updates</p>
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
                  <div className="p-2 bg-blue-500/10 rounded-cyber-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--cyber-text-primary)]">User Analytics</h3>
                </div>
                <button className="flex items-center space-x-2 text-sm text-pink-500 hover:text-pink-400 transition-colors">
                  <span>View Details</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg">
                  <p className="text-2xl font-bold text-[var(--cyber-text-primary)] mb-1">{Math.round((realStats.active / realStats.total) * 100) || 0}%</p>
                  <p className="text-sm text-[var(--cyber-text-muted)]">Activity Rate</p>
                </div>
                <div className="text-center p-4 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg">
                  <p className="text-2xl font-bold text-[var(--cyber-text-primary)] mb-1">{Math.round((realStats.admin / realStats.total) * 100) || 0}%</p>
                  <p className="text-sm text-[var(--cyber-text-muted)]">Admin Ratio</p>
                </div>
                <div className="text-center p-4 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg">
                  <p className="text-2xl font-bold text-[var(--cyber-text-primary)] mb-1">{Math.round((realStats.recent / realStats.total) * 100) || 0}%</p>
                  <p className="text-sm text-[var(--cyber-text-muted)]">Growth Rate</p>
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
        
        {/* Results Count & Pagination */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/30 rounded-cyber-lg">
          <span className="text-slate-400 text-sm">
            Showing <span className="font-semibold text-white">{filteredUsers.length}</span> of <span className="font-semibold text-white">{totalCount.toLocaleString()}</span> users
            {totalPages > 1 && <span className="ml-2">(Page {currentPage} of {totalPages})</span>}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadUsers(true, currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 text-sm bg-[var(--cyber-bg-elevated)] hover:bg-[var(--cyber-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed rounded-cyber-lg text-[var(--cyber-text-primary)] transition-colors"
              >
                Previous
              </button>
              <span className="text-[var(--cyber-text-muted)] text-sm px-2">{currentPage}/{totalPages}</span>
              <button
                onClick={() => loadUsers(true, currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="cyber-btn cyber-btn-primary cyber-btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Users Grid */}
        {loading ? (
          <AdminLoadingState variant="skeleton-cards" cards={6} message="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <AdminEmptyState 
            icon={<Users className="w-16 h-16" />}
            title="No Users Found"
            hasFilters={!!(filters.search || filters.role !== 'all' || filters.status !== 'all')}
            variant="centered"
          />
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
                      <div className="w-12 h-12 bg-[var(--cyber-bg-elevated)] rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-[var(--cyber-text-muted)]" />
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
                            : 'bg-[var(--cyber-bg-elevated)]/20 text-[var(--cyber-text-muted)]'
                        }`}>
                          {user.last_login ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="p-2 bg-[var(--cyber-bg-surface)] hover:bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] rounded-cyber-lg transition-colors"
                      title="View user details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 bg-[var(--cyber-bg-surface)] hover:bg-[var(--cyber-pink-primary)] text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] rounded-cyber-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--cyber-text-muted)] text-sm">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  
                  {user.phone && (
                    <div className="flex items-center gap-2 text-[var(--cyber-text-muted)] text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{formatPhoneNumber(user.phone)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-[var(--cyber-text-muted)] text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDateHelper(user.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[var(--cyber-text-muted)] text-sm">
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
