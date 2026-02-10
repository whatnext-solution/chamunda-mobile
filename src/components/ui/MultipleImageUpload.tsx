import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Camera, 
  Loader2, 
  Star,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { storageTrackingService, UPLOAD_SOURCES, type StorageTrackingData } from '@/services/storageTrackingService';

interface ProductImage {
  id?: string;
  image_url: string;
  image_alt?: string;
  display_order: number;
  is_primary: boolean;
  file_name?: string;
}

interface MultipleImageUploadProps {
  productId?: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  folder?: string;
  className?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  uploadSource?: string; // New prop for tracking
  metadata?: Record<string, any>; // Additional metadata for tracking
}

export function MultipleImageUpload({ 
  productId,
  images,
  onImagesChange,
  maxImages = 10,
  folder = 'products',
  className = '',
  maxSize = 5,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  uploadSource = UPLOAD_SOURCES.PRODUCT_GALLERY, // Default to product gallery
  metadata = {}
}: MultipleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileName = (originalName: string): string => {
    return storageTrackingService.generateFileName(originalName, uploadSource);
  };

  const validateFile = (file: File): boolean => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Only ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} files are allowed`);
      return false;
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    try {
      const fileName = generateFileName(file.name);
      const bucketName = storageTrackingService.getBucketName(uploadSource);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Track the upload for storage management
      const trackingData: StorageTrackingData = {
        file_name: fileName,
        bucket_name: bucketName,
        file_size_bytes: file.size,
        file_type: file.type,
        upload_source: uploadSource,
        metadata: {
          ...metadata,
          original_name: file.name,
          folder: folder,
          public_url: publicUrl,
          product_id: productId
        }
      };

      await storageTrackingService.trackUpload(trackingData);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const newImages: ProductImage[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      if (!validateFile(file)) continue;

      try {
        setUploadProgress((i / totalFiles) * 90);
        
        const imageUrl = await uploadToSupabase(file);
        if (imageUrl) {
          newImages.push({
            image_url: imageUrl,
            image_alt: file.name.split('.')[0],
            display_order: images.length + newImages.length,
            is_primary: images.length === 0 && newImages.length === 0, // First image is primary
            file_name: file.name
          });
        }
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
      }
    }

    setUploadProgress(100);
    
    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded successfully! 🎉`);
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    handleFileUpload(files);
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Try to delete from storage
    if (imageToRemove.image_url) {
      try {
        const url = new URL(imageToRemove.image_url);
        const filePath = url.pathname.split('/').slice(-2).join('/');
        
        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }

    // Remove from database if it has an ID
    if (imageToRemove.id && productId) {
      try {
        await (supabase as any)
          .from('product_images')
          .delete()
          .eq('id', imageToRemove.id);
      } catch (error) {
        console.error('Database delete error:', error);
      }
    }

    const updatedImages = images.filter((_, i) => i !== index);
    
    // If we removed the primary image, make the first remaining image primary
    if (imageToRemove.is_primary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true;
    }

    onImagesChange(updatedImages);
    toast.success('Image removed successfully');
  };

  const handleSetPrimary = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    onImagesChange(updatedImages);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const updatedImages = [...images];
    [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
    
    // Update display orders
    updatedImages.forEach((img, i) => {
      img.display_order = i;
    });

    onImagesChange(updatedImages);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="relative overflow-hidden group">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.image_alt || `Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Primary
                      </div>
                    </div>
                  )}

                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-1">
                      {!image.is_primary && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSetPrimary(index)}
                          title="Set as primary"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMoveImage(index, 'up')}
                          title="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {index < images.length - 1 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMoveImage(index, 'down')}
                          title="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <Card 
          className={cn(
            'border-2 border-dashed transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
            uploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8 text-center">
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploading images...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Click to upload or drag & drop images here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} (Max {maxSize}MB each)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {images.length}/{maxImages} images uploaded
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Add More Images ({images.length}/{maxImages})
            </>
          )}
        </Button>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            Uploading to Supabase... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Maximum {maxImages} images per product</p>
        <p>• Maximum file size: {maxSize}MB per image</p>
        <p>• Supported formats: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
        <p>• First image or starred image will be the primary display image</p>
        <p>• Use drag & drop for multiple files at once</p>
      </div>
    </div>
  );
}