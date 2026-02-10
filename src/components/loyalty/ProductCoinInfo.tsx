import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  Gift, 
  Star, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Zap,
  Target
} from 'lucide-react';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { toast } from 'sonner';

interface ProductCoinInfoProps {
  productId: string;
  productName: string;
  productPrice: number;
  onCoinPurchase?: (coinsRequired: number) => void;
  showEarningInfo?: boolean;
  showRedemptionOption?: boolean;
  compact?: boolean;
}

export const ProductCoinInfo = ({ 
  productId, 
  productName, 
  productPrice,
  onCoinPurchase,
  showEarningInfo = true,
  showRedemptionOption = true,
  compact = false
}: ProductCoinInfoProps) => {
  const { 
    wallet, 
    systemSettings,
    getProductLoyaltySettings,
    calculateCoinsEarned,
    canRedeemCoins,
    isSystemEnabled,
    isFestiveActive
  } = useLoyaltyCoins();

  const [productSettings, setProductSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductSettings = async () => {
      if (!isSystemEnabled) {
        setLoading(false);
        return;
      }

      try {
        const settings = await getProductLoyaltySettings(productId);
        setProductSettings(settings);
      } catch (error) {
        console.error('Error loading product loyalty settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductSettings();
  }, [productId, isSystemEnabled]);

  if (!isSystemEnabled || loading) {
    return null;
  }

  const coinsEarned = productSettings?.coins_earned_per_purchase || 0;
  const coinsRequired = productSettings?.coins_required_to_buy || 0;
  const canRedeem = canRedeemCoins(coinsRequired);
  const isCoinPurchaseEnabled = productSettings?.is_coin_purchase_enabled !== false;
  
  // Calculate how close user is to being able to redeem
  const coinsNeeded = Math.max(0, coinsRequired - (wallet?.available_coins || 0));
  const redemptionProgress = wallet?.available_coins ? Math.min((wallet.available_coins / coinsRequired) * 100, 100) : 0;

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Coins Earned Info */}
        {showEarningInfo && coinsEarned > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">
                Earn <span className="font-medium text-yellow-600">{coinsEarned} coins</span>
              </span>
            </div>
            {isFestiveActive && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Bonus!
              </Badge>
            )}
            <div className="text-xs text-green-600">
              (₹{(coinsEarned * 0.1).toFixed(1)} value)
            </div>
          </div>
        )}

        {/* Coin Redemption Option */}
        {showRedemptionOption && isCoinPurchaseEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">
                  Buy with <span className="font-medium text-blue-600">{coinsRequired} coins</span>
                </span>
              </div>
              {canRedeem ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCoinPurchase?.(coinsRequired)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Coins className="h-4 w-4 mr-1" />
                  Use Coins
                </Button>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Need {coinsNeeded} more
                </Badge>
              )}
            </div>
            
            {/* Progress bar for redemption */}
            {!canRedeem && wallet?.available_coins && wallet.available_coins > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress to redeem</span>
                  <span className="font-medium">{Math.round(redemptionProgress)}%</span>
                </div>
                <Progress value={redemptionProgress} className="h-1" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold">Loyalty Coins</h3>
            {isFestiveActive && (
              <Badge variant="secondary">
                <Sparkles className="h-3 w-3 mr-1" />
                Festive Bonus!
              </Badge>
            )}
          </div>

          {/* Coins Earned Section */}
          {showEarningInfo && coinsEarned > 0 && (
            <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-700">Earn Coins on Purchase</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700 mb-1">
                +{coinsEarned} coins
              </div>
              <div className="text-sm text-yellow-600">
                Added to your wallet after order completion
              </div>
              {isFestiveActive && systemSettings?.festive_multiplier && systemSettings.festive_multiplier > 1 && (
                <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Includes {systemSettings.festive_multiplier}x festive bonus!
                </div>
              )}
            </div>
          )}

          {/* Coin Redemption Section */}
          {showRedemptionOption && isCoinPurchaseEnabled && (
            <>
              {showEarningInfo && coinsEarned > 0 && <Separator />}
              
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-700">Buy with Coins</span>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {coinsRequired} coins
                    </div>
                    <div className="text-sm text-blue-600">
                      Instead of ₹{productPrice}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Your balance:</div>
                    <div className="font-medium">
                      {wallet?.available_coins || 0} coins
                    </div>
                  </div>
                </div>

                {canRedeem ? (
                  <Button
                    onClick={() => onCoinPurchase?.(coinsRequired)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Purchase with Coins
                  </Button>
                ) : (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Insufficient Coins</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      You need {coinsRequired - (wallet?.available_coins || 0)} more coins
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* System Info */}
          {systemSettings && (
            <div className="text-xs text-muted-foreground text-center">
              {systemSettings.min_coins_to_redeem && (
                <div>Minimum {systemSettings.min_coins_to_redeem} coins required for redemption</div>
              )}
              {systemSettings.coin_expiry_days && (
                <div>Coins expire after {systemSettings.coin_expiry_days} days</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};