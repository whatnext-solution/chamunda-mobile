import { Zap, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CountdownBadge } from './CountdownTimer';

interface FlashSaleBadgeProps {
  isActive?: boolean;
  timeRemaining?: number | null; // seconds
  nextSlotTime?: string | null;
  discount?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function FlashSaleBadge({
  isActive = false,
  timeRemaining,
  nextSlotTime,
  discount,
  className,
  size = 'md',
  animated = true
}: FlashSaleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (isActive && timeRemaining) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 rounded-full font-semibold',
        'bg-gradient-to-r from-red-500 to-orange-500 text-white',
        sizeClasses[size],
        animated && 'animate-pulse shadow-lg',
        className
      )}>
        <Zap className={cn(iconSizes[size], 'text-yellow-200')} />
        <span>Flash Sale</span>
        {discount && <span>-{discount}%</span>}
        <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            {Math.floor(timeRemaining / 3600)}h {Math.floor((timeRemaining % 3600) / 60)}m
          </span>
        </div>
      </div>
    );
  }

  if (nextSlotTime) {
    const nextTime = new Date(nextSlotTime);
    const now = new Date();
    const minutesUntilNext = Math.floor((nextTime.getTime() - now.getTime()) / (1000 * 60));

    return (
      <div className={cn(
        'inline-flex items-center gap-2 rounded-full font-semibold',
        'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
        sizeClasses[size],
        className
      )}>
        <Clock className={iconSizes[size]} />
        <span>Next Flash Sale</span>
        <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
          <span className="text-xs">
            in {minutesUntilNext}m
          </span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    );
  }

  return null;
}

// Simple flash sale indicator
export function FlashSaleIndicator({
  isFlashSale,
  className
}: {
  isFlashSale: boolean;
  className?: string;
}) {
  if (!isFlashSale) return null;

  return (
    <Badge className={cn(
      'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse',
      className
    )}>
      <Zap className="h-3 w-3 mr-1" />
      Flash Sale
    </Badge>
  );
}

// Rotating flash sale banner
export function FlashSaleBanner({
  currentSale,
  nextSale,
  className
}: {
  currentSale?: {
    title: string;
    discount: number;
    timeRemaining: number;
  } | null;
  nextSale?: {
    title: string;
    startTime: string;
  } | null;
  className?: string;
}) {
  if (!currentSale && !nextSale) return null;

  return (
    <div className={cn(
      'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white p-4 rounded-lg',
      'animate-gradient-x bg-[length:200%_200%]',
      className
    )}>
      {currentSale ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-200 animate-bounce" />
              <span className="text-xl font-bold">FLASH SALE LIVE!</span>
            </div>
            <div className="text-lg">
              {currentSale.title} - {currentSale.discount}% OFF
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <Clock className="h-5 w-5" />
            <span className="font-mono font-bold">
              {Math.floor(currentSale.timeRemaining / 3600)}:
              {Math.floor((currentSale.timeRemaining % 3600) / 60).toString().padStart(2, '0')}:
              {(currentSale.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      ) : nextSale ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-200" />
            <span className="text-xl font-bold">NEXT FLASH SALE</span>
            <div className="text-lg">{nextSale.title}</div>
          </div>
          <div className="text-sm opacity-90">
            Starts: {new Date(nextSale.startTime).toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Urgency pulse animation for critical moments
export function UrgencyPulse({
  show,
  children,
  className
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      show && 'animate-pulse ring-2 ring-red-500 ring-opacity-50',
      className
    )}>
      {children}
    </div>
  );
}