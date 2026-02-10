import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductAffiliateSettings {
  id: string;
  product_id: string;
  is_affiliate_enabled: boolean;
  commission_type: 'fixed' | 'percentage';
  commission_value: number;
  created_at: string;
  updated_at: string;
}

export const useProductAffiliate = () => {
  const [settings, setSettings] = useState<ProductAffiliateSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all product affiliate settings
  const fetchProductAffiliateSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('product_affiliate_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching product affiliate settings:', error);
      setError(error.message);
      toast.error('Failed to fetch affiliate settings');
    } finally {
      setLoading(false);
    }
  };

  // Get affiliate settings for a specific product
  const getProductAffiliateSettings = async (productId: string): Promise<ProductAffiliateSettings | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_affiliate_settings')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors

      if (error && error.code !== 'PGRST116') {
        console.warn('Affiliate settings query error:', error);
        return null;
      }
      return data || null;
    } catch (error: any) {
      console.error('Error fetching product affiliate settings:', error);
      return null;
    }
  };

  // Update or create product affiliate settings
  const updateProductAffiliateSettings = async (
    productId: string, 
    settings: {
      is_affiliate_enabled: boolean;
      commission_type: 'fixed' | 'percentage';
      commission_value: number;
    }
  ) => {
    try {
      setLoading(true);
      
      // Check if settings exist
      const existing = await getProductAffiliateSettings(productId);
      
      let data;
      if (existing) {
        // Update existing settings
        const { data: updatedData, error } = await (supabase as any)
          .from('product_affiliate_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', productId)
          .select()
          .single();

        if (error) throw error;
        data = updatedData;
      } else {
        // Create new settings
        const { data: newData, error } = await (supabase as any)
          .from('product_affiliate_settings')
          .insert([{
            product_id: productId,
            ...settings
          }])
          .select()
          .single();

        if (error) throw error;
        data = newData;
      }

      toast.success('Affiliate settings updated successfully');
      await fetchProductAffiliateSettings();
      return data;
    } catch (error: any) {
      console.error('Error updating product affiliate settings:', error);
      setError(error.message);
      toast.error('Failed to update affiliate settings');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Bulk update affiliate settings for multiple products
  const bulkUpdateAffiliateSettings = async (
    productIds: string[],
    settings: {
      is_affiliate_enabled: boolean;
      commission_type: 'fixed' | 'percentage';
      commission_value: number;
    }
  ) => {
    try {
      setLoading(true);
      
      // Prepare data for upsert
      const upsertData = productIds.map(productId => ({
        product_id: productId,
        ...settings,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await (supabase as any)
        .from('product_affiliate_settings')
        .upsert(upsertData, { 
          onConflict: 'product_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;

      toast.success(`Affiliate settings updated for ${productIds.length} products`);
      await fetchProductAffiliateSettings();
      return data;
    } catch (error: any) {
      console.error('Error bulk updating affiliate settings:', error);
      setError(error.message);
      toast.error('Failed to bulk update affiliate settings');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get affiliate-enabled products with their settings
  const getAffiliateEnabledProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('product_affiliate_settings')
        .select(`
          *,
          products (
            id,
            name,
            price,
            offer_price,
            image_url,
            slug,
            is_visible
          )
        `)
        .eq('is_affiliate_enabled', true)
        .eq('products.is_visible', true);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching affiliate-enabled products:', error);
      setError(error.message);
      toast.error('Failed to fetch affiliate products');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Calculate commission for a product
  const calculateCommission = (
    commissionType: 'fixed' | 'percentage',
    commissionValue: number,
    productPrice: number,
    quantity: number = 1
  ): number => {
    const totalPrice = productPrice * quantity;
    
    if (commissionType === 'fixed') {
      return commissionValue * quantity;
    } else if (commissionType === 'percentage') {
      return (totalPrice * commissionValue) / 100;
    }
    
    return 0;
  };

  // Generate affiliate link for a product
  const generateAffiliateLink = (productSlug: string, affiliateCode: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/product/${productSlug}?ref=${affiliateCode}`;
  };

  // Validate affiliate commission settings
  const validateCommissionSettings = (
    commissionType: 'fixed' | 'percentage',
    commissionValue: number,
    productPrice: number
  ): { isValid: boolean; message?: string } => {
    if (commissionValue <= 0) {
      return { isValid: false, message: 'Commission value must be greater than 0' };
    }

    if (commissionType === 'percentage') {
      if (commissionValue > 100) {
        return { isValid: false, message: 'Percentage commission cannot exceed 100%' };
      }
      
      const calculatedCommission = (productPrice * commissionValue) / 100;
      if (calculatedCommission >= productPrice) {
        return { isValid: false, message: 'Commission cannot be equal to or greater than product price' };
      }
    } else if (commissionType === 'fixed') {
      if (commissionValue >= productPrice) {
        return { isValid: false, message: 'Fixed commission cannot be equal to or greater than product price' };
      }
    }

    return { isValid: true };
  };

  // Get affiliate statistics for products
  const getProductAffiliateStats = async (productId?: string) => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('affiliate_orders')
        .select(`
          product_id,
          commission_amount,
          status,
          products!inner (name, price)
        `);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        // Handle relationship errors gracefully
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn('Product affiliate stats relationship not found. Please run the affiliate database setup.');
          return [];
        }
        throw error;
      }

      // Group by product and calculate stats
      const stats = (data || []).reduce((acc: any, order: any) => {
        const productId = order.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            product_id: productId,
            product_name: order.products?.name || 'Unknown',
            product_price: order.products?.price || 0,
            total_orders: 0,
            confirmed_orders: 0,
            total_commission: 0,
            confirmed_commission: 0
          };
        }

        acc[productId].total_orders += 1;
        acc[productId].total_commission += order.commission_amount;

        if (order.status === 'confirmed') {
          acc[productId].confirmed_orders += 1;
          acc[productId].confirmed_commission += order.commission_amount;
        }

        return acc;
      }, {});

      return Object.values(stats);
    } catch (error: any) {
      console.error('Error fetching product affiliate stats:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductAffiliateSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchProductAffiliateSettings,
    getProductAffiliateSettings,
    updateProductAffiliateSettings,
    bulkUpdateAffiliateSettings,
    getAffiliateEnabledProducts,
    calculateCommission,
    generateAffiliateLink,
    validateCommissionSettings,
    getProductAffiliateStats
  };
};