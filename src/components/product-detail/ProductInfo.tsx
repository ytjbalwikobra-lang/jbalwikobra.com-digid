/**
 * ProductInfo - Product details and pricing information
 * Displays name, price, tier, game title, and flash sale timer
 */

import React, { useState, useEffect } from 'react';
import { Clock, Star, ThumbsUp } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { Product } from '../../types';
import { PNCard, PNHeading, PNPill, PNText, PNButton } from '../ui/PinkNeonDesignSystem';
import { likeService, LikeStats } from '../../services/likeService';
import { useAuth } from '../../contexts/TraditionalAuthContext';
import FlashSaleTimer from '../FlashSaleTimer';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

interface ProductInfoProps {
  product: Product;
  effectivePrice: number;
  isFlashSaleActive: boolean;
  timeRemaining?: TimeRemaining | null;
  description?: string;
}

export const ProductInfo = React.memo(({
  product,
  effectivePrice,
  isFlashSaleActive,
  timeRemaining,
  description
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
  return (
    <div className="mt-6">
      {/* Tags: Game Title and Tier */}
      <div className="flex items-center mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Game Title - with fallback */}
          <PNPill 
            active={true}
            className="bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 text-pink-400 border-pink-500/30"
          >
            {product.gameTitleData?.name || 'GAME'}
          </PNPill>

          {/* Tier - always show */}
          <PNPill className="bg-white/5 text-white border-white/20">
            {product.tierData?.name || 'Reguler'}
          </PNPill>
        </div>
      </div>

      {/* Product Name */}
      <PNHeading level={1} className="mb-4">{product.name}</PNHeading>

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
        <div className="flex items-start gap-3 p-3 rounded-lg border border-pink-400/30 bg-pink-500/5">
          <PNButton
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLikeLoading}
            className={`flex-shrink-0 ${
              likeStats.ip_has_liked
                ? 'text-pink-400 bg-pink-500/10 border-pink-400/30'
                : 'text-gray-300 hover:text-pink-400 border-pink-400/30'
            } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp 
              size={16} 
              className={likeStats.ip_has_liked ? 'fill-current' : ''} 
            />
          </PNButton>
          <div className="flex-1 min-w-0">
            <PNText className={`leading-relaxed ${
              likeStats.ip_has_liked ? 'text-pink-400' : 'text-gray-300'
            }`}>
              {likeStats.total_likes > 0 
                ? `${likeStats.total_likes} orang menyukai produk ini`
                : 'Jadilah yang pertama menyukai produk ini'
              }
            </PNText>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isFlashSaleActive && product.originalPrice && product.originalPrice > product.price ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-pink-400">
                {formatCurrency(product.price)}
              </span>
              <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded text-sm font-medium whitespace-nowrap leading-none">
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </span>
            </div>
            <span className="text-lg text-white-secondary line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          </div>
        ) : (
          <span className="text-3xl font-bold text-white">
            {formatCurrency(effectivePrice)}
          </span>
        )}
      </div>

      {/* Flash Sale Timer */}
      {isFlashSaleActive && product.flashSaleEndTime && (
        <PNCard className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 p-4">
          <div className="flex items-center space-x-2 text-red-300 font-semibold mb-2">
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
