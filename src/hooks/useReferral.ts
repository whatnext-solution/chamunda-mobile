import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  total_coins_earned: number;
  is_active: boolean;
}

interface ReferralSettings {
  is_enabled: boolean;
  referrer_reward_coins: number;
  referee_welcome_coins: number;
  minimum_order_value: number;
  require_first_order: boolean;
}

export const useReferral = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
      loadSettings();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('user_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setReferralData(data);
    } catch (error) {
      console.error('Error loading referral data:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('referral_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Handle multiple records case
      if (error?.code === 'PGRST116') {
        const { data: allSettings, error: allError } = await (supabase as any)
          .from('referral_settings')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) throw allError;
        setSettings(allSettings?.[0] || null);
      } else {
        setSettings(data || null);
      }
    } catch (error) {
      console.error('Error loading referral settings:', error);
    }
  };

  const processReferralSignup = async (referralCode: string, newUserId: string) => {
    try {
      setLoading(true);

      // Get client IP (simplified - in production, use proper IP detection)
      const clientIP = '127.0.0.1'; // Placeholder
      const userAgent = navigator.userAgent;

      const { data, error } = await (supabase as any).rpc('process_referral_signup', {
        p_referee_id: newUserId,
        p_referral_code: referralCode,
        p_ip_address: clientIP,
        p_user_agent: userAgent
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          data.requires_order 
            ? 'Referral registered! Complete your first order to earn coins.'
            : `Welcome! You've earned ${data.referee_coins} coins!`
        );
        return { success: true, data };
      } else {
        toast.error(data?.error || 'Failed to process referral');
        return { success: false, error: data?.error };
      }
    } catch (error) {
      console.error('Error processing referral signup:', error);
      toast.error('Failed to process referral');
      return { success: false, error: 'Failed to process referral' };
    } finally {
      setLoading(false);
    }
  };

  const processReferralOrderCompletion = async (orderId: string, userId: string, orderValue: number) => {
    try {
      const { data, error } = await (supabase as any).rpc('process_referral_order_completion', {
        p_order_id: orderId,
        p_user_id: userId,
        p_order_value: orderValue
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Referral bonus credited! You earned ${data.referee_coins} coins.`);
        
        // Reload referral data if this is the referrer
        if (user?.id === userId) {
          loadReferralData();
        }
        
        return { success: true, data };
      } else {
        console.log('No referral bonus:', data?.error);
        return { success: false, error: data?.error };
      }
    } catch (error) {
      console.error('Error processing referral order completion:', error);
      return { success: false, error: 'Failed to process referral order completion' };
    }
  };

  const validateReferralCode = async (code: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_referral_codes')
        .select('referral_code, user_id, is_active')
        .eq('referral_code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { valid: false, error: 'Invalid referral code' };
      }

      // Check if user is trying to refer themselves
      if (user && data.user_id === user.id) {
        return { valid: false, error: 'Cannot use your own referral code' };
      }

      return { valid: true, data };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { valid: false, error: 'Failed to validate referral code' };
    }
  };

  const getReferralLink = () => {
    if (!referralData) return '';
    return `${window.location.origin}/signup?ref=${referralData.referral_code}`;
  };

  const shareReferral = async (platform: 'whatsapp' | 'copy' | 'native') => {
    const link = getReferralLink();
    const message = `🎉 Join me on our amazing platform and get ${settings?.referee_welcome_coins} coins as welcome bonus! Use my referral link: ${link}`;

    try {
      switch (platform) {
        case 'whatsapp':
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
          break;

        case 'copy':
          await navigator.clipboard.writeText(link);
          toast.success('Referral link copied to clipboard!');
          break;

        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: 'Join me and earn coins!',
              text: `Get ${settings?.referee_welcome_coins} coins as welcome bonus!`,
              url: link
            });
          } else {
            // Fallback to copy
            await navigator.clipboard.writeText(link);
            toast.success('Referral link copied to clipboard!');
          }
          break;
      }
    } catch (error) {
      console.error('Error sharing referral:', error);
      toast.error('Failed to share referral link');
    }
  };

  return {
    referralData,
    settings,
    loading,
    processReferralSignup,
    processReferralOrderCompletion,
    validateReferralCode,
    getReferralLink,
    shareReferral,
    loadReferralData,
    loadSettings
  };
};