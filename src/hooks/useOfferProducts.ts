import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from './useProducts';

export interface OfferWithProducts {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products: Product[];
}

export interface OfferProduct {
  id: string;
  offer_id: string;
  product_id: string;
  created_at: string;
  offers: {
    id: string;
    title: string;
    description: string | null;
    banner_url: string | null;
    discount_percentage: number | null;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
  };
  products: Product;
}

// Get all offers with their associated products
export function useOffersWithProducts() {
  return useQuery({
    queryKey: ['offers-with-products'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            offer_products (
              id,
              products (
                *,
                categories (id, name, slug)
              )
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Offers with products not available:', error.message);
          return [];
        }
        
        // Transform the data to include products array directly
        const offersWithProducts: OfferWithProducts[] = data.map(offer => ({
          ...offer,
          products: offer.offer_products?.map((op: any) => op.products).filter(Boolean) || []
        }));
        
        return offersWithProducts;
      } catch (err) {
        console.warn('Error fetching offers with products:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Get products that are part of any active offer
export function useProductsOnOffer() {
  return useQuery({
    queryKey: ['products-on-offer'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('offer_products')
          .select(`
            *,
            offers!inner (
              id,
              title,
              description,
              banner_url,
              discount_percentage,
              start_date,
              end_date,
              is_active
            ),
            products!inner (
              *,
              categories (id, name, slug)
            )
          `)
          .eq('offers.is_active', true)
          .order('offers.created_at', { ascending: false });
        
        if (error) {
          console.warn('Products on offer not available:', error.message);
          return [];
        }
        
        return data as OfferProduct[];
      } catch (err) {
        console.warn('Error fetching products on offer:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Get specific offer with its products
export function useOfferWithProducts(offerId: string) {
  return useQuery({
    queryKey: ['offer-with-products', offerId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            offer_products (
              id,
              products (
                *,
                categories (id, name, slug)
              )
            )
          `)
          .eq('id', offerId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) {
          console.warn('Offer with products not available:', error.message);
          return null;
        }
        
        if (!data) return null;
        
        // Transform the data to include products array directly
        const offerWithProducts: OfferWithProducts = {
          ...data,
          products: data.offer_products?.map((op: any) => op.products).filter(Boolean) || []
        };
        
        return offerWithProducts;
      } catch (err) {
        console.warn('Error fetching offer with products:', err);
        return null;
      }
    },
    enabled: !!offerId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Check if a product is part of any active offer
export function useProductOfferStatus(productId: string) {
  return useQuery({
    queryKey: ['product-offer-status', productId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('offer_products')
          .select(`
            *,
            offers!inner (
              id,
              title,
              discount_percentage,
              start_date,
              end_date,
              is_active
            )
          `)
          .eq('product_id', productId)
          .eq('offers.is_active', true);
        
        if (error) {
          console.warn('Product offer status not available:', error.message);
          return null;
        }
        
        return data.length > 0 ? data[0] : null;
      } catch (err) {
        console.warn('Error fetching product offer status:', err);
        return null;
      }
    },
    enabled: !!productId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}