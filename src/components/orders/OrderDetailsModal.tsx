import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderTimeline } from './OrderTimeline';
import { Order } from '@/contexts/OrderContext';
import {
  Package,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Download,
  MessageCircle,
  X,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal = ({ order, isOpen, onClose }: OrderDetailsModalProps) => {
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  if (!order) return null;

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopiedOrderId(true);
      toast.success('Order ID copied to clipboard');
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch (error) {
      toast.error('Failed to copy order ID');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Order Details</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Header */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">{order.order_number}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyOrderId}
                  className="h-6 px-2"
                >
                  {copiedOrderId ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            </div>
            <Badge className={`${getStatusColor(order.status)} border`}>
              <span className="capitalize font-medium">{order.status}</span>
            </Badge>
          </div>

          {/* Order Timeline */}
          <div>
            <h4 className="font-semibold mb-4">Order Progress</h4>
            <OrderTimeline
              status={order.status}
              createdAt={order.created_at}
              estimatedDelivery={order.estimated_delivery}
            />
          </div>

          {/* Order Items */}
          <div>
            <h4 className="font-semibold mb-4">Items Ordered</h4>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{item.line_total.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">₹{(item.line_total / item.quantity).toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-4">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>₹0.00</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>₹{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          {order.shipping_address && (
            <div>
              <h4 className="font-semibold mb-4">Shipping Information</h4>
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Delivery Address</p>
                    <p className="text-sm text-muted-foreground mt-1">{order.shipping_address}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div>
            <h4 className="font-semibold mb-4">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button variant="outline" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};