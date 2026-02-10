import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface FOMOOffer {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  offer_type: 'regular' | 'flash_sale' | 'limited_stock' | 'countdown' | 'bundle';
  max_quantity: number | null;
  sold_quantity: number;
  flash_sale_duration: number | null;
  urgency_message: string | null;
  show_countdown: boolean;
  show_stock_warning: boolean;
  stock_warning_threshold: number;
  priority_level: number;
  auto_expire: boolean;
  remaining_quantity: number | null;
  sold_percentage: number | null;
  seconds_remaining: number | null;
  show_stock_urgency: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashSaleSlot {
  id: string;
  offer_id: string;
  slot_start_time: string;
  slot_end_time: string;
  is_active: boolean;
  slot_order: number;
  offer_title?: string;
  discount_percentage?: number;
  remaining_quantity?: number;
}

export interface OfferAnalytics {
  id: string;
  offer_id: string;
  date: string;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  countdown_interactions: number;
  stock_warning_views: number;
}

// Get all FOMO offers with calculated fields
export function useFOMOOffers() {
  return useQuery({
    queryKey: ['fomo-offers'],
    queryFn: async () => {
      try {
        // First try the FOMO view, fallback to regular offers
        let { data, error } = await supabase
          .from('fomo_offers_view')
          .select('*')
          .order('priority_level', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('FOMO view not available, falling back to regular offers:', error.message);
          // Fallback to regular offers table
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          
          if (fallbackError) {
            console.warn('Regular offers not available:', fallbackError.message);
            return [];
          }
          
          // Transform regular offers to FOMO format with defaults
          return fallbackData.map(offer => ({
            ...offer,
            offer_type: 'regular',
            max_quantity: null,
            sold_quantity: 0,
            flash_sale_duration: null,
            urgency_message: null,
            show_countdown: false,
            show_stock_warning: false,
            stock_warning_threshold: 10,
            priority_level: 1,
            auto_expire: false,
            remaining_quantity: null,
            sold_percentage: null,
            seconds_remaining: null,
            show_stock_urgency: false,
            products: []
          })) as FOMOOffer[];
        }
        
        return data as FOMOOffer[];
      } catch (err) {
        console.warn('Error fetching FOMO offers:', err);
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

// Get current active flash sale - DISABLED until database setup
export function useCurrentFlashSale() {
  return useQuery({
    queryKey: ['current-flash-sale'],
    queryFn: async () => {
      // Disabled until database functions are set up
      return null;
    },
    enabled: false, // Completely disable this query
    refetchInterval: false,
    staleTime: Infinity,
  });
}

// Get next flash sale - DISABLED until database setup
export function useNextFlashSale() {
  return useQuery({
    queryKey: ['next-flash-sale'],
    queryFn: async () => {
      // Disabled until database functions are set up
      return null;
    },
    enabled: false, // Completely disable this query
    refetchInterval: false,
    staleTime: Infinity,
  });
}

// Get flash sale slots for an offer
export function useFlashSaleSlots(offerId?: string) {
  return useQuery({
    queryKey: ['flash-sale-slots', offerId],
    queryFn: async () => {
      if (!offerId) return [];
      
      try {
        const { data, error } = await supabase
          .from('flash_sale_slots')
          .select('*')
          .eq('offer_id', offerId)
          .eq('is_active', true)
          .order('slot_order');
        
        if (error) {
          console.warn('Flash sale slots not available:', error.message);
          return [];
        }
        
        return data as FlashSaleSlot[];
      } catch (err) {
        console.warn('Error fetching flash sale slots:', err);
        return [];
      }
    },
    enabled: !!offerId,
    staleTime: 60000,
  });
}

// Track offer analytics
export function useTrackOfferAnalytics() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      offerId, 
      eventType, 
      revenueAmount = 0 
    }: { 
      offerId: string; 
      eventType: 'view' | 'click' | 'conversion' | 'countdown_interaction' | 'stock_warning_view';
      revenueAmount?: number;
    }) => {
      try {
        const { error } = await supabase
          .rpc('track_offer_analytics', {
            offer_id: offerId,
            event_type: eventType,
            revenue_amount: revenueAmount
          });
        
        if (error) {
          // Silently fail if function doesn't exist (FOMO setup not complete)
          console.warn('Analytics tracking not available:', error.message);
          return;
        }
      } catch (err) {
        // Silently fail for now
        console.warn('Analytics tracking failed:', err);
      }
    },
    onSuccess: () => {
      // Invalidate analytics queries
      queryClient.invalidateQueries({ queryKey: ['offer-analytics'] });
    }
  });
}

// Update offer sold quantity
export function useUpdateOfferQuantity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      offerId, 
      quantitySold 
    }: { 
      offerId: string; 
      quantitySold: number;
    }) => {
      try {
        const { error } = await supabase
          .rpc('update_offer_sold_quantity', {
            offer_id: offerId,
            quantity_sold: quantitySold
          });
        
        if (error) {
          console.warn('Update offer quantity function not available:', error.message);
          return;
        }
      } catch (err) {
        console.warn('Error updating offer quantity:', err);
      }
    },
    onSuccess: () => {
      // Invalidate FOMO offers to refresh stock quantities
      queryClient.invalidateQueries({ queryKey: ['fomo-offers'] });
      queryClient.invalidateQueries({ queryKey: ['current-flash-sale'] });
    }
  });
}

// Custom hook for countdown timer
export function useCountdownTimer(endTime: string | null) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: true
  });

  useEffect(() => {
    if (!endTime) {
      setTimeRemaining(prev => ({ ...prev, isExpired: true }));
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const totalSeconds = Math.floor(difference / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
        isExpired: false
      });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return timeRemaining;
}

// Get offer analytics
export function useOfferAnalytics(offerId?: string, dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['offer-analytics', offerId, dateRange],
    queryFn: async () => {
      try {
        let query = supabase
          .from('offer_analytics')
          .select('*');
        
        if (offerId) {
          query = query.eq('offer_id', offerId);
        }
        
        if (dateRange) {
          query = query
            .gte('date', dateRange.start)
            .lte('date', dateRange.end);
        }
        
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) {
          console.warn('Offer analytics not available:', error.message);
          return [];
        }
        
        return data as OfferAnalytics[];
      } catch (err) {
        console.warn('Error fetching offer analytics:', err);
        return [];
      }
    },
    enabled: !!offerId || !offerId, // Always enabled, but filtered by offerId if provided
    staleTime: 300000, // 5 minutes for analytics
  });
}

// Check if offer has limited stock
export function useOfferStockStatus(offer: FOMOOffer | null) {
  if (!offer) return { hasLimitedStock: false, isLowStock: false, stockPercentage: 0 };
  
  const hasLimitedStock = offer.max_quantity !== null;
  const isLowStock = offer.show_stock_urgency;
  const stockPercentage = offer.sold_percentage || 0;
  
  return {
    hasLimitedStock,
    isLowStock,
    stockPercentage,
    remainingQuantity: offer.remaining_quantity,
    soldQuantity: offer.sold_quantity
  };
}

// Get urgency level based on time and stock
export function useOfferUrgencyLevel(offer: FOMOOffer | null) {
  if (!offer) return 'none';
  
  const timeRemaining = offer.seconds_remaining;
  const isLowStock = offer.show_stock_urgency;
  const isFlashSale = offer.offer_type === 'flash_sale';
  
  if (isFlashSale && timeRemaining && timeRemaining < 3600) { // Less than 1 hour
    return 'critical';
  }
  
  if (isLowStock && timeRemaining && timeRemaining < 86400) { // Less than 1 day
    return 'high';
  }
  
  if (timeRemaining && timeRemaining < 259200) { // Less than 3 days
    return 'medium';
  }
  
  if (offer.show_countdown || offer.show_stock_warning) {
    return 'low';
  }
  
  return 'none';
}