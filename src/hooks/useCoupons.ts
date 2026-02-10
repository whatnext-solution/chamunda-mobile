import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAffiliate } from '@/hooks/useAffiliate';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  coupon_code: string;
  coupon_title: string;
  description: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  applicable_on: 'all' | 'products' | 'categories';
  is_user_specific: boolean;
  target_user_ids?: string[];
  is_affiliate_specific: boolean;
  affiliate_id?: string;
  coins_integration_type: 'none' | 'earn_extra' | 'purchasable' | 'required';
  bonus_coins_earned: number;
  coins_required_to_unlock: number;
  min_coins_required: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  total_usage_limit?: number;
  per_user_usage_limit: number;
  daily_usage_limit?: number;
  allow_stacking_with_coupons: boolean;
  allow_stacking_with_coins: boolean;
  total_usage_count: number;
  total_discount_given: number;
  total_revenue_generated: number;
  created_at: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountAmount: number;
  bonusCoins: number;
  discountType: 'flat' | 'percentage';
  discountValue: number;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  discount_amount?: number;
  bonus_coins?: number;
  coupon_title?: string;
  description?: string;
}

export const useCoupons = () => {
  const { user } = useAuth();
  const { currentAffiliate } = useAffiliate();
  const [loading, setLoading] = useState(false);

  // Validate coupon eligibility
  const validateCoupon = async (
    couponCode: string,
    orderTotal: number,
    cartItems: any[] = []
  ): Promise<CouponValidationResult> => {
    if (!user) {
      return { valid: false, error: 'Please login to apply coupons' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon_eligibility', {
        p_coupon_code: couponCode.toUpperCase(),
        p_user_id: user.id,
        p_order_total: orderTotal,
        p_cart_items: JSON.stringify(cartItems),
        p_affiliate_id: currentAffiliate?.id || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error validating coupon:', error);
      return { valid: false, error: 'Failed to validate coupon' };
    } finally {
      setLoading(false);
    }
  };

  // Apply coupon to order
  const applyCouponToOrder = async (
    couponCode: string,
    orderId: string,
    orderTotal: number
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.rpc('apply_coupon_to_order', {
        p_coupon_code: couponCode.toUpperCase(),
        p_user_id: user.id,
        p_order_id: orderId,
        p_order_total: orderTotal,
        p_affiliate_id: currentAffiliate?.id || null
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply coupon');
      }

      return data;
    } catch (error) {
      console.error('Error applying coupon to order:', error);
      throw error;
    }
  };

  // Get available coupons for user
  const getAvailableCoupons = async (orderTotal: number = 0) => {
    if (!user) return [];

    try {
      // Fetch public coupons
      let publicQuery = supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .eq('is_user_specific', false)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

      if (orderTotal > 0) {
        publicQuery = publicQuery.lte('min_order_value', orderTotal);
      }

      const { data: publicCoupons, error: publicError } = await publicQuery;
      if (publicError) throw publicError;

      // Fetch user-specific coupons
      const { data: userCoupons, error: userError } = await supabase
        .from('user_coupons')
        .select(`
          coupon_id,
          is_used,
          usage_count,
          coupons (*)
        `)
        .eq('user_id', user.id)
        .eq('is_used', false);

      if (userError) throw userError;

      // Combine and filter coupons
      const allCoupons = [
        ...(publicCoupons || []).filter(coupon => 
          !coupon.is_affiliate_specific || coupon.affiliate_id === currentAffiliate?.id
        ),
        ...(userCoupons || [])
          .map(uc => uc.coupons)
          .filter(Boolean)
          .filter(coupon => coupon.is_active)
      ];

      // Remove duplicates
      const uniqueCoupons = allCoupons.filter((coupon, index, self) => 
        index === self.findIndex(c => c.id === coupon.id)
      );

      return uniqueCoupons;
    } catch (error) {
      console.error('Error fetching available coupons:', error);
      return [];
    }
  };

  // Get user's coupon usage history
  const getCouponUsageHistory = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('coupon_usage')
        .select(`
          *,
          coupons (coupon_code, coupon_title),
          orders (id, invoice_number)
        `)
        .eq('user_id', user.id)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching coupon usage history:', error);
      return [];
    }
  };

  // Get user's assigned coupons
  const getUserCoupons = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupons (*)
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user coupons:', error);
      return [];
    }
  };

  // Admin: Create coupon
  const createCoupon = async (couponData: Partial<Coupon>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert([{
          ...couponData,
          coupon_code: couponData.coupon_code?.toUpperCase(),
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  };

  // Admin: Update coupon
  const updateCoupon = async (couponId: string, couponData: Partial<Coupon>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update({
          ...couponData,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  };

  // Admin: Delete coupon
  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw error;
    }
  };

  // Admin: Assign coupon to user
  const assignCouponToUser = async (
    couponId: string, 
    userId: string, 
    reason?: string,
    expiresAt?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('user_coupons')
        .insert([{
          user_id: userId,
          coupon_id: couponId,
          assigned_by: user?.id,
          assignment_reason: reason,
          expires_at: expiresAt
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error assigning coupon to user:', error);
      throw error;
    }
  };

  // Admin: Get coupon analytics
  const getCouponAnalytics = async (couponId?: string, days: number = 30) => {
    try {
      let query = supabase
        .from('coupon_analytics')
        .select('*')
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (couponId) {
        query = query.eq('coupon_id', couponId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching coupon analytics:', error);
      return [];
    }
  };

  // Generate unique coupon code
  const generateCouponCode = (prefix: string = 'SAVE') => {
    const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `${prefix}${randomNum}`;
  };

  // Calculate discount amount
  const calculateDiscount = (
    discountType: 'flat' | 'percentage',
    discountValue: number,
    orderTotal: number,
    maxDiscountAmount?: number
  ) => {
    if (discountType === 'flat') {
      return Math.min(discountValue, orderTotal);
    } else {
      const discount = (orderTotal * discountValue) / 100;
      return maxDiscountAmount ? Math.min(discount, maxDiscountAmount) : discount;
    }
  };

  return {
    loading,
    validateCoupon,
    applyCouponToOrder,
    getAvailableCoupons,
    getCouponUsageHistory,
    getUserCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    assignCouponToUser,
    getCouponAnalytics,
    generateCouponCode,
    calculateDiscount
  };
};