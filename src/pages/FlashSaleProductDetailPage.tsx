/**
 * FlashSaleProductDetailPage - PN Style Flash Sale Product Detail
 * Redesigned to match Pink Neon design system from homepage and catalog
 * 
 * Key Improvements:
 * - PN Design System components (PNSection, PNContainer, etc.)
 * - Consistent styling with homepage and catalog
 * - Mobile-first responsive design
 * - Flash sale specific UI enhancements
 * - Professional Pink Neon aesthetic
 */

import React from 'react';
import { Clock, Tag, Zap } from 'lucide-react';
import { useFlashSaleProductDetail } from '../hooks/useFlashSaleProductDetail';
import {
  ProductImageGallery,
  ProductDescription
} from '../components/product-detail';
import { FlashSaleProductDetailLoadingSkeleton } from '../components/product-detail/FlashSaleProductDetailLoadingSkeleton';
import CheckoutModal from '../components/public/product-detail/CheckoutModal';
import FlashSaleTimer from '../components/FlashSaleTimer';
import PublicPageHeader from '../components/shared/PublicPageHeader';
import { 
  PNHeading, 
  PNText,
  PNButton,
  PNCard,
  PNSection,
  PNContainer
} from '../components/ui/PinkNeonDesignSystem';
import { formatCurrency } from '../utils/helpers';

const FlashSaleProductDetailPage: React.FC = () => {
  const {
    // Product data
    product,
    loading,
    error,
    effectivePrice,
    originalPrice,
    discountPercentage,
    isFlashSaleActive,
    timeRemaining,
    
    // Gallery state
    galleryState,
    handleImageSelect,
    
    // Navigation
    handleBackToFlashSales,
    handleBackToCatalog,
    
    // Checkout state
    checkoutState,
    closeCheckout,
    setCheckoutState,
    
    // Actions
    handlePurchase,
    handleCheckout,
    handleWishlistToggle,
    handleShare,
    
    // Wishlist
    isInWishlist
  } = useFlashSaleProductDetail();

  // Debug logging

  // Loading state
  if (loading || !product) {
    return <FlashSaleProductDetailLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <PNSection padding="lg" className="min-h-screen flex items-center justify-center">
        <PNContainer>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Produk Flash Sale Tidak Ditemukan</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <PNButton
              onClick={handleBackToFlashSales}
              variant="primary"
              className="mr-4"
            >
              Kembali ke Flash Sales
            </PNButton>
            <PNButton
              onClick={handleBackToCatalog}
              variant="secondary"
            >
              Kembali ke Katalog
            </PNButton>
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
            backLabel="Flash Sales"
            onBack={handleBackToFlashSales}
            showWishlist={true}
            onWishlistToggle={handleWishlistToggle}
            isInWishlist={isInWishlist(product.id)}
            showShare={true}
            onShare={handleShare}
          />

          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            {/* Image Gallery */}
            <div>
              <ProductImageGallery
                images={galleryState.images}
                selectedImage={galleryState.selectedImage}
                onImageSelect={handleImageSelect}
                productName={product.name}
                isFlashSaleActive={isFlashSaleActive}
              />
            </div>

            {/* Product Information */}
            <div className="space-y-6 mt-6 lg:mt-0">
              {/* Flash Sale Timer - Redesigned */}
              {isFlashSaleActive && product.flashSaleEndTime && (
                <PNCard className="bg-gradient-to-r from-pink-600 via-red-500 to-pink-600 border-pink-400 shadow-lg shadow-pink-500/20">
                  <div className="p-6">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <Clock className="w-5 h-5 text-white animate-pulse" />
                        <span className="text-white font-semibold text-lg">Flash Sale Berakhir Dalam</span>
                      </div>
                    </div>
                    
                    {/* Custom Countdown Display */}
                    <div className="bg-black/30 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                      <FlashSaleTimer
                        endTime={product.flashSaleEndTime}
                        variant="detail"
                        className="text-white text-center w-full"
                      />
                    </div>
                    
                    {/* Flash Sale Badge */}
                    <div className="text-center mt-4">
                      <div className="inline-flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-full font-bold text-sm">
                        <Zap className="w-4 h-4" />
                        FLASH SALE AKTIF
                      </div>
                    </div>
                  </div>
                </PNCard>
              )}

              {/* Product Name */}
              <div>
                <PNHeading level={1} className="text-white text-2xl lg:text-3xl font-bold mb-2">
                  {product.name}
                </PNHeading>
              </div>

              {/* Price Section */}
              <PNCard className="bg-gray-900 border-gray-700">
                <div className="p-4 sm:p-6">
                  {isFlashSaleActive && originalPrice && originalPrice > effectivePrice ? (
                    <div className="space-y-4">
                      {/* Original Price with Discount Percentage */}
                      <div className="flex items-center justify-between gap-4">
                        <PNText className="text-gray-400 line-through text-lg">
                          {formatCurrency(originalPrice)}
                        </PNText>
                        <div className="bg-red-500 text-white px-3 py-2 rounded-full text-sm font-bold flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          -{discountPercentage}%
                        </div>
                      </div>
                      
                      {/* Sales Price with Savings */}
                      <div className="flex items-center justify-between gap-4">
                        <PNHeading level={2} className="text-pink-400 text-3xl lg:text-4xl font-bold">
                          {formatCurrency(effectivePrice)}
                        </PNHeading>
                        <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          <span>Hemat {formatCurrency(originalPrice - effectivePrice)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PNHeading level={2} className="text-white text-3xl lg:text-4xl font-bold">
                      {formatCurrency(effectivePrice)}
                    </PNHeading>
                  )}
                </div>
              </PNCard>

              {/* Product Description */}
              {product.description && (
                <PNCard className="bg-gray-900 border-gray-700">
                  <div className="p-4 sm:p-6">
                    <PNHeading level={3} className="text-white text-lg font-semibold mb-3">
                      Deskripsi Produk
                    </PNHeading>
                    <ProductDescription description={product.description} />
                  </div>
                </PNCard>
              )}

              {/* Purchase Actions */}
              <PNCard className="bg-gray-900 border-gray-700">
                <div className="p-4 sm:p-6 space-y-4">
                  <PNButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handlePurchase}
                    className="text-lg font-semibold py-4"
                  >
                    Beli Sekarang - {formatCurrency(effectivePrice)}
                  </PNButton>
                  
                  <div className="text-center">
                    <PNText className="text-gray-400 text-sm">
                      ⚡ Flash sale terbatas! Jangan sampai terlewat
                    </PNText>
                  </div>
                </div>
              </PNCard>
            </div>
          </div>
        </PNSection>
      </PNContainer>

      {/* Checkout Modal */}
      {checkoutState.showCheckoutForm && (
        <CheckoutModal
          visible={checkoutState.showCheckoutForm}
          onClose={closeCheckout}
          checkoutType={checkoutState.checkoutType}
          productName={product.name}
          effectivePrice={effectivePrice}
          selectedRental={null}
          customer={checkoutState.customer}
          setCustomer={(customer) => setCheckoutState(prev => ({ ...prev, customer }))}
          isPhoneValid={checkoutState.isPhoneValid}
          setIsPhoneValid={(isPhoneValid) => setCheckoutState(prev => ({ ...prev, isPhoneValid }))}
          acceptedTerms={checkoutState.acceptedTerms}
          setAcceptedTerms={(acceptedTerms) => setCheckoutState(prev => ({ ...prev, acceptedTerms }))}
          creatingInvoice={checkoutState.creatingInvoice}
          onCheckout={handleCheckout}
          onWhatsAppRental={() => {}}
        />
      )}
    </div>
  );
};

export default FlashSaleProductDetailPage;
