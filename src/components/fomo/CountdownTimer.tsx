import { useCountdownTimer } from '@/hooks/useFOMOOffers';
import { Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  urgencyThreshold?: number; // seconds
  onExpiry?: () => void;
  showMilliseconds?: boolean;
}

export function CountdownTimer({
  endTime,
  className,
  size = 'md',
  showIcon = true,
  urgencyThreshold = 3600, // 1 hour default
  onExpiry,
  showMilliseconds = false
}: CountdownTimerProps) {
  const timeRemaining = useCountdownTimer(endTime);

  // Call onExpiry when timer expires
  if (timeRemaining.isExpired && onExpiry) {
    onExpiry();
  }

  if (!endTime || timeRemaining.isExpired) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-muted-foreground",
        size === 'sm' && "text-xs",
        size === 'md' && "text-sm",
        size === 'lg' && "text-base",
        className
      )}>
        {showIcon && <Clock className="h-4 w-4" />}
        <span>Offer Expired</span>
      </div>
    );
  }

  const isUrgent = timeRemaining.totalSeconds <= urgencyThreshold;
  const isCritical = timeRemaining.totalSeconds <= 900; // 15 minutes

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-2",
    lg: "text-base gap-2"
  };

  const urgencyClasses = isCritical 
    ? "text-red-600 animate-pulse" 
    : isUrgent 
    ? "text-orange-600" 
    : "text-foreground";

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className={cn(
      "flex items-center font-mono font-semibold",
      sizeClasses[size],
      urgencyClasses,
      className
    )}>
      {showIcon && (
        <div className="flex-shrink-0">
          {isCritical ? (
            <Zap className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1">
        {timeRemaining.days > 0 && (
          <>
            <span className="bg-background border rounded px-1 py-0.5 min-w-[2ch] text-center">
              {formatTime(timeRemaining.days)}
            </span>
            <span className="text-muted-foreground">d</span>
          </>
        )}
        
        {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
          <>
            <span className="bg-background border rounded px-1 py-0.5 min-w-[2ch] text-center">
              {formatTime(timeRemaining.hours)}
            </span>
            <span className="text-muted-foreground">h</span>
          </>
        )}
        
        <span className="bg-background border rounded px-1 py-0.5 min-w-[2ch] text-center">
          {formatTime(timeRemaining.minutes)}
        </span>
        <span className="text-muted-foreground">m</span>
        
        <span className="bg-background border rounded px-1 py-0.5 min-w-[2ch] text-center">
          {formatTime(timeRemaining.seconds)}
        </span>
        <span className="text-muted-foreground">s</span>
      </div>
      
      {isCritical && (
        <span className="text-xs text-red-600 font-normal ml-1">
          Hurry!
        </span>
      )}
    </div>
  );
}

// Compact version for badges
export function CountdownBadge({
  endTime,
  className
}: {
  endTime: string | null;
  className?: string;
}) {
  const timeRemaining = useCountdownTimer(endTime);

  if (!endTime || timeRemaining.isExpired) {
    return null;
  }

  const isUrgent = timeRemaining.totalSeconds <= 3600; // 1 hour
  const isCritical = timeRemaining.totalSeconds <= 900; // 15 minutes

  const formatCompactTime = () => {
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    }
    if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
    return `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
      isCritical 
        ? "bg-red-100 text-red-800 animate-pulse" 
        : isUrgent 
        ? "bg-orange-100 text-orange-800" 
        : "bg-blue-100 text-blue-800",
      className
    )}>
      <Clock className="h-3 w-3" />
      <span>{formatCompactTime()}</span>
      {isCritical && <span className="text-red-600">⚡</span>}
    </div>
  );
}