import { CheckCircle, Clock, Package, Truck, X } from 'lucide-react';

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  estimatedDelivery?: string;
}

export const OrderTimeline = ({ status, createdAt, estimatedDelivery }: OrderTimelineProps) => {
  const timelineSteps = [
    {
      id: 'pending',
      title: 'Order Placed',
      description: 'Your order has been received',
      icon: Clock,
      date: createdAt
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'We are preparing your order',
      icon: Package,
      date: null
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: 'Your order is on the way',
      icon: Truck,
      date: null
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Order delivered successfully',
      icon: CheckCircle,
      date: estimatedDelivery
    }
  ];

  const getStepStatus = (stepId: string) => {
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (status === 'cancelled') {
      return stepId === 'pending' ? 'completed' : 'cancelled';
    }
    
    if (stepIndex <= currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex + 1) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return 'bg-blue-500 text-white border-blue-500';
      case 'cancelled':
        return 'bg-red-500 text-white border-red-500';
      default:
        return 'bg-gray-200 text-gray-400 border-gray-200';
    }
  };

  const getLineColor = (index: number) => {
    const stepStatus = getStepStatus(timelineSteps[index].id);
    return stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200';
  };

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-full">
          <X className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-red-800">Order Cancelled</p>
          <p className="text-sm text-red-600">This order has been cancelled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineSteps.map((step, index) => {
        const stepStatus = getStepStatus(step.id);
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStepColor(stepStatus)}`}>
                <Icon className="h-4 w-4" />
              </div>
              {/* Connecting line */}
              {index < timelineSteps.length - 1 && (
                <div className={`w-0.5 h-8 mt-2 ${getLineColor(index)}`} />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.title}
                </h4>
                {step.date && stepStatus === 'completed' && (
                  <span className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-600' : 'text-gray-400'}`}>
                {step.description}
              </p>
              
              {/* Estimated delivery for delivered step */}
              {step.id === 'delivered' && estimatedDelivery && stepStatus === 'pending' && (
                <p className="text-xs text-blue-600 mt-1">
                  Expected: {new Date(estimatedDelivery).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};