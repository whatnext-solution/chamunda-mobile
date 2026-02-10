import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Star,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { EligibleProducts } from '@/components/loyalty/EligibleProducts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const LoyaltyCoinsWallet = () => {
  const { 
    wallet, 
    transactions, 
    systemSettings, 
    loading, 
    error,
    isSystemEnabled,
    isFestiveActive 
  } = useLoyaltyCoins();
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  if (!isSystemEnabled) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center max-w-md">
            <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Loyalty System Setup Required</h3>
            <p className="text-muted-foreground mb-4">
              The loyalty coins system needs to be set up in your database first.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Open Supabase Dashboard → SQL Editor</p>
              <p>• Run the loyalty_coins_system_setup.sql script</p>
              <p>• Refresh this page to start earning coins!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Loyalty Coins Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Coins className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  // Calculate progress towards next milestone
  const availableCoins = wallet?.available_coins || 0;
  const nextMilestone = Math.ceil(availableCoins / 100) * 100 || 100;
  const progressPercentage = (availableCoins / nextMilestone) * 100;

  // Calculate coin earning rate
  const totalEarned = wallet?.total_coins_earned || 0;
  const totalUsed = wallet?.total_coins_used || 0;
  const netCoins = totalEarned - totalUsed;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'redeemed':
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case 'manual_add':
        return <Gift className="h-4 w-4 text-blue-600" />;
      case 'manual_remove':
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
      case 'manual_add':
        return 'text-green-600';
      case 'redeemed':
      case 'manual_remove':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Loyalty Coins Wallet
            {isFestiveActive && (
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Festive Bonus Active!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Main Balance Display */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {wallet?.available_coins || 0}
              </div>
              <div className="text-sm text-muted-foreground">Available Coins</div>
              {availableCoins >= 50 && (
                <Badge className="absolute -top-2 -right-8 bg-green-100 text-green-700">
                  <Zap className="h-3 w-3 mr-1" />
                  Ready to Use!
                </Badge>
              )}
            </div>
          </div>

          {/* Progress to Next Milestone */}
          {availableCoins > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress to {nextMilestone} coins</span>
                <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {nextMilestone - availableCoins} more coins to reach milestone
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Available Coins */}
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <Coins className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {wallet?.available_coins || 0}
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
              <div className="text-xs text-yellow-600 mt-1">
                ≈ ₹{((wallet?.available_coins || 0) * 0.1).toFixed(2)} value
              </div>
            </div>

            {/* Total Earned */}
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">
                {wallet?.total_coins_earned || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
              <div className="text-xs text-green-600 mt-1">
                Lifetime earnings
              </div>
            </div>

            {/* Total Used */}
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <Gift className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {wallet?.total_coins_used || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Used</div>
              <div className="text-xs text-blue-600 mt-1">
                Saved ₹{((wallet?.total_coins_used || 0) * 0.1).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Earning Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">How to Earn More Coins</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Complete purchases to earn coins automatically</li>
                  <li>• Larger orders = more coins earned</li>
                  {isFestiveActive && <li>• Festive bonus is currently active!</li>}
                  <li>• Minimum {systemSettings?.min_coins_to_redeem || 10} coins needed to redeem</li>
                </ul>
              </div>
            </div>
          </div>

          {/* System Info */}
          {systemSettings && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Star className="h-4 w-4" />
                <span className="font-medium">Earning Rate</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  Earn {Math.floor(systemSettings.default_coins_per_rupee * 100)} coins per ₹100 spent
                </div>
                <div>
                  1 coin = ₹0.10 discount value
                </div>
                {systemSettings.global_coins_multiplier !== 1 && (
                  <div className="text-green-600">
                    {systemSettings.global_coins_multiplier}x multiplier active!
                  </div>
                )}
                {isFestiveActive && systemSettings.festive_multiplier !== 1 && (
                  <div className="text-purple-600">
                    Festive {systemSettings.festive_multiplier}x bonus active!
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible Products Section */}
      <EligibleProducts />

      {/* Transaction History */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </div>
            {transactions.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllTransactions(!showAllTransactions)}
              >
                {showAllTransactions ? 'Show Less' : `View All (${transactions.length})`}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start shopping to earn your first coins!
              </p>
            </div>
          ) : (
            <ScrollArea className={showAllTransactions ? "h-96" : "h-auto"}>
              <div className="space-y-3">
                {displayTransactions.map((transaction, index) => (
                  <div key={transaction.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.transaction_type)}
                        <div>
                          <div className="font-medium">
                            {transaction.description || 
                              `${transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)} coins`
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                          </div>
                          {transaction.product_name && (
                            <div className="text-sm text-muted-foreground">
                              Product: {transaction.product_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.coins_amount > 0 ? '+' : ''}{transaction.coins_amount}
                      </div>
                    </div>
                    {index < displayTransactions.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};