/**
 * Google Analytics 4 Service
 * 
 * Provides centralized analytics tracking with:
 * - GA4 event tracking
 * - Page view tracking
 * - E-commerce events
 * - Core Web Vitals reporting
 * - Privacy-compliant (respects user consent)
 */

// GA4 Measurement ID - should be set in environment variable
const GA4_MEASUREMENT_ID = process.env.REACT_APP_GA4_MEASUREMENT_ID || '';

// Type definitions for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Initialize Google Analytics 4
 * Should be called once when the app loads
 */
export function initGA4(): void {
  if (!GA4_MEASUREMENT_ID) {
    console.warn('GA4 Measurement ID not configured');
    return;
  }

  // Check for user consent (respect privacy)
  const hasConsent = localStorage.getItem('cookie-consent') === 'accepted';
  if (!hasConsent) {
    console.log('Analytics: Waiting for user consent');
    return;
  }

  // Prevent duplicate initialization
  if (typeof window.gtag === 'function' && window.dataLayer?.length > 0) {
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA4_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    anonymize_ip: true, // Privacy compliance
    cookie_flags: 'SameSite=None;Secure',
  });

  console.log('GA4 initialized');
}

/**
 * Track page views
 * @param path - Page path (e.g., /products)
 * @param title - Page title
 */
export function trackPageView(path: string, title?: string): void {
  if (!window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Track custom events
 * @param eventName - Event name (e.g., 'add_to_cart')
 * @param params - Event parameters
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (!window.gtag) return;

  window.gtag('event', eventName, params);
}

/**
 * Track product views (for SEO and remarketing)
 */
export function trackProductView(product: {
  id: string;
  name: string;
  category?: string;
  price: number;
}): void {
  if (!window.gtag) return;

  window.gtag('event', 'view_item', {
    currency: 'IDR',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category || 'Game Account',
      price: product.price,
    }],
  });
}

/**
 * Track add to wishlist
 */
export function trackAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
}): void {
  if (!window.gtag) return;

  window.gtag('event', 'add_to_wishlist', {
    currency: 'IDR',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
    }],
  });
}

/**
 * Track purchase initiation
 */
export function trackBeginCheckout(product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}): void {
  if (!window.gtag) return;

  window.gtag('event', 'begin_checkout', {
    currency: 'IDR',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: product.quantity || 1,
    }],
  });
}

/**
 * Track successful purchase
 */
export function trackPurchase(order: {
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  paymentMethod?: string;
}): void {
  if (!window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: order.orderId,
    currency: 'IDR',
    value: order.price,
    items: [{
      item_id: order.productId,
      item_name: order.productName,
      price: order.price,
      quantity: 1,
    }],
    payment_type: order.paymentMethod,
  });
}

/**
 * Track search queries (for SEO insights)
 */
export function trackSearch(searchTerm: string, resultsCount?: number): void {
  if (!window.gtag) return;

  window.gtag('event', 'search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

/**
 * Track user sign up
 */
export function trackSignUp(method: string): void {
  if (!window.gtag) return;

  window.gtag('event', 'sign_up', {
    method: method,
  });
}

/**
 * Track user login
 */
export function trackLogin(method: string): void {
  if (!window.gtag) return;

  window.gtag('event', 'login', {
    method: method,
  });
}

// Export a singleton-like object for convenience
const analyticsService = {
  init: initGA4,
  pageView: trackPageView,
  event: trackEvent,
  productView: trackProductView,
  addToWishlist: trackAddToWishlist,
  beginCheckout: trackBeginCheckout,
  purchase: trackPurchase,
  search: trackSearch,
  signUp: trackSignUp,
  login: trackLogin,
};

export default analyticsService;
