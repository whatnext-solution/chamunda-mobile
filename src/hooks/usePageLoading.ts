import { useState, useEffect } from 'react';

interface UsePageLoadingOptions {
  initialDelay?: number;
  minLoadingTime?: number;
}

export function usePageLoading({ 
  initialDelay = 100, 
  minLoadingTime = 500 
}: UsePageLoadingOptions = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    
    // Initial delay to show shimmer
    const initialTimer = setTimeout(() => {
      setIsInitialLoad(false);
    }, initialDelay);

    // Minimum loading time to prevent flash
    const minTimer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(minTimer);
    };
  }, [initialDelay, minLoadingTime]);

  const setLoadingComplete = () => {
    setIsLoading(false);
    setIsInitialLoad(false);
  };

  return {
    isLoading,
    isInitialLoad,
    setLoadingComplete
  };
}

// Hook for managing component-level loading states
export function useComponentLoading(dependencies: any[] = []) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, dependencies);

  return isLoading;
}

// Hook for staggered loading animations
export function useStaggeredLoading(itemCount: number, delay: number = 100) {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    if (visibleItems < itemCount) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [visibleItems, itemCount, delay]);

  return visibleItems;
}