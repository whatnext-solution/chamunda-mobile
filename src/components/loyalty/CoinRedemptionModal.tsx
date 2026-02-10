import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Coins, 
  Gift, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  TrendingDown,
  Percent
} from 'lucide-react';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { toast } from 'sonner';

interface CoinRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  onRedeem: (coinsToUse: number) => void;
  maxRedemptionPercentage?: number; // Maximum percentage of order that can be paid with coins
}

export const CoinRedemptionModal = ({ 
  isOpen, 
  onClose, 
  orderTotal, 
  onRedeem,
  maxRedemptionPercentage = 50 
}: CoinRedemptionModalProps) => {
  const { wallet, systemSettings, canRedeemCoins } = useLoyaltyCoins();
  const [coinsToUse, setCoinsToUse] = useState(0);

  const availableCoins = wallet?.available_coins || 0;
  const maxDiscountAmount = (orderTotal * maxRedemptionPercentage) / 100;
  const maxCoinsUsable = Math.min(
    availableCoins,
    Math.floor(maxDiscountAmount / 0.1) // 1 coin = ₹0.10
  );
  
  const discountAmount = coinsToUse * 0.1;
  const finalTotal = Math.max(0, orderTotal - discountAmount);
  const discountPercentage = orderTotal > 0 ? (discountAmount / orderTotal) * 100 : 0;

  const handleSliderChange = (value: number[]) => {
    setCoinsToUse(value[0]);
  };

  const handleInputChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCoinsToUse(Math.min(numValue, maxCoinsUsable));
  };

  const handleRedeem = () => {
    if (coinsToUse < (systemSettings?.min_coins_to_redeem || 10)) {
      toast.error(`Minimum ${systemSettings?.min_coins_to_redeem || 10} coins required for redemption`);
      return;
    }

    if (!canRedeemCoins(coinsToUse)) {
      toast.error('Insufficient coins for redemption');
      return;
    }

    onRedeem(coinsToUse);
    onClose();
    toast.success(`Successfully applied ${coinsToUse} coins discount!`);
  };

  const handleMaxCoins = () => {
    setCoinsToUse(maxCoinsUsable);
  };

  const canProceed = coinsToUse >= (systemSettings?.min_coins_to_redeem || 10) && 
                    coinsToUse <= maxCoinsUsable && 
                    canRedeemCoins(coinsToUse);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Redeem Loyalty Coins
          </DialogTitle>
          <DialogDescription>
            Use your coins to get a discount on this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Balance */}
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-700 mb-1">
              {availableCoins}
            </div>
            <div className="text-sm text-yellow-600">Available Coins</div>
            <div className="text-xs text-muted-foreground mt-1">
              ≈ ₹{(availableCoins * 0.1).toFixed(2)} maximum discount
            </div>
          </div>

          {/* Coin Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Coins to Use</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min="0"
                  max={maxCoinsUsable}
                  value={coinsToUse}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMaxCoins}
                  disabled={maxCoinsUsable === 0}
                >
                  Max
                </Button>
              </div>
            </div>

            {/* Slider */}
            {maxCoinsUsable > 0 && (
              <div className="space-y-2">
                <Slider
                  value={[coinsToUse]}
                  onValueChange={handleSliderChange}
                  max={maxCoinsUsable}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 coins</span>
                  <span>{maxCoinsUsable} coins (max)</span>
                </div>
              </div>
            )}
          </div>

          {/* Discount Preview */}
          {coinsToUse > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Discount Preview</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span>₹{orderTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Coins Discount:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Final Total:</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <Percent className="h-3 w-3" />
                  <span className="text-xs">
                    {discountPercentage.toFixed(1)}% discount applied
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {coinsToUse > 0 && (
            <div className="space-y-2">
              {coinsToUse < (systemSettings?.min_coins_to_redeem || 10) && (
                <div className="flex items-center gap-2 text-orange-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Minimum {systemSettings?.min_coins_to_redeem || 10} coins required</span>
                </div>
              )}
              
              {coinsToUse > availableCoins && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Insufficient coins available</span>
                </div>
              )}

              {canProceed && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Ready to apply discount</span>
                </div>
              )}
            </div>
          )}

          {/* System Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• 1 coin = ₹0.10 discount value</div>
              <div>• Maximum {maxRedemptionPercentage}% of order can be paid with coins</div>
              <div>• Remaining coins will stay in your wallet</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={!canProceed}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              <Gift className="h-4 w-4 mr-2" />
              Apply Discount
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};