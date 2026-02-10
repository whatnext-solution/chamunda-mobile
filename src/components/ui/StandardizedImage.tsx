import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface StandardizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'instagram' | 'wide' | 'tall';
  objectFit?: 'cover' | 'contain' | 'fill';
  objectPosition?: string;
  fallbackIcon?: React.ReactNode;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  instagram: 'aspect-square', // Instagram posts are 1:1
  wide: 'aspect-video', // 16:9
  tall: 'aspect-[3/4]' // 3:4 ratio
};

export function StandardizedImage({
  src,
  alt,
  className = '',
  aspectRatio = 'instagram',
  objectFit = 'cover',
  objectPosition = 'center',
  fallbackIcon,
  onClick,
  loading = 'lazy',
  placeholder
}: StandardizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const aspectClass = aspectRatioClasses[aspectRatio];

  // Show fallback if no src, error occurred, or placeholder is needed
  if (!src || imageError) {
    return (
      <div 
        className={cn(
          'bg-gray-100 flex items-center justify-center overflow-hidden',
          aspectClass,
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        <div className="text-center text-gray-400">
          {fallbackIcon || <ImageIcon className="h-8 w-8 mx-auto mb-1" />}
          <p className="text-xs">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectClass,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Loading placeholder */}
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          imageLoading ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          objectFit,
          objectPosition
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Optional placeholder overlay */}
      {placeholder && imageLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-sm text-gray-500">{placeholder}</span>
        </div>
      )}
    </div>
  );
}

// Specialized components for common use cases
export function ProductImage({ src, alt, className, onClick }: {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <StandardizedImage
      src={src}
      alt={alt}
      className={className}
      aspectRatio="instagram"
      objectFit="cover"
      objectPosition="center"
      onClick={onClick}
      fallbackIcon={<ImageIcon className="h-12 w-12 mx-auto mb-2" />}
    />
  );
}

export function OfferImage({ src, alt, className, onClick }: {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <StandardizedImage
      src={src}
      alt={alt}
      className={className}
      aspectRatio="wide"
      objectFit="cover"
      objectPosition="center"
      onClick={onClick}
    />
  );
}

export function ServiceImage({ src, alt, className, onClick }: {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <StandardizedImage
      src={src}
      alt={alt}
      className={className}
      aspectRatio="square"
      objectFit="cover"
      objectPosition="center"
      onClick={onClick}
    />
  );
}