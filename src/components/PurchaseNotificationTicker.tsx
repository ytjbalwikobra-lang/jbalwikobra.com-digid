import React, { useState, useEffect } from 'react';
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

  // Slideshow effect - change item every 3 seconds
  useEffect(() => {
    if (purchases.length === 0) return;
    
    const slideInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % purchases.length);
    }, 3000);
    
    return () => clearInterval(slideInterval);
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

  const currentPurchase = purchases[currentIndex];
  const transactionType = currentPurchase.order_type === 'rental' ? 'menyewa' : 'membeli';
  const timeAgo = getTimeAgo(currentPurchase.created_at);
  const backgroundGradient = getBackgroundGradient(currentPurchase);

  // Dynamic positioning: on desktop, move to top when scrolled
  const positionClass = isScrolled 
    ? 'top-0' 
    : 'top-0 md:top-[64px]';

  return (
    <div className={`fixed left-0 right-0 z-[45] overflow-hidden transition-all duration-300 ${positionClass}`}>
      <div 
        className="relative transition-all duration-500"
        style={{ background: backgroundGradient }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-white text-sm animate-slide-in">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 flex-shrink-0 animate-pulse-slow" />
            <span className="font-medium">{currentPurchase.customer_name}</span>
            <span>{transactionType}</span>
            <span className="font-bold">{currentPurchase.product_name}</span>
            {currentPurchase.order_type === 'rental' && currentPurchase.rental_duration && (
              <span className="text-xs opacity-90">({currentPurchase.rental_duration})</span>
            )}
          </div>
          <span className="text-xs opacity-80">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
};

export default PurchaseNotificationTicker;

// Add custom styles for slideshow animation
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
  
  @keyframes slide-in {
    0% {
      opacity: 0;
      transform: translateY(-10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s ease-out;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-ticker-animations]')) {
  style.setAttribute('data-ticker-animations', 'true');
  document.head.appendChild(style);
}
