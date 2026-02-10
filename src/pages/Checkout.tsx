import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckoutPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Truck, 
  CheckCircle,
  Banknote,
  Lock,
  Coins,
  Gift,
  RefreshCw
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useAffiliate } from '@/hooks/useAffiliate';
import { CoinRedemptionModal } from '@/components/loyalty/CoinRedemptionModal';
import CouponApplication from '@/components/checkout/CouponApplication';
import { useCoupons, AppliedCoupon } from '@/hooks/useCoupons';
import { loyaltyIntegrationService } from '@/services/loyaltyIntegrationService';
import { toast } from 'sonner';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: cartItems, getTotalPrice } = useCart();
  const { createOrder } = useOrders();
  const { processAffiliateOrder } = useAffiliate();
  const { isPageLoading } = useLoading();
  const { 
    wallet: loyaltyWallet, 
    calculateCoinsEarned, 
    canRedeemCoins, 
    redeemCoins,
    isSystemEnabled 
  } = useLoyaltyCoins();
  
  const { 
    wallet: unifiedWallet,
    loading: unifiedLoading,
    updateWallet
  } = useUnifiedWallet();
  const { applyCouponToOrder } = useCoupons();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    notes: ''
  });

  // Show shimmer during page loading
  if (isPageLoading) {
    return (
      <MainLayout>
        <CheckoutPageShimmer />
      </MainLayout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please login to proceed with checkout and place your order.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cart">Back to Cart</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const subtotal = getTotalPrice();
  const shipping = 0; // Free shipping
  const coinsDiscount = useCoins ? Math.min(coinsToUse * 0.1, subtotal) : 0; // 1 coin = ₹0.10
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = subtotal + shipping - coinsDiscount - couponDiscount;
  const coinsEarned = calculateCoinsEarned(total) + (appliedCoupon?.bonusCoins || 0);

  const handleCoinRedemption = (coins: number) => {
    setCoinsToUse(coins);
    setUseCoins(coins > 0);
  };

  const handlePlaceOrder = async () => {
    // Validate required fields
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      toast.error('Please fill in all required shipping information');
      return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(shippingInfo.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    // Validate ZIP code if provided (6 digits)
    if (shippingInfo.zipCode) {
      const zipRegex = /^[0-9]{6}$/;
      if (!zipRegex.test(shippingInfo.zipCode)) {
        toast.error('Please enter a valid 6-digit ZIP code');
        return;
      }
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Prevent duplicate orders
    if (isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Handle coin redemption if selected
      let finalTotal = total;
      let coinsUsed = 0;
      
      if (useCoins && coinsToUse > 0) {
        const redemptionSuccess = await redeemCoins(
          coinsToUse, 
          'temp-order-id', // Will be updated with actual order ID
          `Coins redeemed for order - ${coinsToUse} coins used`
        );
        
        if (!redemptionSuccess) {
          toast.error('Failed to redeem coins. Please try again.');
          return;
        }
        
        coinsUsed = coinsToUse;
        finalTotal = total;
      }

      // Create order with cart items
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.offer_price || item.price
      }));

      const newOrder = await createOrder({
        customer_name: shippingInfo.name,
        customer_phone: shippingInfo.phone,
        shipping_name: shippingInfo.name,
        shipping_address: shippingInfo.address,
        shipping_city: shippingInfo.city,
        shipping_zipcode: shippingInfo.zipCode,
        total_amount: finalTotal,
        payment_method: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment',
        notes: shippingInfo.notes,
        items: orderItems
      });

      // Apply coupon to order if one is selected
      if (appliedCoupon) {
        try {
          await applyCouponToOrder(appliedCoupon.code, newOrder.id, subtotal);
        } catch (couponError) {
          console.error('Error applying coupon to order:', couponError);
          // Don't fail the order if coupon application fails
        }
      }

      // Process affiliate order if applicable
      try {
        await processAffiliateOrder(newOrder.id, orderItems);
      } catch (affiliateError) {
        console.error('Error processing affiliate order:', affiliateError);
        // Don't fail the order if affiliate processing fails
      }

      // Credit loyalty coins for the order (if eligible)
      if (isSystemEnabled && user) {
        try {
          const coinsEligible = await loyaltyIntegrationService.isOrderEligibleForCoins(finalTotal);
          if (coinsEligible) {
            await loyaltyIntegrationService.creditCoinsForOrder({
              orderId: newOrder.id,
              userId: user.id,
              orderAmount: finalTotal,
              customerName: shippingInfo.name,
              orderNumber: newOrder.order_number || newOrder.id.slice(0, 8)
            });
          }
        } catch (coinsError) {
          console.error('Error crediting loyalty coins:', coinsError);
          // Don't fail the order if coins credit fails
        }
      }

      // Store order ID in sessionStorage to pass to confirmation page
      sessionStorage.setItem('lastOrderId', newOrder.id);

      toast.success('Order placed successfully!');
      navigate(`/order-confirmation?orderId=${newOrder.id}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Redirect to cart if no items
  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
            <Button onClick={() => navigate('/products')}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-16 z-40">
          <div className="container-fluid py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Checkout</h1>
            </div>
          </div>
        </div>

        <div className="container-fluid py-6 space-y-6">
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={shippingInfo.name}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={shippingInfo.phone}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '');
                      setShippingInfo({ ...shippingInfo, phone: value });
                    }}
                    placeholder="Enter 10-digit phone number"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  placeholder="Enter your full address"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    placeholder="Enter your city"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={shippingInfo.zipCode}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '');
                      setShippingInfo({ ...shippingInfo, zipCode: value });
                    }}
                    placeholder="Enter 6-digit ZIP code"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={shippingInfo.notes}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                  placeholder="Any special instructions for delivery"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="cod" id="cod" />
                  <div className="flex items-center gap-3 flex-1">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <div>
                      <Label htmlFor="cod" className="font-medium cursor-pointer">
                        Cash on Delivery
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Pay when your order is delivered
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Coupon Application */}
          <CouponApplication
            orderTotal={subtotal}
            cartItems={cartItems}
            onCouponApplied={setAppliedCoupon}
            appliedCoupon={appliedCoupon}
          />

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">₹{((item.offer_price || item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                
                {/* Loyalty Coins Section */}
                {isSystemEnabled && loyaltyWallet && loyaltyWallet.available_coins > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">Loyalty Coins</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Available: {loyaltyWallet.available_coins} coins
                        </span>
                      </div>
                      
                      {!useCoins ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCoinModal(true)}
                          className="w-full text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Use Coins for Discount
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600">Coins Applied:</span>
                            <span className="font-medium">{coinsToUse} coins</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCoinModal(true)}
                              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                            >
                              Modify
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUseCoins(false);
                                setCoinsToUse(0);
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {!useCoins && coinsEarned > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Gift className="h-4 w-4" />
                          <span>You'll earn {coinsEarned} coins from this order!</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {coinsDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coins Discount</span>
                    <span>-₹{coinsDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card className="bg-white border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-foreground">Free Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    Estimated delivery: 2-3 business days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button 
            size="lg" 
            className="w-full"
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
          >
            {isPlacingOrder ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Place Order - ₹{total.toFixed(2)}
              </>
            )}
          </Button>

          {/* Coin Redemption Modal */}
          <CoinRedemptionModal
            isOpen={showCoinModal}
            onClose={() => setShowCoinModal(false)}
            orderTotal={subtotal}
            onRedeem={handleCoinRedemption}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;