import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { localNotificationService } from '@/services/localNotificationService';

export interface AffiliateUser {
  id: string;
  name: string;
  mobile_number: string;
  affiliate_code: string;
  is_active: boolean;
  total_clicks: number;
  total_orders: number;
  total_earnings: number;
  pending_commission: number;
  paid_commission: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  product_id: string;
  user_session_id: string;
  ip_address: string;
  clicked_at: string;
  converted_to_order: boolean;
  order_id?: string;
  products?: {
    name: string;
    price: number;
  };
}

export interface AffiliateOrder {
  id: string;
  affiliate_id: string;
  order_id: string;
  product_id: string;
  commission_type: string;
  commission_rate: number;
  product_price: number;
  quantity: number;
  commission_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  customer_name?: string;
  customer_email?: string;
  order_total?: number;
  created_at: string;
  confirmed_at?: string;
  products?: {
    name: string;
  };
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id?: string;
  transaction_type: 'earned' | 'reversed' | 'paid';
  amount: number;
  description: string;
  status: 'pending' | 'confirmed' | 'paid';
  created_at: string;
  processed_at?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method: 'upi' | 'bank_transfer' | 'manual';
  payment_details: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transaction_id?: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
}

export interface ProductAffiliateSettings {
  id: string;
  product_id: string;
  is_affiliate_enabled: boolean;
  commission_type: 'fixed' | 'percentage';
  commission_value: number;
  created_at: string;
  updated_at: string;
}

export const useAffiliate = () => {
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [clicks, setClicks] = useState<AffiliateClick[]>([]);
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all affiliates (Admin only)
  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('affiliate_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Affiliate tables not set up yet. Please run the affiliate database setup script.');
          setError('Affiliate system not configured. Please contact administrator.');
          return;
        }
        throw error;
      }
      setAffiliates(data || []);
    } catch (error: any) {
      console.error('Error fetching affiliates:', error);
      setError(error.message);
      toast.error('Failed to fetch affiliates');
    } finally {
      setLoading(false);
    }
  };

  // Create new affiliate (Admin only)
  const createAffiliate = async (affiliateData: {
    name: string;
    mobile_number: string;
    password: string;
    affiliate_code?: string;
  }) => {
    try {
      setLoading(true);

      // Generate affiliate code if not provided
      let affiliateCode = affiliateData.affiliate_code;
      if (!affiliateCode) {
        const { data: codeData, error: codeError } = await (supabase as any)
          .rpc('generate_affiliate_code');
        
        if (codeError) throw codeError;
        affiliateCode = codeData;
      }

      // Hash password (in real implementation, use proper hashing)
      const passwordHash = btoa(affiliateData.password); // Simple base64 for demo

      const { data, error } = await (supabase as any)
        .from('affiliate_users')
        .insert([{
          name: affiliateData.name,
          mobile_number: affiliateData.mobile_number,
          password_hash: passwordHash,
          affiliate_code: affiliateCode,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Affiliate created successfully');
      await fetchAffiliates();
      return data;
    } catch (error: any) {
      console.error('Error creating affiliate:', error);
      setError(error.message);
      toast.error('Failed to create affiliate');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update affiliate
  const updateAffiliate = async (id: string, updates: Partial<AffiliateUser>) => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('affiliate_users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Affiliate updated successfully');
      await fetchAffiliates();
      return data;
    } catch (error: any) {
      console.error('Error updating affiliate:', error);
      setError(error.message);
      toast.error('Failed to update affiliate');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete affiliate
  const deleteAffiliate = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await (supabase as any)
        .from('affiliate_users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Affiliate deleted successfully');
      await fetchAffiliates();
    } catch (error: any) {
      console.error('Error deleting affiliate:', error);
      setError(error.message);
      toast.error('Failed to delete affiliate');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch affiliate clicks
  const fetchAffiliateClicks = async (affiliateId?: string) => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('affiliate_clicks')
        .select(`
          *,
          products!inner (name, price, slug),
          affiliate_users!inner (name, affiliate_code)
        `)
        .order('clicked_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;

      if (error) {
        // Handle relationship errors gracefully
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn('Affiliate clicks table relationship not found. Please run the affiliate database setup.');
          setError('Affiliate system not properly configured. Please contact administrator.');
          return;
        }
        throw error;
      }
      
      // Transform data to match ClickAnalytics interface
      const transformedData = (data || []).map((click: any) => ({
        ...click,
        products: click.products,
        affiliates: click.affiliate_users
      }));
      
      setClicks(transformedData);
    } catch (error: any) {
      console.error('Error fetching clicks:', error);
      setError(error.message);
      toast.error('Failed to fetch clicks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch affiliate orders
  const fetchAffiliateOrders = async (affiliateId?: string) => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('affiliate_orders')
        .select(`
          *,
          products!inner (name)
        `)
        .order('created_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;

      if (error) {
        // Handle relationship errors gracefully
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn('Affiliate orders table relationship not found. Please run the affiliate database setup.');
          setError('Affiliate system not properly configured. Please contact administrator.');
          return;
        }
        throw error;
      }
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch affiliate commissions
  const fetchAffiliateCommissions = async (affiliateId?: string) => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('affiliate_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      console.error('Error fetching commissions:', error);
      setError(error.message);
      toast.error('Failed to fetch commissions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch affiliate payouts
  const fetchAffiliatePayouts = async (affiliateId?: string) => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('affiliate_payouts')
        .select('*')
        .order('requested_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayouts(data || []);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      setError(error.message);
      toast.error('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  // Track affiliate click with enhanced data
  const trackAffiliateClick = async (affiliateCode: string, productId: string) => {
    try {
      // Get affiliate by code
      const { data: affiliate, error: affiliateError } = await (supabase as any)
        .from('affiliate_users')
        .select('id')
        .eq('affiliate_code', affiliateCode)
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliate) {
        console.error('Invalid affiliate code:', affiliateCode);
        return null;
      }

      // Create session ID for tracking
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Detect device type
      const userAgent = navigator.userAgent;
      let deviceType = 'desktop';
      if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) {
          deviceType = 'tablet';
        } else {
          deviceType = 'mobile';
        }
      }

      // Detect browser
      let browser = 'Unknown';
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      else if (userAgent.includes('Opera')) browser = 'Opera';

      // Extract UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');

      // Get approximate location (you might want to use a geolocation service)
      let location = 'Unknown';
      try {
        // This is a simple approach - in production, you might want to use a proper geolocation service
        const response = await fetch('https://ipapi.co/json/');
        const locationData = await response.json();
        location = `${locationData.city}, ${locationData.country_name}`;
      } catch (error) {
        console.warn('Could not get location data:', error);
      }

      // Track the click with enhanced data
      const { data, error } = await (supabase as any)
        .from('affiliate_clicks')
        .insert([{
          affiliate_id: affiliate.id,
          product_id: productId,
          user_session_id: sessionId,
          ip_address: '0.0.0.0', // Would get real IP in production
          user_agent: userAgent,
          referrer_url: document.referrer,
          device_type: deviceType,
          browser: browser,
          location: location,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign
        }])
        .select()
        .single();

      if (error) throw error;

      // Store session for later order attribution
      localStorage.setItem('affiliate_session', JSON.stringify({
        sessionId,
        affiliateId: affiliate.id,
        affiliateCode,
        timestamp: Date.now()
      }));

      return data;
    } catch (error: any) {
      console.error('Error tracking click:', error);
      return null;
    }
  };

  // Process affiliate order (called when order is placed)
  const processAffiliateOrder = async (orderId: string, orderItems: any[]) => {
    try {
      const affiliateSession = localStorage.getItem('affiliate_session');
      if (!affiliateSession) return;

      const session = JSON.parse(affiliateSession);
      
      // Check if session is still valid (30 days)
      const sessionAge = Date.now() - session.timestamp;
      if (sessionAge > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('affiliate_session');
        return;
      }

      // Process each order item
      for (const item of orderItems) {
        // Get product affiliate settings
        const { data: settings, error: settingsError } = await (supabase as any)
          .from('product_affiliate_settings')
          .select('*')
          .eq('product_id', item.product_id)
          .eq('is_affiliate_enabled', true)
          .single();

        if (settingsError || !settings) continue;

        // Calculate commission
        const { data: commission, error: commissionError } = await (supabase as any)
          .rpc('calculate_affiliate_commission', {
            p_commission_type: settings.commission_type,
            p_commission_value: settings.commission_value,
            p_product_price: item.unit_price,
            p_quantity: item.quantity
          });

        if (commissionError) continue;

        // Create affiliate order record
        const { data: affiliateOrder, error: orderError } = await (supabase as any)
          .from('affiliate_orders')
          .insert([{
            affiliate_id: session.affiliateId,
            order_id: orderId,
            product_id: item.product_id,
            commission_type: settings.commission_type,
            commission_rate: settings.commission_value,
            product_price: item.unit_price,
            quantity: item.quantity,
            commission_amount: commission,
            status: 'pending'
          }])
          .select()
          .single();

        if (orderError) continue;

        // Create commission record
        await (supabase as any)
          .from('affiliate_commissions')
          .insert([{
            affiliate_id: session.affiliateId,
            order_id: orderId,
            affiliate_order_id: affiliateOrder.id,
            transaction_type: 'earned',
            amount: commission,
            description: `Commission for order ${orderId}`,
            status: 'pending'
          }]);

        // Update click as converted
        await (supabase as any)
          .from('affiliate_clicks')
          .update({ 
            converted_to_order: true, 
            order_id: orderId 
          })
          .eq('user_session_id', session.sessionId)
          .eq('product_id', item.product_id);

        // Create local admin notification for new affiliate order
        try {
          const { data: affiliateData } = await (supabase as any)
            .from('affiliate_users')
            .select('name')
            .eq('id', session.affiliateId)
            .single();

          if (affiliateData?.name) {
            await localNotificationService.notifyAffiliateNewOrder(
              session.affiliateId,
              affiliateData.name,
              orderId,
              commission
            );
          }
        } catch (notificationError) {
          console.error('Error creating affiliate order notification:', notificationError);
        }
      }

      // Clear session after processing
      localStorage.removeItem('affiliate_session');
    } catch (error: any) {
      console.error('Error processing affiliate order:', error);
    }
  };

  // Confirm affiliate commission (Admin only)
  const confirmAffiliateCommission = async (commissionId: string) => {
    try {
      setLoading(true);
      const { error } = await (supabase as any)
        .from('affiliate_commissions')
        .update({ 
          status: 'confirmed',
          processed_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) throw error;

      // Also update the affiliate order status
      const { error: orderError } = await (supabase as any)
        .from('affiliate_orders')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (orderError) throw orderError;

      toast.success('Commission confirmed');
      
      // Create local admin notification for commission confirmation
      try {
        const { data: commissionData } = await (supabase as any)
          .from('affiliate_commissions')
          .select(`
            *,
            affiliate_users (
              name
            )
          `)
          .eq('id', commissionId)
          .single();

        if (commissionData?.affiliate_users?.name) {
          await localNotificationService.notifyAffiliateCommissionPending(
            commissionData.affiliate_id,
            commissionData.affiliate_users.name,
            commissionData.order_id || commissionId,
            commissionData.amount
          );
        }
      } catch (notificationError) {
        console.error('Error creating commission notification:', notificationError);
      }
      
      await fetchAffiliateCommissions();
      await fetchAffiliateOrders();
    } catch (error: any) {
      console.error('Error confirming commission:', error);
      setError(error.message);
      toast.error('Failed to confirm commission');
    } finally {
      setLoading(false);
    }
  };

  // Request payout (Affiliate)
  const requestPayout = async (amount: number, paymentMethod: string, paymentDetails: any) => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('affiliate_payouts')
        .insert([{
          amount,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Payout requested successfully');
      await fetchAffiliatePayouts();
      return data;
    } catch (error: any) {
      console.error('Error requesting payout:', error);
      setError(error.message);
      toast.error('Failed to request payout');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Process payout (Admin only)
  const processPayout = async (payoutId: string, status: string, transactionId?: string, notes?: string) => {
    try {
      setLoading(true);
      const { error } = await (supabase as any)
        .from('affiliate_payouts')
        .update({ 
          status,
          transaction_id: transactionId,
          notes,
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      if (error) throw error;

      // If completed, create paid commission record
      if (status === 'completed') {
        const { data: payout } = await (supabase as any)
          .from('affiliate_payouts')
          .select('affiliate_id, amount')
          .eq('id', payoutId)
          .single();

        if (payout) {
          await (supabase as any)
            .from('affiliate_commissions')
            .insert([{
              affiliate_id: payout.affiliate_id,
              transaction_type: 'paid',
              amount: payout.amount,
              description: `Payout processed - ${transactionId}`,
              status: 'confirmed'
            }]);
        }
      }

      toast.success('Payout processed successfully');
      
      // Create local admin notification for payout processing
      try {
        const { data: payoutData } = await (supabase as any)
          .from('affiliate_payouts')
          .select(`
            *,
            affiliate_users (
              name
            )
          `)
          .eq('id', payoutId)
          .single();

        if (payoutData?.affiliate_users?.name) {
          // Count pending payouts for notification
          const { data: pendingPayouts } = await (supabase as any)
            .from('affiliate_payouts')
            .select('id, affiliate_id')
            .eq('status', 'pending');

          if (pendingPayouts && pendingPayouts.length > 0) {
            const uniqueAffiliates = [...new Set(pendingPayouts.map(p => p.affiliate_id))];
            const totalAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
            
            await localNotificationService.notifyAffiliatePayoutDue(
              uniqueAffiliates.length,
              totalAmount,
              uniqueAffiliates
            );
          }
        }
      } catch (notificationError) {
        console.error('Error creating payout notification:', notificationError);
      }
      
      await fetchAffiliatePayouts();
      await fetchAffiliateCommissions();
    } catch (error: any) {
      console.error('Error processing payout:', error);
      setError(error.message);
      toast.error('Failed to process payout');
    } finally {
      setLoading(false);
    }
  };

  return {
    affiliates,
    clicks,
    orders,
    commissions,
    payouts,
    loading,
    error,
    fetchAffiliates,
    createAffiliate,
    updateAffiliate,
    deleteAffiliate,
    fetchAffiliateClicks,
    fetchAffiliateOrders,
    fetchAffiliateCommissions,
    fetchAffiliatePayouts,
    trackAffiliateClick,
    processAffiliateOrder,
    confirmAffiliateCommission,
    requestPayout,
    processPayout
  };
};