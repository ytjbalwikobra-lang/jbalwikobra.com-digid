import React, { useState, useEffect } from 'react';
import { Rocket, Package } from 'lucide-react';

interface RecentPurchase {
  id: string;
  customer_name: string;
  product_name?: string;
  amount: number;
  created_at: string;
  order_type: 'purchase' | 'rental';
  rental_duration?: string;
  tier?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    background_gradient?: string;
  };
}

const PurchaseNotificationTicker: React.FC = () => {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get background gradient based on tier
  const getBackgroundGradient = (purchase: RecentPurchase): string => {
    // If purchase has tier data and it's a purchase type, use tier colors
    if (purchase.order_type === 'purchase' && purchase.tier) {
      const tier = purchase.tier;
      const tierSlug = tier.slug.toLowerCase();
      
      // Premium/Sultan tier - Festive gold with shimmer effect
      if (tierSlug === 'premium' || tierSlug === 'sultan' || tierSlug === 'gold') {
        return 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 25%, #f59e0b 50%, #fbbf24 75%, #f59e0b 100%)';
      }
      
      // Use background_gradient if available
      if (tier.background_gradient) {
        return tier.background_gradient;
      }
      
      // Otherwise create gradient from color
      if (tier.color) {
        return `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)`;
      }
      
      // Fallback based on tier slug
      switch (tierSlug) {
        case 'pelajar':
          return 'linear-gradient(135deg, #2563eb, #1d4ed8)'; // Blue
        case 'reguler':
          return 'linear-gradient(135deg, #71717a, #52525b)'; // Gray
        default:
          return 'linear-gradient(135deg, #6366f1, #4f46e5)'; // Indigo default
      }
    }
    
    // For rental or no tier, use default rotating colors
    const colors = [
      'linear-gradient(135deg, #9333ea, #db2777)', // Purple to Pink
      'linear-gradient(135deg, #2563eb, #06b6d4)', // Blue to Cyan
      'linear-gradient(135deg, #059669, #10b981)', // Green to Emerald
      'linear-gradient(135deg, #ea580c, #dc2626)', // Orange to Red
      'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
    ];
    return colors[currentIndex % colors.length];
  };

  // Check if tier is premium/sultan for special effects
  const isPremiumTier = (purchase: RecentPurchase): boolean => {
    if (!purchase.tier) return false;
    const tierSlug = purchase.tier.slug.toLowerCase();
    return tierSlug === 'premium' || tierSlug === 'sultan' || tierSlug === 'gold';
  };

  useEffect(() => {
    fetchRecentPurchases();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecentPurchases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (purchases.length === 0) return;

    // Show notification immediately
    setIsVisible(true);
    setIsAnimating(true);
    
    // Hide after 5 seconds and immediately show next
    const hideTimer = setTimeout(() => {
      setIsAnimating(false);
      // Immediately move to next without delay
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % purchases.length);
        // Reset animation state immediately for seamless transition
        setIsAnimating(true);
      }, 700); // Match slide animation duration
    }, 5000);

    return () => clearTimeout(hideTimer);
  }, [currentIndex, purchases.length]);

  const fetchRecentPurchases = async () => {
    try {
      const response = await fetch('/api/recent-purchases');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setPurchases(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent purchases:', error);
    }
  };

  if (!isVisible || purchases.length === 0) return null;

  const purchase = purchases[currentIndex];
  const timeAgo = getTimeAgo(purchase.created_at);
  const backgroundGradient = getBackgroundGradient(purchase);
  const isPremium = isPremiumTier(purchase);

  // Format rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get transaction type text
  const transactionType = purchase.order_type === 'rental' ? 'menyewa' : 'membeli';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] overflow-hidden`}
    >
      <div
        className={`text-white shadow-lg transition-transform duration-700 ease-in-out ${isPremium ? 'animate-shimmer' : ''}`}
        style={{ 
          background: backgroundGradient,
          transform: isAnimating ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: isPremium ? '0 4px 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)' : undefined
        }}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base">
            {/* Premium Sparkle */}
            {isPremium && (
              <span className="text-yellow-200 text-lg animate-pulse-slow">✨</span>
            )}
            
            {/* Rocket Icon with Light Pulse */}
            <div className="animate-pulse-slow flex-shrink-0">
              <Rocket className="w-4 h-4 md:w-5 md:h-5" />
            </div>

            {/* Purchase Info - New Format: {nama user} {tipe transaksi} {nama akun} {timestamp} */}
            <div className="flex items-center gap-1.5 md:gap-2 font-medium flex-1 min-w-0">
              <span className="truncate max-w-[100px] sm:max-w-[150px]">
                {purchase.customer_name}
              </span>
              <span className="flex-shrink-0">{transactionType}</span>
              <span className={`font-bold truncate max-w-[120px] sm:max-w-[200px] md:max-w-none ${isPremium ? 'text-yellow-100' : ''}`}>
                {purchase.product_name}
              </span>
              {isPremium && (
                <span className="text-yellow-200 font-bold">👑</span>
              )}
              <span className="text-xs md:text-sm opacity-90 flex-shrink-0">
                {timeAgo}
              </span>
            </div>

            {/* Animated Package Icon */}
            <div className="animate-pulse-slow flex-shrink-0">
              <Package className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            
            {/* Premium Sparkle */}
            {isPremium && (
              <span className="text-yellow-200 text-lg animate-pulse-slow">✨</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/30 overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-[5000ms] ease-linear"
          style={{
            width: isAnimating ? '100%' : '0%',
          }}
        />
      </div>
    </div>
  );
};

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

export default PurchaseNotificationTicker;

// Add custom styles for light pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  .animate-pulse-slow {
    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
  .animate-shimmer {
    background-size: 200% auto;
    animation: shimmer 3s linear infinite;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-ticker-animations]')) {
  style.setAttribute('data-ticker-animations', 'true');
  document.head.appendChild(style);
}
