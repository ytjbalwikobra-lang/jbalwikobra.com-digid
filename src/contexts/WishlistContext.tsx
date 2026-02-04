import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './TraditionalAuthContext';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  category: string;
  available: boolean;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (itemId: string) => void;
  isInWishlist: (itemId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const { user } = useAuth();

  // Load wishlist when user changes
  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      setWishlistItems([]);
    }
  }, [user]);

  const getWishlistKey = () => {
    return user ? `wishlist_${user.id}` : 'wishlist_guest';
  };

  const loadWishlist = () => {
    try {
      const savedWishlist = localStorage.getItem(getWishlistKey());
      if (savedWishlist) {
        setWishlistItems(JSON.parse(savedWishlist));
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setWishlistItems([]);
    }
  };

  const saveWishlist = (items: WishlistItem[]) => {
    try {
      localStorage.setItem(getWishlistKey(), JSON.stringify(items));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  const addToWishlist = (item: WishlistItem) => {
    setWishlistItems(prev => {
      if (prev.some(existingItem => existingItem.id === item.id)) {
        return prev; // Item already exists
      }
      const newItems = [...prev, item];
      saveWishlist(newItems);
      return newItems;
    });
  };

  const removeFromWishlist = (itemId: string) => {
    setWishlistItems(prev => {
      const newItems = prev.filter(item => item.id !== itemId);
      saveWishlist(newItems);
      return newItems;
    });
  };

  const isInWishlist = (itemId: string) => {
    return wishlistItems.some(item => item.id === itemId);
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    localStorage.removeItem(getWishlistKey());
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
