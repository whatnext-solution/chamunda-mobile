import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  Tag, 
  X, 
  Check, 
  AlertCircle, 
  Coins,
  Percent,
  DollarSign,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { toast } from 'sonner';

interface CouponApplicationProps {
  orderTotal: number;
  cartItems: any[];
  onCouponApplied: (couponData: AppliedCoupon | null) => void;
  appliedCoupon: AppliedCoupon | null;
}

interface AppliedCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountAmount: number;
  bonusCoins: number;
  discountType: 'flat' | 'percentage';
  discountValue: number;
}

interface AvailableCoupon {
  id: string;
  coupon_code: string;
  coupon_title: string;
  description: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  coins_integration_type: string;
  bonus_coins_earned: number;
  end_date?: string;
  is_user_specific: boolean;
  is_affiliate_specific: boolean;
}

const CouponApplication: React.FC<CouponApplicationProps> = ({
  orderTotal,
  cartItems,
  onCouponApplied,
  appliedCoupon
}) => {
  const { user } = useAuth();
  const { currentAffiliate } = useAffiliate();
  const { wallet } = useLoyaltyCoins();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAvailableCoupons();
    }
  }, [user, orderTotal]);

  const fetchAvailableCoupons = async () => {
    try {
      // Fetch public coupons that user is eligible for
      let query = supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .lte('min_order_value', orderTotal);

      const { data: publicCoupons, error: publicError } = await query;
      if (publicError) throw publicError;

      // Fetch user-specific coupons
      const { data: userCoupons, error: userError } = await supabase
        .from('user_coupons')
        .select(`
          coupon_id,
          is_used,
          coupons (*)
        `)
        .eq('user_id', user?.id)
        .eq('is_used', false);

      if (userError) throw userError;

      // Combine and filter coupons
      const allCoupons = [
        ...(publicCoupons || []).filter(coupon => 
          !coupon.is_user_specific && 
          (!coupon.is_affiliate_specific || coupon.affiliate_id === currentAffiliate?.id)
        ),
        ...(userCoupons || []).map(uc => uc.coupons).filter(Boolean)
      ];

      // Remove duplicates and filter by coins requirement
      const uniqueCoupons = allCoupons.filter((coupon, index, self) => 
        index === self.findIndex(c => c.id === coupon.id)
      ).filter(coupon => {
        if (coupon.coins_integration_type === 'required') {
          return wallet && wallet.available_coins >= coupon.min_coins_required;
        }
        return true;
      });

      setAvailableCoupons(uniqueCoupons);
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    }
  };

  const validateAndApplyCoupon = async (code: string) => {
    if (!user) {
      toast.error('Please login to apply coupons');
      return;
    }

    setLoading(true);
    try {
      // Call the validation function
      const { data, error } = await supabase.rpc('validate_coupon_eligibility', {
        p_coupon_code: code.toUpperCase(),
        p_user_id: user.id,
        p_order_total: orderTotal,
        p_cart_items: JSON.stringify(cartItems),
        p_affiliate_id: currentAffiliate?.id || null
      });

      if (error) throw error;

      if (data.valid) {
        const appliedCouponData: AppliedCoupon = {
          id: data.coupon_id,
          code: code.toUpperCase(),
          title: data.coupon_title,
          description: data.description || '',
          discountAmount: data.discount_amount,
          bonusCoins: data.bonus_coins || 0,
          discountType: data.discount_type || 'flat',
          discountValue: data.discount_value || 0
        };

        onCouponApplied(appliedCouponData);
        setCouponCode('');
        toast.success(`Coupon applied! You saved ₹${data.discount_amount}`);
      } else {
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    onCouponApplied(null);
    toast.success('Coupon removed');
  };

  const applyCouponFromList = (coupon: AvailableCoupon) => {
    validateAndApplyCoupon(coupon.coupon_code);
    setShowAvailableCoupons(false);
  };

  const calculateDiscount = (coupon: AvailableCoupon) => {
    if (coupon.discount_type === 'flat') {
      return Math.min(coupon.discount_value, orderTotal);
    } else {
      const discount = (orderTotal * coupon.discount_value) / 100;
      return coupon.max_discount_amount ? Math.min(discount, coupon.max_discount_amount) : discount;
    }
  };

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-600" />
          Coupons & Offers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Applied Coupon Display */}
        {appliedCoupon ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">{appliedCoupon.title}</h4>
                  <p className="text-sm text-green-600">
                    Code: {appliedCoupon.code} • Saved ₹{appliedCoupon.discountAmount.toFixed(2)}
                  </p>
                  {appliedCoupon.bonusCoins > 0 && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      +{appliedCoupon.bonusCoins} bonus coins
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeCoupon}
                className="text-green-600 hover:text-green-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Coupon Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && validateAndApplyCoupon(couponCode)}
                className="flex-1"
              />
              <Button
                onClick={() => validateAndApplyCoupon(couponCode)}
                disabled={!couponCode.trim() || loading}
                className="px-6"
              >
                {loading ? 'Applying...' : 'Apply'}
              </Button>
            </div>

            {/* Available Coupons Toggle */}
            {availableCoupons.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowAvailableCoupons(!showAvailableCoupons)}
                  className="w-full"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  {showAvailableCoupons ? 'Hide' : 'View'} Available Coupons ({availableCoupons.length})
                </Button>

                {showAvailableCoupons && (
                  <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                    {availableCoupons.map((coupon) => {
                      const discount = calculateDiscount(coupon);
                      const expiring = isExpiringSoon(coupon.end_date);
                      
                      return (
                        <div
                          key={coupon.id}
                          className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => applyCouponFromList(coupon)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{coupon.coupon_title}</h4>
                                {expiring && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expiring Soon
                                  </Badge>
                                )}
                                {coupon.is_user_specific && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    Special
                                  </Badge>
                                )}
                                {coupon.coins_integration_type === 'earn_extra' && (
                                  <Badge variant="outline" className="text-xs">
                                    <Coins className="h-3 w-3 mr-1" />
                                    +{coupon.bonus_coins_earned}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                  {coupon.coupon_code}
                                </span>
                                <span className="flex items-center gap-1">
                                  {coupon.discount_type === 'flat' ? (
                                    <DollarSign className="h-3 w-3" />
                                  ) : (
                                    <Percent className="h-3 w-3" />
                                  )}
                                  {coupon.discount_type === 'flat' 
                                    ? `₹${coupon.discount_value} OFF` 
                                    : `${coupon.discount_value}% OFF`
                                  }
                                </span>
                                <span>Save ₹{discount.toFixed(0)}</span>
                              </div>
                              
                              {coupon.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {coupon.description}
                                </p>
                              )}
                            </div>
                            
                            <Button size="sm" variant="outline">
                              Apply
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No Coupons Available */}
            {availableCoupons.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No coupons available for this order</p>
              </div>
            )}
          </>
        )}

        {/* Coupon Tips */}
        {!appliedCoupon && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Gift className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Coupon Tips:</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li>• Check your email for exclusive coupon codes</li>
                  <li>• Some coupons can be combined with loyalty coins</li>
                  <li>• User-specific coupons appear in your profile</li>
                  {currentAffiliate && (
                    <li>• You may have special affiliate coupons available</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponApplication;