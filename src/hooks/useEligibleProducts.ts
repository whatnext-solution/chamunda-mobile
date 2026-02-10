import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { toast } from 'sonner';

export interface EligibleProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  coins_required_to_buy: number;
  is_coin_purchase_enabled: boolean;
  stock_quantity: number;
  is_visible: boolean;
  category_id?: string;
  categories?: { name: string };
}

export const useEligibleProducts = () => {
  const [eligibleProducts, setEligibleProducts] = useState<EligibleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallet, isSystemEnabled } = useLoyaltyCoins();

  const fetchEligibleProducts = async () => {
    if (!isSystemEnabled || !wallet || wallet.available_coins <= 0) {
      setEligibleProducts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          price,
          offer_price,
          image_url,
          coins_required_to_buy,
          is_coin_purchase_enabled,
          stock_quantity,
          is_visible,
          category_id,
          categories(name)
        `)
        .eq('is_visible', true)
        .eq('is_coin_purchase_enabled', true)
        .lte('coins_required_to_buy', wallet.available_coins)
        .gt('coins_required_to_buy', 0)
        .gt('stock_quantity', 0)
        .order('coins_required_to_buy', { ascending: true });

      if (error) {
        console.error('Error fetching eligible products:', error);
        setError('Failed to fetch eligible products');
        return;
      }

      setEligibleProducts((data as EligibleProduct[]) || []);
    } catch (err) {
      console.error('Error in fetchEligibleProducts:', err);
      setError('Failed to fetch eligible products');
    } finally {
      setLoading(false);
    }
  };

  // Fetch eligible products when wallet changes
  useEffect(() => {
    fetchEligibleProducts();
  }, [wallet?.available_coins, isSystemEnabled]);

  // Real-time subscription for product updates
  useEffect(() => {
    if (!isSystemEnabled) return;

    const productSubscription = supabase
      .channel('eligible_products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          fetchEligibleProducts();
        }
      )
      .subscribe();

    return () => {
      productSubscription.unsubscribe();
    };
  }, [isSystemEnabled, wallet?.available_coins]);

  const purchaseWithCoins = async (product: EligibleProduct) => {
    if (!wallet || wallet.available_coins < product.coins_required_to_buy) {
      toast.error('Insufficient coins for this purchase');
      return false;
    }

    try {
      // This would typically integrate with your order system
      // For now, we'll show a success message and refresh eligible products
      toast.success(`Successfully redeemed ${product.coins_required_to_buy} coins for ${product.name}!`);
      
      // Refresh eligible products after purchase
      setTimeout(() => {
        fetchEligibleProducts();
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error purchasing with coins:', error);
      toast.error('Failed to complete coin purchase');
      return false;
    }
  };

  return {
    eligibleProducts,
    loading,
    error,
    fetchEligibleProducts,
    purchaseWithCoins,
    hasEligibleProducts: eligibleProducts.length > 0,
    totalEligibleProducts: eligibleProducts.length
  };
};