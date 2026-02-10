import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  IndianRupee, 
  Calculator, 
  Clock, 
  Shield, 
  Send,
  AlertCircle,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { RepairNotificationService } from '@/services/repairNotificationService';

interface QuotationFormProps {
  request: {
    id: string;
    request_id: string;
    customer_name: string;
    device_type: string;
    brand: string;
    model: string;
    issue_types: string[];
    issue_description: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface QuotationData {
  parts_cost: number;
  labour_charges: number;
  service_charges: number;
  estimated_delivery_days: number;
  warranty_period_days: number;
  warranty_description: string;
  admin_notes: string;
}

const QuotationForm = ({ request, onClose, onSuccess }: QuotationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [quotationData, setQuotationData] = useState<QuotationData>({
    parts_cost: 0,
    labour_charges: 0,
    service_charges: 100, // Default service charge
    estimated_delivery_days: 3,
    warranty_period_days: 90,
    warranty_description: 'Warranty covers manufacturing defects in replaced parts',
    admin_notes: ''
  });

  const totalAmount = quotationData.parts_cost + quotationData.labour_charges + quotationData.service_charges;

  const handleInputChange = (field: keyof QuotationData, value: string | number) => {
    setQuotationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalAmount <= 0) {
      toast.error('Total amount must be greater than 0');
      return;
    }

    if (quotationData.estimated_delivery_days <= 0) {
      toast.error('Estimated delivery days must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      // Create quotation
      const { error: quotationError } = await (supabase as any)
        .from('repair_quotations')
        .insert([{
          repair_request_id: request.id,
          parts_cost: quotationData.parts_cost,
          labour_charges: quotationData.labour_charges,
          service_charges: quotationData.service_charges,
          total_amount: totalAmount,
          estimated_delivery_days: quotationData.estimated_delivery_days,
          warranty_period_days: quotationData.warranty_period_days,
          warranty_description: quotationData.warranty_description || null,
          admin_notes: quotationData.admin_notes || null,
          status: 'sent'
        }]);

      if (quotationError) throw quotationError;

      // Update request status
      const { error: requestError } = await (supabase as any)
        .from('repair_requests')
        .update({
          status: 'quotation_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Log status change
      await (supabase as any)
        .from('repair_status_logs')
        .insert({
          repair_request_id: request.id,
          old_status: 'inspection_pending',
          new_status: 'quotation_sent',
          change_reason: 'Quotation sent to customer'
        });

      // Send notification to customer
      try {
        await RepairNotificationService.sendQuotationNotification(
          request.customer_name,
          request.mobile_number,
          request.email,
          request.request_id,
          totalAmount
        );
        toast.success('Quotation sent and customer notified successfully!');
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        toast.success('Quotation sent successfully! (Notification may be delayed)');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error sending quotation:', error);
      toast.error('Failed to send quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Create Quotation - #{request.request_id}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Request Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <span className="ml-2 font-medium">{request.customer_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Device:</span>
                  <span className="ml-2 font-medium">{request.brand} {request.model}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Issues:</span>
                  <span className="ml-2">{request.issue_types.join(', ')}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Description:</span>
                  <p className="mt-1 text-gray-800">{request.issue_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Cost Breakdown</h3>
              
              <div>
                <Label htmlFor="parts_cost">Parts Cost (₹)</Label>
                <Input
                  id="parts_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationData.parts_cost}
                  onChange={(e) => handleInputChange('parts_cost', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="labour_charges">Labour Charges (₹)</Label>
                <Input
                  id="labour_charges"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationData.labour_charges}
                  onChange={(e) => handleInputChange('labour_charges', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="service_charges">Service Charges (₹)</Label>
                <Input
                  id="service_charges"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationData.service_charges}
                  onChange={(e) => handleInputChange('service_charges', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">Total Amount</span>
                  <span className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                    <IndianRupee className="h-5 w-5" />
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Service Details</h3>
              
              <div>
                <Label htmlFor="estimated_delivery_days" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Estimated Delivery (Days)
                </Label>
                <Input
                  id="estimated_delivery_days"
                  type="number"
                  min="1"
                  value={quotationData.estimated_delivery_days}
                  onChange={(e) => handleInputChange('estimated_delivery_days', parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="warranty_period_days" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Warranty Period (Days)
                </Label>
                <Input
                  id="warranty_period_days"
                  type="number"
                  min="0"
                  value={quotationData.warranty_period_days}
                  onChange={(e) => handleInputChange('warranty_period_days', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="warranty_description">Warranty Description</Label>
                <Textarea
                  id="warranty_description"
                  value={quotationData.warranty_description}
                  onChange={(e) => handleInputChange('warranty_description', e.target.value)}
                  placeholder="Describe what the warranty covers..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <Label htmlFor="admin_notes" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Technician Notes (Optional)
            </Label>
            <Textarea
              id="admin_notes"
              value={quotationData.admin_notes}
              onChange={(e) => handleInputChange('admin_notes', e.target.value)}
              placeholder="Add any additional notes for the customer..."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes will be visible to the customer in the quotation
            </p>
          </div>

          {/* Quotation Preview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Quotation Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Parts Cost:</span>
                  <span className="font-medium">₹{quotationData.parts_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Labour Charges:</span>
                  <span className="font-medium">₹{quotationData.labour_charges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Service Charges:</span>
                  <span className="font-medium">₹{quotationData.service_charges.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold text-blue-900">
                  <span>Total Amount:</span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-600 mt-2">
                  <span>Delivery: {quotationData.estimated_delivery_days} days</span>
                  <span>Warranty: {quotationData.warranty_period_days} days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || totalAmount <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quotation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationForm;