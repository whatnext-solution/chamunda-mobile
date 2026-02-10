import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Type assertion helper for unified wallet tables
const walletSupabase = supabase as any;

export interface UnifiedWallet {
  id: string;
  user_id: string;
  loyalty_coins: number;
  affiliate_earnings: number;
  instagram_rewards: number;
  refund_credits: number;
  promotional_credits: number;
  total_redeemable_amount: number;
  marketing_role: 'affiliate' | 'instagram' | 'none';
  last_updated: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  transaction_type: 'credit' | 'debit';
  wallet_type: 'loyalty_coins' | 'affiliate_earnings' | 'instagram_rewards' | 'refund_credits' | 'promotional_credits';
  amount: number;
  coins_amount: number;
  source: string;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  admin_notes?: string;
  order_id?: string;
  product_id?: string;
  product_name?: string;
  expires_at?: string;
  created_at: string;
  created_by?: string;
}

export interface WalletUsageRule {
  id: string;
  wallet_type: string;
  priority_order: number;
  is_active: boolean;
}

export interface MarketingRoleRestriction {
  id: string;
  user_id: string;
  assigned_role: 'affiliate' | 'instagram' | 'none';
  previous_role?: string;
  role_locked_at?: string;
  role_changed_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletBreakdown {
  loyalty_coins: {
    amount: number;
    value_in_rupees: number;
    description: string;
  };
  affiliate_earnings: {
    amount: number;
    value_in_rupees: number;
    description: string;
  };
  instagram_rewards: {
    amount: number;
    value_in_rupees: number;
    description: string;
  };
  refund_credits: {
    amount: number;
    value_in_rupees: number;
    description: string;
  };
  promotional_credits: {
    amount: number;
    value_in_rupees: number;
    description: string;
  };
}

export const useUnifiedWallet = () => {
  const [wallet, setWallet] = useState<UnifiedWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [usageRules, setUsageRules] = useState<WalletUsageRule[]>([]);
  const [roleRestriction, setRoleRestriction] = useState<MarketingRoleRestriction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Refs to prevent multiple simultaneous calls
  const fetchingWallet = useRef(false);
  const fetchingTransactions = useRef(false);

  // Fetch unified wallet with role information
  const fetchWallet = useCallback(async () => {
    if (!user?.id || fetchingWallet.current) return;
    
    // Debounce rapid calls
    if (fetchingWallet.current) {
      console.log('🔄 useUnifiedWallet: Fetch already in progress, skipping...');
      return;
    }
    
    fetchingWallet.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useUnifiedWallet: Fetching wallet for user:', user.id);
      }

      // BYPASS BROKEN RPC FUNCTION - Use direct table queries instead
      console.log('🔄 useUnifiedWallet: Using direct table queries to bypass broken RPC function...');
      
      // Get user's marketing role first
      const { data: profileData, error: profileError } = await walletSupabase
        .from('user_profiles')
        .select('marketing_role')
        .eq('user_id', user.id)
        .maybeSingle();

      const marketingRole = profileData?.marketing_role || 'none';

      // Create profile if it doesn't exist
      if (!profileData) {
        await walletSupabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            marketing_role: 'none',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      }

      // Get or create wallet
      const { data: walletData, error: walletError } = await walletSupabase
        .from('unified_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let wallet = walletData;

      // Create wallet if it doesn't exist
      if (!wallet) {
        const { data: newWallet, error: createError } = await walletSupabase
          .from('unified_wallet')
          .insert({
            user_id: user.id,
            loyalty_coins: 0,
            affiliate_earnings: 0.00,
            instagram_rewards: 0,
            refund_credits: 0.00,
            promotional_credits: 0.00,
            total_redeemable_amount: 0.00,
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ useUnifiedWallet: Failed to create wallet:', createError);
          throw new Error(`Failed to create wallet: ${createError.message}`);
        }

        wallet = newWallet;
      }

      // Format wallet data to match expected structure
      const formattedWallet = {
        wallet_id: wallet.id,
        user_id: wallet.user_id,
        loyalty_coins: wallet.loyalty_coins,
        affiliate_earnings: wallet.affiliate_earnings,
        instagram_rewards: wallet.instagram_rewards,
        refund_credits: wallet.refund_credits,
        promotional_credits: wallet.promotional_credits,
        total_redeemable_amount: wallet.total_redeemable_amount,
        marketing_role: marketingRole,
        last_updated: wallet.last_updated,
        created_at: wallet.created_at
      };

      setWallet(formattedWallet);
      console.log('✅ useUnifiedWallet: Wallet fetched via direct queries:', formattedWallet);

    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Fetch wallet error:', error);
      setError(error.message || 'Failed to load wallet. Please try refreshing the page.');
      
      // Set a minimal fallback wallet to prevent app crashes
      const errorFallbackWallet = {
        wallet_id: 'error-fallback',
        user_id: user.id,
        loyalty_coins: 0,
        affiliate_earnings: 0.00,
        instagram_rewards: 0,
        refund_credits: 0.00,
        promotional_credits: 0.00,
        total_redeemable_amount: 0.00,
        marketing_role: 'none' as const,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      setWallet(errorFallbackWallet);
    } finally {
      fetchingWallet.current = false;
    }
  }, [user?.id]);

  // Fetch wallet transactions
  const fetchTransactions = useCallback(async (limit: number = 50) => {
    if (!user?.id || fetchingTransactions.current) return;
    fetchingTransactions.current = true;

    try {
      const { data, error } = await walletSupabase
        .from('unified_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Error fetching transactions:', error);
      setError(error.message);
    } finally {
      fetchingTransactions.current = false;
    }
  }, [user?.id]);

  // Fetch wallet usage rules
  const fetchUsageRules = useCallback(async () => {
    try {
      const { data, error } = await walletSupabase
        .from('wallet_usage_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority_order', { ascending: true });

      if (error) throw error;
      setUsageRules(data || []);
    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Error fetching usage rules:', error);
    }
  }, []);

  // Fetch marketing role restriction
  const fetchRoleRestriction = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await walletSupabase
        .from('marketing_role_restrictions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ useUnifiedWallet: Role restriction query error:', error);
        return;
      }

      setRoleRestriction(data);
    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Error fetching role restriction:', error);
    }
  }, [user?.id]);

  // Update wallet balance
  const updateWallet = useCallback(async (
    walletType: string,
    amount: number,
    coinsAmount: number = 0,
    transactionType: 'credit' | 'debit' = 'credit',
    source: string = 'manual',
    referenceId?: string,
    description?: string
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // BYPASS BROKEN RPC FUNCTION - Use direct table updates instead
      console.log('🔄 useUnifiedWallet: Using direct table updates to bypass broken RPC function...');
      
      // Ensure wallet exists first
      await fetchWallet();

      // Get current wallet data
      const { data: currentWallet, error: fetchError } = await walletSupabase
        .from('unified_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !currentWallet) {
        throw new Error('Failed to fetch current wallet data');
      }

      // Calculate new value
      let currentValue = 0;
      let newValue = 0;

      if (walletType === 'loyalty_coins' || walletType === 'instagram_rewards') {
        currentValue = currentWallet[walletType] || 0;
        if (transactionType === 'credit') {
          newValue = currentValue + coinsAmount;
        } else {
          newValue = Math.max(0, currentValue - coinsAmount);
        }
      } else {
        currentValue = currentWallet[walletType] || 0;
        if (transactionType === 'credit') {
          newValue = currentValue + amount;
        } else {
          newValue = Math.max(0, currentValue - amount);
        }
      }

      // Update the specific wallet field
      const updateData = {
        [walletType]: newValue,
        last_updated: new Date().toISOString()
      };

      const { error: updateError } = await walletSupabase
        .from('unified_wallet')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      // Calculate and update total redeemable amount
      const { data: updatedWallet, error: refetchError } = await walletSupabase
        .from('unified_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!refetchError && updatedWallet) {
        const totalRedeemable = (
          (updatedWallet.loyalty_coins * 0.10) + 
          updatedWallet.affiliate_earnings +
          (updatedWallet.instagram_rewards * 0.10) + 
          updatedWallet.refund_credits +
          updatedWallet.promotional_credits
        );

        await walletSupabase
          .from('unified_wallet')
          .update({ 
            total_redeemable_amount: totalRedeemable,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }

      // Record transaction
      const { error: transactionError } = await walletSupabase
        .from('unified_wallet_transactions')
        .insert({
          user_id: user.id,
          transaction_type: transactionType,
          wallet_type: walletType,
          amount: amount,
          coins_amount: coinsAmount,
          source: source,
          reference_id: referenceId,
          description: description,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.warn('⚠️ useUnifiedWallet: Failed to record transaction:', transactionError);
      }

      // Refresh wallet and transactions
      await fetchWallet();
      await fetchTransactions();

      console.log('✅ useUnifiedWallet: Wallet updated successfully via direct queries');
      return true;

    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Error updating wallet:', error);
      throw error;
    }
  }, [user?.id, fetchWallet, fetchTransactions]);

  // Set marketing role
  const setMarketingRole = useCallback(async (
    newRole: 'affiliate' | 'instagram' | 'none',
    adminUserId?: string,
    adminNotes?: string
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // BYPASS BROKEN RPC FUNCTION - Use direct table updates instead
      console.log('🔄 useUnifiedWallet: Using direct table updates for marketing role...');
      
      // Get current role
      const { data: currentProfile } = await walletSupabase
        .from('user_profiles')
        .select('marketing_role')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentRole = currentProfile?.marketing_role || 'none';

      // Validate role change (mutual exclusion)
      if (currentRole !== 'none' && currentRole !== newRole && newRole !== 'none') {
        throw new Error(`Cannot switch from ${currentRole} to ${newRole} role due to mutual exclusion policy`);
      }

      // Update user profile
      const { error: profileError } = await walletSupabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          marketing_role: newRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (profileError) {
        throw new Error(`Failed to update marketing role: ${profileError.message}`);
      }

      // Record role restriction if table exists
      try {
        await walletSupabase
          .from('marketing_role_restrictions')
          .upsert({
            user_id: user.id,
            assigned_role: newRole,
            previous_role: currentRole,
            role_locked_at: newRole !== 'none' ? new Date().toISOString() : null,
            admin_notes: adminNotes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (restrictionError) {
        console.warn('⚠️ useUnifiedWallet: Failed to record role restriction (table may not exist):', restrictionError);
      }

      // Refresh wallet and role restriction
      await fetchWallet();
      await fetchRoleRestriction();

      toast.success(`Marketing role updated to: ${newRole}`);
      console.log('✅ useUnifiedWallet: Marketing role updated successfully via direct queries');
      return true;

    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Error setting marketing role:', error);
      toast.error(`Failed to update marketing role: ${error.message}`);
      throw error;
    }
  }, [user?.id, fetchWallet, fetchRoleRestriction]);

  // Get wallet breakdown with descriptions
  const getWalletBreakdown = useCallback((): WalletBreakdown | null => {
    if (!wallet) return null;

    return {
      loyalty_coins: {
        amount: wallet.loyalty_coins,
        value_in_rupees: wallet.loyalty_coins * 0.10,
        description: 'Earned from purchases and activities'
      },
      affiliate_earnings: {
        amount: wallet.affiliate_earnings,
        value_in_rupees: wallet.affiliate_earnings,
        description: 'Commission from affiliate marketing'
      },
      instagram_rewards: {
        amount: wallet.instagram_rewards,
        value_in_rupees: wallet.instagram_rewards * 0.10,
        description: 'Rewards from Instagram story campaigns'
      },
      refund_credits: {
        amount: wallet.refund_credits,
        value_in_rupees: wallet.refund_credits,
        description: 'Credits from order refunds'
      },
      promotional_credits: {
        amount: wallet.promotional_credits,
        value_in_rupees: wallet.promotional_credits,
        description: 'Special promotional credits'
      }
    };
  }, [wallet]);

  // Check if user can use specific wallet type
  const canUseWalletType = useCallback((walletType: string): boolean => {
    if (!wallet) return false;

    // Role-based restrictions
    if (walletType === 'affiliate_earnings' && wallet.marketing_role !== 'affiliate') {
      return false;
    }
    if (walletType === 'instagram_rewards' && wallet.marketing_role !== 'instagram') {
      return false;
    }

    return true;
  }, [wallet]);

  // Get available balance for checkout
  const getAvailableBalance = useCallback((): number => {
    if (!wallet) return 0;

    let total = 0;
    
    // Always include these
    total += wallet.refund_credits;
    total += wallet.loyalty_coins * 0.10; // Convert coins to rupees
    total += wallet.promotional_credits;

    // Role-based inclusion
    if (wallet.marketing_role === 'affiliate') {
      total += wallet.affiliate_earnings;
    } else if (wallet.marketing_role === 'instagram') {
      total += wallet.instagram_rewards * 0.10; // Convert coins to rupees
    }

    return total;
  }, [wallet]);

  // Check if user can switch marketing roles
  const canSwitchMarketingRole = useCallback((targetRole: 'affiliate' | 'instagram'): boolean => {
    if (!wallet) return false;
    
    // If user has no role, they can switch to any role
    if (wallet.marketing_role === 'none') return true;
    
    // If user already has the target role, no switch needed
    if (wallet.marketing_role === targetRole) return true;
    
    // Otherwise, they cannot switch (mutual exclusion)
    return false;
  }, [wallet]);

  // Initialize data
  useEffect(() => {
    const initializeWallet = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Prevent duplicate initialization if already loading
      if (fetchingWallet.current) {
        return;
      }

      try {
        setLoading(true);
        await Promise.all([
          fetchWallet(),
          fetchTransactions(),
          fetchUsageRules(),
          fetchRoleRestriction()
        ]);
      } catch (error: any) {
        console.error('❌ useUnifiedWallet: Initialization error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(initializeWallet, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.id, fetchWallet, fetchTransactions, fetchUsageRules, fetchRoleRestriction]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const walletSubscription = walletSupabase
      .channel('unified_wallet_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'unified_wallet',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchWallet();
        }
      )
      .subscribe();

    const transactionSubscription = walletSupabase
      .channel('wallet_transaction_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'unified_wallet_transactions',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      walletSubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, [user?.id, fetchWallet, fetchTransactions]);

  return {
    // Data
    wallet,
    transactions,
    usageRules,
    roleRestriction,
    loading,
    error,
    
    // Computed values
    walletBreakdown: getWalletBreakdown(),
    availableBalance: getAvailableBalance(),
    
    // Actions
    updateWallet,
    setMarketingRole,
    fetchWallet,
    fetchTransactions,
    
    // Utilities
    canUseWalletType,
    canSwitchMarketingRole,
    
    // Role checks
    isAffiliate: wallet?.marketing_role === 'affiliate',
    isInstagramUser: wallet?.marketing_role === 'instagram',
    hasNoMarketingRole: wallet?.marketing_role === 'none'
  };
};