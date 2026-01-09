// Admin Routes with proper URL navigation
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from './AdminShellWrapper';
import AdminDashboard from './AdminDashboard';
import AdminOrdersV2 from './AdminOrdersV2';
// Use direct version that bypasses all caching
import AdminProductsDirect from './AdminProductsDirect';
import AdminUsersV2 from './AdminUsersV2';
import AdminSettings from './AdminSettings';
import AdminWhatsAppSettingsEnhanced from './AdminWhatsAppSettingsEnhanced';
import AdminBanners from './AdminBanners';
import AdminFlashSales from './AdminFlashSales';

const AdminRoutes: React.FC = () => {
  return (
    <AdminShell>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/orders" element={<AdminOrdersV2 />} />
        <Route path="/users" element={<AdminUsersV2 />} />
        <Route path="/products" element={<AdminProductsDirect />} />
        <Route path="/banners" element={<AdminBanners />} />
        <Route path="/flash-sales" element={<AdminFlashSales />} />
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/whatsapp" element={<AdminWhatsAppSettingsEnhanced />} />
        {/* Redirect any unknown admin routes to dashboard */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminShell>
  );
};

export default AdminRoutes;
