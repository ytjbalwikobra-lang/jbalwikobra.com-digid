/**
 * CartIntegration - Connects CheckoutBottomSheet with CartContext
 * 
 * This component handles:
 * - Cart state from context
 * - Bottom sheet open/close
 * - Quantity updates
 * - Item removal
 * - Navigation to checkout
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { CheckoutBottomSheet } from './mobile';

export const CartIntegration: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart();

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
    closeCart();
    // Navigate to the first item's product page for purchase
    // Or implement a proper checkout flow
    if (items.length > 0) {
      const firstItem = items[0];
      if (firstItem.slug) {
        navigate(`/products/${firstItem.productId}`);
      } else {
        navigate(`/products/${firstItem.productId}`);
      }
    }
  }, [closeCart, items, navigate]);

  return (
    <CheckoutBottomSheet
      isOpen={isOpen}
      onClose={closeCart}
      items={cartItems}
      onUpdateQuantity={handleUpdateQuantity}
      onRemoveItem={handleRemoveItem}
      onCheckout={handleCheckout}
    />
  );
};

export default CartIntegration;
