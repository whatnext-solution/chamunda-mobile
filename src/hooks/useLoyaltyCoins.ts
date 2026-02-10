import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Type assertion helper for loyalty tables
const loyaltySupabase = supabase as any;

export interface LoyaltyWallet {
  id: string;
  user_id: string;
  total_coins_earned: number;
  total_coins_used: number;
  available_coins: number;
  last_updated: string;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'manual_add' | 'manual_remove';
  coins_amount: number;
  reference_type?: string;
  reference_id?: string;
  order_id?: string;
  product_id?: string;
  product_name?: string;
  description?: string;
  admin_notes?: string;
  expires_at?: string;
  created_at: string;
}

export interface LoyaltySystemSettings {
  id: string;
  is_system_enabled: boolean;
  global_coins_multiplier: number;
  default_coins_per_rupee: number;
  coin_expiry_days?: number;
  min_coins_to_redeem: number;
  max_coins_per_order?: number;
  festive_multiplier: number;
  festive_start_date?: string;
  festive_end_date?: string;
  is_festive_active?: boolean;
}

export interface ProductLoyaltySettings {
  product_id: string;
  coins_earned_per_purchase: number;
  coins_required_to_buy: number;
  is_coin_purchase_enabled: boolean;
  is_coin_earning_enabled: boolean;
}

export const useLoyaltyCoins = () => {
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [systemSettings, setSystemSettings] = useState<LoyaltySystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Refs to prevent multiple simultaneous calls
  const fetchingWallet = useRef(false);
  const fetchingSettings = useRef(false);
  const initializingWallet = useRef(false);

  // Fetch system settings with caching and error handling
  const fetchSystemSettings = useCallback(async () => {
    if (fetchingSettings.current) return;
    fetchingSettings.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useLoyaltyCoins: Fetching system settings...');
      }
      
      // Use the reliable view that ALWAYS returns settings
      const { data, error } = await loyaltySupabase
        .from('loyalty_system_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.warn('⚠️ useLoyaltyCoins: Using fallback settings due to:', error.message);
        // Use consistent fallback settings that match the database
        const fallbackSettings: LoyaltySystemSettings = {
          id: 'eef33271-caed-4eb2-a7ea-aa4d5e288a0f',
          is_system_enabled: true,
          global_coins_multiplier: 1.00,
          default_coins_per_rupee: 0.10,
          min_coins_to_redeem: 10,
          festive_multiplier: 1.00,
          is_festive_active: false
        };
        setSystemSettings(fallbackSettings);
        return;
      }

      const settings = data as LoyaltySystemSettings;
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ useLoyaltyCoins: System settings loaded successfully');
      }
      setSystemSettings(settings);
    } catch (err) {
      console.error('❌ useLoyaltyCoins: Error fetching system settings:', err);
      // Use consistent fallback settings
      setSystemSettings({
        id: 'eef33271-caed-4eb2-a7ea-aa4d5e288a0f',
        is_system_enabled: true,
        global_coins_multiplier: 1.00,
        default_coins_per_rupee: 0.10,
        min_coins_to_redeem: 10,
        festive_multiplier: 1.00,
        is_festive_active: false
      });
    } finally {
      fetchingSettings.current = false;
    }
  }, []);

  // Fetch user's loyalty wallet with safe creation
  const fetchWallet = useCallback(async () => {
    if (!user || fetchingWallet.current) return;
    fetchingWallet.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useLoyaltyCoins: Fetching wallet for user:', user.id);
      }
      
      // Use the safe function to get or create wallet
      const { data, error } = await loyaltySupabase
        .rpc('get_user_wallet_safe', { input_user_id: user.id });

      if (error) {
        console.warn('⚠️ useLoyaltyCoins: Wallet function not available:', error.message);
        // Fallback to direct table query
        const { data: walletData, error: walletError } = await loyaltySupabase
          .from('loyalty_coins_wallet')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('❌ useLoyaltyCoins: Error fetching wallet:', walletError);
          return;
        }

        setWallet(walletData as LoyaltyWallet || null);
        return;
      }

      // Handle the renamed columns from the fixed function
      const walletData = Array.isArray(data) ? data[0] : data;
      if (walletData) {
        const normalizedWallet: LoyaltyWallet = {
          id: walletData.wallet_id,
          user_id: walletData.wallet_user_id,
          total_coins_earned: walletData.total_coins_earned,
          total_coins_used: walletData.total_coins_used,
          available_coins: walletData.available_coins,
          last_updated: walletData.last_updated,
          created_at: walletData.created_at
        };
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ useLoyaltyCoins: Wallet loaded successfully');
        }
        setWallet(normalizedWallet);
      } else {
        setWallet(null);
      }
    } catch (err) {
      console.error('❌ useLoyaltyCoins: Error in fetchWallet:', err);
    } finally {
      fetchingWallet.current = false;
    }
  }, [user]);

  // Fetch user's loyalty transactions
  const fetchTransactions = useCallback(async (limit = 50) => {
    if (!user) {
      setTransactions([]);
      return;
    }

    try {
      const { data, error } = await loyaltySupabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation')) {
          console.warn('⚠️ useLoyaltyCoins: Transactions table not available');
          setTransactions([]);
          return;
        }
        console.error('❌ useLoyaltyCoins: Error fetching transactions:', error);
        return;
      }

      setTransactions((data as LoyaltyTransaction[]) || []);
    } catch (err) {
      console.error('❌ useLoyaltyCoins: Error in fetchTransactions:', err);
    }
  }, [user]);

  // Get product loyalty settings with auto-creation
  const getProductLoyaltySettings = useCallback(async (productId: string): Promise<ProductLoyaltySettings | null> => {
    try {
      console.log('🔍 useLoyaltyCoins: Getting settings for product:', productId);
      
      // Use the safe function that auto-creates settings
      const { data: safeData, error: safeError } = await loyaltySupabase
        .rpc('get_or_create_loyalty_settings', { input_product_id: productId });

      if (!safeError && safeData && safeData.length > 0) {
        // Handle the renamed columns from the fixed function
        const rawSettings = safeData[0];
        const settings: ProductLoyaltySettings = {
          product_id: rawSettings.settings_product_id,
          coins_earned_per_purchase: rawSettings.coins_earned_per_purchase,
          coins_required_to_buy: rawSettings.coins_required_to_buy,
          is_coin_purchase_enabled: rawSettings.is_coin_purchase_enabled,
          is_coin_earning_enabled: rawSettings.is_coin_earning_enabled
        };
        
        console.log('✅ useLoyaltyCoins: Got settings from safe function:', {
          productId,
          coinsEarned: settings.coins_earned_per_purchase,
          coinsRequired: settings.coins_required_to_buy,
          canPurchase: settings.is_coin_purchase_enabled
        });
        return settings;
      }

      // Fallback to direct table query
      console.log('🔄 useLoyaltyCoins: Fallback to direct query...');
      const { data, error } = await loyaltySupabase
        .from('loyalty_product_settings')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ useLoyaltyCoins: No settings found, returning null');
          return null;
        }
        console.error('❌ useLoyaltyCoins: Error fetching product settings:', error);
        return null;
      }

      const settings = data as ProductLoyaltySettings;
      console.log('✅ useLoyaltyCoins: Got settings from direct query:', {
        productId,
        coinsEarned: settings.coins_earned_per_purchase,
        coinsRequired: settings.coins_required_to_buy,
        canPurchase: settings.is_coin_purchase_enabled
      });
      return settings;
    } catch (err) {
      console.error('❌ useLoyaltyCoins: Error in getProductLoyaltySettings:', err);
      return null;
    }
  }, []);

  // Calculate coins that would be earned for a purchase amount
  const calculateCoinsEarned = useCallback((amount: number): number => {
    if (!systemSettings || !systemSettings.is_system_enabled) return 0;

    let coins = Math.floor(amount * systemSettings.default_coins_per_rupee);
    coins = Math.floor(coins * systemSettings.global_coins_multiplier);

    // Apply festive multiplier if active
    if (systemSettings.is_festive_active) {
      coins = Math.floor(coins * systemSettings.festive_multiplier);
    }

    // Apply max coins per order limit
    if (systemSettings.max_coins_per_order && coins > systemSettings.max_coins_per_order) {
      coins = systemSettings.max_coins_per_order;
    }

    return coins;
  }, [systemSettings]);

  // Check if user can redeem coins for a product
  const canRedeemCoins = useCallback((coinsRequired: number): boolean => {
    if (!wallet || !systemSettings) return false;
    if (!systemSettings.is_system_enabled) return false;
    if (coinsRequired < systemSettings.min_coins_to_redeem) return false;
    return wallet.available_coins >= coinsRequired;
  }, [wallet, systemSettings]);

  // Redeem coins for a purchase (to be called during checkout)
  const redeemCoins = useCallback(async (coinsToRedeem: number, orderId: string, description: string): Promise<boolean> => {
    if (!user || !wallet) {
      toast.error('User not authenticated');
      return false;
    }

    if (!canRedeemCoins(coinsToRedeem)) {
      toast.error('Insufficient coins for redemption');
      return false;
    }

    try {
      // Create redemption transaction
      const { error: transactionError } = await loyaltySupabase
        .from('loyalty_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'redeemed',
          coins_amount: -coinsToRedeem, // Negative for redemption
          reference_type: 'order',
          reference_id: orderId,
          order_id: orderId,
          description: description
        });

      if (transactionError) {
        console.error('❌ Error creating redemption transaction:', transactionError);
        toast.error('Failed to redeem coins');
        return false;
      }

      // Use safe wallet update function
      const { error: walletError } = await loyaltySupabase
        .rpc('update_user_coin_wallet_safe', {
          p_user_id: user.id,
          p_coins_change: coinsToRedeem,
          p_transaction_type: 'redeemed'
        });

      if (walletError) {
        console.error('❌ Error updating wallet:', walletError);
        toast.error('Failed to update coin balance');
        return false;
      }

      // Refresh data
      await fetchWallet();
      await fetchTransactions();
      
      toast.success(`Successfully redeemed ${coinsToRedeem} coins!`);
      return true;
    } catch (err) {
      console.error('❌ Error in redeemCoins:', err);
      toast.error('Failed to redeem coins');
      return false;
    }
  }, [user, wallet, canRedeemCoins, fetchWallet, fetchTransactions]);

  // Initialize wallet if it doesn't exist (with conflict prevention)
  const initializeWallet = useCallback(async () => {
    if (!user || wallet || initializingWallet.current) return;
    initializingWallet.current = true;

    try {
      console.log('🔧 useLoyaltyCoins: Initializing wallet for user:', user.id);
      
      // Use safe initialization function
      const { error } = await loyaltySupabase
        .rpc('initialize_user_wallet', { p_user_id: user.id });

      if (error) {
        console.warn('⚠️ useLoyaltyCoins: Wallet initialization failed:', error.message);
        return;
      }

      console.log('✅ useLoyaltyCoins: Wallet initialized successfully');
      await fetchWallet();
    } catch (err) {
      console.error('❌ useLoyaltyCoins: Error in initializeWallet:', err);
    } finally {
      initializingWallet.current = false;
    }
  }, [user, wallet, fetchWallet]);

  // Load all data with proper sequencing
  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load system settings first
      await fetchSystemSettings();
      
      // Then load user-specific data in parallel
      await Promise.all([
        fetchWallet(),
        fetchTransactions()
      ]);
    } catch (err) {
      console.error('❌ Error loading loyalty data:', err);
      setError('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  }, [user, fetchSystemSettings, fetchWallet, fetchTransactions]);

  // Initialize wallet after data is loaded (only once)
  useEffect(() => {
    if (user && !loading && !wallet && systemSettings?.is_system_enabled && !initializingWallet.current) {
      initializeWallet();
    }
  }, [user, loading, wallet, systemSettings?.is_system_enabled, initializeWallet]);

  // Effect to load data when user changes (only once per user)
  useEffect(() => {
    loadData();
  }, [user?.id]); // Only depend on user.id to prevent unnecessary reloads

  // Real-time subscription for wallet updates (with error handling)
  useEffect(() => {
    if (!user?.id || !systemSettings?.is_system_enabled) return;

    const walletSubscription = loyaltySupabase
      .channel(`loyalty_wallet_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loyalty_coins_wallet',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 Wallet updated, refreshing...');
          fetchWallet();
        }
      )
      .subscribe();

    const transactionSubscription = loyaltySupabase
      .channel(`loyalty_transaction_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'loyalty_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 New transaction, refreshing...');
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      walletSubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, [user?.id, systemSettings?.is_system_enabled, fetchWallet, fetchTransactions]);

  // Computed values with memoization
  const isSystemEnabled = systemSettings?.is_system_enabled || false;
  const minCoinsToRedeem = systemSettings?.min_coins_to_redeem || 10;
  const isFestiveActive = systemSettings?.is_festive_active || false;

  // Only log state changes when there's an actual change (reduce console spam)
  const prevState = useRef({ isSystemEnabled: false, systemSettings: null, wallet: null, loading: true });
  useEffect(() => {
    const currentState = {
      isSystemEnabled,
      systemSettings: systemSettings ? {
        id: systemSettings.id,
        enabled: systemSettings.is_system_enabled,
        coinsPerRupee: systemSettings.default_coins_per_rupee
      } : null,
      wallet: wallet ? {
        id: wallet.id,
        availableCoins: wallet.available_coins
      } : null,
      loading
    };
    
    // Reduced logging for production
    const currentStateStr = JSON.stringify(currentState);
    const prevStateStr = JSON.stringify(prevState.current);
    
    if (currentStateStr !== prevStateStr && process.env.NODE_ENV === 'development') {
      console.log('useLoyaltyCoins: State changed');
      prevState.current = currentState;
    }
  }, [isSystemEnabled, systemSettings, wallet, loading]);

  return {
    // Data
    wallet,
    transactions,
    systemSettings,
    loading,
    error,

    // Functions
    fetchWallet,
    fetchTransactions,
    getProductLoyaltySettings,
    calculateCoinsEarned,
    canRedeemCoins,
    redeemCoins,
    initializeWallet,
    loadData,

    // Computed values
    isSystemEnabled,
    minCoinsToRedeem,
    isFestiveActive
  };
};