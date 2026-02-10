import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreSettings {
  id: string;
  store_name: string;
  whatsapp_number: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  google_maps_embed: string | null;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 'default',
  store_name: 'ElectroStore',
  whatsapp_number: '+1234567890',
  email: 'info@electrostore.com',
  phone: '+1234567890',
  address: 'Your Store Address Here',
  google_maps_embed: null
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.warn('Store settings not available, using defaults:', error.message);
          return DEFAULT_STORE_SETTINGS;
        }
        
        return data || DEFAULT_STORE_SETTINGS;
      } catch (err) {
        console.warn('Error fetching store settings, using defaults:', err);
        return DEFAULT_STORE_SETTINGS;
      }
    },
    retry: false, // Don't retry on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}