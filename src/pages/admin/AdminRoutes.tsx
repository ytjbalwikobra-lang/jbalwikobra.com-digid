// Admin Routes dengan role-based access control
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from './AdminShellWrapper';
import RequireRole from '../../components/RequireRole';
import AdminDashboard from './AdminDashboard';
import AdminOrdersV2 from './AdminOrdersV2';
import AdminOrderDetail from './AdminOrderDetail';
// Use direct version that bypasses all caching
import AdminProductsDirect from './AdminProductsDirect';
import AdminUsersV2 from './AdminUsersV2';
import AdminSettings from './AdminSettings';
import AdminWhatsAppSettings from './AdminWhatsAppSettings';
import AdminBanners from './AdminBanners';
import AdminFlashSales from './AdminFlashSales';
import AdminNotificationsPage from './AdminNotificationsPage';
import AdminChatPage from './AdminChatPage';
import AdminCannedResponsesPage from './AdminCannedResponsesPage';
import AdminChatSettingsPage from './AdminChatSettingsPage';

const AdminRoutes: React.FC = () => {
  return (
    <AdminShell>
      <Routes>
        {/* Route yang bisa diakses semua admin (termasuk admin_viewer) */}
        <Route element={<RequireRole allowed={['super_admin', 'admin_viewer']} />}>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/orders" element={<AdminOrdersV2 />} />
          <Route path="/orders/:orderId" element={<AdminOrderDetail />} />
          <Route path="/products" element={<AdminProductsDirect />} />
          <Route path="/chat" element={<AdminChatPage />} />
          <Route path="/notifications" element={<AdminNotificationsPage />} />
        </Route>

        {/* Route yang hanya bisa diakses super_admin */}
        <Route element={<RequireRole allowed={['super_admin']} />}>
          <Route path="/users" element={<AdminUsersV2 />} />
          <Route path="/banners" element={<AdminBanners />} />
          <Route path="/flash-sales" element={<AdminFlashSales />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/whatsapp" element={<AdminWhatsAppSettings />} />
          <Route path="/canned-responses" element={<AdminCannedResponsesPage />} />
          <Route path="/chat-settings" element={<AdminChatSettingsPage />} />
        </Route>

        {/* Redirect route yang tidak dikenal ke dashboard */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminShell>
  );
};

export default AdminRoutes;
