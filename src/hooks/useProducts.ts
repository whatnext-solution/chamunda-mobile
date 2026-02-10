import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  offer_price: number | null;
  image_url: string | null;
  category_id: string | null;
  is_visible: boolean;
  is_featured: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useProducts(options?: { featured?: boolean; categoryId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      try {
        let query = supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('is_visible', true)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false });
        
        if (options?.featured) {
          query = query.eq('is_featured', true);
        }
        
        if (options?.categoryId) {
          query = query.eq('category_id', options.categoryId);
        }
        
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.warn('Products not available:', error.message);
          return [];
        }
        
        return data as Product[];
      } catch (err) {
        console.warn('Error fetching products:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('slug', slug)
          .eq('is_visible', true)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .maybeSingle();
        
        if (error) {
          console.warn('Product not available:', error.message);
          return null;
        }
        
        return data as Product | null;
      } catch (err) {
        console.warn('Error fetching product:', err);
        return null;
      }
    },
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}