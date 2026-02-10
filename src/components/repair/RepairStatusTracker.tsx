import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Wrench, 
  Package, 
  Truck,
  Star,
  MessageCircle,
  Calendar,
  Phone
} from 'lucide-react';

interface StatusStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

interface RepairStatusTrackerProps {
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: number;
  onContactSupport?: () => void;
  onLeaveFeedback?: () => void;
}

const STATUS_STEPS: Record<string, StatusStep[]> = {
  'request_received': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: true },
    { id: 'inspection_pending', label: 'Inspection Pending', description: 'Technician will inspect your device', icon: Clock, completed: false, current: false },
    { id: 'quotation_sent', label: 'Quotation', description: 'Detailed quotation will be sent', icon: Package, completed: false, current: false },
    { id: 'repair_in_progress', label: 'Repair', description: 'Device repair in progress', icon: Wrench, completed: false, current: false },
    { id: 'ready_for_delivery', label: 'Ready', description: 'Device ready for delivery', icon: Truck, completed: false, current: false }
  ],
  'inspection_pending': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection Pending', description: 'Technician is inspecting your device', icon: Clock, completed: false, current: true },
    { id: 'quotation_sent', label: 'Quotation', description: 'Detailed quotation will be sent', icon: Package, completed: false, current: false },
    { id: 'repair_in_progress', label: 'Repair', description: 'Device repair in progress', icon: Wrench, completed: false, current: false },
    { id: 'ready_for_delivery', label: 'Ready', description: 'Device ready for delivery', icon: Truck, completed: false, current: false }
  ],
  'quotation_sent': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Sent', description: 'Please review and approve quotation', icon: Package, completed: false, current: true },
    { id: 'repair_in_progress', label: 'Repair', description: 'Device repair in progress', icon: Wrench, completed: false, current: false },
    { id: 'ready_for_delivery', label: 'Ready', description: 'Device ready for delivery', icon: Truck, completed: false, current: false }
  ],
  'quotation_approved': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Approved', description: 'Quotation approved by customer', icon: CheckCircle, completed: true, current: false },
    { id: 'repair_in_progress', label: 'Repair Starting', description: 'Repair process will begin soon', icon: Clock, completed: false, current: true },
    { id: 'ready_for_delivery', label: 'Ready', description: 'Device ready for delivery', icon: Truck, completed: false, current: false }
  ],
  'repair_in_progress': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Approved', description: 'Quotation approved by customer', icon: CheckCircle, completed: true, current: false },
    { id: 'repair_in_progress', label: 'Repair In Progress', description: 'Our technician is working on your device', icon: Wrench, completed: false, current: true },
    { id: 'ready_for_delivery', label: 'Ready', description: 'Device ready for delivery', icon: Truck, completed: false, current: false }
  ],
  'repair_completed': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Approved', description: 'Quotation approved by customer', icon: CheckCircle, completed: true, current: false },
    { id: 'repair_in_progress', label: 'Repair Completed', description: 'Device repair completed successfully', icon: CheckCircle, completed: true, current: false },
    { id: 'ready_for_delivery', label: 'Ready for Delivery', description: 'Device is ready for pickup/delivery', icon: Truck, completed: false, current: true }
  ],
  'ready_for_delivery': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Approved', description: 'Quotation approved by customer', icon: CheckCircle, completed: true, current: false },
    { id: 'repair_in_progress', label: 'Repair Completed', description: 'Device repair completed successfully', icon: CheckCircle, completed: true, current: false },
    { id: 'ready_for_delivery', label: 'Ready for Delivery', description: 'Please collect your device', icon: Truck, completed: false, current: true }
  ],
  'delivered': [
    { id: 'request_received', label: 'Request Received', description: 'Your repair request has been submitted', icon: CheckCircle, completed: true, current: false },
    { id: 'inspection_pending', label: 'Inspection', description: 'Device inspection completed', icon: CheckCircle, completed: true, current: false },
    { id: 'quotation_sent', label: 'Quotation Approved', description: 'Quotation approved by customer', icon: CheckCircle, completed: true, current: false },
    { id: 'repair_in_progress', label: 'Repair Completed', description: 'Device repair completed successfully', icon: CheckCircle, completed: true, current: false },
    { id: 'ready_for_delivery', label: 'Delivered', description: 'Device delivered successfully', icon: CheckCircle, completed: true, current: false }
  ]
};

export const RepairStatusTracker = ({ 
  currentStatus, 
  createdAt, 
  updatedAt, 
  estimatedDelivery,
  onContactSupport,
  onLeaveFeedback 
}: RepairStatusTrackerProps) => {
  const [steps, setSteps] = useState<StatusStep[]>([]);

  useEffect(() => {
    const statusSteps = STATUS_STEPS[currentStatus] || STATUS_STEPS['request_received'];
    setSteps(statusSteps);
  }, [currentStatus]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstimatedDeliveryDate = () => {
    if (!estimatedDelivery) return null;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDelivery);
    return deliveryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-5 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Repair Status Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-5 md:p-6">
        {/* Status Timeline */}
        <div className="relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative flex items-start pb-8">
                {/* Connector Line */}
                {!isLast && (
                  <div 
                    className={`absolute left-4 top-8 w-0.5 h-16 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`} 
                  />
                )}
                
                {/* Status Icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : step.current 
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse' 
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Status Content */}
                <div className="ml-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${
                      step.completed ? 'text-green-700' : 
                      step.current ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </h4>
                    {step.current && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.completed && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Completed
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Information */}
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
            <span className="text-gray-600">Request Submitted:</span>
            <span className="font-medium">{formatDate(createdAt)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
            <span className="text-gray-600">Last Updated:</span>
            <span className="font-medium">{formatDate(updatedAt)}</span>
          </div>
          {estimatedDelivery && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
              <span className="text-gray-600">Estimated Delivery:</span>
              <span className="font-medium text-blue-600">{getEstimatedDeliveryDate()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {onContactSupport && (
            <Button variant="outline" size="sm" onClick={onContactSupport} className="flex-1 h-10 sm:h-9 touch-manipulation">
              <Phone className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          )}
          
          {currentStatus === 'delivered' && onLeaveFeedback && (
            <Button size="sm" onClick={onLeaveFeedback} className="flex-1 bg-green-600 hover:bg-green-700 h-10 sm:h-9 touch-manipulation">
              <Star className="h-4 w-4 mr-2" />
              Leave Feedback
            </Button>
          )}
        </div>

        {/* Status-specific Messages */}
        {currentStatus === 'quotation_sent' && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-amber-800">Action Required</p>
                <p className="text-amber-700">Please review and approve the quotation to proceed with the repair.</p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'repair_in_progress' && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Wrench className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-blue-800">Repair In Progress</p>
                <p className="text-blue-700">Our certified technician is working on your device. We'll notify you once it's ready.</p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'ready_for_delivery' && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-green-800">Device Ready!</p>
                <p className="text-green-700">Your device is ready for pickup/delivery. We'll contact you shortly with the details.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};