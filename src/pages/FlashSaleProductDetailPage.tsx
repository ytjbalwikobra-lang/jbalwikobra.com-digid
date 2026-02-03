/**
 * FlashSaleProductDetailPage - PN Style Flash Sale Product Detail
 * Redesigned to match Pink Neon design system from homepage and catalog
 * 
 * Key Improvements:
 * - PN Design System components (PNSection, PNContainer, etc.)
 * - Consistent styling with homepage and catalog
 * - Mobile-first responsive design
 * - Flash sale specific UI enhancements via shared ProductInfo
 * - Professional Pink Neon aesthetic
 */

import React from 'react';
import { useFlashSaleProductDetail } from '../hooks/useFlashSaleProductDetail';
import {
  ProductImageGallery,
  ProductInfo,
  ProductActions,
  CheckoutModal,
  FlashSaleProductDetailLoadingSkeleton
} from '../components/product-detail';
import PublicPageHeader from '../components/shared/PublicPageHeader';
import { 
  PNButton,
  PNContainer
} from '../components/ui/PinkNeonDesignSystem';
import { SEOHead, Breadcrumb, ProductSchema } from '../components/seo';

const FlashSaleProductDetailPage: React.FC = () => {
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
    handleBackToFlashSales,
    handleBackToCatalog,
    
    // Rental state - typically null for pure flash sales but good to support
    rentalState,
    handleRentalSelect,
    
    // Checkout state
    checkoutState,
    closeCheckout,
    setCheckoutState,
    
    // Actions
    handlePurchase,
    handleRental,
    handleCheckout,
    handleWishlistToggle,
    handleShare,
    
    // Wishlist
    isInWishlist
  } = useFlashSaleProductDetail();

  // Loading state
  if (loading || !product) {
    return <FlashSaleProductDetailLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
        <PNContainer>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Produk Flash Sale Tidak Ditemukan</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <PNButton
                onClick={handleBackToFlashSales}
                variant="primary"
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
          </div>
        </PNContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${product.name} - Flash Sale | JBal WiKobra`}
        description={`FLASH SALE! ${product.name} dengan diskon spesial. ${product.description?.slice(0, 100) || 'Penawaran terbatas, segera dapatkan sebelum kehabisan!'}`}
        keywords={`flash sale, ${product.name}, diskon game, promo terbatas`}
        url={`/flash-sales/${product.id}`}
        image={product.image}
        type="product"
      />
      <Breadcrumb
        items={[
          { label: 'Flash Sale', href: '/flash-sales' },
          { label: product.name, href: `/flash-sales/${product.id}` }
        ]}
      />
      <ProductSchema
        name={product.name}
        description={product.description || 'Produk flash sale dengan diskon spesial'}
        image={product.image}
        price={effectivePrice}
        currency="IDR"
        availability={product.stock > 0 ? 'InStock' : 'OutOfStock'}
        url={`https://jbalwikobra.com/flash-sales/${product.id}`}
      />

      <section className="py-4">
        <PNContainer className="px-4 sm:px-6">
          {/* Shared Header */}
          <PublicPageHeader
            title={product.name}
            onBack={handleBackToFlashSales}
            backAriaLabel="Kembali ke Flash Sales"
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
                soldChannel={(product as any).soldChannel || (product as any).sold_channel || null}
                stock={product.stock}
              />
            </div>

            {/* Product Information */}
            <div className="mt-8 lg:mt-0">
              <ProductInfo
                product={product}
                effectivePrice={effectivePrice}
                isFlashSaleActive={isFlashSaleActive}
                description={product.description || 'Tidak ada deskripsi tersedia.'}
                variant="flash-sale-hero"
              />

              {/* Actions */}
              <div className="mt-10">
                <ProductActions
                  stock={product.stock}
                  isActive={(product as any).isActive !== false && (product as any).is_active !== false}
                  soldChannel={(product as any).soldChannel || (product as any).sold_channel || null}
                  cameFromFlashSaleCard={true}
                  hasRental={product.hasRental}
                  selectedRental={rentalState.selectedRental}
                  onPurchase={handlePurchase}
                  onRental={handleRental}
                />
              </div>
            </div>
          </div>
        </PNContainer>
      </section>

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
          setCustomer={(customer) => setCheckoutState(prev => ({ ...prev, customer }))}
          isPhoneValid={checkoutState.isPhoneValid}
          setIsPhoneValid={(isPhoneValid) => setCheckoutState(prev => ({ ...prev, isPhoneValid }))}
          acceptedTerms={checkoutState.acceptedTerms}
          setAcceptedTerms={(acceptedTerms) => setCheckoutState(prev => ({ ...prev, acceptedTerms }))}
          creatingInvoice={checkoutState.creatingInvoice}
          onCheckout={handleCheckout}
          onWhatsAppRental={() => {}} // Not usually used in flash sale context
        />
      )}
    </div>
  );
};

export default FlashSaleProductDetailPage;
