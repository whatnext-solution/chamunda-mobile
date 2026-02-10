import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  Copy, 
  Clock, 
  Check, 
  X, 
  Coins,
  Percent,
  DollarSign,
  Calendar,
  Tag,
  Users,
  Share2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserCoupon {
  id: string;
  coupon_id: string;
  is_used: boolean;
  usage_count: number;
  assigned_at: string;
  expires_at?: string;
  coupons: {
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
    is_active: boolean;
    per_user_usage_limit: number;
  };
}

interface CouponUsageHistory {
  id: string;
  discount_amount: number;
  order_total: number;
  bonus_coins_earned: number;
  used_at: string;
  status: string;
  orders?: {
    id: string;
    invoice_number: string;
  };
}

const UserCoupons = () => {
  const { user } = useAuth();
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [usageHistory, setUsageHistory] = useState<CouponUsageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'history'>('available');

  useEffect(() => {
    if (user) {
      fetchUserCoupons();
      fetchUsageHistory();
    }
  }, [user]);

  const fetchUserCoupons = async () => {
    try {
      // WORKAROUND: Use separate queries instead of automatic joins
      console.log('🔄 UserCoupons: Using separate queries to bypass relationship issues...');
      
      // First, get user coupon assignments
      const { data: userCouponData, error: userError } = await supabase
        .from('user_coupons')
        .select('*')
        .eq('user_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (userError) throw userError;

      if (!userCouponData || userCouponData.length === 0) {
        console.log('ℹ️ UserCoupons: No coupon assignments found for user');
        setUserCoupons([]);
        return;
      }

      // Get all coupon IDs
      const couponIds = userCouponData.map(uc => uc.coupon_id);
      console.log('🔍 UserCoupons: Fetching details for coupon IDs:', couponIds);

      // Then, get the actual coupon details
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .in('id', couponIds);

      if (couponsError) {
        console.error('❌ UserCoupons: Error fetching coupon details:', couponsError);
        throw couponsError;
      }

      console.log('📋 UserCoupons: Fetched coupon details:', couponsData?.length || 0, 'coupons');

      // Manually join the data
      const joinedData = userCouponData.map(userCoupon => {
        const couponDetails = couponsData?.find(c => c.id === userCoupon.coupon_id);
        if (!couponDetails) {
          console.warn('⚠️ UserCoupons: Missing coupon details for ID:', userCoupon.coupon_id);
        }
        return {
          ...userCoupon,
          coupons: couponDetails || null
        };
      }).filter(item => item.coupons !== null); // Filter out any missing coupons

      setUserCoupons(joinedData);
      console.log('✅ UserCoupons: Successfully joined data:', joinedData.length, 'complete records');
      
      if (joinedData.length > 0) {
        console.log('📊 UserCoupons: Sample record:', {
          coupon_code: joinedData[0].coupons.coupon_code,
          coupon_title: joinedData[0].coupons.coupon_title,
          is_used: joinedData[0].is_used,
          usage_count: joinedData[0].usage_count
        });
      }
    } catch (error) {
      console.error('❌ UserCoupons: Error fetching user coupons:', error);
      toast.error('Failed to fetch your coupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageHistory = async () => {
    try {
      // WORKAROUND: Use separate queries instead of automatic joins
      console.log('🔄 UserCoupons: Fetching usage history via separate queries...');
      
      // First, get usage records
      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usage')
        .select('*')
        .eq('user_id', user?.id)
        .order('used_at', { ascending: false })
        .limit(20);

      if (usageError) {
        console.error('❌ UserCoupons: Error fetching usage data:', usageError);
        throw usageError;
      }

      if (!usageData || usageData.length === 0) {
        console.log('ℹ️ UserCoupons: No usage history found for user');
        setUsageHistory([]);
        return;
      }

      console.log('📋 UserCoupons: Found', usageData.length, 'usage records');

      // Get coupon details
      const couponIds = [...new Set(usageData.map(u => u.coupon_id))];
      console.log('🔍 UserCoupons: Fetching coupon details for usage history:', couponIds);
      
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('id, coupon_code, coupon_title')
        .in('id', couponIds);

      if (couponsError) {
        console.warn('⚠️ UserCoupons: Failed to fetch coupon details for usage history:', couponsError);
      }

      // Get order details (if orders table exists and order_ids are present)
      const orderIds = usageData.map(u => u.order_id).filter(Boolean);
      let ordersData = [];
      
      if (orderIds.length > 0) {
        console.log('🔍 UserCoupons: Fetching order details:', orderIds);
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, invoice_number')
          .in('id', orderIds);

        if (orderError) {
          console.warn('⚠️ UserCoupons: Failed to fetch order details:', orderError);
        } else {
          ordersData = orderData || [];
          console.log('📋 UserCoupons: Fetched order details:', ordersData.length, 'orders');
        }
      }

      // Manually join the data
      const joinedUsageData = usageData.map(usage => {
        const couponDetails = couponsData?.find(c => c.id === usage.coupon_id);
        const orderDetails = ordersData.find(o => o.id === usage.order_id);
        
        if (!couponDetails) {
          console.warn('⚠️ UserCoupons: Missing coupon details for usage ID:', usage.id);
        }
        
        return {
          ...usage,
          coupons: couponDetails || { coupon_code: 'Unknown', coupon_title: 'Unknown Coupon' },
          orders: orderDetails || null
        };
      });

      setUsageHistory(joinedUsageData);
      console.log('✅ UserCoupons: Usage history successfully joined:', joinedUsageData.length, 'complete records');
      
      if (joinedUsageData.length > 0) {
        console.log('📊 UserCoupons: Sample usage record:', {
          coupon_code: joinedUsageData[0].coupons?.coupon_code,
          discount_amount: joinedUsageData[0].discount_amount,
          order_total: joinedUsageData[0].order_total,
          status: joinedUsageData[0].status
        });
      }
    } catch (error) {
      console.error('❌ UserCoupons: Error fetching usage history:', error);
      // Don't show error toast for usage history as it's not critical
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard!');
  };

  const isExpired = (coupon: UserCoupon) => {
    const now = new Date();
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return true;
    if (coupon.coupons.end_date && new Date(coupon.coupons.end_date) < now) return true;
    return false;
  };

  const isExpiringSoon = (coupon: UserCoupon) => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    if (coupon.expires_at) {
      const expiryDate = new Date(coupon.expires_at);
      return expiryDate <= threeDaysFromNow && expiryDate > now;
    }
    
    if (coupon.coupons.end_date) {
      const endDate = new Date(coupon.coupons.end_date);
      return endDate <= threeDaysFromNow && endDate > now;
    }
    
    return false;
  };

  const canUseCoupon = (coupon: UserCoupon) => {
    return !coupon.is_used && 
           coupon.coupons.is_active && 
           !isExpired(coupon) &&
           coupon.usage_count < coupon.coupons.per_user_usage_limit;
  };

  const getExpiryDate = (coupon: UserCoupon) => {
    if (coupon.expires_at && coupon.coupons.end_date) {
      return new Date(coupon.expires_at) < new Date(coupon.coupons.end_date) 
        ? coupon.expires_at 
        : coupon.coupons.end_date;
    }
    return coupon.expires_at || coupon.coupons.end_date;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const availableCoupons = userCoupons.filter(canUseCoupon);
  const usedCoupons = userCoupons.filter(coupon => !canUseCoupon(coupon));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-orange-600" />
          My Coupons
        </h2>
        <p className="text-muted-foreground">Manage your exclusive coupons and offers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{availableCoupons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-2xl font-bold">{usageHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-2xl font-bold">
                  ₹{usageHistory.reduce((sum, usage) => sum + usage.discount_amount, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'available' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('available')}
          className="flex-1"
        >
          Available ({availableCoupons.length})
        </Button>
        <Button
          variant={activeTab === 'used' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('used')}
          className="flex-1"
        >
          Used/Expired ({usedCoupons.length})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
          className="flex-1"
        >
          Usage History ({usageHistory.length})
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableCoupons.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No available coupons</h3>
                <p className="text-muted-foreground">
                  Check back later for exclusive offers and promotions!
                </p>
              </CardContent>
            </Card>
          ) : (
            availableCoupons.map((userCoupon) => {
              const coupon = userCoupon.coupons;
              const expiring = isExpiringSoon(userCoupon);
              const expiryDate = getExpiryDate(userCoupon);
              
              return (
                <Card key={userCoupon.id} className={expiring ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{coupon.coupon_title}</h3>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Available
                          </Badge>
                          {expiring && (
                            <Badge variant="destructive">
                              <Clock className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                          {coupon.coins_integration_type === 'earn_extra' && (
                            <Badge variant="outline">
                              <Coins className="h-3 w-3 mr-1" />
                              +{coupon.bonus_coins_earned} coins
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="font-mono bg-gray-100 px-3 py-1 rounded text-black font-semibold">
                            {coupon.coupon_code}
                          </span>
                          <span className="flex items-center gap-1">
                            {coupon.discount_type === 'flat' ? (
                              <DollarSign className="h-4 w-4" />
                            ) : (
                              <Percent className="h-4 w-4" />
                            )}
                            {coupon.discount_type === 'flat' 
                              ? `₹${coupon.discount_value} OFF` 
                              : `${coupon.discount_value}% OFF`
                            }
                          </span>
                          <span>Min: ₹{coupon.min_order_value}</span>
                          {expiryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Expires: {formatDate(expiryDate)}
                            </span>
                          )}
                        </div>
                        
                        {coupon.description && (
                          <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Assigned on {formatDate(userCoupon.assigned_at)} • 
                          Can be used {coupon.per_user_usage_limit - userCoupon.usage_count} more time(s)
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCouponCode(coupon.coupon_code)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Code
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.location.href = '/products'}
                        >
                          Shop Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'used' && (
        <div className="space-y-4">
          {usedCoupons.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No used coupons</h3>
                <p className="text-muted-foreground">
                  Your used and expired coupons will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            usedCoupons.map((userCoupon) => {
              const coupon = userCoupon.coupons;
              const expired = isExpired(userCoupon);
              
              return (
                <Card key={userCoupon.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{coupon.coupon_title}</h3>
                          <Badge variant={expired ? "destructive" : "secondary"}>
                            {expired ? 'Expired' : 'Used'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="font-mono bg-gray-100 px-3 py-1 rounded">
                            {coupon.coupon_code}
                          </span>
                          <span>
                            {coupon.discount_type === 'flat' 
                              ? `₹${coupon.discount_value} OFF` 
                              : `${coupon.discount_value}% OFF`
                            }
                          </span>
                          <span>Used {userCoupon.usage_count} time(s)</span>
                        </div>
                        
                        {coupon.description && (
                          <p className="text-sm text-muted-foreground">{coupon.description}</p>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-muted-foreground">
                        {expired ? 'Expired' : 'Fully Used'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {usageHistory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No usage history</h3>
                <p className="text-muted-foreground">
                  Your coupon usage history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            usageHistory.map((usage) => (
              <Card key={usage.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{usage.coupons?.coupon_title}</h4>
                        <Badge variant={usage.status === 'applied' ? 'default' : 'destructive'}>
                          {usage.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {usage.coupons?.coupon_code}
                        </span>
                        <span>Order: ₹{usage.order_total.toFixed(2)}</span>
                        <span className="text-green-600 font-medium">
                          Saved: ₹{usage.discount_amount.toFixed(2)}
                        </span>
                        {usage.bonus_coins_earned > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Coins className="h-3 w-3" />
                            +{usage.bonus_coins_earned} coins
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Used on {formatDate(usage.used_at)}
                        {usage.orders?.invoice_number && (
                          <span> • Invoice: {usage.orders.invoice_number}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserCoupons;