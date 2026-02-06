import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, UserCheck, Shield, Phone, RefreshCw, User as UserIcon, Search } from 'lucide-react';
import { adminService, User } from '../../services/adminService';
import { useToast } from '../../components/Toast';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminErrorState } from './components/ui/AdminErrorState';
import { AdminButton } from './components/ui/AdminButton';
import { AdminBentoCard, AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
import { AdminPagination } from './components/AdminPagination';
import { AdminUserModal } from './components/AdminUserModal';
import { formatDate as formatDateHelper } from '../../utils/helpers';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';
// Design system: cyber-compact.css (loaded via index.css)
// Cyberpunk Compact Redesign

interface UserStats {
  total: number;
  active: number;
  admin: number;
  recent: number;
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
  
  // Search & Pagination (DNA from Products) - SERVER-SIDE
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  
  // Stats
  const [realStats, setRealStats] = useState<UserStats>({
    total: 0,
    active: 0,
    admin: 0,
    recent: 0
  });
  const { push } = useToast();

  // No client-side filtering - server handles it
  const paginatedUsers = users;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // SERVER-SIDE PAGINATION: Only fetch current page (20 users)
      const usersResult = await adminService.getUsers(currentPage, itemsPerPage, debouncedSearch);
      const usersData = usersResult.data || [];

      setUsers(usersData);
      setTotalPages(usersResult.totalPages || 1);

      // Use stats from API response if available, otherwise calculate
      if (usersResult.stats) {
        setRealStats({
          total: usersResult.stats.total || 0,
          admin: usersResult.stats.admin || 0,
          active: usersResult.stats.active || 0,
          recent: usersResult.stats.recent || 0
        });
      } else {
        // Fallback: calculate from current page (not accurate for total)
        const adminCount = usersData.filter(u => u.is_admin).length;
        const activeCount = usersData.filter(u => u.last_login).length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCount = usersData.filter(u => u.created_at && new Date(u.created_at) > thirtyDaysAgo).length;

        setRealStats({
          total: usersResult.count || usersData.length,
          admin: adminCount,
          active: activeCount,
          recent: recentCount
        });
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to load users';
      setError(message);
      push(`Failed to load users: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, push]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    loadUsers();
  };

  // Compact metrics data
  const metricsData = useMemo(() => [
    {
      label: 'Total',
      value: realStats.total,
      icon: <Users size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Active',
      value: realStats.active,
      icon: <UserCheck size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Admin',
      value: realStats.admin,
      icon: <Shield size={16} className="text-[var(--cyber-pink-primary)]" />
    },
    {
      label: 'Recent',
      value: realStats.recent,
      icon: <UserIcon size={16} className="text-[var(--cyber-pink-primary)]" />
    }
  ], [realStats]);

  return (
    <div className="admin-page space-y-4">
      {/* User Edit Modal */}
      <AdminUserModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        user={selectedUser}
        mode={modalMode}
      />
      
      {/* Cyberpunk Hero Section */}
      <AdminHeroSection
        title="User Management"
        subtitle={`${realStats.total} users • ${realStats.active} active`}
        badge="Live"
        badgeColor="info"
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {/* Search Bar (DNA from Products) */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </AdminHeroSection>

      {/* Error Display */}
      {error && (
        <AdminErrorState 
          variant="banner"
          message={error}
        />
      )}

      {/* Compact Metrics - Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricsData.map((metric, idx) => (
          <AdminBentoMetricCard
            key={idx}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>

      {/* Users Bento Grid */}
      {loading ? (
        <AdminLoadingState variant="skeleton-cards" cards={12} />
      ) : users.length === 0 ? (
        <AdminEmptyState 
          icon={<Users className="w-12 h-12" />}
          title={debouncedSearch ? "No Users Match" : "No Users Found"}
          description={debouncedSearch ? "Try different search terms" : "Users will appear here when they register"}
          hasFilters={!!debouncedSearch}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {paginatedUsers.map((user) => (
            <AdminBentoCard
              key={user.id}
              onClick={() => {
                setSelectedUser(user);
                setModalMode('view');
                setModalOpen(true);
              }}
              glowOnHover
            >
              {/* User Avatar */}
              <div className="flex flex-col items-center text-center gap-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-[var(--cyber-pink-subtle)] rounded-full flex items-center justify-center">
                    <UserIcon size={20} className="text-[var(--cyber-pink-primary)]" />
                  </div>
                )}
                
                {/* User Info */}
                <div className="min-w-0 w-full">
                  <p className="text-xs font-medium text-white truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {user.is_admin && (
                      <span className="px-1.5 py-0.5 bg-[var(--cyber-purple)]/10 text-[var(--cyber-purple)] text-[10px] rounded-full flex items-center gap-0.5">
                        <Shield size={8} />
                      </span>
                    )}
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded-full',
                      user.last_login
                        ? 'bg-[var(--cyber-success)]/10 text-[var(--cyber-success)]'
                        : 'bg-[var(--cyber-text-muted)]/10 text-[var(--cyber-text-muted)]'
                    )}>
                      {user.last_login ? '●' : '○'}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="w-full mt-1 pt-1 border-t border-[var(--cyber-border)]">
                  {user.phone && (
                    <div className="flex items-center gap-1 justify-center">
                      <Phone size={8} className="text-[var(--cyber-text-muted)]" />
                      <span className="text-[10px] text-[var(--cyber-text-muted)] truncate">
                        {formatPhoneNumber(user.phone).slice(0, 12)}...
                      </span>
                    </div>
                  )}
                  {user.last_login && (
                    <p className="text-[10px] text-[var(--cyber-text-muted)] mt-0.5">
                      {formatDateHelper(user.last_login).split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
            </AdminBentoCard>
          ))}
        </div>

        {/* Pagination (DNA from Products) */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={realStats.total}
            itemsPerPage={itemsPerPage}
          />
        )}
      </>
      )}
    </div>
  );
};

export default AdminUsersV2;
