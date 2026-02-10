import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyWrapper } from '@/components/ui/LazyWrapper';
import { OrdersShimmer } from '@/components/ui/Shimmer';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { ReturnRequestModal } from '@/components/returns/ReturnRequestModal';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Eye,
  RotateCcw,
  MessageCircle,
  Lock,
  X,
  Edit,
  MapPin,
  Calendar,
  CreditCard,
  Star,
  Filter,
  Search,
  Download,
  RefreshCw,
  ShoppingBag,
  Phone,
  Mail,
  PackageX
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, Order } from '@/contexts/OrderContext';
import { useReturns } from '@/contexts/ReturnContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading, updateOrderStatus } = useOrders();
  const { canReturnOrder, getReturnsByOrderId } = useReturns();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState<Order | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Confirm cancellation
    const confirmed = confirm(
      `Are you sure you want to cancel this order?\n\nOrder: ${order.order_number}\nAmount: ₹${order.total_amount.toFixed(2)}\n\nNote: If you paid online, refund will be processed to your wallet within 3-5 business days.`
    );
    
    if (!confirmed) return;

    try {
      await updateOrderStatus(orderId, 'cancelled');
      
      // Process refund if payment was made (not COD)
      if (order.payment_method && order.payment_method !== 'Cash on Delivery') {
        // Process refund to wallet
        try {
          // Get current wallet balance
          const { data: walletData, error: walletError } = await supabase
            .from('unified_wallet')
            .select('balance')
            .eq('user_id', user?.id)
            .single();

          if (walletError && walletError.code !== 'PGRST116') {
            throw walletError;
          }

          const currentBalance = walletData?.balance || 0;
          const newBalance = currentBalance + order.total_amount;

          if (walletData) {
            // Update existing wallet
            const { error: updateError } = await supabase
              .from('unified_wallet')
              .update({ balance: newBalance })
              .eq('user_id', user?.id);

            if (updateError) throw updateError;
          } else {
            // Create new wallet
            const { error: createError } = await supabase
              .from('unified_wallet')
              .insert({
                user_id: user?.id,
                balance: order.total_amount,
              });

            if (createError) throw createError;
          }

          // Create wallet transaction
          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user?.id,
              transaction_type: 'credit',
              amount: order.total_amount,
              description: `Refund for cancelled order ${order.order_number}`,
              reference_type: 'order_cancellation',
              reference_id: orderId,
            });

          toast.success(`Order cancelled successfully. ₹${order.total_amount.toFixed(2)} refunded to your wallet.`);
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          toast.warning('Order cancelled but refund processing failed. Please contact support.');
        }
      } else {
        toast.success('Order cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again or contact support.');
    }
  };

  const handleEditOrder = (orderId: string) => {
    toast.info('Order editing feature coming soon');
  };

  const handleReorder = (order: Order) => {
    toast.success('Items added to cart for reorder');
  };

  const handleReturnRequest = (order: Order) => {
    // Check if return is eligible
    if (!canReturnOrder(order.id, order.created_at)) {
      const existingReturns = getReturnsByOrderId(order.id);
      if (existingReturns.length > 0) {
        toast.error('A return request already exists for this order');
      } else {
        toast.error('This order is not eligible for return (7-day window expired)');
      }
      return;
    }

    setOrderForReturn(order);
    setIsReturnModalOpen(true);
  };

  const handleDownloadInvoice = (orderId: string) => {
    toast.info('Invoice download feature coming soon');
  };

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };
  
  // Redirect to login if not authenticated
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please login to view your orders and track their status.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending':
        return 25;
      case 'processing':
        return 50;
      case 'shipped':
        return 75;
      case 'delivered':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const filterOrdersByStatus = (status?: string) => {
    let filteredOrders = orders;
    
    if (status && status !== 'all') {
      filteredOrders = orders.filter(order => order.status === status);
    }
    
    if (searchTerm) {
      filteredOrders = filteredOrders.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items.some(item => 
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filteredOrders;
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };
    return stats;
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-6 overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg">{order.order_number}</h3>
              <Badge className={`${getStatusColor(order.status)} border`}>
                {getStatusIcon(order.status)}
                <span className="ml-1.5 capitalize font-medium">{order.status}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(order.created_at).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span>₹{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
              <Eye className="h-4 w-4 mr-1" />
              Track
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(order.id)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {order.status !== 'cancelled' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Order Progress</span>
              <span>{getStatusProgress(order.status)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  order.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getStatusProgress(order.status)}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Order Items */}
        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Order Items</h4>
          {order.order_items.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">₹{item.line_total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">₹{(item.line_total / item.quantity).toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Information */}
        {order.estimated_delivery && order.status !== 'delivered' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Expected delivery: {new Date(order.estimated_delivery).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shipping_address && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Delivery Address</p>
                <p className="text-xs text-muted-foreground mt-1">{order.shipping_address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {/* Cancel button - only show for pending/processing orders */}
          {(order.status === 'pending' || order.status === 'processing') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCancelOrder(order.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel Order
            </Button>
          )}
          
          {/* Edit button - only show for pending orders */}
          {order.status === 'pending' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditOrder(order.id)}
              className="hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Modify
            </Button>
          )}
          
          {/* Reorder button for delivered orders */}
          {order.status === 'delivered' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleReorder(order)}
              className="hover:bg-green-50"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reorder
            </Button>
          )}

          {/* Return button for delivered orders (within 7 days) */}
          {order.status === 'delivered' && canReturnOrder(order.id, order.created_at) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleReturnRequest(order)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <PackageX className="h-4 w-4 mr-1" />
              Return
            </Button>
          )}

          {/* Rate & Review for delivered orders */}
          {order.status === 'delivered' && (
            <Button 
              variant="outline" 
              size="sm"
              className="hover:bg-yellow-50"
            >
              <Star className="h-4 w-4 mr-1" />
              Rate & Review
            </Button>
          )}
          
          {/* Support button for processing/shipped orders */}
          {(order.status === 'processing' || order.status === 'shipped') && (
            <Button 
              variant="outline" 
              size="sm"
              className="hover:bg-purple-50"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Get Help
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b shadow-sm sticky top-16 z-40">
          <div className="container-fluid py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-10 w-10 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                  <p className="text-sm text-muted-foreground">
                    Track and manage your orders
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="container-fluid py-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Package className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Loading your orders...</h2>
              <p className="text-muted-foreground">Please wait while we fetch your order history</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <ShoppingBag className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">No orders yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start shopping to see your orders here. We'll keep track of everything for you!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/products">
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Start Shopping
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              </div>
              
              {/* Debug info */}
              {user && (
                <div className="mt-12 p-6 bg-white rounded-xl shadow-sm border max-w-md mx-auto">
                  <h3 className="font-medium mb-3">Account Information</h3>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Orders are linked to your account email address
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Order Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {(() => {
                  const stats = getOrderStats();
                  return [
                    { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
                    { label: 'Pending', value: stats.pending, color: 'bg-amber-100 text-amber-700' },
                    { label: 'Processing', value: stats.processing, color: 'bg-blue-100 text-blue-700' },
                    { label: 'Shipped', value: stats.shipped, color: 'bg-purple-100 text-purple-700' },
                    { label: 'Delivered', value: stats.delivered, color: 'bg-green-100 text-green-700' },
                    { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-100 text-red-700' },
                  ].map((stat, index) => (
                    <Card key={index} className="text-center p-4 hover:shadow-md transition-shadow">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.color} mb-2`}>
                        <span className="font-bold text-lg">{stat.value}</span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    </Card>
                  ));
                })()}
              </div>

              <Tabs value={selectedFilter} onValueChange={setSelectedFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-6 mb-8 bg-white shadow-sm">
                  <TabsTrigger value="all" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    All ({getOrderStats().total})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                    Pending ({getOrderStats().pending})
                  </TabsTrigger>
                  <TabsTrigger value="processing" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    Processing ({getOrderStats().processing})
                  </TabsTrigger>
                  <TabsTrigger value="shipped" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                    Shipped ({getOrderStats().shipped})
                  </TabsTrigger>
                  <TabsTrigger value="delivered" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                    Delivered ({getOrderStats().delivered})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                    Cancelled ({getOrderStats().cancelled})
                  </TabsTrigger>
                </TabsList>

                {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                  <TabsContent key={status} value={status} className="space-y-6">
                    {filterOrdersByStatus(status).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No {status === 'all' ? '' : status} orders found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? 'Try adjusting your search terms' : `You don't have any ${status === 'all' ? '' : status} orders yet`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filterOrdersByStatus(status).map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </div>

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />

        {/* Return Request Modal */}
        <ReturnRequestModal
          order={orderForReturn}
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setOrderForReturn(null);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default Orders;