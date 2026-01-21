import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Clock } from 'lucide-react';

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

// Extract first name from full name
const getFirstName = (fullName: string): string => {
  if (!fullName) return 'Pelanggan';
  const firstName = fullName.trim().split(/\s+/)[0];
  // Capitalize first letter, lowercase rest
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

// Format price in Indonesian Rupiah (compact)
const formatPrice = (amount: number): string => {
  if (amount >= 1000000) {
    return `Rp${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `Rp${(amount / 1000).toFixed(0)}rb`;
  }
  return `Rp${amount.toLocaleString('id-ID')}`;
};

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
        if (result.success && result.data.length > 0) {
          setPurchases(result.data);
        }
      }
    } catch (error) {
      console.error('❌ Purchase Ticker - Failed to fetch:', error);
    }
  };

  if (purchases.length === 0) return null;

  // Get time ago in compact format
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit`;
    if (diffHours < 24) return `${diffHours} jam`;
    return `${diffDays} hari`;
  };

  const currentPurchase = purchases[displayIndex];
  const firstName = getFirstName(currentPurchase.customer_name);
  const purchaseType = currentPurchase.order_type === 'rental' ? 'Sewa' : 'Beli';
  const productName = currentPurchase.product_name || 'Produk';
  const price = formatPrice(currentPurchase.amount);
  const timeAgo = getTimeAgo(currentPurchase.created_at);
  const backgroundGradient = getBackgroundGradient(currentPurchase);
  
  // Additional info: rental duration or tier name
  const additionalInfo = currentPurchase.order_type === 'rental' && currentPurchase.rental_duration
    ? currentPurchase.rental_duration
    : currentPurchase.tier?.name || null;
  
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
    <div 
      className={`fixed left-0 right-0 z-[45] overflow-hidden transition-all duration-300 ${positionClass}`}
      role="status"
      aria-live="polite"
      aria-label="Notifikasi pembelian terbaru"
    >
      {/* Background layer with smooth color transition */}
      <div 
        className="absolute inset-0 transition-all duration-500 ease-in-out"
        style={{ 
          background: isTransitioning ? nextBackgroundGradient : backgroundGradient,
        }}
        aria-hidden="true"
      />
      
      {/* Content layer with slide animation */}
      <div className="relative">
        <div 
          className={`flex items-center justify-between gap-3 px-4 py-2 text-white text-sm transition-all duration-400 ease-out ${contentTransitionClass}`}
        >
          {/* Left side: Purchase info */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <ShoppingBag className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            
            {/* First Name */}
            <span className="font-semibold text-white truncate max-w-[60px] sm:max-w-[100px]">
              {firstName}
            </span>
            
            <span className="text-white/60" aria-hidden="true">•</span>
            
            {/* Purchase Type */}
            <span className="font-medium px-1.5 py-0.5 rounded text-xs bg-white/20 text-white flex-shrink-0">
              {purchaseType}
            </span>
            
            <span className="text-white/60" aria-hidden="true">•</span>
            
            {/* Product Name */}
            <span className="font-medium text-white truncate max-w-[80px] sm:max-w-[150px] md:max-w-[200px]">
              {productName}
            </span>
            
            <span className="text-white/60" aria-hidden="true">•</span>
            
            {/* Price */}
            <span className="font-bold text-white flex-shrink-0">
              {price}
            </span>
            
            {/* Additional Info (Rental Duration or Tier) - hidden on very small screens */}
            {additionalInfo && (
              <>
                <span className="text-white/60 hidden sm:inline" aria-hidden="true">•</span>
                <span className="text-white/80 text-xs hidden sm:inline truncate max-w-[80px]">
                  {additionalInfo}
                </span>
              </>
            )}
          </div>
          
          {/* Right side: Timestamp */}
          <div className="flex items-center gap-1 flex-shrink-0 text-white/90">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span className="text-xs font-medium">{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseNotificationTicker;

// Add custom styles for smooth transitions
const style = document.createElement('style');
style.textContent = `
  /* Smooth transition timing */
  .duration-400 {
    transition-duration: 400ms;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-ticker-animations]')) {
  style.setAttribute('data-ticker-animations', 'true');
  document.head.appendChild(style);
}
