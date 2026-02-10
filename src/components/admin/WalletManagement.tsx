import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wallet, 
  Users, 
  Search, 
  Plus, 
  Minus,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Star,
  Coins,
  Gift,
  Settings,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface UserWallet {
  id: string;
  user_id: string;
  loyalty_coins: number;
  affiliate_earnings: number;
  instagram_rewards: number;
  refund_credits: number;
  promotional_credits: number;
  total_redeemable_amount: number;
  marketing_role: string;
  last_updated: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface WalletAdjustment {
  userId: string;
  walletType: string;
  amount: number;
  coinsAmount: number;
  transactionType: 'credit' | 'debit';
  description: string;
  adminNotes: string;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_type: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  coins_amount: number;
  description: string;
  admin_notes: string;
  old_balance: number;
  new_balance: number;
  created_at: string;
  admin_id?: string;
}

export const WalletManagement = () => {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [showRoleChangeForm, setShowRoleChangeForm] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [walletHistory, setWalletHistory] = useState<WalletTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [adjustment, setAdjustment] = useState<WalletAdjustment>({
    userId: '',
    walletType: 'loyalty_coins',
    amount: 0,
    coinsAmount: 0,
    transactionType: 'credit',
    description: '',
    adminNotes: ''
  });
  const [roleChange, setRoleChange] = useState({
    userId: '',
    newRole: 'none' as 'affiliate' | 'instagram' | 'none',
    adminNotes: ''
  });
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Fetch all user wallets
  const fetchWallets = async () => {
    try {
      setLoading(true);
      
      // Get wallets first (using type assertion to bypass TypeScript issues)
      const { data: walletsData, error: walletsError } = await (supabase as any)
        .from('unified_wallet')
        .select('*')
        .order('total_redeemable_amount', { ascending: false });

      if (walletsError) throw walletsError;

      // Get user profiles separately
      const { data: profilesData, error: profilesError } = await (supabase as any)
        .from('user_profiles')
        .select('user_id, email, full_name, marketing_role');

      if (profilesError) throw profilesError;

      // Merge the data
      const formattedData = walletsData?.map((wallet: any) => {
        const profile = profilesData?.find((p: any) => p.user_id === wallet.user_id);
        return {
          ...wallet,
          user_email: profile?.email,
          user_name: profile?.full_name,
          marketing_role: profile?.marketing_role || 'none'
        };
      }) || [];
      
      setWallets(formattedData);
    } catch (error: any) {
      console.error('Error fetching wallets:', error);
      toast.error('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  // Handle wallet adjustment
  const handleWalletAdjustment = async () => {
    // Validation: Check required fields
    if (!adjustment.userId) {
      toast.error('Please select a user');
      return;
    }

    if (!adjustment.description.trim()) {
      toast.error('Description is required');
      return;
    }

    // Validation: Check amount
    const amountToCheck = adjustment.walletType.includes('coins') || adjustment.walletType.includes('rewards') 
      ? adjustment.coinsAmount 
      : adjustment.amount;

    if (amountToCheck <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Validation: Check for decimal in coins
    if ((adjustment.walletType.includes('coins') || adjustment.walletType.includes('rewards')) && 
        !Number.isInteger(adjustment.coinsAmount)) {
      toast.error('Coins amount must be a whole number');
      return;
    }

    try {
      setAdjustmentLoading(true);

      // Get current wallet
      const { data: currentWallet, error: fetchError } = await (supabase as any)
        .from('unified_wallet')
        .select('*')
        .eq('user_id', adjustment.userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Calculate new values
      const current = currentWallet || {
        loyalty_coins: 0,
        affiliate_earnings: 0,
        instagram_rewards: 0,
        refund_credits: 0,
        promotional_credits: 0
      };

      let updateData: any = {};
      let oldBalance = 0;
      let newBalance = 0;
      
      if (adjustment.walletType === 'loyalty_coins') {
        oldBalance = current.loyalty_coins;
        if (adjustment.transactionType === 'debit' && oldBalance < adjustment.coinsAmount) {
          toast.error(`Insufficient balance. Available: ${oldBalance} coins, Requested: ${adjustment.coinsAmount} coins`);
          setAdjustmentLoading(false);
          return;
        }
        newBalance = adjustment.transactionType === 'credit' 
          ? oldBalance + adjustment.coinsAmount
          : oldBalance - adjustment.coinsAmount;
        updateData.loyalty_coins = newBalance;
      } else if (adjustment.walletType === 'instagram_rewards') {
        oldBalance = current.instagram_rewards;
        if (adjustment.transactionType === 'debit' && oldBalance < adjustment.coinsAmount) {
          toast.error(`Insufficient balance. Available: ${oldBalance} rewards, Requested: ${adjustment.coinsAmount} rewards`);
          setAdjustmentLoading(false);
          return;
        }
        newBalance = adjustment.transactionType === 'credit' 
          ? oldBalance + adjustment.coinsAmount
          : oldBalance - adjustment.coinsAmount;
        updateData.instagram_rewards = newBalance;
      } else {
        // For monetary values
        oldBalance = current[adjustment.walletType] || 0;
        if (adjustment.transactionType === 'debit' && oldBalance < adjustment.amount) {
          toast.error(`Insufficient balance. Available: ₹${oldBalance.toFixed(2)}, Requested: ₹${adjustment.amount.toFixed(2)}`);
          setAdjustmentLoading(false);
          return;
        }
        newBalance = adjustment.transactionType === 'credit' 
          ? oldBalance + adjustment.amount
          : oldBalance - adjustment.amount;
        updateData[adjustment.walletType] = newBalance;
      }

      // Calculate new total
      const newWallet = { ...current, ...updateData };
      updateData.total_redeemable_amount = 
        (newWallet.affiliate_earnings || 0) + 
        (newWallet.refund_credits || 0) + 
        (newWallet.promotional_credits || 0) + 
        ((newWallet.loyalty_coins || 0) * 0.1) + 
        ((newWallet.instagram_rewards || 0) * 0.1);

      updateData.last_updated = new Date().toISOString();

      // Update or insert wallet
      const { error: updateError } = await (supabase as any)
        .from('unified_wallet')
        .upsert({
          user_id: adjustment.userId,
          ...updateData
        });

      if (updateError) throw updateError;

      // Log transaction (if wallet_transactions table exists)
      try {
        await (supabase as any)
          .from('wallet_transactions')
          .insert({
            user_id: adjustment.userId,
            wallet_type: adjustment.walletType,
            transaction_type: adjustment.transactionType,
            amount: adjustment.amount,
            coins_amount: adjustment.coinsAmount,
            description: adjustment.description,
            admin_notes: adjustment.adminNotes,
            old_balance: oldBalance,
            new_balance: newBalance
          });
      } catch (logError) {
        console.warn('Transaction logging failed (table may not exist):', logError);
      }

      const changeAmount = adjustment.walletType.includes('coins') || adjustment.walletType.includes('rewards')
        ? `${adjustment.coinsAmount} ${adjustment.walletType.includes('coins') ? 'coins' : 'rewards'}`
        : `₹${adjustment.amount.toFixed(2)}`;

      toast.success(`${adjustment.transactionType === 'credit' ? 'Added' : 'Removed'} ${changeAmount} ${adjustment.transactionType === 'credit' ? 'to' : 'from'} ${formatWalletType(adjustment.walletType)}. New balance: ${adjustment.walletType.includes('coins') || adjustment.walletType.includes('rewards') ? newBalance : '₹' + newBalance.toFixed(2)}`);
      
      setShowAdjustmentForm(false);
      setShowConfirmDialog(false);
      setAdjustment({
        userId: '',
        walletType: 'loyalty_coins',
        amount: 0,
        coinsAmount: 0,
        transactionType: 'credit',
        description: '',
        adminNotes: ''
      });
      await fetchWallets();
    } catch (error: any) {
      console.error('Error adjusting wallet:', error);
      toast.error(`Failed to adjust wallet: ${error.message}`);
    } finally {
      setAdjustmentLoading(false);
    }
  };

  // Fetch wallet transaction history
  const fetchWalletHistory = async (userId: string) => {
    try {
      setHistoryLoading(true);
      const { data, error } = await (supabase as any)
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Table might not exist
        console.warn('Wallet transactions table not found:', error);
        setWalletHistory([]);
        return;
      }

      setWalletHistory((data as any) || []);
    } catch (error) {
      console.error('Error fetching wallet history:', error);
      setWalletHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle view history
  const handleViewHistory = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setShowHistoryDialog(true);
    fetchWalletHistory(wallet.user_id);
  };

  // Reset filters
  const resetSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Handle role change
  const handleRoleChange = async () => {
    if (!roleChange.userId || !roleChange.newRole) {
      toast.error('Please select a user and role');
      return;
    }

    try {
      setRoleChangeLoading(true);

      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({ 
          marketing_role: roleChange.newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', roleChange.userId);

      if (error) throw error;

      toast.success(`Marketing role updated to: ${roleChange.newRole}`);
      setShowRoleChangeForm(false);
      setRoleChange({
        userId: '',
        newRole: 'none',
        adminNotes: ''
      });
      await fetchWallets();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error(`Failed to change role: ${error.message}`);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  // Filter wallets based on search
  const filteredWallets = wallets.filter(wallet => 
    wallet.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredWallets.length / itemsPerPage);
  const paginatedWallets = filteredWallets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchWallets();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'affiliate': return <TrendingUp className="h-4 w-4" />;
      case 'instagram': return <Star className="h-4 w-4" />;
      case 'none': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'affiliate': return 'default';
      case 'instagram': return 'secondary';
      case 'none': return 'outline';
      default: return 'outline';
    }
  };

  const formatWalletType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
            Wallet Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage user wallets, roles, and perform adjustments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowAdjustmentForm(true)} 
            variant="outline"
            className="h-11 sm:h-10 md:h-11 flex-1 sm:flex-none touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Adjust Wallet</span>
          </Button>
          <Button 
            onClick={() => setShowRoleChangeForm(true)} 
            variant="outline"
            className="h-11 sm:h-10 md:h-11 flex-1 sm:flex-none touch-manipulation"
          >
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Change Role</span>
          </Button>
          <Button 
            onClick={fetchWallets} 
            variant="outline"
            className="h-11 sm:h-10 md:h-11 touch-manipulation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search by email, name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Wallets List */}
      <Card>
        <CardHeader className="p-4 sm:p-5 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            User Wallets ({filteredWallets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 sm:h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Wallets Found</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {searchTerm ? 'No wallets match your search criteria.' : 'No user wallets available.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredWallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {wallet.user_name || wallet.user_email || 'Unknown User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {wallet.user_email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {wallet.user_id.slice(0, 8)}...
                            </div>
                          </div>
                          <Badge variant={getRoleBadgeVariant(wallet.marketing_role)}>
                            {getRoleIcon(wallet.marketing_role)}
                            <span className="ml-1 capitalize">{wallet.marketing_role}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {/* Wallet Breakdown */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-blue-600">
                                {wallet.loyalty_coins}
                              </div>
                              <div className="text-xs text-muted-foreground">Loyalty</div>
                            </div>
                            {wallet.marketing_role === 'affiliate' && (
                              <div className="text-center">
                                <div className="font-semibold text-green-600">
                                  ₹{wallet.affiliate_earnings.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">Affiliate</div>
                              </div>
                            )}
                            {wallet.marketing_role === 'instagram' && (
                              <div className="text-center">
                                <div className="font-semibold text-purple-600">
                                  {wallet.instagram_rewards}
                                </div>
                                <div className="text-xs text-muted-foreground">Instagram</div>
                              </div>
                            )}
                            <div className="text-center">
                              <div className="font-semibold text-orange-600">
                                ₹{wallet.refund_credits.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Refunds</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-pink-600">
                                ₹{wallet.promotional_credits.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Promo</div>
                            </div>
                          </div>
                          
                          {/* Total Balance */}
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">
                              ₹{wallet.total_redeemable_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Balance
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setAdjustment(prev => ({ ...prev, userId: wallet.user_id }));
                                setShowAdjustmentForm(true);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setRoleChange(prev => ({ 
                                  ...prev, 
                                  userId: wallet.user_id,
                                  newRole: wallet.marketing_role as any
                                }));
                                setShowRoleChangeForm(true);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {filteredWallets.map((wallet) => (
                  <Card key={wallet.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* User Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base truncate">
                            {wallet.user_name || wallet.user_email || 'Unknown User'}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {wallet.user_email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {wallet.user_id.slice(0, 8)}...
                          </div>
                        </div>
                        <Badge variant={getRoleBadgeVariant(wallet.marketing_role)} className="ml-2 flex-shrink-0">
                          {getRoleIcon(wallet.marketing_role)}
                          <span className="ml-1 capitalize text-xs">{wallet.marketing_role}</span>
                        </Badge>
                      </div>

                      <Separator className="my-3" />

                      {/* Wallet Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <div className="font-semibold text-blue-600 text-sm sm:text-base">
                            {wallet.loyalty_coins}
                          </div>
                          <div className="text-xs text-muted-foreground">Loyalty Coins</div>
                        </div>
                        
                        {wallet.marketing_role === 'affiliate' && (
                          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                            <div className="font-semibold text-green-600 text-sm sm:text-base">
                              ₹{wallet.affiliate_earnings.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Affiliate</div>
                          </div>
                        )}
                        
                        {wallet.marketing_role === 'instagram' && (
                          <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                            <div className="font-semibold text-purple-600 text-sm sm:text-base">
                              {wallet.instagram_rewards}
                            </div>
                            <div className="text-xs text-muted-foreground">Instagram</div>
                          </div>
                        )}
                        
                        <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                          <div className="font-semibold text-orange-600 text-sm sm:text-base">
                            ₹{wallet.refund_credits.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Refunds</div>
                        </div>
                        
                        <div className="text-center p-2 rounded-lg bg-pink-50 dark:bg-pink-950/20">
                          <div className="font-semibold text-pink-600 text-sm sm:text-base">
                            ₹{wallet.promotional_credits.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Promo</div>
                        </div>
                      </div>

                      {/* Total Balance */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 mb-3">
                        <span className="text-sm font-medium">Total Balance</span>
                        <span className="text-lg sm:text-xl font-bold text-primary">
                          ₹{wallet.total_redeemable_amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => {
                            setSelectedWallet(wallet);
                            setAdjustment(prev => ({ ...prev, userId: wallet.user_id }));
                            setShowAdjustmentForm(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-11 touch-manipulation"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Adjust
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedWallet(wallet);
                            setRoleChange(prev => ({ 
                              ...prev, 
                              userId: wallet.user_id,
                              newRole: wallet.marketing_role as any
                            }));
                            setShowRoleChangeForm(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-11 touch-manipulation"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Role
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Wallet Adjustment Modal */}
      {showAdjustmentForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-[96vw] sm:w-[90vw] md:w-full max-w-md bg-background border shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  Adjust Wallet
                </CardTitle>
                <Button
                  onClick={() => setShowAdjustmentForm(false)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
              {selectedWallet && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Adjusting wallet for: {selectedWallet.user_name || selectedWallet.user_email}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="walletType" className="text-sm font-medium mb-1.5 block">
                  Wallet Type
                </Label>
                <Select
                  value={adjustment.walletType}
                  onValueChange={(value) => setAdjustment(prev => ({ ...prev, walletType: value }))}
                >
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loyalty_coins">Loyalty Coins</SelectItem>
                    <SelectItem value="affiliate_earnings">Affiliate Earnings</SelectItem>
                    <SelectItem value="instagram_rewards">Instagram Rewards</SelectItem>
                    <SelectItem value="refund_credits">Refund Credits</SelectItem>
                    <SelectItem value="promotional_credits">Promotional Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionType" className="text-sm font-medium mb-1.5 block">
                  Transaction Type
                </Label>
                <Select
                  value={adjustment.transactionType}
                  onValueChange={(value: 'credit' | 'debit') => setAdjustment(prev => ({ ...prev, transactionType: value }))}
                >
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Add)</SelectItem>
                    <SelectItem value="debit">Debit (Remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adjustment.walletType.includes('coins') || adjustment.walletType.includes('rewards') ? (
                <div className="space-y-2">
                  <Label htmlFor="coinsAmount" className="text-sm font-medium mb-1.5 block">
                    Coins Amount
                  </Label>
                  <Input
                    id="coinsAmount"
                    type="number"
                    value={adjustment.coinsAmount}
                    onChange={(e) => setAdjustment(prev => ({ ...prev, coinsAmount: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter coins amount"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium mb-1.5 block">
                    Amount (₹)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={adjustment.amount}
                    onChange={(e) => setAdjustment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Enter amount in rupees"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">
                  Description
                </Label>
                <Input
                  id="description"
                  value={adjustment.description}
                  onChange={(e) => setAdjustment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Reason for adjustment"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes" className="text-sm font-medium mb-1.5 block">
                  Admin Notes
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adjustment.adminNotes}
                  onChange={(e) => setAdjustment(prev => ({ ...prev, adminNotes: e.target.value }))}
                  placeholder="Internal notes (optional)"
                  rows={3}
                  className="resize-none touch-manipulation"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleWalletAdjustment}
                    disabled={adjustmentLoading}
                    className="flex-1 h-11 sm:h-10 md:h-11 touch-manipulation"
                  >
                    {adjustmentLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Apply Adjustment
                  </Button>
                  <Button
                    onClick={() => setShowAdjustmentForm(false)}
                    variant="outline"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleChangeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-[96vw] sm:w-[90vw] md:w-full max-w-md bg-background border shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  Change Marketing Role
                </CardTitle>
                <Button
                  onClick={() => setShowRoleChangeForm(false)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
              {selectedWallet && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Warning:</strong> Changing marketing role for {selectedWallet.user_name || selectedWallet.user_email} 
                    will permanently disable their previous role access.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newRole" className="text-sm font-medium mb-1.5 block">
                  New Marketing Role
                </Label>
                <Select
                  value={roleChange.newRole}
                  onValueChange={(value: 'affiliate' | 'instagram' | 'none') => setRoleChange(prev => ({ ...prev, newRole: value }))}
                >
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Remove Role)</SelectItem>
                    <SelectItem value="affiliate">Affiliate Marketer</SelectItem>
                    <SelectItem value="instagram">Instagram Influencer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleAdminNotes" className="text-sm font-medium mb-1.5 block">
                  Admin Notes
                </Label>
                <Textarea
                  id="roleAdminNotes"
                  value={roleChange.adminNotes}
                  onChange={(e) => setRoleChange(prev => ({ ...prev, adminNotes: e.target.value }))}
                  placeholder="Reason for role change"
                  rows={3}
                  className="resize-none touch-manipulation"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleRoleChange}
                    disabled={roleChangeLoading}
                    className="flex-1 h-11 sm:h-10 md:h-11 touch-manipulation"
                  >
                    {roleChangeLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Change Role
                  </Button>
                  <Button
                    onClick={() => setShowRoleChangeForm(false)}
                    variant="outline"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};