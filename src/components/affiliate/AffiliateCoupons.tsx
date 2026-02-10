import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  Copy, 
  Share2, 
  TrendingUp, 
  Users, 
  DollarSign,
  Eye,
  Calendar,
  Percent,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AffiliateCoupon {
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
  start_date: string;
  end_date?: string;
  is_active: boolean;
  total_usage_count: number;
  total_discount_given: number;
  total_revenue_generated: number;
}

interface CouponUsage {
  id: string;
  discount_amount: number;
  order_total: number;
  used_at: string;
  orders?: {
    id: string;
    invoice_number: string;
    customer_name: string;
  };
}

const AffiliateCoupons = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<AffiliateCoupon[]>([]);
  const [usageHistory, setUsageHistory] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAffiliateCoupons();
    }
  }, [user]);

  const fetchAffiliateCoupons = async () => {
    try {
      // First get the affiliate user record - try multiple approaches
      let affiliateUser = null;
      let affiliateError = null;

      // Try with full email first
      const { data: affiliateByEmail, error: emailError } = await supabase
        .from('affiliate_users')
        .select('id')
        .eq('mobile_number', user?.email)
        .maybeSingle();

      if (affiliateByEmail) {
        affiliateUser = affiliateByEmail;
      } else {
        // Try with email username part (before @)
        const emailUsername = user?.email?.split('@')[0];
        if (emailUsername) {
          const { data: affiliateByUsername, error: usernameError } = await supabase
            .from('affiliate_users')
            .select('id')
            .eq('mobile_number', emailUsername)
            .maybeSingle();
          
          if (affiliateByUsername) {
            affiliateUser = affiliateByUsername;
          } else {
            affiliateError = usernameError || emailError;
          }
        } else {
          affiliateError = emailError;
        }
      }

      if (affiliateError || !affiliateUser) {
        console.log('No affiliate user found for:', user?.email);
        // Don't show error, just show empty state
        setCoupons([]);
        setUsageHistory([]);
        setLoading(false);
        return;
      }

      // Fetch coupons specific to this affiliate
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('affiliate_id', affiliateUser.id)
        .eq('is_affiliate_specific', true)
        .order('created_at', { ascending: false });

      if (couponsError) throw couponsError;
      setCoupons(couponsData || []);

      // Fetch usage history for affiliate coupons
      if (couponsData && couponsData.length > 0) {
        const couponIds = couponsData.map(c => c.id);
        
        // Fetch usage data without joins for now to avoid relationship issues
        const { data: usageData, error: usageError } = await supabase
          .from('coupon_usage')
          .select('*')
          .in('coupon_id', couponIds)
          .eq('affiliate_id', affiliateUser.id)
          .order('used_at', { ascending: false })
          .limit(50);

        if (usageError) {
          console.error('Error fetching usage data:', usageError);
          // Don't throw error, just set empty array
          setUsageHistory([]);
        } else {
          setUsageHistory(usageData || []);
        }
      } else {
        setUsageHistory([]);
      }
    } catch (error) {
      console.error('Error fetching affiliate coupons:', error);
      // Don't show error toast for missing affiliate user
      if (!error.message?.includes('No affiliate user found')) {
        toast.error('Failed to fetch coupon data');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard!');
  };

  const generateAffiliateLink = (couponCode: string) => {
    const baseUrl = window.location.origin;
    const affiliateParam = user?.email?.split('@')[0] || 'affiliate';
    return `${baseUrl}/products?ref=${affiliateParam}&coupon=${couponCode}`;
  };

  const shareAffiliateLink = (couponCode: string) => {
    const link = generateAffiliateLink(couponCode);
    navigator.clipboard.writeText(link);
    toast.success('Affiliate link copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isExpired = (coupon: AffiliateCoupon) => {
    return coupon.end_date && new Date(coupon.end_date) < new Date();
  };

  const isExpiringSoon = (coupon: AffiliateCoupon) => {
    if (!coupon.end_date) return false;
    const endDate = new Date(coupon.end_date);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return endDate <= threeDaysFromNow && endDate > new Date();
  };

  const totalEarnings = coupons.reduce((sum, coupon) => sum + coupon.total_revenue_generated, 0);
  const totalUsage = coupons.reduce((sum, coupon) => sum + coupon.total_usage_count, 0);
  const totalDiscount = coupons.reduce((sum, coupon) => sum + coupon.total_discount_given, 0);

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
          My Affiliate Coupons
        </h2>
        <p className="text-muted-foreground">Manage and track your exclusive coupon performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Coupons</p>
                <p className="text-2xl font-bold">{coupons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Discount Given</p>
                <p className="text-2xl font-bold">₹{totalDiscount.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-2xl font-bold">₹{totalEarnings.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Exclusive Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No affiliate coupons found</h3>
              <p className="text-muted-foreground mb-4">
                {user?.email ? (
                  <>
                    No affiliate account found for <strong>{user.email}</strong>
                    <br />
                    Contact admin to set up your affiliate account and get exclusive coupons
                  </>
                ) : (
                  'Please login to view your affiliate coupons'
                )}
              </p>
              {user?.email && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  <p><strong>Note:</strong> Affiliate coupons are special promotional codes assigned to affiliate marketers.</p>
                  <p>If you should have access to affiliate coupons, please contact the administrator.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => {
                const expired = isExpired(coupon);
                const expiring = isExpiringSoon(coupon);
                
                return (
                  <div 
                    key={coupon.id} 
                    className={`border rounded-lg p-4 ${expired ? 'opacity-60' : ''} ${expiring ? 'border-orange-200 bg-orange-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{coupon.coupon_title}</h3>
                        <Badge variant={coupon.is_active && !expired ? "default" : "secondary"}>
                          {expired ? 'Expired' : coupon.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {expiring && (
                          <Badge variant="destructive">
                            Expiring Soon
                          </Badge>
                        )}
                        {coupon.coins_integration_type === 'earn_extra' && (
                          <Badge variant="outline">
                            +{coupon.bonus_coins_earned} coins
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCouponCode(coupon.coupon_code)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareAffiliateLink(coupon.coupon_code)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share Link
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-mono text-lg font-bold text-primary">
                          {coupon.coupon_code}
                        </div>
                        <div className="text-xs text-muted-foreground">Coupon Code</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-lg font-bold">
                          {coupon.discount_type === 'flat' ? (
                            <>
                              <DollarSign className="h-4 w-4" />
                              ₹{coupon.discount_value}
                            </>
                          ) : (
                            <>
                              <Percent className="h-4 w-4" />
                              {coupon.discount_value}%
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">Discount</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold">{coupon.total_usage_count}</div>
                        <div className="text-xs text-muted-foreground">Times Used</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          ₹{coupon.total_revenue_generated.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>Min Order: ₹{coupon.min_order_value}</span>
                        {coupon.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Expires: {formatDate(coupon.end_date)}
                          </span>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCoupon(selectedCoupon === coupon.id ? null : coupon.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {selectedCoupon === coupon.id ? 'Hide' : 'View'} Details
                      </Button>
                    </div>
                    
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mt-2 p-3 bg-blue-50 rounded-lg">
                        {coupon.description}
                      </p>
                    )}
                    
                    {/* Expanded Details */}
                    {selectedCoupon === coupon.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Performance Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Discount Given</p>
                            <p className="text-lg font-bold text-red-600">₹{coupon.total_discount_given.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average Order Value</p>
                            <p className="text-lg font-bold">
                              ₹{coupon.total_usage_count > 0 ? (coupon.total_revenue_generated / coupon.total_usage_count).toFixed(0) : '0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Conversion Rate</p>
                            <p className="text-lg font-bold text-green-600">
                              {coupon.total_usage_count > 0 ? '100%' : '0%'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="font-medium">Sharing Options:</h5>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = generateAffiliateLink(coupon.coupon_code);
                                window.open(`https://wa.me/?text=🎉 Exclusive Offer! Use coupon code *${coupon.coupon_code}* and get ${coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`} OFF! Shop now: ${link}`, '_blank');
                              }}
                            >
                              Share on WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = generateAffiliateLink(coupon.coupon_code);
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
                              }}
                            >
                              Share on Facebook
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = generateAffiliateLink(coupon.coupon_code);
                                const text = `🎉 Exclusive Offer! Use coupon code ${coupon.coupon_code} and get ${coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`} OFF!`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                              }}
                            >
                              Share on Twitter
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Usage */}
      {usageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Coupon Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageHistory.slice(0, 10).map((usage) => (
                <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{usage.orders?.customer_name || 'Customer'}</p>
                    <p className="text-sm text-muted-foreground">
                      Order: ₹{usage.order_total.toFixed(2)} • 
                      Discount: ₹{usage.discount_amount.toFixed(2)} • 
                      {formatDate(usage.used_at)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {usage.orders?.invoice_number || usage.order_id?.slice(0, 8) || 'N/A'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateCoupons;