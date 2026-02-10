import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.warn('Categories not available:', error.message);
          return [];
        }
        
        return data as Category[];
      } catch (err) {
        console.warn('Error fetching categories:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}