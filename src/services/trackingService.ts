/**
 * Google Tag Manager & Analytics Tracking Service
 * Comprehensive tracking for JB Alwikobra E-commerce Platform
 * 
 * Features:
 * - Enhanced E-commerce tracking
 * - User behavior analytics
 * - Google Ads conversion tracking
 * - Gaming-specific custom events
 * - Cross-device user tracking
 */

// Type definitions for better TypeScript support
interface TrackingUser {
  id?: string;
  type: 'authenticated' | 'guest';
  email?: string;
  phone?: string;
}

interface TrackingProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  brand?: string;
  variant?: string;
}

interface TrackingPurchase {
  transaction_id: string;
  value: number;
  currency: string;
  payment_method?: string;
  transaction_type: 'purchase' | 'rental';
  items: TrackingProduct[];
}

interface TrackingRental {
  rental_id: string;
  product_id: string;
  duration: string;
  value: number;
  currency: string;
}

// Declare global dataLayer for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

class TrackingService {
  private isInitialized = false;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private GTM_ID = process.env.REACT_APP_GTM_CONTAINER_ID;
  private GA4_ID = process.env.REACT_APP_GA4_MEASUREMENT_ID;
  private GOOGLE_ADS_ID = process.env.REACT_APP_GOOGLE_ADS_ID;
  private debugMode = process.env.REACT_APP_GA4_DEBUG === 'true';

  constructor() {
    this.initializeDataLayer();
  }

  /**
   * Initialize dataLayer and basic GTM setup
   */
  private initializeDataLayer() {
    if (typeof window === 'undefined') return;

    // Initialize dataLayer if not already present
    window.dataLayer = window.dataLayer || [];
    
    // Basic GTM configuration
    if (this.GTM_ID) {
      this.pushToDataLayer({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });
    }

    this.isInitialized = true;
    this.log('Tracking service initialized');
  }

  /**
   * Push data to dataLayer with error handling
   */
  private pushToDataLayer(data: any) {
    if (typeof window === 'undefined' || !window.dataLayer) return;

    try {
      // Inject debug flag if enabled (helps GA4 DebugView)
      if (this.debugMode && typeof data === 'object' && data && !('debug_mode' in data)) {
        data.debug_mode = true;
      }
      window.dataLayer.push(data);
      this.log('DataLayer push:', data);
    } catch (error) {
      console.error('Failed to push to dataLayer:', error);
    }
  }

  /**
   * Enhanced logging for development
   */
  private log(message: string, data?: any) {
    if (this.isDevelopment) {
    }
  }

  /**
   * Get current user information
   */
  private getCurrentUser(): TrackingUser {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return {
          id: user.id,
          type: 'authenticated',
          email: user.email,
          phone: user.phone
        };
      }
    } catch (error) {
      console.warn('Failed to get user info:', error);
    }

    return { type: 'guest' };
  }

  /**
   * Get game category from product name/category
   */
  private getGameCategory(productName: string, category?: string): string {
    const name = productName.toLowerCase();
    const cat = category?.toLowerCase() || '';

    if (name.includes('mobile legends') || cat.includes('mobile legends')) return 'mobile_legends';
    if (name.includes('pubg') || cat.includes('pubg')) return 'pubg_mobile';
    if (name.includes('free fire') || cat.includes('free fire')) return 'free_fire';
    if (name.includes('genshin') || cat.includes('genshin')) return 'genshin_impact';
    if (name.includes('valorant') || cat.includes('valorant')) return 'valorant';
    if (name.includes('call of duty') || cat.includes('cod')) return 'call_of_duty';

    return 'other_games';
  }

  // ========================
  // PAGE TRACKING METHODS
  // ========================

  /**
   * Track page views with enhanced data
   */
  trackPageView(page: string, title?: string, additionalData?: any) {
    const user = this.getCurrentUser();
    
    this.pushToDataLayer({
      event: 'page_view',
      page_title: title || document.title,
      page_location: window.location.href,
      page_path: page,
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now(),
      ...additionalData
    });

    // Also send to GA4 if available
    if (window.gtag && this.GA4_ID) {
      window.gtag('config', this.GA4_ID, {
        page_title: title || document.title,
        page_location: window.location.href,
        user_id: user.id,
        custom_map: {
          'custom_parameter_1': 'user_type'
        }
      });
    }
  }

  // ========================
  // PRODUCT TRACKING METHODS
  // ========================

  /**
   * Track product view events
   */
  trackProductView(product: TrackingProduct) {
    const user = this.getCurrentUser();
    const gameCategory = this.getGameCategory(product.name, product.category);

    this.pushToDataLayer({
      event: 'view_item',
      currency: 'IDR',
      value: product.price,
      user_type: user.type,
      user_id: user.id,
      game_category: gameCategory,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: gameCategory,
        item_brand: product.brand || 'JB Alwikobra',
        price: product.price,
        quantity: 1
      }]
    });

    this.log('Product view tracked:', product.name);
  }

  /**
   * Track product list views (categories, search results)
   */
  trackProductList(products: TrackingProduct[], listName: string, listId?: string) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'view_item_list',
      item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
      item_list_name: listName,
      user_type: user.type,
      user_id: user.id,
      items: products.map(product => ({
        item_id: product.id,
        item_name: product.name,
        item_category: this.getGameCategory(product.name, product.category),
        price: product.price,
        quantity: 1
      }))
    });

    this.log('Product list view tracked:', listName);
  }

  // ========================
  // WISHLIST TRACKING METHODS
  // ========================

  /**
   * Track add to wishlist events
   */
  trackAddToWishlist(product: TrackingProduct) {
    const user = this.getCurrentUser();
    const gameCategory = this.getGameCategory(product.name, product.category);

    this.pushToDataLayer({
      event: 'add_to_wishlist',
      currency: 'IDR',
      value: product.price,
      user_type: user.type,
      user_id: user.id,
      game_category: gameCategory,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: gameCategory,
        price: product.price,
        quantity: 1
      }]
    });

    // NOTE: Removed direct Google Ads conversion firing.
    // Conversion should be handled via GTM tag listening to add_to_wishlist if desired.

    this.log('Add to wishlist tracked:', product.name);
  }

  /**
   * Track remove from wishlist events
   */
  trackRemoveFromWishlist(product: TrackingProduct) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'remove_from_wishlist',
      currency: 'IDR',
      value: product.price,
      user_type: user.type,
      user_id: user.id,
      game_category: this.getGameCategory(product.name, product.category),
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: this.getGameCategory(product.name, product.category),
        price: product.price
      }]
    });

    this.log('Remove from wishlist tracked:', product.name);
  }

  // ========================
  // CHECKOUT TRACKING METHODS
  // ========================

  /**
   * Track begin checkout events
   */
  trackBeginCheckout(product: TrackingProduct, transactionType: 'purchase' | 'rental') {
    const user = this.getCurrentUser();
    const gameCategory = this.getGameCategory(product.name, product.category);

    this.pushToDataLayer({
      event: 'begin_checkout',
      currency: 'IDR',
      value: product.price,
      user_type: user.type,
      user_id: user.id,
      transaction_type: transactionType,
      game_category: gameCategory,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: gameCategory,
        price: product.price,
        quantity: 1
      }]
    });

    this.log('Begin checkout tracked:', `${transactionType} - ${product.name}`);
  }

  /**
   * Track purchase completion
   */
  trackPurchase(purchaseData: TrackingPurchase) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'purchase',
      transaction_id: purchaseData.transaction_id,
      value: purchaseData.value,
      currency: purchaseData.currency,
      payment_method: purchaseData.payment_method,
      transaction_type: purchaseData.transaction_type,
      user_type: user.type,
      user_id: user.id,
      items: purchaseData.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: this.getGameCategory(item.name, item.category),
        price: item.price,
        quantity: 1
      }))
    });

    // NOTE: Removed inline Google Ads conversion call; GTM should fire the official
    // Google Ads Conversion Tag (ID + Label) on the 'purchase' event.

    this.log('Purchase tracked:', purchaseData.transaction_id);
  }

  /**
   * Track rental completion
   */
  trackRental(rentalData: TrackingRental) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'rental_complete',
      rental_id: rentalData.rental_id,
      product_id: rentalData.product_id,
      rental_duration: rentalData.duration,
      value: rentalData.value,
      currency: rentalData.currency,
      user_type: user.type,
      user_id: user.id,
      transaction_type: 'rental'
    });

    // NOTE: Removed direct Ads rental conversion firing; manage in GTM if needed.

    this.log('Rental tracked:', rentalData.rental_id);
  }

  // ========================
  // USER TRACKING METHODS
  // ========================

  /**
   * Track user registration
   */
  trackSignUp(method: 'phone' | 'email' = 'phone') {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'sign_up',
      method: method,
      user_type: 'authenticated',
      user_id: user.id,
      timestamp: Date.now()
    });

    // NOTE: Removed direct Ads signup conversion; configure GTM tag on sign_up event if required.

    this.log('User signup tracked:', method);
  }

  /**
   * Track user login
   */
  trackLogin(method: 'phone' | 'email' = 'phone') {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'login',
      method: method,
      user_type: 'authenticated',
      user_id: user.id,
      timestamp: Date.now()
    });

    this.log('User login tracked:', method);
  }

  // ========================
  // GAMING-SPECIFIC METHODS
  // ========================

  /**
   * Track flash sale interactions
   */
  trackFlashSale(action: 'view' | 'click' | 'purchase', product?: TrackingProduct) {
    const user = this.getCurrentUser();

    const eventData: any = {
      event: `flash_sale_${action}`,
      promotion_id: 'flash_sale',
      promotion_name: 'Flash Sale',
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now()
    };

    if (product) {
      eventData.items = [{
        item_id: product.id,
        item_name: product.name,
        item_category: this.getGameCategory(product.name, product.category),
        price: product.price
      }];
    }

    this.pushToDataLayer(eventData);
    this.log('Flash sale tracked:', `${action} ${product ? '- ' + product.name : ''}`);
  }

  /**
   * Track WhatsApp contact events
   */
  trackWhatsAppContact(productId?: string, contactType: 'rental' | 'purchase' | 'inquiry' = 'inquiry') {
    const user = this.getCurrentUser();

    // Primary event (original naming)
    this.pushToDataLayer({
      event: 'whatsapp_contact',
      contact_type: contactType,
      product_id: productId,
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now()
    });

    // Alias event for Google Ads 'Contact' conversion tag
    this.pushToDataLayer({
      event: 'contact',
      contact_type: contactType,
      product_id: productId,
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now()
    });

    this.log('WhatsApp contact tracked:', contactType);
  }

  /**
   * Track search events
   */
  trackSearch(searchTerm: string, resultsCount?: number) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'search',
      search_term: searchTerm,
      results_count: resultsCount,
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now()
    });

    this.log('Search tracked:', searchTerm);
  }

  // ========================
  // UTILITY METHODS
  // ========================

  /**
   * Track custom events
   */
  trackCustomEvent(eventName: string, parameters: any = {}) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: eventName,
      user_type: user.type,
      user_id: user.id,
      timestamp: Date.now(),
      ...parameters
    });

    this.log('Custom event tracked:', eventName);
  }

  /**
   * Set user properties (for authenticated users)
   */
  setUserProperties(properties: { [key: string]: any }) {
    const user = this.getCurrentUser();

    this.pushToDataLayer({
      event: 'user_properties_update',
      user_id: user.id,
      ...properties
    });

    this.log('User properties updated:', properties);
  }

  /**
   * Track error events for debugging
   */
  trackError(error: string, context?: string) {
    this.pushToDataLayer({
      event: 'error',
      error_message: error,
      error_context: context,
      timestamp: Date.now()
    });

    this.log('Error tracked:', error);
  }
}

// Create singleton instance
export const trackingService = new TrackingService();

// Export for use in components
export default trackingService;