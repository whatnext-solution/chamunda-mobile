import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroCarouselSlide {
  id: string;
  title: string;
  description: string | null;
  background_image_url: string;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHeroCarouselSlides() {
  return useQuery({
    queryKey: ['hero-carousel-slides'],
    queryFn: async (): Promise<HeroCarouselSlide[]> => {
      const { data, error } = await supabase
        .from('hero_carousel_slides')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching hero carousel slides:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once on failure
  });
}

// Hook for admin to get all slides (including inactive)
export function useAllHeroCarouselSlides() {
  return useQuery({
    queryKey: ['all-hero-carousel-slides'],
    queryFn: async (): Promise<HeroCarouselSlide[]> => {
      const { data, error } = await supabase
        .from('hero_carousel_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching all hero carousel slides:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for admin
  });
}

// Mutation hooks for admin operations
export async function createHeroCarouselSlide(slide: Omit<HeroCarouselSlide, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('hero_carousel_slides')
    .insert([slide])
    .select()
    .single();

  if (error) {
    console.error('Error creating hero carousel slide:', error);
    throw error;
  }

  return data;
}

export async function updateHeroCarouselSlide(id: string, updates: Partial<Omit<HeroCarouselSlide, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('hero_carousel_slides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating hero carousel slide:', error);
    throw error;
  }

  return data;
}

export async function deleteHeroCarouselSlide(id: string) {
  const { error } = await supabase
    .from('hero_carousel_slides')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting hero carousel slide:', error);
    throw error;
  }

  return true;
}

export async function reorderHeroCarouselSlides(slides: { id: string; display_order: number }[]) {
  const updates = slides.map(slide => 
    supabase
      .from('hero_carousel_slides')
      .update({ display_order: slide.display_order })
      .eq('id', slide.id)
  );

  const results = await Promise.all(updates);
  
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error('Error reordering hero carousel slides:', errors);
    throw new Error('Failed to reorder slides');
  }

  return true;
}