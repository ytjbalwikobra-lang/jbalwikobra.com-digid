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

  // Format rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  // Duplicate purchases for seamless loop
  const displayPurchases = [...purchases, ...purchases];

  return (
    <div className="fixed left-0 right-0 z-[45] overflow-hidden top-0 md:top-[64px]">
      <div className="relative overflow-hidden">
        <div className="ticker-wrapper">
          <div className="ticker-content">
            {displayPurchases.map((purchase, index) => {
              const transactionType = purchase.order_type === 'rental' ? 'menyewa' : 'membeli';
              const timeAgo = getTimeAgo(purchase.created_at);
              const backgroundGradient = getBackgroundGradient(purchase);

              return (
                <div
                  key={`${purchase.id}-${index}`}
                  className="ticker-item"
                  style={{ background: backgroundGradient }}
                >
                  <div className="flex items-center gap-2 px-4 py-2 text-white text-sm whitespace-nowrap">
                    <Rocket className="w-4 h-4 flex-shrink-0 animate-pulse-slow" />
                    <span className="font-medium">{purchase.customer_name}</span>
                    <span>{transactionType}</span>
                    <span className="font-bold">{purchase.product_name}</span>
                    {purchase.order_type === 'rental' && purchase.rental_duration && (
                      <span className="text-xs opacity-90">({purchase.rental_duration})</span>
                    )}
                    <span className="text-xs opacity-80">• {timeAgo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseNotificationTicker;

// Add custom styles for ticker animation
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
  
  @keyframes ticker-scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
  
  .ticker-wrapper {
    width: 100%;
    overflow: hidden;
  }
  
  .ticker-content {
    display: flex;
    animation: ticker-scroll 30s linear infinite;
    will-change: transform;
  }
  
  .ticker-content:hover {
    animation-play-state: paused;
  }
  
  .ticker-item {
    flex-shrink: 0;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-ticker-animations]')) {
  style.setAttribute('data-ticker-animations', 'true');
  document.head.appendChild(style);
}
