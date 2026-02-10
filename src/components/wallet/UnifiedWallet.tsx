import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  Coins, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Star,
  Sparkles,
  Zap,
  Info,
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface UnifiedWalletProps {
  showTransactionHistory?: boolean;
  showRoleManagement?: boolean;
  compact?: boolean;
}

export const UnifiedWallet = ({ 
  showTransactionHistory = true, 
  showRoleManagement = false,
  compact = false 
}: UnifiedWalletProps) => {
  const { 
    wallet, 
    transactions, 
    walletBreakdown,
    availableBalance,
    loading, 
    error,
    isAffiliate,
    isInstagramUser,
    hasNoMarketingRole,
    canSwitchMarketingRole,
    setMarketingRole,
    fetchWallet
  } = useUnifiedWallet();

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const handleRoleChange = async (newRole: 'affiliate' | 'instagram' | 'none') => {
    if (!canSwitchMarketingRole(newRole) && newRole !== 'none') {
      toast.error(`Cannot switch to ${newRole} role. You already have a marketing role assigned.`);
      return;
    }

    try {
      setRoleChangeLoading(true);
      await setMarketingRole(newRole);
    } catch (error: any) {
      console.error('Role change error:', error);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Unified Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wallet Setup Required</h3>
            <p className="text-muted-foreground mb-4">
              The unified wallet system needs to be set up in your database.
            </p>
            <div className="text-sm text-muted-foreground space-y-2 mb-4">
              <p>• Go to Supabase Dashboard → SQL Editor</p>
              <p>• Run the fix_unified_wallet_permissions.sql script</p>
              <p>• Refresh this page to access your wallet</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchWallet} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">Debug Info</summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center max-w-md">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wallet Setup Required</h3>
            <p className="text-muted-foreground mb-4">
              Your unified wallet needs to be initialized.
            </p>
            <Button onClick={fetchWallet}>
              <Zap className="h-4 w-4 mr-2" />
              Initialize Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  const getWalletTypeIcon = (type: string) => {
    switch (type) {
      case 'loyalty_coins': return <Coins className="h-4 w-4" />;
      case 'affiliate_earnings': return <TrendingUp className="h-4 w-4" />;
      case 'instagram_rewards': return <Star className="h-4 w-4" />;
      case 'refund_credits': return <RefreshCw className="h-4 w-4" />;
      case 'promotional_credits': return <Gift className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'loyalty_coins': return 'text-blue-600';
      case 'affiliate_earnings': return 'text-green-600';
      case 'instagram_rewards': return 'text-purple-600';
      case 'refund_credits': return 'text-orange-600';
      case 'promotional_credits': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const formatWalletType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'affiliate': return <TrendingUp className="h-4 w-4" />;
      case 'instagram': return <Star className="h-4 w-4" />;
      case 'none': return <Unlock className="h-4 w-4" />;
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

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold">Wallet Balance</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                ₹{availableBalance.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {wallet.marketing_role !== 'none' && (
                  <Badge variant={getRoleBadgeVariant(wallet.marketing_role)} className="text-xs">
                    {getRoleIcon(wallet.marketing_role)}
                    <span className="ml-1">{wallet.marketing_role}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Unified Wallet
            </CardTitle>
            <div className="flex items-center gap-2">
              {wallet.marketing_role !== 'none' && (
                <Badge variant={getRoleBadgeVariant(wallet.marketing_role)}>
                  {getRoleIcon(wallet.marketing_role)}
                  <span className="ml-1 capitalize">{wallet.marketing_role} User</span>
                </Badge>
              )}
              <Button onClick={fetchWallet} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Balance */}
          <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
            <div className="text-3xl font-bold text-primary mb-2">
              ₹{availableBalance.toFixed(2)}
            </div>
            <p className="text-muted-foreground">Total Redeemable Amount</p>
          </div>

          {/* Wallet Breakdown */}
          {walletBreakdown && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Wallet Breakdown
              </h4>
              <div className="grid gap-3">
                {Object.entries(walletBreakdown).map(([type, data]) => {
                  const isDisabled = !wallet || 
                    (type === 'affiliate_earnings' && wallet.marketing_role !== 'affiliate') ||
                    (type === 'instagram_rewards' && wallet.marketing_role !== 'instagram');
                  
                  if (data.amount === 0 && data.value_in_rupees === 0) return null;

                  return (
                    <div 
                      key={type} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDisabled ? 'opacity-50 bg-muted/50' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={getWalletTypeColor(type)}>
                          {getWalletTypeIcon(type)}
                        </div>
                        <div>
                          <div className="font-medium">{formatWalletType(type)}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.description}
                          </div>
                        </div>
                        {isDisabled && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {type.includes('coins') || type.includes('rewards') 
                            ? `${data.amount} coins` 
                            : `₹${data.amount.toFixed(2)}`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ₹{data.value_in_rupees.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role Management */}
          {showRoleManagement && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4" />
                  Marketing Role Management
                </h4>
                
                {/* Current Role */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Role:</span>
                    <Badge variant={getRoleBadgeVariant(wallet.marketing_role)}>
                      {getRoleIcon(wallet.marketing_role)}
                      <span className="ml-1 capitalize">{wallet.marketing_role}</span>
                    </Badge>
                  </div>
                </div>

                {/* Role Restrictions Alert */}
                {(isAffiliate || isInstagramUser) && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Role Locked:</strong> You are currently a {wallet.marketing_role} user. 
                      You cannot switch to {wallet.marketing_role === 'affiliate' ? 'Instagram' : 'Affiliate'} 
                      marketing role due to mutual exclusion policy.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Role Change Options */}
                {hasNoMarketingRole && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose your marketing role (this decision is permanent):
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRoleChange('affiliate')}
                        disabled={roleChangeLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Become Affiliate
                      </Button>
                      <Button
                        onClick={() => handleRoleChange('instagram')}
                        disabled={roleChangeLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Become Instagram User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      {showTransactionHistory && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground">
                  Your wallet transactions will appear here once you start earning or spending.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {displayTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.transaction_type === 'credit' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {transaction.transaction_type === 'credit' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatWalletType(transaction.wallet_type)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.description || transaction.source}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            transaction.transaction_type === 'credit' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.transaction_type === 'credit' ? '+' : '-'}
                            {transaction.wallet_type.includes('coins') || transaction.wallet_type.includes('rewards')
                              ? `${transaction.coins_amount} coins`
                              : `₹${transaction.amount.toFixed(2)}`
                            }
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {transaction.source}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {transactions.length > 5 && (
                  <div className="text-center">
                    <Button
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                      variant="outline"
                      size="sm"
                    >
                      {showAllTransactions ? 'Show Less' : `Show All ${transactions.length} Transactions`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};