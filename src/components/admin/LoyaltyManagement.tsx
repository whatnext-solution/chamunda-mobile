import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';

// Type assertion helper for loyalty tables
const loyaltySupabase = supabase as any;
import { 
  Coins, 
  Settings, 
  Users, 
  TrendingUp, 
  Gift, 
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Star,
  Sparkles,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface LoyaltyStats {
  totalUsers: number;
  totalCoinsIssued: number;
  totalCoinsRedeemed: number;
  activeUsers: number;
  totalTransactions: number;
}

interface UserWallet {
  id: string;
  user_id: string;
  total_coins_earned: number;
  total_coins_used: number;
  available_coins: number;
  last_updated: string;
  users?: { email: string };
}

interface LoyaltyTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  coins_amount: number;
  description: string;
  created_at: string;
  users?: { email: string };
}

interface SystemSettings {
  id: string;
  is_system_enabled: boolean;
  global_coins_multiplier: number;
  default_coins_per_rupee: number;
  coin_expiry_days?: number;
  min_coins_to_redeem: number;
  min_order_amount?: number;
  max_coins_per_order?: number;
  festive_multiplier: number;
  festive_start_date?: string;
  festive_end_date?: string;
}

export default function LoyaltyManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null);
  const [userTransactions, setUserTransactions] = useState<LoyaltyTransaction[]>([]);
  const [currentWalletsPage, setCurrentWalletsPage] = useState(1);
  const [currentTransactionsPage, setCurrentTransactionsPage] = useState(1);
  const itemsPerPage = 20;
  const [manualAdjustment, setManualAdjustment] = useState({
    coins: 0,
    type: 'add' as 'add' | 'remove',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentWalletsPage(1);
    setCurrentTransactionsPage(1);
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUserWallets(),
        fetchTransactions(),
        fetchSystemSettings()
      ]);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      toast.error('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Initialize default stats
      let totalUsers = 0;
      let totalCoinsIssued = 0;
      let totalCoinsRedeemed = 0;
      let activeUsers = 0;
      let totalTransactions = 0;

      // Get total users with wallets (safe query)
      try {
        const { count } = await loyaltySupabase
          .from('loyalty_coins_wallet')
          .select('*', { count: 'exact', head: true });
        totalUsers = count || 0;
      } catch (error) {
        console.warn('Could not fetch wallet count:', error);
      }

      // Get total coins issued and redeemed (safe query)
      try {
        const { data: coinsData } = await loyaltySupabase
          .from('loyalty_coins_wallet')
          .select('total_coins_earned, total_coins_used');

        if (coinsData) {
          totalCoinsIssued = coinsData.reduce((sum: number, wallet: any) => sum + (wallet.total_coins_earned || 0), 0);
          totalCoinsRedeemed = coinsData.reduce((sum: number, wallet: any) => sum + (wallet.total_coins_used || 0), 0);
        }
      } catch (error) {
        console.warn('Could not fetch coins data:', error);
      }

      // Get active users (safe query)
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: activeUsersData } = await loyaltySupabase
          .from('loyalty_transactions')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (activeUsersData) {
          activeUsers = new Set(activeUsersData.map((t: any) => t.user_id)).size;
        }
      } catch (error) {
        console.warn('Could not fetch active users:', error);
      }

      // Get total transactions (safe query)
      try {
        const { count } = await loyaltySupabase
          .from('loyalty_transactions')
          .select('*', { count: 'exact', head: true });
        totalTransactions = count || 0;
      } catch (error) {
        console.warn('Could not fetch transaction count:', error);
      }

      setStats({
        totalUsers,
        totalCoinsIssued,
        totalCoinsRedeemed,
        activeUsers,
        totalTransactions
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        totalUsers: 0,
        totalCoinsIssued: 0,
        totalCoinsRedeemed: 0,
        activeUsers: 0,
        totalTransactions: 0
      });
    }
  };

  const fetchUserWallets = async () => {
    try {
      // Simple approach - just get wallet data without user info for now
      const { data, error } = await loyaltySupabase
        .from('loyalty_coins_wallet')
        .select('*')
        .order('available_coins', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching user wallets:', error);
        setUserWallets([]);
        return;
      }

      // Add basic user info without complex joins
      const walletsWithBasicInfo = (data || []).map((wallet: any) => ({
        ...wallet,
        user_email: `User ${wallet.user_id.slice(0, 8)}`, // Simple user identifier
        user_name: `User ${wallet.user_id.slice(0, 8)}`
      }));

      setUserWallets(walletsWithBasicInfo as UserWallet[]);
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      setUserWallets([]);
    }
  };

  const fetchTransactions = async () => {
    try {
      // Simple approach - just get transaction data without user info for now
      const { data, error } = await loyaltySupabase
        .from('loyalty_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
        return;
      }

      // Add basic user info without complex joins
      const transactionsWithBasicInfo = (data || []).map((transaction: any) => ({
        ...transaction,
        user_email: `User ${transaction.user_id.slice(0, 8)}`, // Simple user identifier
        user_name: `User ${transaction.user_id.slice(0, 8)}`
      }));

      setTransactions(transactionsWithBasicInfo as LoyaltyTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await loyaltySupabase
        .from('loyalty_system_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        // Handle table not found (406) or no data found (PGRST116)
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation')) {
          console.warn('Loyalty system settings table not found or empty, creating default settings');
          
          // Create default settings
          const defaultSettings = {
            is_system_enabled: true,
            global_coins_multiplier: 1.00,
            default_coins_per_rupee: 0.10,
            min_coins_to_redeem: 10,
            festive_multiplier: 1.00
          };

          try {
            const { data: newSettings, error: createError } = await loyaltySupabase
              .from('loyalty_system_settings')
              .insert(defaultSettings)
              .select()
              .single();

            if (createError) {
              console.error('Failed to create default settings:', createError);
              setSystemSettings(null);
            } else {
              setSystemSettings(newSettings as SystemSettings);
            }
          } catch (createErr) {
            console.error('Error creating default settings:', createErr);
            setSystemSettings(null);
          }
          return;
        }
        throw error;
      }
      
      setSystemSettings(data as SystemSettings || null);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setSystemSettings(null);
    }
  };

  const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
    try {
      const { error } = await loyaltySupabase
        .from('loyalty_system_settings')
        .upsert({
          id: systemSettings?.id,
          ...systemSettings,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await fetchSystemSettings();
      toast.success('System settings updated successfully');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to update system settings');
    }
  };

  const openConfirmDialog = () => {
    if (!selectedUser || !manualAdjustment.coins || !manualAdjustment.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validation: Coins must be whole number
    if (!Number.isInteger(manualAdjustment.coins)) {
      toast.error('Coins must be a whole number');
      return;
    }

    // Validation: Coins must be positive
    if (manualAdjustment.coins <= 0) {
      toast.error('Coins amount must be greater than 0');
      return;
    }

    // Validation: Check insufficient balance for removal
    if (manualAdjustment.type === 'remove' && selectedUser.available_coins < manualAdjustment.coins) {
      toast.error(`Insufficient coins. Available: ${selectedUser.available_coins}, Requested: ${manualAdjustment.coins}`);
      return;
    }

    // Open confirmation dialog
    setIsConfirmDialogOpen(true);
  };

  const handleManualAdjustment = async () => {
    if (!selectedUser) return;

    try {
      const coinsAmount = manualAdjustment.type === 'add' ? manualAdjustment.coins : -manualAdjustment.coins;
      
      // Create transaction record
      const { error: transactionError } = await loyaltySupabase
        .from('loyalty_transactions')
        .insert({
          user_id: selectedUser.user_id,
          transaction_type: manualAdjustment.type === 'add' ? 'manual_add' : 'manual_remove',
          coins_amount: coinsAmount,
          description: manualAdjustment.reason,
          admin_notes: `Manual adjustment by admin: ${manualAdjustment.reason}`
        });

      if (transactionError) throw transactionError;

      // Update user wallet
      const newAvailableCoins = selectedUser.available_coins + coinsAmount;
      const { error: walletError } = await loyaltySupabase
        .from('loyalty_coins_wallet')
        .update({
          total_coins_earned: manualAdjustment.type === 'add' 
            ? selectedUser.total_coins_earned + manualAdjustment.coins 
            : selectedUser.total_coins_earned,
          total_coins_used: manualAdjustment.type === 'remove' 
            ? selectedUser.total_coins_used + manualAdjustment.coins 
            : selectedUser.total_coins_used,
          available_coins: Math.max(0, newAvailableCoins),
          last_updated: new Date().toISOString()
        })
        .eq('user_id', selectedUser.user_id);

      if (walletError) throw walletError;

      toast.success(`Successfully ${manualAdjustment.type === 'add' ? 'added' : 'removed'} ${manualAdjustment.coins} coins. New balance: ${Math.max(0, newAvailableCoins)} coins`);
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
      setSelectedUser(null);
      setManualAdjustment({ coins: 0, type: 'add', reason: '' });
      await loadData();
    } catch (error) {
      console.error('Error processing manual adjustment:', error);
      toast.error('Failed to process manual adjustment');
    }
  };

  const fetchUserHistory = async (userId: string) => {
    try {
      const { data, error } = await loyaltySupabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transactionsWithBasicInfo = (data || []).map((transaction: any) => ({
        ...transaction,
        user_email: `User ${transaction.user_id.slice(0, 8)}`,
        user_name: `User ${transaction.user_id.slice(0, 8)}`
      }));

      setUserTransactions(transactionsWithBasicInfo as LoyaltyTransaction[]);
    } catch (error) {
      console.error('Error fetching user history:', error);
      toast.error('Failed to load user history');
    }
  };

  const openHistoryDialog = async (wallet: UserWallet) => {
    setSelectedUser(wallet);
    setIsHistoryDialogOpen(true);
    await fetchUserHistory(wallet.user_id);
  };

  const filteredWallets = userWallets.filter(wallet =>
    wallet.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(transaction =>
    transaction.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic for wallets
  const totalWalletsPages = Math.ceil(filteredWallets.length / itemsPerPage);
  const paginatedWallets = filteredWallets.slice(
    (currentWalletsPage - 1) * itemsPerPage,
    currentWalletsPage * itemsPerPage
  );

  // Pagination logic for transactions
  const totalTransactionsPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentTransactionsPage - 1) * itemsPerPage,
    currentTransactionsPage * itemsPerPage
  );

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>
        <TableShimmer />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
            Loyalty Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage loyalty coins system and user rewards
          </p>
        </div>
        
        {systemSettings && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">System Status:</span>
            <Badge variant={systemSettings.is_system_enabled ? "default" : "secondary"}>
              {systemSettings.is_system_enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Total Users</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Coins Issued</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">{stats.totalCoinsIssued.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Coins Redeemed</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">{stats.totalCoinsRedeemed.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Active Users</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Transactions</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">{stats.totalTransactions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-5 lg:-mx-6 px-3 sm:px-4 md:px-5 lg:px-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit min-w-full sm:min-w-0">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'User Wallets', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: Calendar },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 h-11 sm:h-9 touch-manipulation whitespace-nowrap"
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
              <ScrollArea className="h-64 sm:h-72 md:h-80">
                <div className="space-y-2 sm:space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">
                          {transaction.users?.email || 'Unknown User'}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className={`font-bold text-sm sm:text-base ml-2 flex-shrink-0 ${transaction.coins_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.coins_amount > 0 ? '+' : ''}{transaction.coins_amount}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Users */}
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                Top Coin Holders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
              <ScrollArea className="h-64 sm:h-72 md:h-80">
                <div className="space-y-2 sm:space-y-3">
                  {userWallets.slice(0, 10).map((wallet, index) => (
                    <div key={wallet.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-700 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate">
                            {wallet.users?.email || 'Unknown User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Earned: {wallet.total_coins_earned} | Used: {wallet.total_coins_used}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-yellow-600 text-sm sm:text-base ml-2 flex-shrink-0">
                        {wallet.available_coins}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <Card>
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                User Wallets ({filteredWallets.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64 h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <ScrollArea className="h-96">
              <div className="space-y-2 sm:space-y-3">
                {paginatedWallets.map((wallet) => (
                  <div key={wallet.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {wallet.users?.email || 'Unknown User'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Earned: {wallet.total_coins_earned} | Used: {wallet.total_coins_used}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last updated: {formatDistanceToNow(new Date(wallet.last_updated), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right">
                        <div className="font-bold text-yellow-600 text-base sm:text-lg">
                          {wallet.available_coins} coins
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHistoryDialog(wallet)}
                        className="h-11 sm:h-9 touch-manipulation"
                      >
                        <Calendar className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">History</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(wallet);
                          setIsDialogOpen(true);
                        }}
                        className="h-11 sm:h-9 touch-manipulation"
                      >
                        <Edit className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Pagination Controls */}
            {totalWalletsPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentWalletsPage} of {totalWalletsPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentWalletsPage(prev => Math.max(1, prev - 1))}
                    disabled={currentWalletsPage === 1}
                    className="h-9 touch-manipulation"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentWalletsPage(prev => Math.min(totalWalletsPages, prev + 1))}
                    disabled={currentWalletsPage === totalWalletsPages}
                    className="h-9 touch-manipulation"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                All Transactions ({filteredTransactions.length})
              </CardTitle>
              <div className="relative flex-1 sm:flex-none">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64 h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <ScrollArea className="h-96">
              <div className="space-y-2 sm:space-y-3">
                {paginatedTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {transaction.users?.email || 'Unknown User'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <Badge variant={transaction.transaction_type === 'earned' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.transaction_type}
                      </Badge>
                      <div className={`font-bold text-sm sm:text-base ${transaction.coins_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.coins_amount > 0 ? '+' : ''}{transaction.coins_amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Pagination Controls */}
            {totalTransactionsPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentTransactionsPage} of {totalTransactionsPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentTransactionsPage(prev => Math.max(1, prev - 1))}
                    disabled={currentTransactionsPage === 1}
                    className="h-9 touch-manipulation"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentTransactionsPage(prev => Math.min(totalTransactionsPages, prev + 1))}
                    disabled={currentTransactionsPage === totalTransactionsPages}
                    className="h-9 touch-manipulation"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && systemSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* System Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Enable Loyalty System</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Turn the entire loyalty system on/off
                  </p>
                </div>
                <Switch
                  checked={systemSettings.is_system_enabled}
                  onCheckedChange={(checked) => updateSystemSettings({ is_system_enabled: checked })}
                  className="touch-manipulation"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Coins per Rupee</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={systemSettings.default_coins_per_rupee}
                  onChange={(e) => updateSystemSettings({ default_coins_per_rupee: parseFloat(e.target.value) || 0 })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  How many coins users earn per rupee spent
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Global Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={systemSettings.global_coins_multiplier}
                  onChange={(e) => updateSystemSettings({ global_coins_multiplier: parseFloat(e.target.value) || 1 })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Global multiplier for all coin earnings
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Minimum Coins to Redeem</Label>
                <Input
                  type="number"
                  value={systemSettings.min_coins_to_redeem}
                  onChange={(e) => updateSystemSettings({ min_coins_to_redeem: parseInt(e.target.value) || 0 })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Minimum coins required for redemption
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Minimum Order Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={systemSettings.min_order_amount || ''}
                  onChange={(e) => updateSystemSettings({ min_order_amount: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No minimum"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Minimum order amount to earn loyalty coins
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Max Coins per Order</Label>
                <Input
                  type="number"
                  value={systemSettings.max_coins_per_order || ''}
                  onChange={(e) => updateSystemSettings({ max_coins_per_order: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="No limit"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Maximum coins that can be earned per order
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Festive Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                Festive Bonus Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Festive Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={systemSettings.festive_multiplier}
                  onChange={(e) => updateSystemSettings({ festive_multiplier: parseFloat(e.target.value) || 1 })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Additional multiplier during festive period
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Festive Start Date</Label>
                <Input
                  type="datetime-local"
                  value={systemSettings.festive_start_date ? new Date(systemSettings.festive_start_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateSystemSettings({ festive_start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Festive End Date</Label>
                <Input
                  type="datetime-local"
                  value={systemSettings.festive_end_date ? new Date(systemSettings.festive_end_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateSystemSettings({ festive_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>

              {systemSettings.festive_start_date && systemSettings.festive_end_date && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <Sparkles className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm">Festive Period Active</span>
                  </div>
                  <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                    {systemSettings.festive_multiplier}x bonus coins during this period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Adjustment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 sm:p-5 md:p-6 pb-3">
            <DialogTitle className="text-lg sm:text-xl">Manual Coin Adjustment</DialogTitle>
            <DialogDescription className="text-sm">
              Manually add or remove coins for {selectedUser?.users?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium mb-1.5 block">Action</Label>
              <Select value={manualAdjustment.type} onValueChange={(value: 'add' | 'remove') => setManualAdjustment({ ...manualAdjustment, type: value })}>
                <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Coins</SelectItem>
                  <SelectItem value="remove">Remove Coins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium mb-1.5 block">Number of Coins</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={manualAdjustment.coins}
                onChange={(e) => setManualAdjustment({ ...manualAdjustment, coins: parseInt(e.target.value) || 0 })}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              />
              <p className="text-xs text-muted-foreground">
                Coins must be whole numbers only
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium mb-1.5 block">Reason</Label>
              <Textarea
                value={manualAdjustment.reason}
                onChange={(e) => setManualAdjustment({ ...manualAdjustment, reason: e.target.value })}
                placeholder="Enter reason for this adjustment..."
                rows={3}
                className="resize-none touch-manipulation"
              />
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t">
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={openConfirmDialog}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                >
                  {manualAdjustment.type === 'add' ? 'Add' : 'Remove'} Coins
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-md">
          <DialogHeader className="p-4 sm:p-5 md:p-6 pb-3">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirm Adjustment
            </DialogTitle>
            <DialogDescription className="text-sm">
              Please review the details before confirming
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">{selectedUser?.users?.email || 'Unknown User'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Action:</span>
                <span className="font-medium capitalize">{manualAdjustment.type} Coins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className={`font-bold ${manualAdjustment.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                  {manualAdjustment.type === 'add' ? '+' : '-'}{manualAdjustment.coins} coins
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-medium">{selectedUser?.available_coins} coins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Balance:</span>
                <span className="font-bold text-yellow-600">
                  {selectedUser ? (
                    manualAdjustment.type === 'add' 
                      ? selectedUser.available_coins + manualAdjustment.coins 
                      : Math.max(0, selectedUser.available_coins - manualAdjustment.coins)
                  ) : 0} coins
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Reason:</strong> {manualAdjustment.reason}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmDialogOpen(false)}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleManualAdjustment}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 sm:p-5 md:p-6 pb-3">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Transaction History
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedUser?.users?.email || 'Unknown User'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 sm:p-5 md:p-6 pt-0">
            {/* User Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Earned</div>
                <div className="text-lg font-bold text-green-600">{selectedUser?.total_coins_earned || 0}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Used</div>
                <div className="text-lg font-bold text-red-600">{selectedUser?.total_coins_used || 0}</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Available</div>
                <div className="text-lg font-bold text-yellow-600">{selectedUser?.available_coins || 0}</div>
              </div>
            </div>

            {/* Transaction List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {userTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                ) : (
                  userTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={transaction.coins_amount > 0 ? 'default' : 'secondary'} className="text-xs">
                            {transaction.transaction_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {transaction.description}
                        </div>
                      </div>
                      <div className={`font-bold text-base ml-3 flex-shrink-0 ${transaction.coins_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.coins_amount > 0 ? '+' : ''}{transaction.coins_amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsHistoryDialogOpen(false)}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}