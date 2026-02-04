import { useState, useEffect } from 'react';
import { adminService, Banner } from '../../../../services/adminService';
import { BannerFormData } from './types';
import { scrollToPaginationContent } from '../../../../utils/scrollUtils';

export const useBannerManagement = (itemsPerPage: number = 10) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Handle page change with scroll to admin content
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollToPaginationContent();
  };

  useEffect(() => {
    loadBanners();
  }, [currentPage, searchTerm]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getBanners(currentPage, itemsPerPage);
      setBanners(result.data || []);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading banners:', error);
      setError(error instanceof Error ? error.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const toggleBannerStatus = async (bannerId: string, _currentStatus: boolean) => {
    try {
      await adminService.toggleBannerStatus(bannerId);
      await loadBanners();
    } catch (error) {
      console.error('Error updating banner status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update banner status');
    }
  };

  const deleteBanner = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await adminService.deleteBanner(bannerId);
      await loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete banner');
    }
  };

  const saveBanner = async (formData: BannerFormData, editingBanner: Banner | null) => {
    try {
      setSubmitting(true);
      if (editingBanner) {
        await adminService.updateBanner(editingBanner.id, formData);
      } else {
        await adminService.createBanner(formData);
      }
      await loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      setError(error instanceof Error ? error.message : 'Failed to save banner');
      throw error; // Re-throw to handle in component
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBanners = banners.filter(banner =>
    banner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (banner.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayBanners = searchTerm ? filteredBanners : banners;

  return {
    banners: displayBanners,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    handlePageChange,
    totalPages,
    submitting,
    loadBanners,
    toggleBannerStatus,
    deleteBanner,
    saveBanner,
    clearError: () => setError(null)
  };
};
