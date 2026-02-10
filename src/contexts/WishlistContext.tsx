import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  slug: string;
  stock_quantity: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (product: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  getTotalItems: () => number;
  loading: boolean;
  refreshWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load wishlist from database when user changes
  useEffect(() => {
    if (user) {
      loadWishlistFromDatabase();
    } else {
      // Clear wishlist when user logs out
      setItems([]);
    }
  }, [user]);

  const loadWishlistFromDatabase = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('get_user_wishlist');

      if (error) {
        console.error('Error loading wishlist:', error);
        return;
      }

      if (data) {
        const wishlistItems: WishlistItem[] = data.map((item: any) => ({
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          offer_price: item.product_offer_price,
          image_url: item.product_image_url,
          slug: item.product_slug,
          stock_quantity: item.product_stock_quantity
        }));
        
        setItems(wishlistItems);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (product: WishlistItem) => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return;
    }

    // Check if already in wishlist
    if (isInWishlist(product.id)) {
      toast.info('Item already in wishlist');
      return;
    }

    try {
      // Optimistically update UI
      setItems(currentItems => [...currentItems, product]);
      
      const { data, error } = await (supabase as any).rpc('add_to_wishlist', {
        product_id_input: product.id
      });

      if (error) {
        // Revert optimistic update on error
        setItems(currentItems => currentItems.filter(item => item.id !== product.id));
        console.error('Error adding to wishlist:', error);
        toast.error('Failed to add to wishlist');
        return;
      }

      toast.success('Added to wishlist!');
    } catch (error) {
      // Revert optimistic update on error
      setItems(currentItems => currentItems.filter(item => item.id !== product.id));
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    }
  };

  const removeItem = async (id: string) => {
    if (!user) {
      toast.error('Please login to manage wishlist');
      return;
    }

    try {
      // Optimistically update UI
      const removedItem = items.find(item => item.id === id);
      setItems(currentItems => currentItems.filter(item => item.id !== id));

      const { data, error } = await (supabase as any).rpc('remove_from_wishlist', {
        product_id_input: id
      });

      if (error) {
        // Revert optimistic update on error
        if (removedItem) {
          setItems(currentItems => [...currentItems, removedItem]);
        }
        console.error('Error removing from wishlist:', error);
        toast.error('Failed to remove from wishlist');
        return;
      }

      toast.success('Removed from wishlist');
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
      // Reload from database to ensure consistency
      loadWishlistFromDatabase();
    }
  };

  const isInWishlist = (id: string) => {
    return items.some(item => item.id === id);
  };

  const getTotalItems = () => {
    return items.length;
  };

  const refreshWishlist = () => {
    if (user) {
      loadWishlistFromDatabase();
    }
  };

  const value = {
    items,
    addItem,
    removeItem,
    isInWishlist,
    getTotalItems,
    loading,
    refreshWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};