/**
 * ProductInfo - Product details and pricing information
 * Displays name, price, tier, game title, and flash sale timer
 */

import React, { useState, useEffect } from 'react';
import { Clock, ThumbsUp, Zap, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { Product } from '../../types';
import { PNCard, PNHeading, PNPill, PNText, PNButton } from '../ui/CyberDesignSystem';
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
        <PNCard className="mb-8 bg-gradient-to-r from-[var(--cyber-pink-primary)] via-[var(--cyber-error)] to-[var(--cyber-pink-primary)] border-[var(--cyber-pink-secondary)] shadow-2xl shadow-[var(--cyber-pink-muted)] overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-repeat mix-blend-overlay"></div>
          <div className="p-6 relative z-10">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cyber-bg-overlay)] rounded-full backdrop-blur-md border border-[var(--cyber-border)] shadow-lg">
                <Clock className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-wider">Flash Sale Berakhir Dalam:</span>
              </div>
            </div>
            
            {/* Custom Countdown Display */}
            <div className="bg-[var(--cyber-bg-overlay)] rounded-cyber-2xl p-4 backdrop-blur-md border border-[var(--cyber-border)] shadow-inner">
              <FlashSaleTimer
                endTime={product.flashSaleEndTime}
                variant="detail"
                className="text-white text-center w-full transform scale-105"
              />
            </div>
            
            {/* Flash Sale Badge */}
            <div className="text-center mt-5">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--cyber-warning)] text-[var(--cyber-bg-pure)] rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--cyber-warning)]/20 transform hover:scale-105 transition-transform">
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
            className="bg-[var(--cyber-bg-elevated)] backdrop-blur-md border-[var(--cyber-pink-muted)] text-[var(--cyber-pink-secondary)] font-semibold px-4 py-1.5"
          >
            🎮 {product.gameTitleData?.name || 'GAME'}
          </PNPill>

          {/* Tier - always show */}
          <PNPill className="bg-gradient-to-r from-[var(--cyber-bg-card)] to-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] border-[var(--cyber-border)] px-4 py-1.5 font-medium">
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
        <div className="flex items-start gap-3 p-3 rounded-cyber-lg border border-[var(--cyber-pink-subtle)] bg-gradient-to-r from-[var(--cyber-pink-subtle)] to-transparent">
          <PNButton
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLikeLoading}
            className={`flex-shrink-0 transition-all duration-300 transform active:scale-90 ${
              likeStats.ip_has_liked
                ? 'text-[var(--cyber-pink-primary)] bg-[var(--cyber-pink-muted)] border-[var(--cyber-pink-muted)] shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                : 'text-[var(--cyber-text-muted)] hover:text-[var(--cyber-pink-secondary)] hover:bg-[var(--cyber-bg-elevated)] border-[var(--cyber-border)]'
            } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp 
              size={18} 
              className={`transition-transform duration-300 ${likeStats.ip_has_liked ? 'fill-current scale-110' : ''}`}
            />
          </PNButton>
          <div className="flex-1 min-w-0 pt-1">
            <PNText className={`text-sm font-medium ${
              likeStats.ip_has_liked ? 'text-[var(--cyber-pink-secondary)]' : 'text-[var(--cyber-text-muted)]'
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
      <PNCard className={`mb-6 ${isHeroFlashSale ? 'bg-[var(--cyber-bg-pure)] border-[var(--cyber-border)] p-4 sm:p-6' : ''}`}>
        {isFlashSaleActive && product.originalPrice && product.originalPrice > product.price ? (
          <div className="space-y-4 text-center">
            {/* Original Price */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className={`line-through ${isHeroFlashSale ? 'text-[var(--cyber-text-muted)] text-lg' : 'text-[var(--cyber-text-muted)]'}`}>
                {formatCurrency(product.originalPrice)}
              </span>
              <div className="bg-[var(--cyber-error)] text-[var(--cyber-text-primary)] px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </div>
            </div>
            
            {/* Sales Price */}
            <div className="flex flex-col items-center gap-3">
              <PNHeading level={2} className={`${isHeroFlashSale ? 'text-[var(--cyber-pink-primary)] text-3xl lg:text-4xl' : 'text-3xl text-[var(--cyber-pink-primary)]'} font-bold text-center`}>
                {formatCurrency(effectivePrice)}
              </PNHeading>
              {isHeroFlashSale && (
                <div className="bg-[var(--cyber-success)] text-[var(--cyber-text-primary)] px-4 py-2 rounded-cyber-lg text-sm font-semibold inline-flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Hemat {formatCurrency(product.originalPrice - effectivePrice)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <PNHeading level={2} className="text-3xl lg:text-4xl font-bold text-[var(--cyber-text-primary)] text-center">
            {formatCurrency(effectivePrice)}
          </PNHeading>
        )}
      </PNCard>

      {/* Standard Flash Sale Timer (Only for standard variant) */}
      {!isHeroFlashSale && isFlashSaleActive && product.flashSaleEndTime && (
        <PNCard className="mb-6 bg-gradient-to-r from-[var(--cyber-error)]/10 to-[var(--cyber-pink-subtle)] border border-[var(--cyber-error)]/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-[var(--cyber-error)] font-semibold mb-2">
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
