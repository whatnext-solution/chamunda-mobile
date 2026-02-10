import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Order } from '@/contexts/OrderContext';
import { useReturns } from '@/contexts/ReturnContext';
import { toast } from 'sonner';
import { RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReturnRequestModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnRequestModal = ({ order, isOpen, onClose }: ReturnRequestModalProps) => {
  const { createReturn } = useReturns();
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setReturnReason('');
    setReturnDescription('');
    setSelectedItems(new Set());
    setItemQuantities({});
    setIsSubmitting(false);
    onClose();
  };

  const handleItemToggle = (itemId: string, maxQuantity: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newQuantities = { ...itemQuantities };
      delete newQuantities[itemId];
      setItemQuantities(newQuantities);
    } else {
      newSelected.add(itemId);
      setItemQuantities({ ...itemQuantities, [itemId]: maxQuantity });
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItemQuantities({ ...itemQuantities, [itemId]: quantity });
  };

  const calculateRefundAmount = () => {
    if (!order) return 0;
    
    return order.order_items.reduce((total, item) => {
      if (selectedItems.has(item.id)) {
        const quantity = itemQuantities[item.id] || item.quantity;
        return total + (item.unit_price * quantity);
      }
      return total;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!order) return;

    // Validation
    if (!returnReason) {
      toast.error('Please select a return reason');
      return;
    }

    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    if (!returnDescription || returnDescription.trim().length < 10) {
      toast.error('Please provide a detailed description (minimum 10 characters)');
      return;
    }

    try {
      setIsSubmitting(true);

      const items = Array.from(selectedItems).map(itemId => ({
        order_item_id: itemId,
        quantity: itemQuantities[itemId],
        reason: returnReason,
      }));

      await createReturn({
        order_id: order.id,
        return_reason: returnReason,
        return_description: returnDescription,
        items,
      });

      toast.success('Return request submitted successfully!');
      handleClose();
    } catch (error) {
      console.error('Error submitting return:', error);
      toast.error('Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  const refundAmount = calculateRefundAmount();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            Return Request
          </DialogTitle>
          <DialogDescription>
            Order #{order.order_number} • Placed on {new Date(order.created_at).toLocaleDateString('en-IN')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Return Policy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Return Policy</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Returns accepted within 7 days of delivery</li>
                  <li>Items must be unused and in original packaging</li>
                  <li>Refund will be processed to your wallet within 3-5 business days</li>
                  <li>Pickup will be scheduled after approval</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Select Items to Return */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Items to Return</Label>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedItems.has(item.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => handleItemToggle(item.id, item.quantity)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{item.unit_price.toFixed(2)} × {item.quantity} = ₹{item.line_total.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      {selectedItems.has(item.id) && item.quantity > 1 && (
                        <div className="mt-3 flex items-center gap-3">
                          <Label className="text-sm">Return Quantity:</Label>
                          <div className="flex items-center gap-2">
                            {Array.from({ length: item.quantity }, (_, i) => i + 1).map((qty) => (
                              <button
                                key={qty}
                                onClick={() => handleQuantityChange(item.id, qty)}
                                className={`px-3 py-1 rounded border text-sm ${
                                  itemQuantities[item.id] === qty
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white border-gray-300 hover:border-blue-500'
                                }`}
                              >
                                {qty}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div className="space-y-2">
            <Label htmlFor="return-reason" className="text-base font-semibold">
              Return Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger id="return-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="defective">Defective or Damaged Product</SelectItem>
                <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                <SelectItem value="not_as_described">Not as Described</SelectItem>
                <SelectItem value="quality_issue">Quality Issue</SelectItem>
                <SelectItem value="size_fit">Size/Fit Issue</SelectItem>
                <SelectItem value="not_needed">No Longer Needed</SelectItem>
                <SelectItem value="better_price">Found Better Price</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Detailed Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail (minimum 10 characters)..."
              value={returnDescription}
              onChange={(e) => setReturnDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {returnDescription.length}/500 characters
            </p>
          </div>

          {/* Refund Summary */}
          {selectedItems.size > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Estimated Refund</span>
                </div>
                <span className="text-xl font-bold text-green-800">
                  ₹{refundAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Refund will be credited to your wallet after approval
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.size === 0 || !returnReason}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Return Request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
