import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Sparkles, 
  Gift, 
  TrendingUp, 
  X,
  CheckCircle,
  Star
} from 'lucide-react';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinEarningNotificationProps {
  coinsEarned: number;
  orderTotal: number;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const CoinEarningNotification = ({ 
  coinsEarned, 
  orderTotal, 
  onClose,
  autoClose = true,
  duration = 5000 
}: CoinEarningNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const { wallet, systemSettings, isFestiveActive } = useLoyaltyCoins();

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  if (!isVisible || coinsEarned <= 0) return null;

  const coinValue = coinsEarned * 0.1;
  const totalCoins = (wallet?.available_coins || 0) + coinsEarned;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-20 right-4 z-50 w-80"
      >
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Coins className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800">Coins Earned!</h3>
                  <p className="text-sm text-yellow-600">Order completed successfully</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-yellow-600 hover:bg-yellow-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Coins Earned Display */}
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                className="text-3xl font-bold text-yellow-700 mb-1"
              >
                +{coinsEarned}
              </motion.div>
              <div className="text-sm text-yellow-600 mb-2">
                coins earned (₹{coinValue.toFixed(2)} value)
              </div>
              
              {isFestiveActive && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Festive Bonus Applied!
                </Badge>
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-medium">₹{orderTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Earning Rate:</span>
                <span className="font-medium">
                  {systemSettings?.default_coins_per_rupee ? 
                    `${Math.floor(systemSettings.default_coins_per_rupee * 100)} coins per ₹100` : 
                    '1 coin per ₹10'
                  }
                </span>
              </div>
            </div>

            {/* New Balance */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">New Balance:</span>
              </div>
              <div className="text-lg font-bold text-green-700">
                {totalCoins} coins
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                onClick={() => window.location.href = '/profile?tab=loyalty'}
              >
                <Gift className="h-4 w-4 mr-1" />
                View Wallet
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = '/'}
              >
                <Star className="h-4 w-4 mr-1" />
                Shop More
              </Button>
            </div>

            {/* Milestone Progress */}
            {totalCoins >= 50 && (
              <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Ready to redeem!</span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  You have enough coins to get discounts on your next purchase
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};