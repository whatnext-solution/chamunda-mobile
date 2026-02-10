import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StandardizedImage } from '@/components/ui/StandardizedImage';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  X,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProductImage {
  id: string;
  image_url: string;
  image_alt?: string;
  display_order: number;
  is_primary: boolean;
}

interface ProductImageGalleryProps {
  productId: string;
  productName: string;
  fallbackImage?: string;
  className?: string;
  showThumbnails?: boolean;
  maxHeight?: string;
}

export function ProductImageGallery({
  productId,
  productName,
  fallbackImage,
  className = '',
  showThumbnails = true,
  maxHeight = 'h-96 md:h-[500px] lg:h-[600px]'
}: ProductImageGalleryProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setImages(data);
        // Set current image to primary image or first image
        const primaryIndex = data.findIndex((img: ProductImage) => img.is_primary);
        setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
      } else if (fallbackImage) {
        // Use fallback image if no images found
        setImages([{
          id: 'fallback',
          image_url: fallbackImage,
          image_alt: productName,
          display_order: 0,
          is_primary: true
        }]);
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error('Error fetching product images:', error);
      if (fallbackImage) {
        setImages([{
          id: 'fallback',
          image_url: fallbackImage,
          image_alt: productName,
          display_order: 0,
          is_primary: true
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-0">
          <StandardizedImage
            alt="Loading..."
            className={maxHeight}
            placeholder="Loading image..."
          />
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-0">
          <StandardizedImage
            alt="No image available"
            className={maxHeight}
            fallbackIcon={
              <div className="text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No images available</p>
              </div>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const currentImage = images[currentImageIndex];

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Main Image */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <div className={cn('relative group', maxHeight)}>
              <StandardizedImage
                src={currentImage.image_url}
                alt={currentImage.image_alt || `${productName} - Image ${currentImageIndex + 1}`}
                className="w-full h-full"
                aspectRatio="instagram"
                objectFit="cover"
                objectPosition="center"
                onClick={() => openLightbox(currentImageIndex)}
              />
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Zoom Icon */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => openLightbox(currentImageIndex)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thumbnails */}
        {showThumbnails && images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                  index === currentImageIndex 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setCurrentImageIndex(index)}
              >
                <StandardizedImage
                  src={image.image_url}
                  alt={image.image_alt || `Thumbnail ${index + 1}`}
                  className="w-full h-full"
                  aspectRatio="square"
                  objectFit="cover"
                  objectPosition="center"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close Button */}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={closeLightbox}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={prevLightboxImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={nextLightboxImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Lightbox Image */}
            <img
              src={images[lightboxIndex].image_url}
              alt={images[lightboxIndex].image_alt || `${productName} - Image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                {lightboxIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnail Strip in Lightbox */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-md overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all',
                    index === lightboxIndex 
                      ? 'border-white' 
                      : 'border-gray-400 hover:border-gray-200'
                  )}
                  onClick={() => setLightboxIndex(index)}
                >
                  <StandardizedImage
                    src={image.image_url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full"
                    aspectRatio="square"
                    objectFit="cover"
                    objectPosition="center"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}