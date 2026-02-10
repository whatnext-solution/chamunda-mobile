import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  IndianRupee, 
  Clock, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface QuotationModalProps {
  quotation: {
    id: string;
    parts_cost: number;
    labour_charges: number;
    service_charges: number;
    total_amount: number;
    estimated_delivery_days: number;
    warranty_period_days: number;
    warranty_description?: string;
    admin_notes?: string;
    status: string;
    created_at: string;
  };
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export const QuotationModal = ({ quotation, onClose, onApprove, onReject }: QuotationModalProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            Repair Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Quotation Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg border border-blue-200">
            <div className="text-center mb-3 sm:mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-blue-900 flex items-center justify-center gap-2">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6" />
                {quotation.total_amount.toFixed(2)}
              </h3>
              <p className="text-blue-700 text-xs sm:text-sm">Total Repair Cost</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold text-sm sm:text-base">{quotation.estimated_delivery_days} Days</span>
                </div>
                <p className="text-xs text-blue-700">Estimated Delivery</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold text-sm sm:text-base">{quotation.warranty_period_days} Days</span>
                </div>
                <p className="text-xs text-blue-700">Warranty Period</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Cost Breakdown</h4>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-gray-600">Parts Cost</span>
                <span className="font-medium flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {quotation.parts_cost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-gray-600">Labour Charges</span>
                <span className="font-medium flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {quotation.labour_charges.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-gray-600">Service Charges</span>
                <span className="font-medium flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {quotation.service_charges.toFixed(2)}
                </span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-blue-600 flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {quotation.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Service Details</h4>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Estimated Delivery Time</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Your device will be ready within {quotation.estimated_delivery_days} working days
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Warranty Coverage</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {quotation.warranty_period_days} days warranty on repaired parts
                  </p>
                  {quotation.warranty_description && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{quotation.warranty_description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Quotation Date</p>
                  <p className="text-xs sm:text-sm text-gray-600">{formatDate(quotation.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          {quotation.admin_notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Technician Notes</h4>
              <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-amber-800">{quotation.admin_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Important Information */}
          <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Important Information</h4>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
              <li>• Once approved, the repair process will begin immediately</li>
              <li>• Payment can be made after repair completion</li>
              <li>• Warranty covers manufacturing defects in replaced parts</li>
              <li>• You will receive updates via SMS/WhatsApp during the repair process</li>
            </ul>
          </div>

          {/* Action Buttons */}
          {quotation.status === 'sent' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <Button
                onClick={onApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Quotation
              </Button>
              <Button
                onClick={onReject}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Quotation
              </Button>
            </div>
          )}

          {quotation.status !== 'sent' && (
            <div className="text-center py-4">
              <Badge 
                className={
                  quotation.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }
              >
                {quotation.status === 'approved' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Quotation Approved
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Quotation Rejected
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};