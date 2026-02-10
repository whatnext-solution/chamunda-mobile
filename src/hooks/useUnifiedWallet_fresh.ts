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
    fetchingWallet.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useUnifiedWallet: Fetching wallet for user:', user.id);
      }

      // Try the RPC function first
      const { data, error } = await walletSupabase
        .rpc('get_unified_wallet', { input_user_id: user.id });

      if (error) {
        console.error('❌ useUnifiedWallet: RPC Error:', error);
        
        // If RPC fails, try manual wallet creation
        if (error.message.includes('403') || error.message.includes('permission') || error.message.includes('not found')) {
          console.log('🔄 useUnifiedWallet: Attempting manual wallet creation...');
          
          // Create wallet profile first
          await walletSupabase
            .from('user_wallet_profiles')
            .upsert({
              user_id: user.id,
              marketing_role: 'none'
            }, { onConflict: 'user_id' });

          // Create wallet record
          const { data: insertData, error: insertError } = await walletSupabase
            .from('unified_wallet')
            .upsert({
              user_id: user.id,
              loyalty_coins: 0,
              affiliate_earnings: 0.00,
              instagram_rewards: 0,
              refund_credits: 0.00,
              promotional_credits: 0.00,
              total_redeemable_amount: 0.00,
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (insertError) {
            console.error('❌ useUnifiedWallet: Manual creation failed:', insertError);
            throw new Error(`Wallet setup failed. Please run the database setup script. Error: ${insertError.message}`);
          }

          const walletWithRole = {
            ...insertData,
            wallet_id: insertData.id,
            marketing_role: 'none' as const
          };

          setWallet(walletWithRole);
          console.log('✅ useUnifiedWallet: Manual wallet created:', walletWithRole);
          return;
        }
        
        throw error;
      }

      if (data && data.length > 0) {
        setWallet(data[0]);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ useUnifiedWallet: Wallet fetched:', data[0]);
        }
      } else {
        console.warn('⚠️ useUnifiedWallet: No wallet data returned, creating fallback...');
        
        // Create fallback wallet
        const fallbackWallet = {
          wallet_id: crypto.randomUUID(),
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
        
        setWallet(fallbackWallet);
      }
    } catch (error: any) {
      console.error('❌ useUnifiedWallet: Fetch wallet error:', error);
      setError(error.message || 'Failed to load wallet. Please run the database setup script.');
      
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
      const { data, error } = await walletSupabase
        .rpc('update_unified_wallet', {
          input_user_id: user.id,
          wallet_type: walletType,
          amount: amount,
          coins_amount: coinsAmount,
          transaction_type: transactionType,
          source: source,
          reference_id: referenceId,
          description: description
        });

      if (error) throw error;

      // Refresh wallet and transactions
      await fetchWallet();
      await fetchTransactions();

      return data;
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
      // Update the wallet profile directly
      const { error } = await walletSupabase
        .from('user_wallet_profiles')
        .upsert({
          user_id: user.id,
          marketing_role: newRole,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Record role restriction
      await walletSupabase
        .from('marketing_role_restrictions')
        .upsert({
          user_id: user.id,
          assigned_role: newRole,
          role_locked_at: newRole !== 'none' ? new Date().toISOString() : null,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      // Refresh wallet and role restriction
      await fetchWallet();
      await fetchRoleRestriction();

      toast.success(`Marketing role updated to: ${newRole}`);
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

    initializeWallet();
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