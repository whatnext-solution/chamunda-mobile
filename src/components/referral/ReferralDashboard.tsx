import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Gift, 
  Copy, 
  Share2, 
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  ExternalLink,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  total_coins_earned: number;
  is_active: boolean;
}

interface ReferralTransaction {
  id: string;
  referee_email: string;
  status: string;
  referrer_coins: number;
  referee_coins: number;
  order_value: number;
  created_at: string;
  completed_at: string;
}

interface ReferralSettings {
  is_enabled: boolean;
  referrer_reward_coins: number;
  referee_welcome_coins: number;
  minimum_order_value: number;
  require_first_order: boolean;
}

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  successful_referrals: number;
  total_coins_earned: number;
  badge_level: string;
}

export const ReferralDashboard = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const referralLink = referralData ? 
    `${window.location.origin}/signup?ref=${referralData.referral_code}` : '';

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user's referral data
      const { data: referralCode, error: codeError} = await (supabase as any)
        .from('user_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (codeError) throw codeError;
      setReferralData(referralCode);

      // Load referral transactions with user profile lookup
      const { data: transactionsData, error: transactionsError } = await (supabase as any)
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;
      
      // Format transactions with user profile lookup for referee names
      const formattedTransactions = [];
      if (transactionsData && transactionsData.length > 0) {
        // Get referee user IDs
        const refereeIds = transactionsData.map(t => t.referee_id);
        
        // Fetch user profiles for referee display names
        const { data: userProfiles } = await (supabase as any)
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', refereeIds);
        
        // Create user lookup map
        const userLookup = {};
        userProfiles?.forEach(profile => {
          userLookup[profile.user_id] = profile.full_name || profile.email || 'Friend';
        });
        
        // Format transactions with referee names
        transactionsData.forEach(t => {
          formattedTransactions.push({
            id: t.id,
            referee_email: userLookup[t.referee_id] || 'Friend',
            status: t.status,
            referrer_coins: t.referrer_coins,
            referee_coins: t.referee_coins,
            order_value: t.order_value,
            created_at: t.created_at,
            completed_at: t.completed_at
          });
        });
      }

      setTransactions(formattedTransactions);

      // Load referral settings (handle duplicate records)
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

      // Load leaderboard
      const { data: leaderboardData, error: leaderboardError } = await (supabase as any)
        .from('referral_leaderboard')
        .select('*')
        .limit(10);

      if (leaderboardError) throw leaderboardError;
      setLeaderboard(leaderboardData || []);

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!referralData) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(referralData.referral_code);
      toast.success('Referral code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy referral code');
    } finally {
      setCopying(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy referral link');
    } finally {
      setCopying(false);
    }
  };

  const shareViaWhatsApp = () => {
    const message = `🎉 Join me on our amazing platform and get ${settings?.referee_welcome_coins} coins as welcome bonus! Use my referral link: ${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBadgeIcon = (level: string) => {
    switch (level) {
      case 'Diamond':
        return '💎';
      case 'Gold':
        return '🥇';
      case 'Silver':
        return '🥈';
      case 'Bronze':
        return '🥉';
      default:
        return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings?.is_enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Referral Program Coming Soon
            </h3>
            <p className="text-gray-600">
              Our referral program is currently disabled. Check back later for exciting rewards!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refer & Earn</h1>
          <p className="text-gray-600">
            Invite friends and earn {settings?.referrer_reward_coins} coins for each successful referral
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Your Referral Code</p>
          <p className="text-2xl font-bold text-blue-600">{referralData?.referral_code}</p>
        </div>
      </div>

      {/* Stats Cards */}
      {referralData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">{referralData.total_referrals}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{referralData.successful_referrals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coins Earned</p>
                  <p className="text-2xl font-bold text-yellow-600">{referralData.total_coins_earned}</p>
                </div>
                <Coins className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="share" className="space-y-4">
        <TabsList>
          <TabsTrigger value="share">Share & Earn</TabsTrigger>
          <TabsTrigger value="history">My Referrals</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Share Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Your Referral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Referral Code</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={referralData?.referral_code || ''}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={copyReferralCode}
                      disabled={copying}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Referral Link</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={referralLink}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      onClick={copyReferralLink}
                      disabled={copying}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={shareViaWhatsApp} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share on WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Join me and earn coins!',
                        text: `Get ${settings?.referee_welcome_coins} coins as welcome bonus!`,
                        url: referralLink
                      });
                    }
                  }}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* How it Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Share your referral link</p>
                      <p className="text-sm text-gray-600">Send your unique link to friends</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Friend signs up</p>
                      <p className="text-sm text-gray-600">They create account using your link</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">
                        {settings?.require_first_order ? 'First order placed' : 'Instant reward'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {settings?.require_first_order 
                          ? `Minimum order value: ₹${settings.minimum_order_value}`
                          : 'Coins credited immediately'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Earn coins!</p>
                      <p className="text-sm text-gray-600">
                        You get {settings?.referrer_reward_coins} coins, they get {settings?.referee_welcome_coins} coins
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No referrals yet</h3>
                  <p className="text-gray-600">Start sharing your referral link to earn coins!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Friend</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Coins Earned</th>
                        <th className="text-left p-2">Order Value</th>
                        <th className="text-left p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{transaction.referee_email}</td>
                          <td className="p-2">{getStatusBadge(transaction.status)}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              <span className="font-semibold">{transaction.referrer_coins}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            {transaction.order_value ? `₹${transaction.order_value}` : '-'}
                          </td>
                          <td className="p-2 text-xs">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
                  <p className="text-gray-600">Be the first to appear on the leaderboard!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {entry.rank}
                        </div>
                        <div>
                          <p className="font-semibold">{entry.full_name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-600">
                            {entry.successful_referrals} successful referrals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getBadgeIcon(entry.badge_level)}</span>
                          <div>
                            <p className="font-semibold text-yellow-600">{entry.total_coins_earned} coins</p>
                            <p className="text-xs text-gray-500">{entry.badge_level}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};