/**
 * CartContext - Global cart state management for Cyber-Compact checkout
 * 
 * Features:
 * - Add/remove/update cart items
 * - Persist cart to localStorage
 * - Calculate totals
 * - Quick buy functionality
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
  imageUrl?: string;
  slug?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'TOGGLE_CART' };

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  quickBuy: (productId: string, product: { name: string; price: number; imageUrl?: string; slug?: string; stock?: number }) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CART_STORAGE_KEY = 'jbal_cart';
const INITIAL_STATE: CartState = {
  items: [],
  isOpen: false,
};

// ============================================================================
// REDUCER
// ============================================================================

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(item => item.id === action.payload.id);
      
      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingIndex];
        const newQuantity = existingItem.quantity + (action.payload.quantity || 1);
        
        // Respect max quantity if set
        const finalQuantity = existingItem.maxQuantity 
          ? Math.min(newQuantity, existingItem.maxQuantity)
          : newQuantity;
        
        updatedItems[existingIndex] = { ...existingItem, quantity: finalQuantity };
        return { ...state, items: updatedItems };
      }
      
      // Add new item
      const newItem: CartItem = {
        ...action.payload,
        quantity: action.payload.quantity || 1,
      };
      return { ...state, items: [...state.items, newItem] };
    }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      if (quantity < 1) {
        return { ...state, items: state.items.filter(item => item.id !== id) };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id
            ? { ...item, quantity: item.maxQuantity ? Math.min(quantity, item.maxQuantity) : quantity }
            : item
        ),
      };
    }
    
    case 'CLEAR_CART':
      return { ...state, items: [] };
    
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    
    case 'OPEN_CART':
      return { ...state, isOpen: true };
    
    case 'CLOSE_CART':
      return { ...state, isOpen: false };
    
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
    
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          dispatch({ type: 'SET_ITEMS', payload: parsed });
        }
      }
    } catch (error) {
      console.warn('Failed to load cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }, [state.items]);

  // Memoized calculations
  const totalItems = useMemo(() => 
    state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  const subtotal = useMemo(() => 
    state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [state.items]
  );

  // Actions
  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const openCart = useCallback(() => {
    dispatch({ type: 'OPEN_CART' });
  }, []);

  const closeCart = useCallback(() => {
    dispatch({ type: 'CLOSE_CART' });
  }, []);

  const toggleCart = useCallback(() => {
    dispatch({ type: 'TOGGLE_CART' });
  }, []);

  // Quick buy - adds item and opens cart
  const quickBuy = useCallback((
    productId: string, 
    product: { name: string; price: number; imageUrl?: string; slug?: string; stock?: number }
  ) => {
    const cartItem: Omit<CartItem, 'quantity'> = {
      id: productId,
      productId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      slug: product.slug,
      maxQuantity: product.stock,
    };
    dispatch({ type: 'ADD_ITEM', payload: { ...cartItem, quantity: 1 } });
    dispatch({ type: 'OPEN_CART' });
  }, []);

  const value = useMemo(() => ({
    items: state.items,
    isOpen: state.isOpen,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    quickBuy,
  }), [
    state.items,
    state.isOpen,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    quickBuy,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
