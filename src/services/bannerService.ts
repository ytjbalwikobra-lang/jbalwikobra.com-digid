import { adminService } from './adminService';
import { Banner } from '../types';

// BannerService as wrapper around adminService for backward compatibility
export const BannerService = {
  async list(): Promise<Banner[]> {
    try {
      const result = await adminService.getBanners(1, 100); // Get first 100 banners
      return result.data || [];
    } catch (error) {
      console.error('BannerService.list error:', error);
      return [];
    }
  },

  async create(input: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner | null> {
    try {
      return await adminService.createBanner(input);
    } catch (error) {
      console.error('BannerService.create error:', error);
      return null;
    }
  },

  async update(id: string, updates: Partial<Banner>): Promise<Banner | null> {
    try {
      const { id: bannerId, created_at, updated_at, ...updateData } = updates;
      return await adminService.updateBanner(id, updateData);
    } catch (error) {
      console.error('BannerService.update error:', error);
      return null;
    }
  },

  async remove(id: string, _imageUrl?: string): Promise<boolean> {
    try {
      await adminService.deleteBanner(id);
      return true;
    } catch (error) {
      console.error('BannerService.remove error:', error);
      return false;
    }
  }
};
