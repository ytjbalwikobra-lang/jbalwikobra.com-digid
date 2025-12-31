import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Clock } from 'lucide-react';

interface RecentPurchase {
  id: string;
  customer_name: string;
  product_name?: string;
  amount: number;
  created_at: string;
  order_type: 'purchase' | 'rental';
  rental_duration?: string;
}

const PurchaseNotificationTicker: React.FC = () => {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Dynamic background colors
  const colors = [
    'from-purple-600 to-pink-600',
    'from-blue-600 to-cyan-600',
    'from-green-600 to-emerald-600',
    'from-orange-600 to-red-600',
    'from-indigo-600 to-purple-600',
  ];

  useEffect(() => {
    fetchRecentPurchases();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecentPurchases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (purchases.length === 0) return;

    // Show notification
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Hide after 5 seconds
      const hideTimer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          // Move to next purchase
          setCurrentIndex((prev) => (prev + 1) % purchases.length);
        }, 500);
      }, 5000);

      return () => clearTimeout(hideTimer);
    }, 2000);

    return () => clearTimeout(showTimer);
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
  const colorIndex = currentIndex % colors.length;
  const timeAgo = getTimeAgo(purchase.created_at);

  // Format rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-500 ${
        isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`bg-gradient-to-r ${colors[colorIndex]} text-white shadow-lg`}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-3 text-sm md:text-base">
            {/* Animated Icon */}
            <div className="animate-bounce">
              {purchase.order_type === 'rental' ? (
                <Clock className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </div>

            {/* Purchase Info */}
            <div className="flex items-center gap-2 font-medium">
              <span className="hidden sm:inline">🎉</span>
              <span className="truncate max-w-[120px] sm:max-w-none">
                {purchase.customer_name}
              </span>
              <span className="hidden sm:inline">
                {purchase.order_type === 'rental' ? 'menyewa' : 'membeli'}
              </span>
              <span className="font-bold truncate max-w-[150px] sm:max-w-none">
                {purchase.product_name}
              </span>
              {purchase.order_type === 'rental' && purchase.rental_duration && (
                <span className="hidden md:inline text-xs bg-white/20 px-2 py-1 rounded">
                  {purchase.rental_duration}
                </span>
              )}
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-bold text-yellow-300">
                {formatRupiah(purchase.amount)}
              </span>
              <span className="text-xs opacity-80 hidden sm:inline">
                {timeAgo}
              </span>
            </div>

            {/* Animated Package Icon */}
            <div className="animate-pulse">
              <Package className="w-5 h-5 md:w-6 md:h-6" />
            </div>
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
