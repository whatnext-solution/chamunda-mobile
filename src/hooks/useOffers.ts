import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Offer {
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
}

export function useOffers() {
  return useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Offers not available:', error.message);
          return [];
        }
        
        return data as Offer[];
      } catch (err) {
        console.warn('Error fetching offers:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}