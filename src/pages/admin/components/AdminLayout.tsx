import React from 'react';
import { AdminPageHeader, AdminStats, StatItem } from './ui';
import '../../../styles/admin-design-system-v3.css';

interface AdminLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: StatItem[];
  children: React.ReactNode;
  onRefresh?: () => void;
  showStats?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title,
  description,
  actions,
  stats,
  children,
  onRefresh,
  showStats = true
}) => {
  return (
    <div className="admin-container">
      {/* Main Content */}
      <div className="admin-main">
        {/* Page Header */}
        <AdminPageHeader
          title={title}
          description={description}
          actions={actions}
          onRefresh={onRefresh}
        />

        {/* Stats Section */}
        {showStats && stats && stats.length > 0 && (
          <div className="mb-6">
            <AdminStats stats={stats} />
          </div>
        )}

        {/* Main Content Area */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Pre-configured layouts for common admin patterns
export const AdminDashboardLayout: React.FC<{
  stats: StatItem[];
  children: React.ReactNode;
}> = ({ stats, children }) => (
  <AdminLayout
    title="Dashboard"
    description="Overview of your system metrics and activity"
    stats={stats}
    showStats={true}
  >
    {children}
  </AdminLayout>
);

export const AdminCRUDLayout: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
}> = ({ title, description, actions, children, onRefresh }) => (
  <AdminLayout
    title={title}
    description={description}
    actions={actions}
    onRefresh={onRefresh}
    showStats={false}
  >
    {children}
  </AdminLayout>
);

export const AdminListLayout: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
}> = ({ title, description, actions, filters, children, onRefresh }) => (
  <AdminLayout
    title={title}
    description={description}
    actions={actions}
    onRefresh={onRefresh}
    showStats={false}
  >
    {/* Filters Section */}
    {filters && (
      <div className="mb-stack-lg">
        {filters}
      </div>
    )}
    
    {/* Content */}
    {children}
  </AdminLayout>
);
