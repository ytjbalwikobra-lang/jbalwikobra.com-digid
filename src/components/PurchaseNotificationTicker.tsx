import React, { useState, useEffect, useRef } from 'react';
import { Rocket } from 'lucide-react';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get background gradient based on order type and tier
  const getBackgroundGradient = (purchase: RecentPurchase): string => {
    const isPremium = purchase.tier && 
      ['premium', 'sultan', 'gold'].includes(purchase.tier.slug.toLowerCase());
    
    if (purchase.order_type === 'rental') {
      // Rental Premium: Purple gradient
      if (isPremium) {
        return 'linear-gradient(135deg, #8b5cf6, #a855f7)';
      }
      // Rental Regular: Blue/Cyan gradient
      return 'linear-gradient(135deg, #0ea5e9, #06b6d4)';
    } else {
      // Purchase Premium: Gold gradient
      if (isPremium) {
        return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      }
      // Purchase Regular: Pink neon gradient
      return 'linear-gradient(135deg, #ec4899, #db2777)';
    }
  };

  useEffect(() => {
    fetchRecentPurchases();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecentPurchases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Seamless slideshow transition - change item every 4 seconds with smooth animation
  useEffect(() => {
    if (purchases.length <= 1) return;
    
    const slideInterval = setInterval(() => {
      // Start exit transition
      setIsTransitioning(true);
      
      // After exit animation completes, update index and start enter animation
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % purchases.length);
        setDisplayIndex((prevIndex) => (prevIndex + 1) % purchases.length);
        setIsTransitioning(false);
      }, 400); // Match this with CSS transition duration
    }, 4000);
    
    return () => {
      clearInterval(slideInterval);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [purchases.length]);

  // Detect scroll position for desktop positioning
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchRecentPurchases = async () => {
    try {
      const response = await fetch('/api/recent-purchases');
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Purchase Ticker - Fetched data:', result);
        if (result.success && result.data.length > 0) {
          setPurchases(result.data);
          console.log('✅ Purchase Ticker - Set purchases:', result.data.length, 'items');
        }
      }
    } catch (error) {
      console.error('❌ Purchase Ticker - Failed to fetch:', error);
    }
  };

  if (purchases.length === 0) return null;

  // Get time ago
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}j`;
    return `${diffDays}h`;
  };

  const currentPurchase = purchases[displayIndex];
  const transactionType = currentPurchase.order_type === 'rental' ? 'menyewa' : 'membeli';
  const timeAgo = getTimeAgo(currentPurchase.created_at);
  const backgroundGradient = getBackgroundGradient(currentPurchase);
  
  // Next purchase for smooth background transition
  const nextIndex = (displayIndex + 1) % purchases.length;
  const nextPurchase = purchases[nextIndex];
  const nextBackgroundGradient = getBackgroundGradient(nextPurchase);

  // Dynamic positioning: on desktop, move to top when scrolled
  const positionClass = isScrolled 
    ? 'top-0' 
    : 'top-0 md:top-[64px]';

  // Transition classes for seamless animation
  const contentTransitionClass = isTransitioning
    ? 'opacity-0 transform -translate-x-4'
    : 'opacity-100 transform translate-x-0';

  return (
    <div className={`fixed left-0 right-0 z-[45] overflow-hidden transition-all duration-300 ${positionClass}`}>
      {/* Background layer with smooth color transition */}
      <div 
        className="absolute inset-0 transition-all duration-500 ease-in-out"
        style={{ 
          background: isTransitioning ? nextBackgroundGradient : backgroundGradient,
        }}
      />
      
      {/* Content layer with slide animation */}
      <div className="relative">
        <div 
          className={`flex items-center justify-between gap-2 px-4 py-2.5 text-white text-sm transition-all duration-400 ease-out ${contentTransitionClass}`}
        >
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 flex-shrink-0 animate-pulse-slow" />
            <span className="font-medium truncate max-w-[100px] sm:max-w-none">{currentPurchase.customer_name}</span>
            <span className="hidden xs:inline">{transactionType}</span>
            <span className="font-bold truncate max-w-[120px] sm:max-w-none">{currentPurchase.product_name}</span>
            {currentPurchase.order_type === 'rental' && currentPurchase.rental_duration && (
              <span className="text-xs opacity-90 hidden sm:inline">({currentPurchase.rental_duration})</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Progress indicator dots */}
            {purchases.length > 1 && (
              <div className="hidden sm:flex items-center gap-1">
                {purchases.map((_, idx) => (
                  <span 
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === displayIndex 
                        ? 'bg-white scale-125' 
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
            <span className="text-xs opacity-80">{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseNotificationTicker;

// Add custom styles for seamless slideshow animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }
  .animate-pulse-slow {
    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* Smooth transition timing */
  .duration-400 {
    transition-duration: 400ms;
  }
  
  /* Shimmer effect for active state */
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  .ticker-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.1) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 3s linear infinite;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-ticker-animations]')) {
  style.setAttribute('data-ticker-animations', 'true');
  document.head.appendChild(style);
}
