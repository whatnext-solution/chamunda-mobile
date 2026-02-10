import { AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface StockWarningProps {
  remaining: number | null;
  threshold?: number;
  maxQuantity?: number | null;
  soldQuantity?: number;
  showProgressBar?: boolean;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StockWarning({
  remaining,
  threshold = 10,
  maxQuantity,
  soldQuantity = 0,
  showProgressBar = false,
  urgencyLevel,
  className,
  size = 'md'
}: StockWarningProps) {
  // Don't show if unlimited stock
  if (remaining === null || maxQuantity === null) {
    return null;
  }

  // Don't show if stock is above threshold
  if (remaining > threshold) {
    return null;
  }

  // Auto-determine urgency level if not provided
  const autoUrgencyLevel = urgencyLevel || (() => {
    if (remaining === 0) return 'critical';
    if (remaining <= 3) return 'high';
    if (remaining <= 7) return 'medium';
    return 'low';
  })();

  const urgencyConfig = {
    low: {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 border-yellow-200',
      icon: Package,
      message: `Only ${remaining} left in stock`
    },
    medium: {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
      icon: AlertTriangle,
      message: `Hurry! Only ${remaining} left`
    },
    high: {
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      icon: AlertTriangle,
      message: `Almost sold out! ${remaining} remaining`
    },
    critical: {
      color: 'text-red-800',
      bgColor: 'bg-red-100 border-red-300',
      icon: AlertTriangle,
      message: 'Sold out!'
    }
  };

  const config = urgencyConfig[autoUrgencyLevel];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4'
  };

  const soldPercentage = maxQuantity > 0 ? (soldQuantity / maxQuantity) * 100 : 0;

  return (
    <div className={cn(
      'border rounded-lg',
      config.bgColor,
      sizeClasses[size],
      autoUrgencyLevel === 'critical' && 'animate-pulse',
      className
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn(
          'flex-shrink-0',
          config.color,
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        
        <span className={cn('font-medium', config.color)}>
          {config.message}
        </span>
        
        {autoUrgencyLevel === 'high' && (
          <Badge variant="destructive" className="ml-auto">
            🔥 Hot
          </Badge>
        )}
        
        {autoUrgencyLevel === 'critical' && (
          <Badge variant="destructive" className="ml-auto animate-bounce">
            ⚡ Sold Out
          </Badge>
        )}
      </div>
      
      {showProgressBar && maxQuantity && remaining > 0 && (
        <div className="mt-2 space-y-1">
          <Progress 
            value={soldPercentage} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{soldQuantity} sold</span>
            <span>{remaining} left</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for product cards
export function StockBadge({
  remaining,
  threshold = 10,
  className
}: {
  remaining: number | null;
  threshold?: number;
  className?: string;
}) {
  if (remaining === null || remaining > threshold) {
    return null;
  }

  const getUrgencyStyle = () => {
    if (remaining === 0) {
      return 'bg-red-600 text-white animate-pulse';
    }
    if (remaining <= 3) {
      return 'bg-red-500 text-white';
    }
    if (remaining <= 7) {
      return 'bg-orange-500 text-white';
    }
    return 'bg-yellow-500 text-white';
  };

  const getMessage = () => {
    if (remaining === 0) return 'Sold Out';
    if (remaining === 1) return 'Last One!';
    return `${remaining} Left`;
  };

  return (
    <Badge className={cn(
      'text-xs font-semibold',
      getUrgencyStyle(),
      className
    )}>
      {getMessage()}
    </Badge>
  );
}

// Social proof component showing popularity
export function PopularityIndicator({
  soldQuantity,
  viewCount,
  className
}: {
  soldQuantity?: number;
  viewCount?: number;
  className?: string;
}) {
  if (!soldQuantity && !viewCount) return null;

  const isPopular = (soldQuantity || 0) > 20 || (viewCount || 0) > 100;
  const isTrending = (soldQuantity || 0) > 50 || (viewCount || 0) > 500;

  if (!isPopular) return null;

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs',
      isTrending ? 'text-green-700' : 'text-blue-700',
      className
    )}>
      <TrendingUp className="h-3 w-3" />
      <span>
        {isTrending ? 'Trending' : 'Popular'} - {soldQuantity || 0}+ sold
      </span>
    </div>
  );
}