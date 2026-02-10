import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Service {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        
        if (error) {
          console.warn('Services not available:', error.message);
          return [];
        }
        
        return data as Service[];
      } catch (err) {
        console.warn('Error fetching services:', err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}