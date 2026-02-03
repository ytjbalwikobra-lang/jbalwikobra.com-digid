/**
 * CartIntegration - Connects CheckoutBottomSheet with CartContext
 * 
 * This component handles:
 * - Cart state from context
 * - Bottom sheet open/close
 * - Quantity updates
 * - Item removal
 * - Multi-item checkout flow
 */

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { CheckoutBottomSheet } from './mobile';
import { CheckoutModal } from './product-detail';
import { useToast } from './Toast';

export const CartIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
  } = useCart();

  // Checkout modal state for cart checkout
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutCustomer, setCheckoutCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Map cart items to CheckoutBottomSheet format
  const cartItems = items.map(item => ({
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    maxQuantity: item.maxQuantity,
  }));

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
  }, [updateQuantity]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  const handleCheckout = useCallback(() => {
    if (items.length === 0) {
      showToast('Keranjang kosong', 'error');
      return;
    }
    
    // For single item, navigate to product page with checkout modal open
    if (items.length === 1) {
      closeCart();
      const singleItem = items[0];
      navigate(`/products/${singleItem.productId}`, {
        state: { openCheckoutModal: true }
      });
      return;
    }
    
    // For multiple items, open the checkout modal directly
    closeCart();
    setShowCheckoutModal(true);
  }, [closeCart, items, navigate, showToast]);

  const handleCloseCheckoutModal = useCallback(() => {
    setShowCheckoutModal(false);
    setAcceptedTerms(false);
    setCheckoutCustomer({ name: '', email: '', phone: '' });
  }, []);

  const handleMultiItemCheckout = useCallback(async (paymentMethod?: string) => {
    if (items.length === 0) return;
    
    setCreatingInvoice(true);
    
    try {
      const { createXenditInvoice } = await import('../services/paymentService');
      
      // Generate unique external ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const externalId = `cart_order_${timestamp}_${random}`;
      
      // Create combined description
      const itemDescriptions = items.map(item => 
        `${item.name} (x${item.quantity})`
      ).join(', ');
      
      const invoiceData = await createXenditInvoice({
        externalId,
        amount: subtotal,
        payerEmail: checkoutCustomer.email,
        description: `Pembelian: ${itemDescriptions}`,
        successRedirectUrl: `${window.location.origin}/payment-status?status=success`,
        failureRedirectUrl: `${window.location.origin}/payment-status?status=failed`,
        paymentMethod,
        customer: {
          given_names: checkoutCustomer.name,
          email: checkoutCustomer.email,
          mobile_number: checkoutCustomer.phone,
        },
        order: {
          // For cart orders, use the first product's ID but include all in metadata
          product_id: items[0].productId,
          product_name: itemDescriptions,
          customer_name: checkoutCustomer.name,
          customer_email: checkoutCustomer.email,
          customer_phone: checkoutCustomer.phone,
          order_type: 'purchase',
          amount: subtotal,
          rental_duration: null,
          // Include full cart data in metadata
          cart_items: items.map(item => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }
      });
      
      // Clear cart after successful invoice creation
      clearCart();
      handleCloseCheckoutModal();
      
      // Redirect to payment
      if (invoiceData.invoice_url) {
        window.location.href = invoiceData.invoice_url;
      } else {
        const paymentParams = new URLSearchParams({
          id: invoiceData.id,
          method: paymentMethod || 'unknown',
          amount: subtotal.toString(),
          external_id: externalId,
          description: `Pembelian: ${itemDescriptions}`
        });
        window.location.href = `/payment?${paymentParams.toString()}`;
      }
    } catch (error) {
      console.error('Cart checkout error:', error);
      showToast('Gagal membuat invoice. Silakan coba lagi.', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  }, [items, subtotal, checkoutCustomer, clearCart, handleCloseCheckoutModal, showToast]);

  // Generate combined product name for multi-item checkout
  const combinedProductName = items.length > 1 
    ? `${items.length} item dalam keranjang`
    : items[0]?.name || 'Produk';

  return (
    <>
      <CheckoutBottomSheet
        isOpen={isOpen}
        onClose={closeCart}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
      
      {/* Multi-item checkout modal */}
      {showCheckoutModal && items.length > 1 && (
        <CheckoutModal
          visible={showCheckoutModal}
          onClose={handleCloseCheckoutModal}
          checkoutType="purchase"
          productName={combinedProductName}
          effectivePrice={subtotal}
          selectedRental={null}
          customer={checkoutCustomer}
          setCustomer={setCheckoutCustomer}
          isPhoneValid={isPhoneValid}
          setIsPhoneValid={setIsPhoneValid}
          acceptedTerms={acceptedTerms}
          setAcceptedTerms={setAcceptedTerms}
          creatingInvoice={creatingInvoice}
          onCheckout={handleMultiItemCheckout}
          onWhatsAppRental={() => {}}
        />
      )}
    </>
  );
};

export default CartIntegration;
