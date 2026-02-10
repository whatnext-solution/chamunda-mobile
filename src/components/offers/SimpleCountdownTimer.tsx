import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleCountdownTimerProps {
  endDate: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SimpleCountdownTimer({
  endDate,
  className,
  size = 'md'
}: SimpleCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true
  });

  useEffect(() => {
    if (!endDate) {
      setTimeRemaining(prev => ({ ...prev, isExpired: true }));
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!endDate || timeRemaining.isExpired) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-2",
    lg: "text-base gap-2"
  };

  const isUrgent = (timeRemaining.days === 0 && timeRemaining.hours < 24);
  const isCritical = (timeRemaining.days === 0 && timeRemaining.hours < 2);

  const urgencyClasses = isCritical 
    ? "text-red-600 animate-pulse" 
    : isUrgent 
    ? "text-orange-600" 
    : "text-white";

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className={cn(
      "flex items-center font-mono font-semibold",
      sizeClasses[size],
      urgencyClasses,
      className
    )}>
      <Clock className="h-4 w-4 mr-2" />
      
      <div className="flex items-center gap-1">
        {timeRemaining.days > 0 && (
          <>
            <span className="bg-white/20 backdrop-blur-sm border border-white/30 rounded px-2 py-1 min-w-[2ch] text-center">
              {formatTime(timeRemaining.days)}
            </span>
            <span className="text-white/80">d</span>
          </>
        )}
        
        <span className="bg-white/20 backdrop-blur-sm border border-white/30 rounded px-2 py-1 min-w-[2ch] text-center">
          {formatTime(timeRemaining.hours)}
        </span>
        <span className="text-white/80">h</span>
        
        <span className="bg-white/20 backdrop-blur-sm border border-white/30 rounded px-2 py-1 min-w-[2ch] text-center">
          {formatTime(timeRemaining.minutes)}
        </span>
        <span className="text-white/80">m</span>
        
        <span className="bg-white/20 backdrop-blur-sm border border-white/30 rounded px-2 py-1 min-w-[2ch] text-center">
          {formatTime(timeRemaining.seconds)}
        </span>
        <span className="text-white/80">s</span>
      </div>
      
      {isCritical && (
        <span className="text-xs text-red-200 font-normal ml-2 animate-bounce">
          जल्दी करें!
        </span>
      )}
    </div>
  );
}