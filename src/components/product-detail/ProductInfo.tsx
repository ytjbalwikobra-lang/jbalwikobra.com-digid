/**
 * ProductInfo - Product details and pricing information
 * Displays name, price, tier, game title, and flash sale timer
 */

import React, { useState, useEffect } from 'react';
import { Clock, ThumbsUp, Zap, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { Product } from '../../types';
import { PNCard, PNHeading, PNPill, PNText, PNButton } from '../ui/PinkNeonDesignSystem';
import { likeService, LikeStats } from '../../services/likeService';
import { useAuth } from '../../contexts/TraditionalAuthContext';
import FlashSaleTimer from '../FlashSaleTimer';

interface ProductInfoProps {
  product: Product;
  effectivePrice: number;
  isFlashSaleActive: boolean;
  description?: string;
  variant?: 'standard' | 'flash-sale-hero';
}

export const ProductInfo = React.memo(({
  product,
  effectivePrice,
  isFlashSaleActive,
  description,
  variant = 'standard'
}: ProductInfoProps) => {
  // Safely get user from auth context
  const { user } = useAuth();
  
  const [likeStats, setLikeStats] = useState<LikeStats>({
    total_likes: 0,
    user_has_liked: false,
    ip_has_liked: false
  });
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // Load like stats on component mount
  useEffect(() => {
    const loadLikeStats = async () => {
      try {
        const stats = await likeService.getLikeStats(product.id, user?.id);
        setLikeStats(stats);
      } catch (error) {
        console.error('Failed to load like stats:', error);
      }
    };

    loadLikeStats();
  }, [product.id, user?.id]);

  // Handle like toggle
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      const newStats = await likeService.toggleLike(product.id, user?.id);
      setLikeStats(newStats);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const isHeroFlashSale = variant === 'flash-sale-hero' && isFlashSaleActive;

  return (
    <div className="mt-6">
      
      {/* Hero Flash Sale Timer (Only for flash-sale-hero variant) */}
      {isHeroFlashSale && product.flashSaleEndTime && (
        <PNCard className="mb-8 bg-gradient-to-r from-pink-600 via-red-500 to-pink-600 border-pink-400 shadow-2xl shadow-pink-500/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-repeat mix-blend-overlay"></div>
          <div className="p-6 relative z-10">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                <Clock className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-wider">Flash Sale Berakhir Dalam:</span>
              </div>
            </div>
            
            {/* Custom Countdown Display */}
            <div className="bg-black/40 rounded-2xl p-4 backdrop-blur-md border border-white/20 shadow-inner">
              <FlashSaleTimer
                endTime={product.flashSaleEndTime}
                variant="detail"
                className="text-white text-center w-full transform scale-105"
              />
            </div>
            
            {/* Flash Sale Badge */}
            <div className="text-center mt-5">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-yellow-400/20 transform hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 fill-current" />
                FLASH SALE SEDANG AKTIF
              </div>
            </div>
          </div>
        </PNCard>
      )}

      {/* Tags: Game Title and Tier */}
      <div className="flex items-center mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Game Title - with fallback */}
          <PNPill 
            active={true}
            className="bg-white/5 backdrop-blur-md border-pink-500/30 text-pink-300 font-semibold px-4 py-1.5"
          >
            🎮 {product.gameTitleData?.name || 'GAME'}
          </PNPill>

          {/* Tier - always show */}
          <PNPill className="bg-gradient-to-r from-gray-800 to-gray-900 text-white border-white/20 px-4 py-1.5 font-medium">
            🔥 {product.tierData?.name || 'Reguler'} Tier
          </PNPill>
        </div>
      </div>

      {/* Product Description */}
      {description && (
        <PNCard className="mb-6 p-4">
          <PNText className="leading-relaxed whitespace-pre-line">
            {description}
          </PNText>
        </PNCard>
      )}

      {/* Like Section - Moved below description */}
      <div className="mb-6">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-pink-500/10 bg-gradient-to-r from-pink-500/5 to-transparent">
          <PNButton
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLikeLoading}
            className={`flex-shrink-0 transition-all duration-300 transform active:scale-90 ${
              likeStats.ip_has_liked
                ? 'text-pink-400 bg-pink-500/20 border-pink-400/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                : 'text-gray-400 hover:text-pink-300 hover:bg-white/5 border-white/10'
            } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp 
              size={18} 
              className={`transition-transform duration-300 ${likeStats.ip_has_liked ? 'fill-current scale-110' : ''}`}
            />
          </PNButton>
          <div className="flex-1 min-w-0 pt-1">
            <PNText className={`text-sm font-medium ${
              likeStats.ip_has_liked ? 'text-pink-300' : 'text-gray-400'
            }`}>
              {likeStats.total_likes > 0 
                ? `${likeStats.total_likes} orang menyukai produk ini`
                : 'Jadilah yang pertama menyukai produk ini! 👍'
              }
            </PNText>
          </div>
        </div>
      </div>

      {/* Price */}
      <PNCard className={`mb-6 ${isHeroFlashSale ? 'bg-gray-900 border-gray-700 p-4 sm:p-6' : ''}`}>
        {isFlashSaleActive && product.originalPrice && product.originalPrice > product.price ? (
          <div className="space-y-4 text-center">
            {/* Original Price */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className={`line-through ${isHeroFlashSale ? 'text-gray-400 text-lg' : 'text-gray-500'}`}>
                {formatCurrency(product.originalPrice)}
              </span>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </div>
            </div>
            
            {/* Sales Price */}
            <div className="flex flex-col items-center gap-3">
              <PNHeading level={2} className={`${isHeroFlashSale ? 'text-pink-400 text-3xl lg:text-4xl' : 'text-3xl text-pink-400'} font-bold text-center`}>
                {formatCurrency(effectivePrice)}
              </PNHeading>
              {isHeroFlashSale && (
                <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Hemat {formatCurrency(product.originalPrice - effectivePrice)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <PNHeading level={2} className="text-3xl lg:text-4xl font-bold text-white text-center">
            {formatCurrency(effectivePrice)}
          </PNHeading>
        )}
      </PNCard>

      {/* Standard Flash Sale Timer (Only for standard variant) */}
      {!isHeroFlashSale && isFlashSaleActive && product.flashSaleEndTime && (
        <PNCard className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-300 font-semibold mb-2">
            <Clock size={20} />
            <span>Flash Sale berakhir dalam:</span>
          </div>
          <FlashSaleTimer 
            endTime={product.flashSaleEndTime} 
            variant="detail"
            className="w-full"
          />
        </PNCard>
      )}

  {/* accountLevel/accountDetails removed */}
    </div>
  );
});

ProductInfo.displayName = 'ProductInfo';
