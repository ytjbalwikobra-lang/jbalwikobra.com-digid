/**
 * ProductDetailPageNew - Modular refactored version
 * Mobile-first design with separated components for better maintainability
 * 
 * Key Improvements:
 * - Modular component architecture
 * - Custom hook for data management  
 * - Better separation of concerns
 * - Mobile-optimized UI components
 * - Improved accessibility and touch targets
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductDetail } from '../hooks/useProductDetail';
import {
  ProductDetailLoadingSkeleton,
  ProductImageGallery,
  ProductInfo,
  ProductRentalOptions,
  ProductActions
} from '../components/product-detail';
import PublicPageHeader from '../components/shared/PublicPageHeader';
import { PNSection, PNContainer } from '../components/ui/PinkNeonDesignSystem';

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    // Product data
    product,
    loading,
    error,
    effectivePrice,
    isFlashSaleActive,
    timeRemaining,
    
    // Gallery state
    galleryState,
    handleImageSelect,
    
    // Navigation
    cameFromFlashSaleCard,
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
    isInWishlist
  } = useProductDetail();

  // Navigate to checkout page when checkout is triggered
  React.useEffect(() => {
    if (checkoutState.showCheckoutForm && product) {
      navigate('/checkout', {
        state: {
          checkoutType: checkoutState.checkoutType,
          productName: product.name,
          effectivePrice: effectivePrice,
          selectedRental: rentalState.selectedRental,
          customer: checkoutState.customer,
          isPhoneValid: checkoutState.isPhoneValid,
          acceptedTerms: checkoutState.acceptedTerms,
          creatingInvoice: checkoutState.creatingInvoice,
          productId: product.id
        }
      });
      // Close the checkout state after navigation
      closeCheckout();
    }
  }, [checkoutState.showCheckoutForm, product, checkoutState.checkoutType, effectivePrice, rentalState.selectedRental, checkoutState.customer, checkoutState.isPhoneValid, checkoutState.acceptedTerms, checkoutState.creatingInvoice, navigate, closeCheckout]);

  // Loading state
  if (loading || !product) {
    return <ProductDetailLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <PNSection padding="lg" className="min-h-screen flex items-center justify-center">
        <PNContainer>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Produk Tidak Ditemukan</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={handleBackToCatalog}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all"
            >
              Kembali ke Katalog
            </button>
          </div>
        </PNContainer>
      </PNSection>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PNContainer>
        <PNSection padding="lg">
          {/* Shared Header */}
          <PublicPageHeader
            backLabel="Katalog"
            onBack={handleBackToCatalog}
            showWishlist={true}
            onWishlistToggle={handleWishlistToggle}
            isInWishlist={isInWishlist}
            showShare={true}
            onShare={handleShare}
          />

          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            {/* Image Gallery */}
            <div>
              <ProductImageGallery
                images={galleryState.images}
                productName={product.name}
                selectedImage={galleryState.selectedImage}
                onImageSelect={handleImageSelect}
                isFlashSaleActive={isFlashSaleActive}
              />
            </div>

            {/* Product Information */}
            <div>
              <ProductInfo
                product={product}
                effectivePrice={effectivePrice}
                isFlashSaleActive={isFlashSaleActive}
                timeRemaining={timeRemaining}
                description={product.description || 'Tidak ada deskripsi tersedia.'}
              />

              {/* Rental Options */}
              <ProductRentalOptions
                rentalOptions={product.rentalOptions || []}
                selectedRental={rentalState.selectedRental}
                onRentalSelect={handleRentalSelect}
                cameFromFlashSaleCard={cameFromFlashSaleCard}
                hasRental={product.hasRental || false}
                isFlashSaleActive={isFlashSaleActive}
              />

              {/* Actions */}
              <ProductActions
                stock={product.stock}
                cameFromFlashSaleCard={cameFromFlashSaleCard}
                hasRental={product.hasRental || false}
                selectedRental={rentalState.selectedRental}
                onPurchase={handlePurchase}
                onRental={handleRental}
              />
            </div>
          </div>
        </PNSection>
      </PNContainer>
    </div>
  );
};

export default ProductDetailPage;
