import { useState, useEffect, Suspense } from 'react';
import { Shimmer } from './Shimmer';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  className?: string;
}

export function LazyWrapper({ 
  children, 
  fallback, 
  delay = 100,
  className 
}: LazyWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isLoaded) {
    return (
      <div className={className}>
        {fallback || <Shimmer className="h-32 w-full rounded" />}
      </div>
    );
  }

  return (
    <Suspense fallback={fallback || <Shimmer className="h-32 w-full rounded" />}>
      <div className={`animate-fade-in ${className || ''}`}>
        {children}
      </div>
    </Suspense>
  );
}

// Specific lazy wrappers for common components
export function LazyProductCard({ children, ...props }: LazyWrapperProps) {
  return (
    <LazyWrapper 
      {...props}
      fallback={
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Shimmer className="aspect-square w-full" />
          <div className="p-4 space-y-3">
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-3 w-3/4 rounded" />
            <div className="flex items-center justify-between">
              <Shimmer className="h-6 w-20 rounded" />
              <Shimmer className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      }
    >
      {children}
    </LazyWrapper>
  );
}

export function LazySection({ children, ...props }: LazyWrapperProps) {
  return (
    <LazyWrapper 
      {...props}
      fallback={
        <section className="py-12">
          <div className="container-modern">
            <div className="text-center mb-8">
              <Shimmer className="h-8 w-48 mx-auto rounded mb-4" />
              <Shimmer className="h-5 w-96 mx-auto rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                  <Shimmer className="aspect-square w-full rounded mb-3" />
                  <Shimmer className="h-4 w-full rounded mb-2" />
                  <Shimmer className="h-3 w-3/4 rounded" />
                </div>
              ))}
            </div>
          </div>
        </section>
      }
    >
      {children}
    </LazyWrapper>
  );
}

// Image lazy loading component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  fallback,
  onLoad,
  onError 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-gray-400 text-center">
          <svg className="h-8 w-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Image not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0">
          {fallback || <Shimmer className="w-full h-full" />}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}