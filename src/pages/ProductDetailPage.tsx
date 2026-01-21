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
import { useProductDetail } from '../hooks/useProductDetail';
import {
  ProductDetailLoadingSkeleton,
  ProductImageGallery,
  ProductInfo,
  ProductRentalOptions,
  ProductActions,
  CheckoutModal
} from '../components/product-detail';
import PublicPageHeader from '../components/shared/PublicPageHeader';
import { PNButton, PNContainer } from '../components/ui/PinkNeonDesignSystem';

const ProductDetailPage: React.FC = () => {
  const {
    // Product data
    product,
    loading,
    error,
    effectivePrice,
    isFlashSaleActive,
    
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

  // Loading state
  if (loading || !product) {
    return <ProductDetailLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
        <PNContainer>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Produk Tidak Ditemukan</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <PNButton
              onClick={handleBackToCatalog}
              variant="primary"
            >
              Kembali ke Katalog
            </PNButton>
          </div>
        </PNContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PNContainer>
        <section className="py-8">
          {/* Shared Header */}
          <PublicPageHeader
            title={product.name}
            onBack={handleBackToCatalog}
            backAriaLabel="Kembali ke Katalog"
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
                isActive={(product as any).isActive !== false && (product as any).is_active !== false}
                soldChannel={(product as any).sold_channel}
                cameFromFlashSaleCard={cameFromFlashSaleCard}
                hasRental={product.hasRental || false}
                selectedRental={rentalState.selectedRental}
                onPurchase={handlePurchase}
                onRental={handleRental}
              />
            </div>
          </div>
        </section>
      </PNContainer>

      {/* Checkout Modal */}
      {checkoutState.showCheckoutForm && (
        <CheckoutModal
          visible={checkoutState.showCheckoutForm}
          onClose={closeCheckout}
          checkoutType={checkoutState.checkoutType}
          productName={product.name}
          effectivePrice={effectivePrice}
          selectedRental={rentalState.selectedRental}
          customer={checkoutState.customer}
          setCustomer={(customer) => 
            setCheckoutState(prev => ({ ...prev, customer }))
          }
          isPhoneValid={checkoutState.isPhoneValid}
          setIsPhoneValid={(isPhoneValid) => 
            setCheckoutState(prev => ({ ...prev, isPhoneValid }))
          }
          acceptedTerms={checkoutState.acceptedTerms}
          setAcceptedTerms={(acceptedTerms) => 
            setCheckoutState(prev => ({ ...prev, acceptedTerms }))
          }
          creatingInvoice={checkoutState.creatingInvoice}
          onCheckout={handleCheckout}
          onWhatsAppRental={handleWhatsAppRental}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
