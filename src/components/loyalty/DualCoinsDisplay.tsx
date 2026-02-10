import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Coins, 
  TrendingUp, 
  Gift, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

interface DualCoinsDisplayProps {
  productId: string;
  productName: string;
  productPrice: number;
  offerPrice?: number;
  // Display modes
  mode?: 'card' | 'detail' | 'compact';
  showEarnCoins?: boolean;
  showRedeemCoins?: boolean;
  onCoinRedeem?: (coinsRequired: number) => void;
}

export const DualCoinsDisplay = ({
  productId,
  productName,
  productPrice,
  offerPrice,
  mode = 'card',
  showEarnCoins = true,
  showRedeemCoins = true,
  onCoinRedeem
}: DualCoinsDisplayProps) => {
  const { user } = useAuth();
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

  const finalPrice = offerPrice || productPrice;

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
  }, [productId, isSystemEnabled, getProductLoyaltySettings]);

  if (!isSystemEnabled || loading) {
    return null;
  }

  // Get coin values from product settings or show message if not configured
  const coinsRequired = productSettings?.coins_required_to_buy || 0;
  const coinsEarned = productSettings?.coins_earned_per_purchase || 0;
  const canRedeem = coinsRequired > 0 ? canRedeemCoins(coinsRequired) : false;
  const isCoinRedeemEnabled = productSettings?.is_coin_purchase_enabled === true;
  const userCoins = wallet?.available_coins || 0;
  const coinsNeeded = Math.max(0, coinsRequired - userCoins);

  // If no loyalty settings configured for this product, show setup message
  if (!productSettings && mode === 'card') {
    return (
      <div className="text-xs text-amber-600 italic flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Loyalty coins not configured
      </div>
    );
  }

  // If no loyalty settings but we have some coin values, show basic info
  if (!productSettings && (coinsEarned > 0 || coinsRequired > 0)) {
    return (
      <div className="text-xs text-gray-500 italic">
        Loyalty settings being updated...
      </div>
    );
  }

  // Card mode - for product cards in lists/grids
  if (mode === 'card') {
    return (
      <div className="space-y-2">
        {/* Earn Coins Badge */}
        {showEarnCoins && coinsEarned > 0 && (
          <Badge 
            variant="secondary" 
            className="bg-green-100 text-green-700 border-green-200 text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Buy & Earn +{coinsEarned} Coins
          </Badge>
        )}

        {/* Redeem Coins Badge */}
        {showRedeemCoins && isCoinRedeemEnabled && coinsRequired > 0 && (
          <Badge 
            variant="secondary" 
            className={`text-xs ${
              canRedeem 
                ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            <Gift className="h-3 w-3 mr-1" />
            {canRedeem ? (
              <>
                <Unlock className="h-3 w-3 mr-1" />
                Redeem for {coinsRequired} Coins
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Need {coinsNeeded} more coins
              </>
            )}
          </Badge>
        )}

        {/* Festive Bonus Indicator */}
        {isFestiveActive && coinsEarned > 0 && (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Festive Bonus!
          </Badge>
        )}
      </div>
    );
  }

  // Compact mode - for smaller spaces
  if (mode === 'compact') {
    return (
      <div className="flex flex-wrap gap-1">
        {showEarnCoins && coinsEarned > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Coins className="h-3 w-3" />
            <span>+{coinsEarned}</span>
          </div>
        )}
        {showRedeemCoins && isCoinRedeemEnabled && coinsRequired > 0 && (
          <div className={`flex items-center gap-1 text-xs ${
            canRedeem ? 'text-yellow-600' : 'text-gray-400'
          }`}>
            <Gift className="h-3 w-3" />
            <span>{coinsRequired}</span>
          </div>
        )}
      </div>
    );
  }

  // Detail mode - for product detail pages
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-lg">Loyalty Coins</h3>
            {isFestiveActive && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <Sparkles className="h-3 w-3 mr-1" />
                Festive Bonus Active!
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earn Coins Section */}
            {showEarnCoins && coinsEarned > 0 && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-500 rounded-full">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">You Will Earn</h4>
                    <p className="text-xs text-green-600">On successful purchase</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    +{coinsEarned} Coins
                  </div>
                  <div className="text-sm text-green-600">
                    Worth ₹{(coinsEarned * 0.1).toFixed(1)} value
                  </div>
                  {isFestiveActive && systemSettings?.festive_multiplier && systemSettings.festive_multiplier > 1 && (
                    <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Includes {systemSettings.festive_multiplier}x festive bonus!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Redeem Coins Section */}
            {showRedeemCoins && isCoinRedeemEnabled && coinsRequired > 0 && (
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-yellow-500 rounded-full">
                    <Gift className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Redeem with Coins</h4>
                    <p className="text-xs text-yellow-600">Get this product for free</p>
                  </div>
                </div>
                
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-yellow-700 mb-1">
                    {coinsRequired} Coins
                  </div>
                  <div className="text-sm text-yellow-600">
                    Instead of ₹{finalPrice}
                  </div>
                </div>

                {/* User's coin balance */}
                {user && (
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-600">Your balance:</span>
                    <span className={`font-medium ${
                      canRedeem ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {userCoins} coins
                    </span>
                  </div>
                )}

                {/* Action button or status */}
                {user ? (
                  canRedeem ? (
                    <Button
                      onClick={() => onCoinRedeem?.(coinsRequired)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Redeem with Coins
                    </Button>
                  ) : (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Need {coinsNeeded} more coins</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Keep shopping to earn more coins!
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    Login to see your coin balance
                  </div>
                )}
              </div>
            )}
          </div>

          {/* System Information */}
          {systemSettings && (
            <div className="text-center text-xs text-gray-500 pt-2 border-t">
              <div className="flex items-center justify-center gap-4">
                <span>1 coin = ₹0.10 value</span>
                <span>•</span>
                <span>Earn {Math.floor(systemSettings.default_coins_per_rupee * 100)} coins per ₹100</span>
                {systemSettings.min_coins_to_redeem && (
                  <>
                    <span>•</span>
                    <span>Min {systemSettings.min_coins_to_redeem} coins to redeem</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};