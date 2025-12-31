/**
 * useFlashSaleProductDetail - Custom hook for flash sale product detail page
 * Handles flash sale specific logic, product data fetching, and enhanced checkout flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Product, Customer, RentalOption } from '../types';
import { ProductService } from '../services/productService';
import { SettingsService } from '../services/settingsService';
import { calculateTimeRemaining, formatCurrency } from '../utils/helpers';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../components/Toast';

// Mobile-first constants with enhanced touch targets and spacing
const MOBILE_CONSTANTS = {
  MIN_TOUCH_TARGET: 48, // Increased for better mobile usability
  GALLERY_PLACEHOLDER_COUNT: 5,
  MAX_GALLERY_IMAGES: 15,
  HEADER_HEIGHT: 64,
  BOTTOM_SAFE_AREA: 140, // Account for bottom navigation + action buttons
  CONTENT_PADDING: 16,
  CARD_PADDING: 20,
  SECTION_GAP: 24,
  ELEMENT_GAP: 16,
} as const;

interface ProductDetailState {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

interface GalleryState {
  selectedImage: number;
  images: string[];
}

interface CheckoutState {
  showCheckoutForm: boolean;
  checkoutType: 'purchase' | 'rental';
  acceptedTerms: boolean;
  customer: Customer;
  isPhoneValid: boolean;
  creatingInvoice: boolean;
  paymentAttemptId: string | null;
}

interface RentalState {
  selectedRental: RentalOption | null;
}

export const useFlashSaleProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  // Flash sale data from navigation state
  const flashSaleData = (location as any)?.state?.flashSaleData;
  const shouldOpenCheckoutModal = Boolean((location as any)?.state?.openCheckoutModal);

  // Debug navigation state
  console.log('🧭 Navigation state debug:', {
    locationState: (location as any)?.state,
    flashSaleData,
    shouldOpenCheckoutModal,
    fromFlashSaleCard: (location as any)?.state?.fromFlashSaleCard
  });

  // Product state
  const [state, setState] = useState<ProductDetailState>({
    product: null,
    loading: true,
    error: null
  });

  // Gallery state
  const [galleryState, setGalleryState] = useState<GalleryState>({
    selectedImage: 0,
    images: []
  });

  // Checkout state
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    showCheckoutForm: false,
    checkoutType: 'purchase',
    acceptedTerms: false,
    customer: {
      name: '',
      email: '',
      phone: ''
    },
    isPhoneValid: true,
    creatingInvoice: false,
    paymentAttemptId: null
  });

  // Rental state
  const [rentalState, setRentalState] = useState<RentalState>({
    selectedRental: null
  });

  // WhatsApp configuration
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    process.env.REACT_APP_WHATSAPP_NUMBER || '6281234567890'
  );

  // Debug logging
  useEffect(() => {
    console.log('🎯 FlashSaleProductDetailPage: Initialized', {
      productId: id,
      hasFlashSaleData: !!flashSaleData,
      flashSaleData,
      shouldOpenCheckoutModal
    });
  }, [id, flashSaleData, shouldOpenCheckoutModal]);

  // Load WhatsApp configuration
  useEffect(() => { 
    (async () => { 
      try { 
        const settings = await SettingsService.get(); 
        if (settings?.whatsappNumber) setWhatsappNumber(settings.whatsappNumber); 
      } catch (_e) { 
        // Ignore settings fetch errors
      } 
    })(); 
  }, []);

  // Fetch product data and apply flash sale data
  const fetchProduct = useCallback(async () => {
    if (!id) return;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await ProductService.getProductById(id);
      
      if (!data) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Product not found'
        }));
        return;
      }

      // Apply flash sale data if available
      let finalProduct = data;
      if (flashSaleData) {
        console.log('🎯 Applying flash sale data:', flashSaleData);
        
        // Use flash sale data if valid, otherwise use product data as fallback
        const flashSalePrice = flashSaleData.salePrice || (data.price * 0.8); // Assume 20% discount if no sale price
        const originalPrice = flashSaleData.originalPrice || data.originalPrice || data.price;
        const endTime = flashSaleData.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default to 24 hours from now
        
        finalProduct = {
          ...data,
          isFlashSale: true,
          flashSaleEndTime: endTime,
          price: flashSalePrice,
          originalPrice: originalPrice
        };
        
        console.log('🎯 Final product with flash sale data:', {
          name: finalProduct.name,
          isFlashSale: finalProduct.isFlashSale,
          flashSaleEndTime: finalProduct.flashSaleEndTime,
          price: finalProduct.price,
          originalPrice: finalProduct.originalPrice,
          flashSaleDataWasValid: !!flashSaleData.salePrice
        });
      }

      setState(prev => ({
        ...prev,
        product: finalProduct,
        loading: false
      }));
      
      // Set initial rental option
      if (finalProduct.rentalOptions && finalProduct.rentalOptions.length > 0) {
        setRentalState({ selectedRental: finalProduct.rentalOptions[0] });
      }

      // Auto-open checkout modal if requested
      if (shouldOpenCheckoutModal) {
        setTimeout(() => {
          setCheckoutState(prev => ({
            ...prev,
            showCheckoutForm: true,
            checkoutType: 'purchase'
          }));
        }, 500);
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load product details'
      }));
    }
  }, [id, flashSaleData, shouldOpenCheckoutModal]);

  // Effect to fetch product on mount
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Gallery image management
  useEffect(() => {
    if (state.product) {
      const images = [
        state.product.image,
        ...(state.product.images || [])
      ].filter(Boolean).slice(0, MOBILE_CONSTANTS.MAX_GALLERY_IMAGES);
      
      setGalleryState(prev => ({
        ...prev,
        images
      }));
    }
  }, [state.product]);

  // Calculate flash sale related values
  const timeRemaining = state.product?.flashSaleEndTime ? 
    calculateTimeRemaining(state.product.flashSaleEndTime) : null;
  
  const actuallyFlashSaleActive = Boolean(
    state.product?.isFlashSale && 
    timeRemaining && 
    !timeRemaining.isExpired
  );

  const originalPrice = state.product?.originalPrice || state.product?.price || 0;
  const effectivePrice = actuallyFlashSaleActive ? (state.product?.price || 0) : originalPrice;
  
  const discountPercentage = originalPrice > 0 ? 
    Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0;

  // Navigation handlers
  const handleBackToFlashSales = useCallback(() => {
    navigate('/flash-sales');
  }, [navigate]);

  const handleBackToCatalog = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Gallery handlers
  const handleImageSelect = useCallback((index: number) => {
    setGalleryState(prev => ({
      ...prev,
      selectedImage: index
    }));
  }, []);

  // Rental handlers
  const handleRentalSelect = useCallback((rental: RentalOption) => {
    setRentalState({ selectedRental: rental });
  }, []);

  // Purchase handlers
  const handlePurchase = useCallback(() => {
    setCheckoutState(prev => ({
      ...prev,
      showCheckoutForm: true,
      checkoutType: 'purchase'
    }));
  }, []);

  const handleRental = useCallback(() => {
    setCheckoutState(prev => ({
      ...prev,
      showCheckoutForm: true,
      checkoutType: 'rental'
    }));
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutState(prev => ({
      ...prev,
      showCheckoutForm: false,
      acceptedTerms: false,
      creatingInvoice: false,
      paymentAttemptId: null
    }));
  }, []);

  // Checkout handler
  const handleCheckout = useCallback(async (paymentMethod?: string) => {
    if (!state.product) return;
    
    try {
      setCheckoutState(prev => ({ ...prev, creatingInvoice: true }));
      
      const { createXenditInvoice } = await import('../services/paymentService');
      
      const externalId = `flash_sale_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use effective price which already includes flash sale discount
      const amount = checkoutState.checkoutType === 'rental' && rentalState.selectedRental 
        ? rentalState.selectedRental.price 
        : effectivePrice;
      
      const invoiceData = await createXenditInvoice({
        externalId,
        amount,
        payerEmail: checkoutState.customer.email,
        description: `Flash Sale - ${state.product.name}`,
        successRedirectUrl: `${window.location.origin}/payment-status?status=success`,
        failureRedirectUrl: `${window.location.origin}/payment-status?status=failed`,
        paymentMethod, // Pass the selected payment method
        customer: {
          given_names: checkoutState.customer.name,
          email: checkoutState.customer.email,
          mobile_number: checkoutState.customer.phone,
        },
        order: {
          product_id: state.product.id,
          product_name: state.product.name,
          customer_name: checkoutState.customer.name,
          customer_email: checkoutState.customer.email,
          customer_phone: checkoutState.customer.phone,
          order_type: checkoutState.checkoutType,
          amount,
          rental_duration: rentalState.selectedRental?.duration || null,
          user_id: null
        }
      });

      console.log('✅ Flash sale invoice created:', invoiceData);
      
      // Redirect to payment URL
      if (invoiceData.invoice_url) {
        window.location.href = invoiceData.invoice_url;
      } else {
        throw new Error('No payment URL received from server');
      }
    } catch (error) {
      console.error('❌ Flash sale checkout failed:', error);
      setCheckoutState(prev => ({ 
        ...prev, 
        creatingInvoice: false, 
        error: error instanceof Error ? error.message : 'Gagal membuat invoice pembayaran' 
      }));
    }
  }, [state.product, effectivePrice, checkoutState.customer, checkoutState.checkoutType, rentalState.selectedRental]);

  // WhatsApp handler
  const handleWhatsAppRental = useCallback(() => {
    if (!state.product || !rentalState.selectedRental) return;
    
    const message = `Halo, saya tertarik untuk menyewa produk ${state.product.name} dengan paket ${rentalState.selectedRental.duration} (${formatCurrency(rentalState.selectedRental.price)}). Apakah masih tersedia?`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }, [state.product, rentalState.selectedRental, whatsappNumber]);

  // Wishlist handler
  const handleWishlistToggle = useCallback(() => {
    if (!state.product) return;

    const wishlistItem = {
      id: state.product.id,
      name: state.product.name,
      price: effectivePrice,
      image: state.product.image,
      rating: 0,
      category: 'flash-sale',
      available: true
    };

    if (isInWishlist(state.product.id)) {
      removeFromWishlist(state.product.id);
    } else {
      addToWishlist(wishlistItem);
    }
  }, [state.product, effectivePrice, isInWishlist, addToWishlist, removeFromWishlist]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (!state.product) return;
    
    const currentUrl = window.location.href;
    const shareData = {
      title: state.product.name,
      text: `Lihat ${state.product.name} Flash Sale di JB Alwikobra - ${formatCurrency(effectivePrice)}`,
      url: currentUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        showToast('Link produk telah disalin ke clipboard!', 'success');
      }
    } catch (error) {
      const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Link produk telah disalin ke clipboard!', 'success');
    }
  }, [state.product, effectivePrice, showToast]);

  return {
    // Product data
    product: state.product,
    loading: state.loading,
    error: state.error,
    effectivePrice,
    originalPrice,
    discountPercentage,
    isFlashSaleActive: actuallyFlashSaleActive,
    timeRemaining,
    
    // Gallery state
    galleryState,
    handleImageSelect,
    
    // Navigation
    flashSaleData,
    handleBackToFlashSales,
    handleBackToCatalog,
    
    // Rental state
    rentalState,
    handleRentalSelect,
    
    // Checkout state
    checkoutState,
    closeCheckout,
    setCheckoutState,
    
    // WhatsApp
    whatsappNumber,
    
    // Actions
    handlePurchase,
    handleRental,
    handleCheckout,
    handleWhatsAppRental,
    handleWishlistToggle,
    handleShare,
    
    // Wishlist
    isInWishlist: (productId: string) => isInWishlist(productId),
    
    // Constants
    MOBILE_CONSTANTS
  };
};
