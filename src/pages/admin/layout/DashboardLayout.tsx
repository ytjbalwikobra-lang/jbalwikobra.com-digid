import React from 'react';
import { cn } from '../../../utils/cn';
import AdminFloatingNotifications from '../AdminFloatingNotifications';
import Footer from '../../../components/Footer';

interface DashboardLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Optional custom footer override. Jika tidak diberikan akan memakai Footer */
  footer?: React.ReactNode;
  className?: string;
  /** if true, remove max-width constraint */
  fullWidth?: boolean;
  /** Sembunyikan footer (misal untuk halaman fullscreen seperti canvas, editor, dsb) */
  showFooter?: boolean;
}

/**
 * DashboardLayout
 * Central wrapper enforcing horizontal max width, vertical rhythm, and responsive gutters.
 * Provides CSS vars for spacing scale consumed by section primitives.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  children,
  footer,
  className,
  fullWidth,
  showFooter = true,
}) => {
  return (
    <div className={cn('w-full min-h-screen flex flex-col bg-black text-white', className)}>
      {header}
      <main className="dashboard-shell pt-16 flex-1 bg-black">
        <div className={cn('dashboard-container bg-black', fullWidth && 'max-w-none')}>
          {children}
        </div>
      </main>
      {showFooter && (footer ?? <Footer />)}
      {/* AdminFloatingNotifications - muncul di semua halaman admin */}
      <AdminFloatingNotifications />
    </div>
  );
};

export default DashboardLayout;
