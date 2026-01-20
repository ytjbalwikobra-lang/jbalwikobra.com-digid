import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { formatCurrency, calculateTimeRemaining } from '../utils/helpers';
import { Zap, ArrowUpRight, Users, Trophy, Crown, Sparkles } from 'lucide-react';
import FlashSaleTimer from './FlashSaleTimer';
import ResponsiveImage from './ResponsiveImage';
import { IOSCard } from './ios/IOSDesignSystemV2';

interface ProductCardProps {
  product: Product;
  showFlashSaleTimer?: boolean;
  fromCatalogPage?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  showFlashSaleTimer = false,
  fromCatalogPage = false,
  className = ''
}) => {
  const navigate = useNavigate();
  
  // Validate product data - prevent navigation if ID is missing
  if (!product || !product.id || product.id.trim() === '') {
    console.error('[ProductCard] Invalid product data:', product);
    return null; // Don't render card with invalid data
  }
  
  const timeRemaining = product.flashSaleEndTime
    ? calculateTimeRemaining(product.flashSaleEndTime)
    : null;

  const isFlashSaleActive = showFlashSaleTimer && timeRemaining && !timeRemaining.isExpired;
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const showBest = showFlashSaleTimer || product.tierData?.slug === 'premium';

  // Debug logging for flash sales
  if (showFlashSaleTimer) {
  }

  // Determine which price to show on the card
  // - On flash sale cards with an active sale: show sale price (product.price)
  // - Everywhere else (catalog, normal cards): show original/base price
  const displayPrice = (() => {
    const hasValidDiscount = product.originalPrice && product.originalPrice > product.price;
    if (isFlashSaleActive && hasValidDiscount) return product.price;
    return product.originalPrice && product.originalPrice > 0 ? product.originalPrice : product.price;
  })();

  // Robust monogram: derive from game title name or slug, producing tokens initials (e.g., Free Fire -> FF, Mobile Legends -> ML)
  const getMonogram = (): string => {
  const name = product.gameTitleData?.name || '';
  const slug = product.gameTitleData?.slug || '';
    const source = name || slug;
    if (!source) return 'JB';
    const normalized = source.replace(/[-_]+/g, ' ').trim();
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) {
      const word = parts[0];
      const caps = word.match(/[A-Z]/g);
      if (caps && caps.length >= 2) return (caps[0] + caps[1]).toUpperCase();
      return word.slice(0, 2).toUpperCase();
    }
    return 'JB';
  };

  // Tier styling with specific colors: blue for pelajar, gray for reguler, gold for premium
  const getTierStyles = (tierData?: any) => {
    // Use tier slug to determine specific colors
    const tierSlug = tierData?.slug;
    
    switch (tierSlug) {
      case 'pelajar': // Student - Blue
        return {
          bg: 'bg-gradient-to-br from-blue-700/40 via-blue-700/30 to-blue-600/40',
          ring: 'ring-blue-400/40',
          textColor: 'text-white',
          badge: 'bg-blue-500/25 text-blue-100 border-blue-400/60',
          badgeColor: '#3B82F6',
          borderColor: '#60A5FA',
          cardBorder: 'border-blue-500/30'
        };
      
      case 'premium': // Premium - Gold
        return {
          bg: 'bg-gradient-to-br from-yellow-600/40 via-yellow-600/30 to-amber-600/40',
          ring: 'ring-yellow-400/40',
          textColor: 'text-white',
          badge: 'bg-yellow-500/25 text-yellow-100 border-yellow-400/60',
          badgeColor: '#EAB308',
          borderColor: '#FBBF24',
          cardBorder: 'border-yellow-500/30'
        };
      
      case 'reguler': // General - Gray
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-700/40 via-gray-700/30 to-gray-600/40',
          ring: 'ring-gray-400/40',
          textColor: 'text-white',
          badge: 'bg-gray-500/25 text-gray-100 border-gray-400/60',
          badgeColor: '#6B7280',
          borderColor: '#9CA3AF',
          cardBorder: 'border-gray-500/30'
        };
    }
  };

  const tierStyle = getTierStyles(product.tierData);

  // Get tier icon with dynamic data
  const getTierIcon = (tierData?: any) => {
    if (tierData?.icon) {
      switch (tierData.icon) {
        case 'Crown': return Crown;
        case 'Users': return Users;
        case 'Trophy': return Trophy;
        default: return Trophy;
      }
    }
    
    // Fallback default trophy when slug unknown
    if (tierData?.slug === 'premium') return Crown;
    if (tierData?.slug === 'pelajar') return Users;
    return Trophy;
  };

  const TierIcon = getTierIcon(product.tierData);

  // Get game title for display
  const gameTitle = product.gameTitleData?.name;
  const gameTitleSlug = product.gameTitleData?.slug;

  // Get tier name for display
  const tierName = product.tierData?.name || (
  product.tierData?.slug?.toUpperCase() || 'REGULER'
  );

  const handleCardClick = () => {
    // Double-check product ID before navigation
    if (!product.id || product.id.trim() === '' || product.id === 'undefined') {
      console.error('[ProductCard] Cannot navigate: invalid product ID:', product.id);
      return;
    }
    
    navigate(`/products/${product.id}`, { 
      state: { 
        fromFlashSaleCard: showFlashSaleTimer,
        fromCatalogPage 
      } 
    });
  };

  return (
    <IOSCard
      variant="elevated"
      padding="none"
      hoverable
      className={`relative flex flex-col overflow-hidden ${showFlashSaleTimer ? 'bg-gradient-to-br from-pink-700/40 via-pink-700/30 to-fuchsia-700/40 border border-pink-500/30' : `${tierStyle.bg} border ${tierStyle.cardBorder}`} group ${className}`}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="aspect-[4/5] w-full bg-[linear-gradient(45deg,#1e1e1e,#2a2a2a)] flex items-center justify-center border-b border-gray-500/20">
        {images[0] ? (
          <ResponsiveImage
            src={images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
            priority={showFlashSaleTimer}
            quality={85}
            aspectRatio={4/5}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="text-[10px] text-gray-200 tracking-wider">NO IMAGE</div>
        )}

        {/* Flash Sale or Best Badge */}
        {showBest && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-red-500/90 text-white text-xs font-bold px-2 py-1 backdrop-blur border border-red-400/50 shadow-lg animate-pulse">
            <Zap size={10} />
            <span className="text-xs">{isFlashSaleActive ? 'FLASH SALE' : 'TERBARU'}</span>
          </div>
        )}

        {/* Game Monogram */}
        <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 text-pink-400 text-xs font-bold flex items-center justify-center ring-2 ring-pink-500/30 backdrop-blur">
          {getMonogram()}
        </div>

        {/* Stock Status */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">STOK HABIS</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug uppercase tracking-wide line-clamp-2 group-hover:text-white/90">
          {product.name}
        </h3>

        {/* Tags Row */}
        {!showFlashSaleTimer && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Game Title */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
              {gameTitle}
            </span>

            {/* Tier Badge */}
            {product.tierData && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border backdrop-blur-sm"
                style={{
                  backgroundColor: tierStyle.badgeColor ? `${tierStyle.badgeColor}25` : 'rgba(255,255,255,0.15)',
                  borderColor: tierStyle.borderColor ? `${tierStyle.borderColor}80` : 'rgba(255,255,255,0.3)',
                  color: '#ffffff'
                }}
              >
                <TierIcon size={10} />
                <span className="text-xs">{tierName}</span>
              </span>
            )}
          </div>
        )}

        {/* Rental Tag */}
        {!showFlashSaleTimer && (product.hasRental || (product as any).rentalOptions?.length > 0) && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/25 text-white border border-emerald-400/60 backdrop-blur-sm">
            <Sparkles size={10} />
            <span className="text-xs">Tersedia Rental</span>
          </span>
        )}

        {/* Price Section */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 rounded-lg border border-gray-300/30 bg-black/40 text-white text-xs font-medium shadow-inner">
            {formatCurrency(displayPrice)}
          </div>
          {isFlashSaleActive && product.originalPrice && product.originalPrice > product.price && (
            <>
              <div className="px-2 py-1 rounded-lg bg-white text-red-600 text-[11px] font-bold shadow-sm tracking-wide">
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </div>
              <div className="text-[11px] text-white/60 line-through">
                {formatCurrency(product.originalPrice)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Flash Sale Timer */}
      {showFlashSaleTimer && product.flashSaleEndTime && (
        <div className="px-3 pb-4">
          <FlashSaleTimer 
            endTime={product.flashSaleEndTime} 
            compact={false}
            variant="card"
            className=""
          />
        </div>
      )}
    </IOSCard>
  );
};

export default ProductCard;
