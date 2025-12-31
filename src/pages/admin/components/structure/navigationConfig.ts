import { LayoutDashboard, ShoppingCart, Users, Package, Image, Zap, Star, Bell, Settings } from 'lucide-react';
import { AdminTab } from './adminTypes';

export interface NavigationItem {
  id: AdminTab;
  label: string;
  icon: any; // lucide icon component
}

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'flash-sales', label: 'Flash Sales', icon: Zap },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];
