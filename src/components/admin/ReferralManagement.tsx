import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Gift, 
  TrendingUp, 
  Shield, 
  Settings, 
  DollarSign,
  UserCheck,
  AlertTriangle,
  Trophy,
  Eye,
  Ban,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralSettings {
  id: string;
  is_enabled: boolean;
  referrer_reward_coins: number;
  referee_welcome_coins: number;
  minimum_order_value: number;
  max_referrals_per_user: number;
  daily_referral_limit: number;
  monthly_referral_limit: number;
  require_first_order: boolean;
  allow_self_referral: boolean;
}

interface ReferralTransaction {
  id: string;
  referrer_email: string;
  referee_email: string;
  referral_code: string;
  status: string;
  referrer_coins: number;
  referee_coins: number;
  order_value: number;
  fraud_flags: string[];
  created_at: string;
  completed_at: string;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_coins_issued: number;
  conversion_rate: number;
  fraud_attempts: number;
}

export const ReferralManagement = () => {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // BUG FIX #2: Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    transactionId: string;
    newStatus: string;
    adminNotes?: string;
    transaction?: ReferralTransaction;
  } | null>(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      
      // Load settings (handle duplicate records)
      const { data: settingsData, error: settingsError } = await (supabase as any)
        .from('referral_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      
      // Handle multiple records case
      if (settingsError?.code === 'PGRST116') {
        const { data: allSettings, error: allError } = await (supabase as any)
          .from('referral_settings')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) throw allError;
        setSettings(allSettings?.[0] || null);
      } else {
        setSettings(settingsData || null);
      }

      // Load recent transactions with user names
      const { data: transactionsData, error: transactionsError } = await (supabase as any)
        .from('referral_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;
      
      // Format transactions with user profile lookup
      let formattedTransactions = [];
      if (transactionsData && transactionsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set([
          ...transactionsData.map(t => t.referrer_id),
          ...transactionsData.map(t => t.referee_id)
        ])];
        
        // Fetch user profiles for display names
        const { data: userProfiles } = await (supabase as any)
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        // Create user lookup map
        const userLookup = {};
        userProfiles?.forEach(profile => {
          userLookup[profile.user_id] = profile.full_name || profile.email || 'User';
        });
        
        // Format transactions with user names
        formattedTransactions = transactionsData.map(t => ({
          id: t.id,
          referrer_email: userLookup[t.referrer_id] || 'User',
          referee_email: userLookup[t.referee_id] || 'User',
          referral_code: t.referral_code,
          status: t.status,
          referrer_coins: t.referrer_coins,
          referee_coins: t.referee_coins,
          order_value: t.order_value,
          fraud_flags: t.fraud_flags || [],
          created_at: t.created_at,
          completed_at: t.completed_at
        }));
      }
      
      setTransactions(formattedTransactions);

      // Calculate stats
      const totalReferrals = formattedTransactions.length;
      const successfulReferrals = formattedTransactions.filter(t => t.status === 'completed').length;
      const pendingReferrals = formattedTransactions.filter(t => t.status === 'pending').length;
      const totalCoinsIssued = formattedTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.referrer_coins + t.referee_coins, 0);
      const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;
      const fraudAttempts = formattedTransactions.filter(t => t.fraud_flags.length > 0).length;

      setStats({
        total_referrals: totalReferrals,
        successful_referrals: successfulReferrals,
        pending_referrals: pendingReferrals,
        total_coins_issued: totalCoinsIssued,
        conversion_rate: conversionRate,
        fraud_attempts: fraudAttempts
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = () => {
    if (!settings) return false;

    // BUG FIX #1: Negative value validation
    if (settings.referrer_reward_coins < 0) {
      toast.error('Referrer reward must be 0 or positive');
      return false;
    }
    if (settings.referee_welcome_coins < 0) {
      toast.error('Welcome bonus must be 0 or positive');
      return false;
    }
    if (settings.minimum_order_value < 0) {
      toast.error('Minimum order value must be 0 or positive');
      return false;
    }
    if (settings.max_referrals_per_user < 0) {
      toast.error('Max referrals per user must be 0 or positive');
      return false;
    }
    if (settings.daily_referral_limit < 0) {
      toast.error('Daily limit must be 0 or positive');
      return false;
    }
    if (settings.monthly_referral_limit < 0) {
      toast.error('Monthly limit must be 0 or positive');
      return false;
    }

    // BUG FIX #5: Limit validation
    if (settings.daily_referral_limit > settings.monthly_referral_limit && settings.monthly_referral_limit > 0) {
      toast.error('Daily limit cannot exceed monthly limit');
      return false;
    }

    return true;
  };

  const saveSettings = async () => {
    if (!settings) return;

    // Validate before saving
    if (!validateSettings()) {
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await (supabase as any)
        .from('referral_settings')
        .update({
          is_enabled: settings.is_enabled,
          referrer_reward_coins: settings.referrer_reward_coins,
          referee_welcome_coins: settings.referee_welcome_coins,
          minimum_order_value: settings.minimum_order_value,
          max_referrals_per_user: settings.max_referrals_per_user,
          daily_referral_limit: settings.daily_referral_limit,
          monthly_referral_limit: settings.monthly_referral_limit,
          require_first_order: settings.require_first_order,
          allow_self_referral: settings.allow_self_referral,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Referral settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const openConfirmDialog = (transactionId: string, newStatus: string, adminNotes?: string, transaction?: ReferralTransaction) => {
    setPendingAction({ transactionId, newStatus, adminNotes, transaction });
    setIsConfirmDialogOpen(true);
  };

  const updateTransactionStatus = async () => {
    if (!pendingAction) return;

    try {
      const { error } = await (supabase as any)
        .from('referral_transactions')
        .update({
          status: pendingAction.newStatus,
          admin_notes: pendingAction.adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingAction.transactionId);

      if (error) throw error;

      toast.success(`Transaction ${pendingAction.newStatus} successfully`);
      setIsConfirmDialogOpen(false);
      setPendingAction(null);
      loadReferralData(); // Reload data
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'fraud':
        return <Badge className="bg-red-100 text-red-800">Fraud</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Referral Marketing</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Manage referral system settings and monitor performance</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Switch
            checked={settings?.is_enabled || false}
            onCheckedChange={(checked) => 
              setSettings(prev => prev ? { ...prev, is_enabled: checked } : null)
            }
            className="touch-manipulation"
          />
          <span className="text-sm font-medium">
            {settings?.is_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Referrals</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_referrals}</p>
                </div>
                <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Successful</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.successful_referrals}</p>
                </div>
                <UserCheck className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Coins Issued</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{stats.total_coins_issued}</p>
                </div>
                <Gift className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Conversion Rate</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{stats.conversion_rate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-1 h-auto">
          <TabsTrigger value="settings" className="text-xs sm:text-sm h-10 sm:h-9">Settings</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm h-10 sm:h-9">Transactions</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm h-10 sm:h-9">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {settings && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Reward Settings */}
              <Card>
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                    Reward Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="referrer_coins" className="mb-1.5 block text-sm sm:text-base">Referrer Reward (Coins)</Label>
                      <Input
                        id="referrer_coins"
                        type="number"
                        value={settings.referrer_reward_coins}
                        onChange={(e) => setSettings({
                          ...settings,
                          referrer_reward_coins: parseInt(e.target.value) || 0
                        })}
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="referee_coins" className="mb-1.5 block text-sm sm:text-base">Welcome Bonus (Coins)</Label>
                      <Input
                        id="referee_coins"
                        type="number"
                        value={settings.referee_welcome_coins}
                        onChange={(e) => setSettings({
                          ...settings,
                          referee_welcome_coins: parseInt(e.target.value) || 0
                        })}
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="min_order" className="mb-1.5 block text-sm sm:text-base">Minimum Order Value (₹)</Label>
                    <Input
                      id="min_order"
                      type="number"
                      step="0.01"
                      value={settings.minimum_order_value}
                      onChange={(e) => setSettings({
                        ...settings,
                        minimum_order_value: parseFloat(e.target.value) || 0
                      })}
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>

                  <div className="flex items-center space-x-2 touch-manipulation">
                    <Switch
                      id="require_order"
                      checked={settings.require_first_order}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_first_order: checked
                      })}
                      className="touch-manipulation"
                    />
                    <Label htmlFor="require_order" className="text-sm sm:text-base">Require first order for rewards</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Limits & Security */}
              <Card>
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    Limits & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="daily_limit" className="mb-1.5 block text-sm sm:text-base">Daily Limit</Label>
                      <Input
                        id="daily_limit"
                        type="number"
                        value={settings.daily_referral_limit}
                        onChange={(e) => setSettings({
                          ...settings,
                          daily_referral_limit: parseInt(e.target.value) || 0
                        })}
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthly_limit" className="mb-1.5 block text-sm sm:text-base">Monthly Limit</Label>
                      <Input
                        id="monthly_limit"
                        type="number"
                        value={settings.monthly_referral_limit}
                        onChange={(e) => setSettings({
                          ...settings,
                          monthly_referral_limit: parseInt(e.target.value) || 0
                        })}
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="max_referrals" className="mb-1.5 block text-sm sm:text-base">Max Referrals Per User</Label>
                    <Input
                      id="max_referrals"
                      type="number"
                      value={settings.max_referrals_per_user}
                      onChange={(e) => setSettings({
                        ...settings,
                        max_referrals_per_user: parseInt(e.target.value) || 0
                      })}
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>

                  <div className="flex items-center space-x-2 touch-manipulation">
                    <Switch
                      id="allow_self"
                      checked={settings.allow_self_referral}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        allow_self_referral: checked
                      })}
                      className="touch-manipulation"
                    />
                    <Label htmlFor="allow_self" className="text-sm sm:text-base">Allow self-referral</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Recent Referral Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Referrer</th>
                      <th className="text-left p-2">Referee</th>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Coins</th>
                      <th className="text-left p-2">Order Value</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="p-2">{transaction.referrer_email}</td>
                        <td className="p-2">{transaction.referee_email}</td>
                        <td className="p-2 font-mono text-xs">{transaction.referral_code}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(transaction.status)}
                            {transaction.fraud_flags.length > 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="Fraud flags detected" />
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-xs">
                            <div>Referrer: {transaction.referrer_coins}</div>
                            <div>Referee: {transaction.referee_coins}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          {transaction.order_value ? `₹${transaction.order_value}` : '-'}
                        </td>
                        <td className="p-2 text-xs">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {transaction.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openConfirmDialog(transaction.id, 'completed', undefined, transaction)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openConfirmDialog(transaction.id, 'cancelled', 'Manually cancelled by admin', transaction)}
                                >
                                  <Ban className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Referrer</p>
                            <p className="font-medium text-sm truncate">{transaction.referrer_email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(transaction.status)}
                            {transaction.fraud_flags.length > 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="Fraud flags detected" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Referee</p>
                            <p className="font-medium truncate">{transaction.referee_email}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Code</p>
                            <p className="font-mono text-xs">{transaction.referral_code}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Referrer Coins</p>
                            <p className="font-medium">{transaction.referrer_coins}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Referee Coins</p>
                            <p className="font-medium">{transaction.referee_coins}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Order Value</p>
                            <p className="font-medium">{transaction.order_value ? `₹${transaction.order_value}` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Date</p>
                            <p className="font-medium">{new Date(transaction.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {transaction.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openConfirmDialog(transaction.id, 'completed', undefined, transaction)}
                                className="h-9 touch-manipulation"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openConfirmDialog(transaction.id, 'cancelled', 'Manually cancelled by admin', transaction)}
                                className="h-9 touch-manipulation"
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                <span className="text-xs">Cancel</span>
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="h-9 touch-manipulation">
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="text-xs">View</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm sm:text-base">
                  Leaderboard data will be displayed here
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Fraud Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Total Attempts:</span>
                    <span className="font-semibold">{stats?.fraud_attempts || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Blocked:</span>
                    <span className="font-semibold text-red-600">
                      {transactions.filter(t => t.status === 'fraud').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Success Rate:</span>
                    <span className="font-semibold text-green-600">
                      {stats ? ((stats.total_referrals - stats.fraud_attempts) / stats.total_referrals * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* BUG FIX #2: Confirmation Dialog for Status Changes */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && (
                <div className="space-y-2">
                  <p>
                    Are you sure you want to <strong>{pendingAction.newStatus}</strong> this referral transaction?
                  </p>
                  {pendingAction.transaction && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                      <p><strong>Referrer:</strong> {pendingAction.transaction.referrer_email}</p>
                      <p><strong>Referee:</strong> {pendingAction.transaction.referee_email}</p>
                      <p><strong>Referrer Coins:</strong> {pendingAction.transaction.referrer_coins}</p>
                      <p><strong>Referee Coins:</strong> {pendingAction.transaction.referee_coins}</p>
                      {pendingAction.transaction.order_value && (
                        <p><strong>Order Value:</strong> ₹{pendingAction.transaction.order_value}</p>
                      )}
                    </div>
                  )}
                  <p className="mt-3 text-yellow-600">
                    <strong>Note:</strong> This action will affect both referrer and referee accounts.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={updateTransactionStatus}
              className={pendingAction?.newStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm {pendingAction?.newStatus}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};