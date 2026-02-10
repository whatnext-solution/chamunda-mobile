import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImage {
  id?: string;
  product_id?: string;
  image_url: string;
  image_alt?: string;
  display_order: number;
  is_primary: boolean;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProductImages(productId?: string) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch images for a product
  const fetchImages = async (id: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await (supabase as any)
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setImages(data || []);
    } catch (err: any) {
      console.error('Error fetching product images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save images to database
  const saveImages = async (productId: string, imagesToSave: ProductImage[]) => {
    try {
      setLoading(true);
      setError(null);

      // Delete existing images for this product
      await (supabase as any)
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      // Insert new images
      if (imagesToSave.length > 0) {
        const imagesToInsert = imagesToSave.map((img, index) => ({
          product_id: productId,
          image_url: img.image_url,
          image_alt: img.image_alt || `Product image ${index + 1}`,
          display_order: index,
          is_primary: img.is_primary,
          file_name: img.file_name,
          file_size: img.file_size,
          mime_type: img.mime_type
        }));

        const { error } = await (supabase as any)
          .from('product_images')
          .insert(imagesToInsert);

        if (error) throw error;
      }

      // Update the main product table with primary image
      const primaryImage = imagesToSave.find(img => img.is_primary);
      if (primaryImage) {
        await supabase
          .from('products')
          .update({ image_url: primaryImage.image_url })
          .eq('id', productId);
      }

      setImages(imagesToSave);
      toast.success('Product images saved successfully!');
    } catch (err: any) {
      console.error('Error saving product images:', err);
      setError(err.message);
      toast.error(`Failed to save images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a single image
  const deleteImage = async (imageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted successfully');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      setError(err.message);
      toast.error(`Failed to delete image: ${err.message}`);
    }
  };

  // Update image order
  const updateImageOrder = async (productId: string, imageIds: string[]) => {
    try {
      const updates = imageIds.map((id, index) => ({
        id,
        display_order: index
      }));

      for (const update of updates) {
        await (supabase as any)
          .from('product_images')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      // Refresh images
      await fetchImages(productId);
    } catch (err: any) {
      console.error('Error updating image order:', err);
      setError(err.message);
      toast.error(`Failed to update image order: ${err.message}`);
    }
  };

  // Set primary image
  const setPrimaryImage = async (productId: string, imageId: string) => {
    try {
      // Unset all primary images for this product
      await (supabase as any)
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set the selected image as primary
      await (supabase as any)
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      // Update the main product table
      const primaryImage = images.find(img => img.id === imageId);
      if (primaryImage) {
        await supabase
          .from('products')
          .update({ image_url: primaryImage.image_url })
          .eq('id', productId);
      }

      // Refresh images
      await fetchImages(productId);
      toast.success('Primary image updated');
    } catch (err: any) {
      console.error('Error setting primary image:', err);
      setError(err.message);
      toast.error(`Failed to set primary image: ${err.message}`);
    }
  };

  // Get primary image
  const getPrimaryImage = () => {
    return images.find(img => img.is_primary) || images[0] || null;
  };

  // Get all images except primary
  const getSecondaryImages = () => {
    return images.filter(img => !img.is_primary);
  };

  useEffect(() => {
    if (productId) {
      fetchImages(productId);
    }
  }, [productId]);

  return {
    images,
    loading,
    error,
    fetchImages,
    saveImages,
    deleteImage,
    updateImageOrder,
    setPrimaryImage,
    getPrimaryImage,
    getSecondaryImages,
    setImages
  };
}