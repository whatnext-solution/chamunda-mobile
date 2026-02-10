/**
 * Loyalty Integration Service
 * Handles loyalty coins earning, redemption, and synchronization across modules
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const loyaltySupabase = supabase as any;

export interface OrderCoinsData {
  orderId: string;
  userId: string;
  orderAmount: number;
  customerName: string;
  orderNumber: string;
}

export interface ReferralCoinsData {
  userId: string;
  referralCode: string;
  referredUserId: string;
  referralType: 'signup' | 'purchase';
  amount?: number;
}

export interface OfferCoinsData {
  userId: string;
  offerId: string;
  offerName: string;
  bonusCoins: number;
}

/**
 * Credit loyalty coins to user after successful order
 */
export const creditCoinsForOrder = async (data: OrderCoinsData): Promise<boolean> => {
  try {
    console.log('💰 Crediting coins for order:', data.orderId);

    // Get system settings
    const { data: settings, error: settingsError } = await loyaltySupabase
      .from('loyalty_system_config')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings || !settings.is_system_enabled) {
      console.log('⚠️ Loyalty system not enabled, skipping coins credit');
      return false;
    }

    // Check minimum order amount if configured
    if (settings.min_order_amount && data.orderAmount < settings.min_order_amount) {
      console.log(`⚠️ Order amount ${data.orderAmount} below minimum ${settings.min_order_amount}, skipping coins credit`);
      return false;
    }

    // Calculate coins to credit
    let coinsToCredit = Math.floor(data.orderAmount * settings.default_coins_per_rupee);
    coinsToCredit = Math.floor(coinsToCredit * settings.global_coins_multiplier);

    // Apply festive multiplier if active
    if (settings.is_festive_active && settings.festive_multiplier) {
      coinsToCredit = Math.floor(coinsToCredit * settings.festive_multiplier);
    }

    // Apply max coins per order limit
    if (settings.max_coins_per_order && coinsToCredit > settings.max_coins_per_order) {
      coinsToCredit = settings.max_coins_per_order;
    }

    if (coinsToCredit <= 0) {
      console.log('⚠️ No coins to credit for this order');
      return false;
    }

    // Create transaction record
    const { error: transactionError } = await loyaltySupabase
      .from('loyalty_transactions')
      .insert({
        user_id: data.userId,
        transaction_type: 'earned',
        coins_amount: coinsToCredit,
        reference_type: 'order',
        reference_id: data.orderId,
        order_id: data.orderId,
        description: `Earned ${coinsToCredit} coins from order ${data.orderNumber}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError);
      return false;
    }

    // Update user wallet
    const { error: walletError } = await loyaltySupabase
      .rpc('update_user_coin_wallet_safe', {
        p_user_id: data.userId,
        p_coins_change: coinsToCredit,
        p_transaction_type: 'earned'
      });

    if (walletError) {
      console.error('❌ Error updating wallet:', walletError);
      // Try direct update as fallback
      const { data: wallet } = await loyaltySupabase
        .from('loyalty_coins_wallet')
        .select('*')
        .eq('user_id', data.userId)
        .single();

      if (wallet) {
        await loyaltySupabase
          .from('loyalty_coins_wallet')
          .update({
            total_coins_earned: wallet.total_coins_earned + coinsToCredit,
            available_coins: wallet.available_coins + coinsToCredit,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', data.userId);
      }
    }

    console.log(`✅ Successfully credited ${coinsToCredit} coins for order ${data.orderNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Error in creditCoinsForOrder:', error);
    return false;
  }
};

/**
 * Credit loyalty coins for referral
 */
export const creditCoinsForReferral = async (data: ReferralCoinsData): Promise<boolean> => {
  try {
    console.log('💰 Crediting coins for referral:', data.referralCode);

    // Get system settings
    const { data: settings, error: settingsError } = await loyaltySupabase
      .from('loyalty_system_config')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings || !settings.is_system_enabled) {
      console.log('⚠️ Loyalty system not enabled, skipping referral coins');
      return false;
    }

    // Get referral settings (you may need to add this to your database)
    const referralCoins = data.referralType === 'signup' ? 50 : 100; // Default values

    // Create transaction record
    const { error: transactionError } = await loyaltySupabase
      .from('loyalty_transactions')
      .insert({
        user_id: data.userId,
        transaction_type: 'earned',
        coins_amount: referralCoins,
        reference_type: 'referral',
        reference_id: data.referredUserId,
        description: `Earned ${referralCoins} coins from referral ${data.referralCode}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error creating referral transaction:', transactionError);
      return false;
    }

    // Update user wallet
    const { error: walletError } = await loyaltySupabase
      .rpc('update_user_coin_wallet_safe', {
        p_user_id: data.userId,
        p_coins_change: referralCoins,
        p_transaction_type: 'earned'
      });

    if (walletError) {
      console.error('❌ Error updating wallet for referral:', walletError);
      return false;
    }

    console.log(`✅ Successfully credited ${referralCoins} coins for referral`);
    toast.success(`You earned ${referralCoins} coins from referral!`);
    return true;
  } catch (error) {
    console.error('❌ Error in creditCoinsForReferral:', error);
    return false;
  }
};

/**
 * Credit bonus coins from offers/campaigns
 */
export const creditCoinsForOffer = async (data: OfferCoinsData): Promise<boolean> => {
  try {
    console.log('💰 Crediting bonus coins for offer:', data.offerId);

    // Get system settings
    const { data: settings, error: settingsError } = await loyaltySupabase
      .from('loyalty_system_config')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings || !settings.is_system_enabled) {
      console.log('⚠️ Loyalty system not enabled, skipping offer coins');
      return false;
    }

    // Create transaction record
    const { error: transactionError } = await loyaltySupabase
      .from('loyalty_transactions')
      .insert({
        user_id: data.userId,
        transaction_type: 'earned',
        coins_amount: data.bonusCoins,
        reference_type: 'offer',
        reference_id: data.offerId,
        description: `Earned ${data.bonusCoins} bonus coins from ${data.offerName}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error creating offer transaction:', transactionError);
      return false;
    }

    // Update user wallet
    const { error: walletError } = await loyaltySupabase
      .rpc('update_user_coin_wallet_safe', {
        p_user_id: data.userId,
        p_coins_change: data.bonusCoins,
        p_transaction_type: 'earned'
      });

    if (walletError) {
      console.error('❌ Error updating wallet for offer:', walletError);
      return false;
    }

    console.log(`✅ Successfully credited ${data.bonusCoins} bonus coins from offer`);
    toast.success(`You earned ${data.bonusCoins} bonus coins!`);
    return true;
  } catch (error) {
    console.error('❌ Error in creditCoinsForOffer:', error);
    return false;
  }
};

/**
 * Verify wallet sync with unified wallet system
 */
export const verifyWalletSync = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔍 Verifying wallet sync for user:', userId);

    // Get loyalty wallet
    const { data: loyaltyWallet, error: loyaltyError } = await loyaltySupabase
      .from('loyalty_coins_wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (loyaltyError) {
      console.error('❌ Error fetching loyalty wallet:', loyaltyError);
      return false;
    }

    // Get unified wallet
    const { data: unifiedWallet, error: unifiedError } = await (supabase as any)
      .from('unified_wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (unifiedError) {
      console.error('❌ Error fetching unified wallet:', unifiedError);
      return false;
    }

    // Check if coins balance matches
    const coinsMatch = loyaltyWallet.available_coins === unifiedWallet.coins_balance;

    if (!coinsMatch) {
      console.warn('⚠️ Wallet sync mismatch detected:', {
        loyaltyCoins: loyaltyWallet.available_coins,
        unifiedCoins: unifiedWallet.coins_balance
      });
      
      // Sync unified wallet with loyalty wallet (loyalty is source of truth)
      await (supabase as any)
        .from('unified_wallet')
        .update({
          coins_balance: loyaltyWallet.available_coins,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log('✅ Wallet sync corrected');
    }

    return true;
  } catch (error) {
    console.error('❌ Error in verifyWalletSync:', error);
    return false;
  }
};

/**
 * Get loyalty statistics for dashboard
 */
export const getLoyaltyStats = async () => {
  try {
    const { data: stats, error } = await loyaltySupabase
      .rpc('get_loyalty_dashboard_stats');

    if (error) {
      console.error('❌ Error fetching loyalty stats:', error);
      return null;
    }

    return stats;
  } catch (error) {
    console.error('❌ Error in getLoyaltyStats:', error);
    return null;
  }
};

/**
 * Check if order is eligible for coins
 */
export const isOrderEligibleForCoins = async (orderAmount: number): Promise<boolean> => {
  try {
    const { data: settings, error } = await loyaltySupabase
      .from('loyalty_system_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !settings || !settings.is_system_enabled) {
      return false;
    }

    if (settings.min_order_amount && orderAmount < settings.min_order_amount) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking order eligibility:', error);
    return false;
  }
};

export const loyaltyIntegrationService = {
  creditCoinsForOrder,
  creditCoinsForReferral,
  creditCoinsForOffer,
  verifyWalletSync,
  getLoyaltyStats,
  isOrderEligibleForCoins
};
