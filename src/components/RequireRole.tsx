/**
 * RequireRole - Proteksi route berdasarkan role admin
 * 
 * Role yang didukung:
 * - super_admin: Akses penuh ke semua fitur
 * - admin_viewer: Hanya bisa melihat produk, order, dan chat
 * 
 * Penggunaan:
 *   <Route element={<RequireRole allowed={['super_admin']} />}>
 *     <Route path="/settings" element={<AdminSettings />} />
 *   </Route>
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/TraditionalAuthContext';

/** Tipe role admin yang valid */
export type AdminRole = 'super_admin' | 'admin_viewer';

/** Mapping halaman yang dibolehkan per role */
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
    '/admin/dashboard',
    '/admin/orders',
    '/admin/users',
    '/admin/products',
    '/admin/flash-sales',
    '/admin/banners',
    '/admin/whatsapp',
    '/admin/chat',
    '/admin/canned-responses',
    '/admin/notifications',
    '/admin/settings',
    '/admin/chat-settings',
    '/admin/rental-tracking',
    '/admin/activity-log',
  ],
  admin_viewer: [
    '/admin/dashboard',
    '/admin/orders',
    '/admin/products',
    '/admin/chat',
    '/admin/notifications',
    '/admin/rental-tracking',
  ],
};

interface RequireRoleProps {
  /** Daftar role yang diizinkan mengakses route ini */
  allowed: AdminRole[];
}

const RequireRole: React.FC<RequireRoleProps> = ({ allowed }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-full max-w-xs px-6">
          <div className="h-4 w-28 mb-3 rounded bg-white/10 animate-pulse" />
          <div className="h-3.5 w-full mb-2 rounded bg-white/10 animate-pulse" />
          <div className="h-3.5 w-5/6 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  // User harus login dan admin
  if (!user || !user.isAdmin) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  // Cek role — super_admin selalu diizinkan
  const userRole = (user.role as AdminRole) || 'admin_viewer';
  
  if (userRole === 'super_admin') {
    return <Outlet />;
  }

  if (!allowed.includes(userRole)) {
    // Redirect ke dashboard dengan pesan
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Helper: Cek apakah user punya akses ke path tertentu
 * Berguna untuk menyembunyikan tombol/link di UI
 */
export function hasAccessToPath(role: string | undefined, path: string): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return false;
  
  // Cek exact match atau prefix match (untuk sub-routes seperti /admin/orders/:id)
  return permissions.some(p => path === p || path.startsWith(p + '/'));
}

export default RequireRole;
