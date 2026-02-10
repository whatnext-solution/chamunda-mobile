import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingOverlay } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Clock, 
  MapPin,
  Phone,
  ArrowLeft,
  Download,
  Share2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useOrders, Order } from '@/contexts/OrderContext';
import { toast } from 'sonner';

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { getOrderById } = useOrders();
  const { isPageLoading } = useLoading();
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get order ID from sessionStorage or URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('orderId');
    const orderIdFromStorage = sessionStorage.getItem('lastOrderId');
    
    const orderId = orderIdFromUrl || orderIdFromStorage;
    
    if (orderId) {
      const order = getOrderById(orderId);
      setOrderData(order || null);
      
      // Clear the stored order ID only if from sessionStorage
      if (orderIdFromStorage) {
        sessionStorage.removeItem('lastOrderId');
      }
    }

    // Clear cart only once when component mounts
    const timer = setTimeout(() => {
      clearCart();
      setIsLoading(false);
    }, 1000); // Small delay to avoid immediate clearing

    return () => clearTimeout(timer);
  }, [getOrderById, clearCart]);

  const handleShare = () => {
    if (!orderData) return;
    
    if (navigator.share) {
      navigator.share({
        title: 'Order Confirmation',
        text: `Order ${orderData.order_number} confirmed! Total: ₹${orderData.total_amount}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`Order ${orderData.order_number} confirmed! Total: ₹${orderData.total_amount}`);
      toast.success('Order details copied to clipboard!');
    }
  };

  // Show loading overlay during initial load
  if (isPageLoading || isLoading) {
    return (
      <MainLayout>
        <LoadingOverlay />
      </MainLayout>
    );
  }

  // Show empty state when no order data is available
  if (!orderData) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Order Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find any order details. Please place an order first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/products">Start Shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
            
            {/* Back to Home */}
            <div className="text-center pt-6">
              <Button asChild variant="ghost">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container-fluid py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
              <p className="text-gray-600">Thank you for your order. We'll send you updates via email.</p>
            </div>
          </div>
        </div>

        <div className="container-fluid py-6 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Order Details</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-semibold">{orderData.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{new Date(orderData.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-semibold">{orderData.payment_method || 'Cash on Delivery'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-lg">₹{orderData.total_amount.toFixed(2)}</p>
                </div>
              </div>

              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Order Confirmed
              </Badge>
            </CardContent>
          </Card>

          {/* Delivery Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Delivery Timeline</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Order Confirmed</p>
                    <p className="text-sm text-gray-600">Your order has been confirmed</p>
                  </div>
                  <span className="text-sm text-gray-500">Now</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Processing</p>
                    <p className="text-sm text-gray-600">We're preparing your order</p>
                  </div>
                  <span className="text-sm text-gray-500">1-2 hours</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Truck className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Out for Delivery</p>
                    <p className="text-sm text-gray-600">Your order is on the way</p>
                  </div>
                  <span className="text-sm text-gray-500">2-3 days</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Delivered</p>
                    <p className="text-sm text-gray-600">Estimated delivery</p>
                  </div>
                  <span className="text-sm text-gray-500">{orderData.estimated_delivery ? new Date(orderData.estimated_delivery).toLocaleDateString() : '3-5 days'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </h3>
              
              <div className="space-y-2">
                <p className="font-medium">{orderData.shipping_name || orderData.customer_name}</p>
                <p className="text-gray-600">{orderData.shipping_address}</p>
                {orderData.shipping_city && (
                  <p className="text-gray-600">{orderData.shipping_city} {orderData.shipping_zipcode}</p>
                )}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{orderData.customer_phone}</span>
                  </div>
                </div>
                {orderData.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {orderData.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Order Items</h3>
              
              <div className="space-y-4">
                {orderData.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold">₹{item.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{orderData.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{orderData.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link to="/orders">
                <Clock className="h-4 w-4 mr-2" />
                Track Order
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/products">
                Continue Shopping
              </Link>
            </Button>
          </div>

          {/* Back to Home */}
          <div className="text-center pt-4">
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default OrderConfirmation;