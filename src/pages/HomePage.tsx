/**
 * HomePage - Mobile-First Optimized Version
 * Following iOS Human Interface Guidelines & Android Material Design 3
 * 
 * Key Improvements:
 * - Native-like spacing and layout patterns
 * - Optimized touch targets (44dp minimum)
 * - Proper content hierarchy and visual weight
 * - Reduced cognitive load with clear sections
 * - Improved accessibility and semantic structure
 * - Performance optimizations for mobile devices
 * - Cache/egress efficiency optimizations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { sortByFlashSaleEndTime } from '../utils/flashSaleUtils';
// New PN homepage components
import PNHero from '../components/public/home/PNHero';
import PNFlashSalesSection from '../components/public/home/PNFlashSalesSection';
import PNPopularGamesSection from '../components/public/home/PNPopularGamesSection';
import HomeAccountCategoriesSection from '../components/home/HomeAccountCategoriesSection';
import PNCTA from '../components/public/home/PNCTA';
import { useToast } from '../components/Toast';
import BannerCarousel from '../components/BannerCarousel';
import MobileLoadingSkeleton from '../components/public/home/MobileLoadingSkeleton';

// Mobile-first constants following platform guidelines
const MOBILE_CONSTANTS = {
  // iOS/Android recommended touch target sizes
  MIN_TOUCH_TARGET: 44, // 44dp/pt minimum touch target
  
  // Performance optimizations - reduced limits for egress efficiency
  POPULAR_GAMES_LIMIT: 12, // Reduced from 20 for faster load
  FLASH_SALE_DISPLAY_LIMIT: 6, // Reduced from 8 for mobile performance
  CACHE_DURATION: 5 * 60 * 1000, // 5 minute cache
  
  // Animation timing following platform standards
  ANIMATIONS: {
    FAST: 150, // Quick interactions
    STANDARD: 250, // Standard transitions
  }
} as const;

interface HomePageState {
  flashSaleProducts: Product[];
  popularGames: Array<{ 
    id: string; 
    name: string; 
    slug: string; 
    logoUrl?: string | null; 
    count: number 
  }>;
  loading: boolean;
  error: string | null;
}

const HomePage: React.FC = () => {
  const { showToast } = useToast();
  const [state, setState] = useState<HomePageState>({
    flashSaleProducts: [],
    popularGames: [],
    loading: true,
    error: null
  });

  // Optimized data fetching with egress-efficient queries
  const fetchHomeData = useCallback(async (signal: AbortSignal) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { ProductService } = await import('../services/productService');
      
      if (signal.aborted) return;

      const [flashSalesResult, popularGamesResult] = await Promise.allSettled([
        ProductService.getFlashSales(),
        ProductService.getPopularGames(MOBILE_CONSTANTS.POPULAR_GAMES_LIMIT)
      ]);

      if (signal.aborted) return;

      const flashSaleProducts = flashSalesResult.status === 'fulfilled' 
        ? sortByFlashSaleEndTime(
            flashSalesResult.value.map(sale => ({
              ...sale.product,
              isFlashSale: true, // Ensure isFlashSale is set for routing
              flashSaleEndTime: sale.endTime || sale.product.flashSaleEndTime,
              price: sale.salePrice || sale.product.price,
              originalPrice: sale.originalPrice || sale.product.originalPrice
            }))
          )
        : [];
      
      const popularGames = popularGamesResult.status === 'fulfilled'
        ? popularGamesResult.value
        : [];

      const hasErrors = flashSalesResult.status === 'rejected' || popularGamesResult.status === 'rejected';
      
      setState({
        flashSaleProducts,
        popularGames,
        loading: false,
        error: hasErrors ? 'Beberapa data gagal dimuat' : null
      });

      if (hasErrors) {
        showToast('Beberapa konten mungkin tidak tersedia', 'info');
      }

    } catch (error) {
      if (signal.aborted) return;
      
      console.error('HomePage data fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Gagal memuat data. Silakan refresh halaman.'
      }));
      showToast('Gagal memuat halaman. Silakan coba lagi.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    
    const timer = setTimeout(() => {
      fetchHomeData(controller.signal);
    }, MOBILE_CONSTANTS.ANIMATIONS.FAST);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fetchHomeData]);

  const handleRetry = useCallback(() => {
    const controller = new AbortController();
    fetchHomeData(controller.signal);
  }, [fetchHomeData]);

  if (state.loading) {
    return <MobileLoadingSkeleton />;
  }

  if (state.error && state.flashSaleProducts.length === 0 && state.popularGames.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4" aria-hidden="true">😔</div>
          <h2 className="text-xl font-bold text-white mb-2">Oops! Terjadi Kesalahan</h2>
          <p className="text-gray-300 mb-6 text-sm">{state.error}</p>
          <button
            onClick={handleRetry}
            className="w-full h-11 min-h-[44px] bg-pink-600 hover:bg-pink-700 text-white font-medium px-6 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Coba muat ulang halaman"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Error banner for partial failures */}
      {state.error && (state.flashSaleProducts.length > 0 || state.popularGames.length > 0) && (
        <div className="mx-4 sm:mx-6 mt-4 bg-amber-900/20 border border-amber-600/30 rounded-xl p-4" role="alert">
          <p className="text-amber-200 text-sm">{state.error}</p>
        </div>
      )}

      {/* Hero Section - Full bleed */}
      <PNHero />

      {/* Banner Carousel - Consistent horizontal padding */}
      <div className="mt-6 sm:mt-8">
        <BannerCarousel />
      </div>

      {/* Content Sections - Unified spacing system */}
      <div className="mt-8 sm:mt-10 space-y-8 sm:space-y-10 lg:space-y-12">
        <PNFlashSalesSection products={state.flashSaleProducts} limit={MOBILE_CONSTANTS.FLASH_SALE_DISPLAY_LIMIT} />
        <HomeAccountCategoriesSection />
        <PNPopularGamesSection games={state.popularGames} limit={12} />
      </div>

      {/* CTA Section - Separate spacing for visual break */}
      <div className="mt-12 sm:mt-16">
        <PNCTA />
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-8 sm:h-10" />
    </div>
  );
};

export default HomePage;
