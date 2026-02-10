import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { MultipleImageUpload } from '@/components/ui/MultipleImageUpload';
import { UPLOAD_SOURCES } from '@/services/storageTrackingService';
import { TableShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { useProductImages } from '@/hooks/useProductImages';
import { useProductAffiliate } from '@/hooks/useProductAffiliate';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Star, Package, Coins, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface ProductImage {
  id?: string;
  image_url: string;
  image_alt?: string;
  display_order: number;
  is_primary: boolean;
  file_name?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  offer_price?: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  sku?: string;
  unit?: string;
  tax_rate?: number;
  image_url?: string;
  category_id?: string;
  is_visible: boolean;
  is_featured: boolean;
  is_top_product?: boolean;
  top_product_order?: number;
  created_at: string;
  categories?: { name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const { saveImages } = useProductImages();
  const { updateProductAffiliateSettings, getProductAffiliateSettings, calculateCommission } = useProductAffiliate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    offer_price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_point: 0,
    sku: '',
    unit: 'pcs',
    tax_rate: 18,
    category_id: '',
    is_visible: true,
    is_featured: false,
    is_top_product: false,
    top_product_order: 0,
    coins_earned_per_purchase: 0,
    coins_required_to_buy: 0,
    is_coin_purchase_enabled: false,
    // Coupon settings
    is_coupon_eligible: true,
    max_coupon_discount: 0,
    coupon_categories: '',
    allow_coupon_stacking: true,
    // Affiliate settings
    is_affiliate_enabled: false,
    affiliate_commission_type: 'percentage' as 'fixed' | 'percentage',
    affiliate_commission_value: 5
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name)
        `)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Products fetch error:', error);
        // Try without categories relationship if it fails
        const { data: productsOnly, error: productsError } = await supabase
          .from('products')
          .select('*')
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false });
          
        if (productsError) throw productsError;
        setProducts(productsOnly || []);
        return;
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ VALIDATION: Offer price must be less than selling price
    if (formData.offer_price && formData.offer_price > 0) {
      if (formData.offer_price >= formData.price) {
        toast.error('Offer price must be less than selling price');
        return;
      }
    }

    // ✅ VALIDATION: Min stock must be less than max stock
    if (formData.min_stock_level > 0 && formData.max_stock_level > 0) {
      if (formData.min_stock_level >= formData.max_stock_level) {
        toast.error('Minimum stock must be less than maximum stock');
        return;
      }
    }

    // ✅ VALIDATION: Reorder point should not exceed max stock
    if (formData.reorder_point > 0 && formData.max_stock_level > 0) {
      if (formData.reorder_point > formData.max_stock_level) {
        toast.error('Reorder point cannot exceed maximum stock level');
        return;
      }
    }

    setLoading(true);

    try {
      // ✅ CHECK: Warn about duplicate product names
      if (!editingProduct) {
        const { data: existingProduct, error: nameCheckError } = await supabase
          .from('products')
          .select('id, name')
          .ilike('name', formData.name)
          .maybeSingle();
        
        if (!nameCheckError && existingProduct) {
          const confirmDuplicate = confirm(
            `A product with similar name "${existingProduct.name}" already exists. Do you want to continue?`
          );
          if (!confirmDuplicate) {
            setLoading(false);
            return;
          }
        }
      }
      // Generate a unique slug
      const baseSlug = formData.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Replace multiple hyphens with single
        .trim();                      // Remove leading/trailing spaces
      
      let uniqueSlug = baseSlug;
      
      // If editing, keep the same slug unless name changed significantly
      if (editingProduct && editingProduct.name === formData.name) {
        uniqueSlug = editingProduct.slug;
      } else {
        // Check if slug exists and make it unique
        try {
          const { data: existingProduct, error: slugError } = await supabase
            .from('products')
            .select('slug')
            .eq('slug', baseSlug)
            .maybeSingle(); // Use maybeSingle to avoid 406 errors
            
          if (!slugError && existingProduct && (!editingProduct || existingProduct.slug !== editingProduct.slug)) {
            uniqueSlug = `${baseSlug}-${Date.now()}`;
          }
        } catch (error) {
          // If error checking slug, use timestamp to ensure uniqueness
          console.warn('Slug validation error:', error);
          uniqueSlug = `${baseSlug}-${Date.now()}`;
        }
      }

      // Get primary image URL from productImages
      const primaryImage = productImages.find(img => img.is_primary);
      const primaryImageUrl = primaryImage?.image_url || '';

      const productData = {
        name: formData.name,
        slug: uniqueSlug,
        description: formData.description,
        price: formData.price,
        offer_price: formData.offer_price || null,
        cost_price: formData.cost_price || null,
        stock_quantity: formData.stock_quantity,
        min_stock_level: formData.min_stock_level || null,
        max_stock_level: formData.max_stock_level || null,
        reorder_point: formData.reorder_point || null,
        sku: formData.sku || null,
        unit: formData.unit,
        tax_rate: formData.tax_rate,
        image_url: primaryImageUrl, // Set primary image as main image_url
        category_id: formData.category_id || null,
        is_visible: formData.is_visible,
        is_featured: formData.is_featured,
        is_top_product: formData.is_top_product,
        top_product_order: formData.is_top_product ? (formData.top_product_order || 1) : 0,
        coins_earned_per_purchase: formData.coins_earned_per_purchase || 0,
        coins_required_to_buy: formData.coins_required_to_buy || 0,
        is_coin_purchase_enabled: formData.is_coin_purchase_enabled
      };

      console.log('Saving product data:', productData);

      let productId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        productId = editingProduct.id;
        toast.success('Product updated successfully');
      } else {
        // Generate unique SKU to avoid conflicts
        let finalSku = formData.sku;
        if (!finalSku) {
          finalSku = `PS${Date.now()}`;
        } else {
          // Check if SKU exists and make it unique
          try {
            const { data: existingSku } = await supabase
              .from('products')
              .select('sku')
              .eq('sku', finalSku)
              .maybeSingle();
              
            if (existingSku) {
              finalSku = `${formData.sku}-${Date.now()}`;
            }
          } catch (error) {
            console.warn('SKU validation error:', error);
            finalSku = `${formData.sku}-${Date.now()}`;
          }
        }
        
        // Update productData with unique SKU
        const finalProductData = { ...productData, sku: finalSku };
        
        const { data, error } = await supabase
          .from('products')
          .insert([finalProductData])
          .select('id')
          .single();

        if (error) {
          console.error('Insert error:', error);
          // If still getting SKU conflict, try with timestamp
          if (error.code === '23505' && error.message.includes('sku')) {
            const retryData = { ...finalProductData, sku: `${finalSku}-${Date.now()}` };
            const { data: retryResult, error: retryError } = await supabase
              .from('products')
              .insert([retryData])
              .select('id')
              .single();
              
            if (retryError) {
              throw retryError;
            }
            productId = retryResult.id;
          } else {
            throw error;
          }
        } else {
          productId = data.id;
        }
        toast.success('Product created successfully');
      }

      // Save multiple images to database
      if (productImages.length > 0) {
        try {
          await saveImages(productId, productImages);
          console.log('Images saved successfully');
        } catch (imageError) {
          console.error('Error saving images:', imageError);
          
          // ✅ IMPROVED: Offer retry option for image upload
          const retryUpload = confirm(
            'Product saved successfully but some images failed to upload. Would you like to retry image upload?'
          );
          
          if (retryUpload) {
            try {
              await saveImages(productId, productImages);
              toast.success('Images uploaded successfully');
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              toast.error('Image upload failed. Please edit the product and try uploading images again.');
            }
          } else {
            toast.warning('Product saved without images. You can edit the product to add images later.');
          }
        }
      }

      // Create/Update loyalty settings - ALWAYS save loyalty settings for every product
      try {
        const loyaltySettings = {
          product_id: productId,
          coins_earned_per_purchase: formData.coins_earned_per_purchase || 0,
          coins_required_to_buy: formData.coins_required_to_buy || 0,
          is_coin_purchase_enabled: formData.is_coin_purchase_enabled || false,
          is_coin_earning_enabled: (formData.coins_earned_per_purchase || 0) > 0,
          updated_at: new Date().toISOString()
        };

        console.log('Creating loyalty settings:', loyaltySettings);

        // Use upsert to handle both insert and update
        const { error: loyaltyError } = await (supabase as any)
          .from('loyalty_product_settings')
          .upsert(loyaltySettings, { 
            onConflict: 'product_id',
            ignoreDuplicates: false 
          });

        if (loyaltyError) {
          console.error('Loyalty settings upsert error:', loyaltyError);
          
          // ✅ IMPROVED: Better error messages based on error type
          if (loyaltyError.message?.includes('relation') || loyaltyError.message?.includes('does not exist')) {
            toast.warning('Product saved successfully. Loyalty system is not configured yet. Please contact administrator to set up loyalty tables.');
            console.log('Loyalty settings table not found. Please run loyalty system setup SQL.');
          } else {
            toast.error(`Product saved but loyalty settings failed: ${loyaltyError.message}`);
          }
        } else {
          console.log('Loyalty settings saved successfully');
        }
      } catch (loyaltyError: any) {
        console.error('Loyalty settings error:', loyaltyError);
        
        // ✅ IMPROVED: User-friendly error handling
        if (loyaltyError.message?.includes('relation') || loyaltyError.message?.includes('does not exist')) {
          toast.warning('Product saved successfully. Loyalty system is not configured yet.');
        } else {
          toast.error('Product saved but loyalty settings failed to save');
        }
      }

      // Create/Update affiliate settings
      try {
        await updateProductAffiliateSettings(productId, {
          is_affiliate_enabled: formData.is_affiliate_enabled,
          commission_type: formData.affiliate_commission_type,
          commission_value: formData.affiliate_commission_value
        });
        console.log('Affiliate settings updated successfully');
      } catch (affiliateError) {
        console.error('Affiliate settings error:', affiliateError);
        toast.error('Product saved but affiliate settings failed to save');
      }

      // Create/Update coupon settings
      try {
        const couponSettings = {
          product_id: productId,
          is_coupon_eligible: formData.is_coupon_eligible,
          max_coupon_discount: formData.max_coupon_discount || 0,
          coupon_categories: formData.coupon_categories || '',
          allow_coupon_stacking: formData.allow_coupon_stacking,
          updated_at: new Date().toISOString()
        };

        console.log('Creating coupon settings:', couponSettings);

        // Use upsert to handle both insert and update
        const { error: couponError } = await (supabase as any)
          .from('product_coupon_settings')
          .upsert(couponSettings, { 
            onConflict: 'product_id',
            ignoreDuplicates: false 
          });

        if (couponError) {
          console.error('Coupon settings upsert error:', couponError);
          // Don't show error to user if table doesn't exist yet
          if (!couponError.message?.includes('relation') && !couponError.message?.includes('table')) {
            toast.error(`Product saved but coupon settings failed: ${couponError.message}`);
          } else {
            console.log('Coupon settings table not created yet - skipping coupon settings save');
          }
        } else {
          console.log('Coupon settings saved successfully');
        }
      } catch (couponError) {
        console.error('Coupon settings error:', couponError);
        // Don't show error to user if table doesn't exist yet
        console.log('Coupon settings table may not exist yet - skipping coupon settings save');
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      
      // Fetch products with error handling
      try {
        await fetchProducts();
      } catch (fetchError) {
        console.error('Error refreshing products list:', fetchError);
        // Don't show error to user since product was saved successfully
        // Just log it for debugging
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('slug')) {
          toast.error('Product name already exists. Please use a different name.');
        } else if (error.message.includes('sku')) {
          toast.error('SKU already exists. Please use a different SKU.');
        } else {
          toast.error('Duplicate entry. Please check your data.');
        }
      } else {
        toast.error(`Failed to save product: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    
    // Load existing images for this product
    try {
      const { data: existingImages, error } = await (supabase as any)
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      if (!error && existingImages) {
        setProductImages(existingImages);
      } else {
        // If no images in product_images table, use the main image_url
        if (product.image_url) {
          setProductImages([{
            image_url: product.image_url,
            image_alt: product.name,
            display_order: 0,
            is_primary: true,
            file_name: 'existing-image'
          }]);
        } else {
          setProductImages([]);
        }
      }
    } catch (error) {
      console.log('Error loading product images:', error);
      setProductImages([]);
    }
    
    // Load loyalty settings from loyalty_product_settings table
    let loyaltySettings = null;
    try {
      const { data, error } = await (supabase as any)
        .from('loyalty_product_settings')
        .select('*')
        .eq('product_id', product.id)
        .single();
      
      if (!error && data) {
        loyaltySettings = data;
        console.log('Loaded loyalty settings:', loyaltySettings);
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for products without loyalty settings
        console.warn('Error loading loyalty settings:', error);
      }
    } catch (error) {
      console.log('No loyalty settings found for product:', product.id);
    }

    // Load affiliate settings from product_affiliate_settings table
    let affiliateSettings = null;
    try {
      const affiliateData = await getProductAffiliateSettings(product.id);
      if (affiliateData) {
        affiliateSettings = affiliateData;
        console.log('Loaded affiliate settings:', affiliateSettings);
      }
    } catch (error) {
      console.log('No affiliate settings found for product:', product.id);
    }

    // Load coupon settings from product_coupon_settings table
    let couponSettings = null;
    try {
      const { data, error } = await (supabase as any)
        .from('product_coupon_settings')
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle(); // ✅ Use maybeSingle to avoid 406 errors
      
      if (!error && data) {
        couponSettings = data;
        console.log('Loaded coupon settings:', couponSettings);
      } else if (error) {
        // Log error but don't break the flow - table might not exist yet
        console.warn('Error loading coupon settings (table may not exist yet):', error);
      }
    } catch (error) {
      console.log('No coupon settings found for product (table may not exist yet):', product.id);
    }

    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      offer_price: product.offer_price || 0,
      cost_price: product.cost_price || 0,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level || 0,
      max_stock_level: product.max_stock_level || 0,
      reorder_point: product.reorder_point || 0,
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      tax_rate: product.tax_rate || 18,
      category_id: product.category_id || '',
      is_visible: product.is_visible,
      is_featured: product.is_featured,
      is_top_product: product.is_top_product || false,
      top_product_order: product.top_product_order || 0,
      // Use loyalty settings from loyalty_product_settings table if available, otherwise fallback to product table
      coins_earned_per_purchase: loyaltySettings?.coins_earned_per_purchase || (product as any).coins_earned_per_purchase || 0,
      coins_required_to_buy: loyaltySettings?.coins_required_to_buy || (product as any).coins_required_to_buy || 0,
      is_coin_purchase_enabled: loyaltySettings?.is_coin_purchase_enabled || (product as any).is_coin_purchase_enabled || false,
      // Coupon settings
      is_coupon_eligible: couponSettings?.is_coupon_eligible ?? true,
      max_coupon_discount: couponSettings?.max_coupon_discount || 0,
      coupon_categories: couponSettings?.coupon_categories || '',
      allow_coupon_stacking: couponSettings?.allow_coupon_stacking ?? true,
      // Affiliate settings
      is_affiliate_enabled: affiliateSettings?.is_affiliate_enabled || false,
      affiliate_commission_type: affiliateSettings?.commission_type || 'percentage',
      affiliate_commission_value: affiliateSettings?.commission_value || 5
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This will hide it from all listings.')) return;

    try {
      // ✅ SOFT DELETE: Mark as deleted instead of permanently removing
      const { error } = await supabase
        .from('products')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          is_visible: false // Also hide from user side
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      offer_price: 0,
      cost_price: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      reorder_point: 0,
      sku: '',
      unit: 'pcs',
      tax_rate: 18,
      category_id: '',
      is_visible: true,
      is_featured: false,
      is_top_product: false,
      top_product_order: 0,
      coins_earned_per_purchase: 0,
      coins_required_to_buy: 0,
      is_coin_purchase_enabled: false,
      // Coupon settings
      is_coupon_eligible: true,
      max_coupon_discount: 0,
      coupon_categories: '',
      allow_coupon_stacking: true,
      // Affiliate settings
      is_affiliate_enabled: false,
      affiliate_commission_type: 'percentage' as 'fixed' | 'percentage',
      affiliate_commission_value: 5
    });
    setProductImages([]);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || !filterCategory || product.category_id === filterCategory;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && product.is_visible) ||
                           (filterStatus === 'inactive' && !product.is_visible) ||
                           (filterStatus === 'featured' && product.is_featured) ||
                           (filterStatus === 'low_stock' && product.stock_quantity <= (product.reorder_point || 10));
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, filterCategory, filterStatus]);

  const pagination = usePagination({
    totalItems: filteredProducts.length,
    itemsPerPage: 25,
  });

  const paginatedProducts = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, pagination.startIndex, pagination.endIndex]);

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (product.stock_quantity <= (product.reorder_point || 10)) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'default' };
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Product Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProduct(null); }} className="w-full sm:w-auto h-10 md:h-11 touch-manipulation border-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[96vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
            <DialogHeader className="flex-shrink-0 pb-4 sm:pb-4 md:pb-6 border-b mb-4 sm:mb-4">
              <DialogTitle className="text-base sm:text-lg md:text-xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-2 sm:mt-2">
                {editingProduct ? 'Update product information and settings.' : 'Create a new product with details, pricing, and inventory settings.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-2 sm:px-2 md:px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <form onSubmit={handleSubmit} className="product-form space-y-5 sm:space-y-5 md:space-y-7 py-2 sm:py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-6">
                  <div className="space-y-2 sm:space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-medium">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 sm:h-11 md:h-12 text-sm"
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-2">
                    <Label htmlFor="sku" className="text-xs sm:text-sm font-medium">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="h-11 sm:h-11 md:h-12 text-sm"
                    />
                  </div>
                </div>

              <div className="space-y-2 sm:space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="resize-none min-h-[80px] sm:min-h-[80px] text-sm"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 md:gap-6">
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="cost_price" className="text-xs sm:text-sm font-medium">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="price" className="text-xs sm:text-sm font-medium">Selling Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="offer_price" className="text-xs sm:text-sm font-medium">Offer Price</Label>
                  <Input
                    id="offer_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.offer_price}
                    onChange={(e) => setFormData({ ...formData, offer_price: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-4 md:gap-6">
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="stock_quantity" className="text-xs sm:text-sm font-medium">Stock Qty</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="min_stock_level" className="text-xs sm:text-sm font-medium">Min Stock</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="max_stock_level" className="text-xs sm:text-sm font-medium">Max Stock</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    min="0"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="reorder_point" className="text-xs sm:text-sm font-medium">Reorder Pt</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 md:gap-6">
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="unit" className="text-xs sm:text-sm font-medium">Unit</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger className="h-11 sm:h-11 md:h-12 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="ltr">Liter</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="tax_rate" className="text-xs sm:text-sm font-medium">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                    className="h-11 sm:h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2 sm:space-y-2">
                  <Label htmlFor="category_id" className="text-xs sm:text-sm font-medium">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger className="h-11 sm:h-11 md:h-12 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Product Images</Label>
                <div>
                  <MultipleImageUpload
                    productId={editingProduct?.id}
                    images={productImages}
                    onImagesChange={setProductImages}
                    maxImages={10}
                    folder="products"
                    uploadSource={UPLOAD_SOURCES.PRODUCT_GALLERY}
                    metadata={{
                      module: 'product_management',
                      product_id: editingProduct?.id,
                      product_name: editingProduct?.name
                    }}
                    maxSize={5}
                    allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                  />
                </div>
              </div>

              {/* Coupon Eligibility Settings - Collapsible */}
              <details className="group border border-orange-200 sm:border-2 rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between gap-2 p-4 sm:p-4 md:p-5 bg-gradient-to-r from-orange-50 to-orange-100 cursor-pointer hover:from-orange-100 hover:to-orange-200 transition-all">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Gift className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-orange-600 flex-shrink-0" />
                    <Label className="text-sm sm:text-sm md:text-base font-semibold text-orange-900 cursor-pointer">Coupon Eligibility</Label>
                  </div>
                  <span className="text-orange-600 group-open:rotate-180 transition-transform text-base sm:text-lg">▼</span>
                </summary>
                <div className="space-y-4 sm:space-y-4 md:space-y-5 p-4 sm:p-4 md:p-6 bg-white">
                
                <div className="space-y-4 sm:space-y-4">
                  <div className="flex items-center space-x-3 sm:space-x-3 p-3 sm:p-3 bg-orange-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_coupon_eligible"
                      checked={formData.is_coupon_eligible}
                      onChange={(e) => setFormData({ ...formData, is_coupon_eligible: e.target.checked })}
                      className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                    />
                    <Label htmlFor="is_coupon_eligible" className="text-sm sm:text-sm font-medium cursor-pointer">
                      Allow coupons on this product
                    </Label>
                  </div>

                  {formData.is_coupon_eligible && (
                    <div className="space-y-4 sm:space-y-4 pl-4 sm:pl-4 md:pl-6 border-l-2 sm:border-l-4 border-orange-300 ml-2 sm:ml-2">
                      <div className="space-y-2 sm:space-y-2">
                        <Label htmlFor="max_coupon_discount" className="text-xs sm:text-sm font-medium">Max Coupon Discount (%)</Label>
                        <Input
                          id="max_coupon_discount"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formData.max_coupon_discount}
                          onChange={(e) => setFormData({ ...formData, max_coupon_discount: Number(e.target.value) })}
                          placeholder="e.g., 50"
                          className="h-11 sm:h-11 md:h-12 text-sm"
                        />
                        <p className="text-xs sm:text-xs text-muted-foreground mt-1.5 sm:mt-1.5">
                          Max discount % allowed (leave empty for no limit)
                        </p>
                      </div>

                      <div className="space-y-2 sm:space-y-2">
                        <Label htmlFor="coupon_categories" className="text-xs sm:text-sm font-medium">Coupon Categories</Label>
                        <Input
                          id="coupon_categories"
                          value={formData.coupon_categories}
                          onChange={(e) => setFormData({ ...formData, coupon_categories: e.target.value })}
                          placeholder="e.g., electronics, gadgets"
                          className="h-11 sm:h-11 md:h-12 text-sm"
                        />
                        <p className="text-xs sm:text-xs text-muted-foreground mt-1.5 sm:mt-1.5">
                          Comma-separated categories
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 sm:space-x-3 p-3 sm:p-3 bg-orange-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="allow_coupon_stacking"
                          checked={formData.allow_coupon_stacking}
                          onChange={(e) => setFormData({ ...formData, allow_coupon_stacking: e.target.checked })}
                          className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                        />
                        <Label htmlFor="allow_coupon_stacking" className="text-sm sm:text-sm font-medium cursor-pointer">
                          Allow stacking with loyalty coins
                        </Label>
                      </div>

                      <div className="text-xs sm:text-xs text-orange-800 bg-orange-100 p-3 sm:p-3 rounded-lg border border-orange-200">
                        <strong>Note:</strong> Controls how coupons apply to this product.
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </details>

              {/* Loyalty Coins Configuration - Collapsible */}
              <details className="group border border-yellow-200 sm:border-2 rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between gap-2 p-4 sm:p-4 md:p-5 bg-gradient-to-r from-yellow-50 to-yellow-100 cursor-pointer hover:from-yellow-100 hover:to-yellow-200 transition-all">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Coins className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600 flex-shrink-0" />
                    <Label className="text-sm sm:text-sm md:text-base font-semibold text-yellow-900 cursor-pointer">Loyalty Coins</Label>
                  </div>
                  <span className="text-yellow-600 group-open:rotate-180 transition-transform text-base sm:text-lg">▼</span>
                </summary>
                <div className="space-y-4 sm:space-y-4 md:space-y-5 p-4 sm:p-4 md:p-6 bg-white">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-6">
                  <div className="space-y-2 sm:space-y-2">
                    <Label htmlFor="coins_earned_per_purchase" className="text-xs sm:text-sm font-medium">Coins Earned</Label>
                    <Input
                      id="coins_earned_per_purchase"
                      type="number"
                      min="0"
                      value={formData.coins_earned_per_purchase}
                      onChange={(e) => setFormData({ ...formData, coins_earned_per_purchase: Number(e.target.value) })}
                      placeholder="e.g., 10"
                      className="h-11 sm:h-11 md:h-12 text-sm"
                    />
                    <p className="text-xs sm:text-xs text-muted-foreground mt-1.5 sm:mt-1.5">
                      Coins earned per purchase
                    </p>
                  </div>
                  <div className="space-y-2 sm:space-y-2">
                    <Label htmlFor="coins_required_to_buy" className="text-xs sm:text-sm font-medium">Coins to Redeem</Label>
                    <Input
                      id="coins_required_to_buy"
                      type="number"
                      min="0"
                      value={formData.coins_required_to_buy}
                      onChange={(e) => setFormData({ ...formData, coins_required_to_buy: Number(e.target.value) })}
                      placeholder="e.g., 100"
                      className="h-11 sm:h-11 md:h-12 text-sm"
                    />
                    <p className="text-xs sm:text-xs text-muted-foreground mt-1.5 sm:mt-1.5">
                      Coins needed for free redemption
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 sm:space-x-3 p-3 sm:p-3 bg-yellow-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_coin_purchase_enabled"
                    checked={formData.is_coin_purchase_enabled}
                    onChange={(e) => setFormData({ ...formData, is_coin_purchase_enabled: e.target.checked })}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                  />
                  <Label htmlFor="is_coin_purchase_enabled" className="text-sm sm:text-sm font-medium cursor-pointer">
                    Enable Coin Redemption
                  </Label>
                </div>
                
                {formData.coins_required_to_buy > 0 && (
                  <div className="text-xs sm:text-xs text-yellow-800 bg-yellow-100 p-3 sm:p-3 rounded-lg border border-yellow-200">
                    <strong>Preview:</strong> {formData.coins_required_to_buy} coins = Free product (≈ ₹{(formData.coins_required_to_buy * 0.1).toFixed(2)})
                  </div>
                )}
                </div>
              </details>

              {/* Affiliate Marketing Settings - Collapsible */}
              <details className="group border border-blue-200 sm:border-2 rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between gap-2 p-4 sm:p-4 md:p-5 bg-gradient-to-r from-blue-50 to-blue-100 cursor-pointer hover:from-blue-100 hover:to-blue-200 transition-all">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-sm md:text-base font-semibold text-blue-900 cursor-pointer">Affiliate Marketing</h3>
                  </div>
                  <span className="text-blue-600 group-open:rotate-180 transition-transform text-base sm:text-lg">▼</span>
                </summary>
                <div className="space-y-4 sm:space-y-4 md:space-y-5 p-4 sm:p-4 md:p-6 bg-white">
                
                <div className="flex items-center space-x-3 sm:space-x-3 p-3 sm:p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_affiliate_enabled"
                    checked={formData.is_affiliate_enabled}
                    onChange={(e) => setFormData({ ...formData, is_affiliate_enabled: e.target.checked })}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                  />
                  <Label htmlFor="is_affiliate_enabled" className="text-sm sm:text-sm font-medium cursor-pointer">
                    Enable Affiliate Marketing
                  </Label>
                </div>

                {formData.is_affiliate_enabled && (
                  <div className="space-y-4 sm:space-y-4 md:space-y-5 pl-4 sm:pl-4 md:pl-6 border-l-2 sm:border-l-4 border-blue-300 ml-2 sm:ml-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-6">
                      <div className="space-y-2 sm:space-y-2">
                        <Label htmlFor="affiliate_commission_type" className="text-xs sm:text-sm font-medium">Commission Type</Label>
                        <Select 
                          value={formData.affiliate_commission_type} 
                          onValueChange={(value: 'fixed' | 'percentage') => setFormData({ ...formData, affiliate_commission_type: value })}
                        >
                          <SelectTrigger className="h-11 sm:h-11 md:h-12 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:space-y-2">
                        <Label htmlFor="affiliate_commission_value" className="text-xs sm:text-sm font-medium">
                          Commission {formData.affiliate_commission_type === 'percentage' ? '(%)' : '(₹)'}
                        </Label>
                        <Input
                          id="affiliate_commission_value"
                          type="number"
                          min="0"
                          step={formData.affiliate_commission_type === 'percentage' ? '0.1' : '1'}
                          max={formData.affiliate_commission_type === 'percentage' ? '100' : undefined}
                          value={formData.affiliate_commission_value}
                          onChange={(e) => setFormData({ ...formData, affiliate_commission_value: Number(e.target.value) })}
                          placeholder={formData.affiliate_commission_type === 'percentage' ? 'e.g., 5' : 'e.g., 50'}
                          className="h-11 sm:h-11 md:h-12 text-sm"
                        />
                      </div>
                    </div>
                    
                    {formData.affiliate_commission_value > 0 && (
                      <div className="text-xs sm:text-xs text-blue-800 bg-blue-100 p-3 sm:p-3 rounded-lg border border-blue-200">
                        <strong>Preview:</strong> Affiliates earn{' '}
                        {formData.affiliate_commission_type === 'percentage' 
                          ? `${formData.affiliate_commission_value}% (₹${(((formData.offer_price || formData.price) * formData.affiliate_commission_value) / 100).toFixed(2)}/sale)`
                          : `₹${formData.affiliate_commission_value}/sale`
                        }
                      </div>
                    )}
                  </div>
                )}
                </div>
              </details>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-4 md:gap-6 p-4 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200 sm:border-2">
                <div className="flex items-center space-x-3 sm:space-x-3">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                  />
                  <Label htmlFor="is_visible" className="text-sm sm:text-sm font-medium cursor-pointer">Visible</Label>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-3">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                  />
                  <Label htmlFor="is_featured" className="text-sm sm:text-sm font-medium cursor-pointer">Featured</Label>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-3">
                  <input
                    type="checkbox"
                    id="is_top_product"
                    checked={formData.is_top_product}
                    onChange={(e) => setFormData({ ...formData, is_top_product: e.target.checked })}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded"
                  />
                  <Label htmlFor="is_top_product" className="text-sm sm:text-sm text-orange-600 font-semibold cursor-pointer">Top Product</Label>
                </div>
              </div>

              {/* Top Product Order - Show only when Top Product is enabled */}
              {formData.is_top_product && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-6 p-4 sm:p-4 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-200 sm:border-2">
                  <div className="space-y-2 sm:space-y-2">
                    <Label htmlFor="top_product_order" className="text-xs sm:text-sm font-medium">Display Order</Label>
                    <Input
                      id="top_product_order"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.top_product_order}
                      onChange={(e) => setFormData({ ...formData, top_product_order: parseInt(e.target.value) || 0 })}
                      placeholder="1"
                      className="h-11 sm:h-11 md:h-12 text-sm"
                    />
                    <p className="text-xs sm:text-xs text-gray-600 mt-1.5 sm:mt-1.5">Lower numbers appear first</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="bg-white border border-orange-300 sm:border-2 rounded-lg sm:rounded-xl p-4 sm:p-4 w-full shadow-sm">
                      <div className="flex items-center gap-2 text-orange-700">
                        <Star className="h-5 w-5 sm:h-5 sm:w-5 flex-shrink-0 fill-orange-500" />
                        <span className="text-sm sm:text-sm font-semibold">Top Product</span>
                      </div>
                      <p className="text-xs sm:text-xs text-orange-600 mt-2 sm:mt-2">Will appear on home page</p>
                    </div>
                  </div>
                </div>
              )}
              </form>
            </div>
            
            {/* Fixed Footer with Action Buttons */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 pt-4 sm:pt-4 md:pt-6 border-t sm:border-t-2 bg-gray-50 px-3 pb-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-11 md:h-12 touch-manipulation font-medium text-sm">
                Cancel
              </Button>
              <Button 
                disabled={loading}
                onClick={() => {
                  const form = document.querySelector('.product-form');
                  if (form) {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                  }
                }}
                className="w-full sm:w-auto h-11 sm:h-11 md:h-12 touch-manipulation font-semibold shadow-md text-sm"
              >
                {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                </div>
              ))}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div>
                <Label className="text-sm">Search Products</Label>
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 md:h-11 mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterStatus('all');
                }} className="w-full h-10 md:h-11 touch-manipulation">
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table/Cards */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Package className="h-4 w-4 md:h-5 md:w-5" />
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-shimmer"></div>
              </div>
              <TableShimmer rows={10} columns={7} />
            </div>
          ) : (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden lg:block w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm font-medium">Product</th>
                      <th className="text-left p-2 text-sm font-medium">SKU</th>
                      <th className="text-left p-2 text-sm font-medium">Category</th>
                      <th className="text-left p-2 text-sm font-medium">Price</th>
                      <th className="text-left p-2 text-sm font-medium">Stock</th>
                      <th className="text-left p-2 text-sm font-medium">Status</th>
                      <th className="text-left p-2 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <div className="flex gap-1 mt-1">
                              {product.is_featured && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                              {product.is_top_product && (
                                <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                                  <Star className="h-3 w-3 mr-1" />
                                  Top Product
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-sm">{product.sku || '-'}</td>
                      <td className="p-2 text-sm">{product.categories?.name || '-'}</td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-sm">₹{product.price}</p>
                          {product.offer_price && product.offer_price > 0 && (
                            <p className="text-xs text-green-600">Offer: ₹{product.offer_price}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-sm">{product.stock_quantity} {product.unit}</p>
                          <Badge variant={stockStatus.color as any} className="text-xs mt-1">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={product.is_visible ? 'default' : 'secondary'} className="text-xs">
                          {product.is_visible ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(product.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No products found matching your criteria.
              </div>
            )}
          </div>

          {/* Mobile Card View - Visible only on mobile/tablet */}
          <div className="lg:hidden space-y-3">
            {paginatedProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.is_featured && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {product.is_top_product && (
                            <Badge variant="default" className="text-xs bg-orange-500">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                          <Badge variant={product.is_visible ? 'default' : 'secondary'} className="text-xs">
                            {product.is_visible ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <p className="font-semibold">₹{product.price}</p>
                            {product.offer_price && product.offer_price > 0 && (
                              <p className="text-xs text-green-600">Offer: ₹{product.offer_price}</p>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stock:</span>
                            <p className="font-semibold">{product.stock_quantity} {product.unit}</p>
                            <Badge variant={stockStatus.color as any} className="text-xs mt-0.5">
                              {stockStatus.label}
                            </Badge>
                          </div>
                          {product.sku && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">SKU:</span>
                              <p className="font-medium">{product.sku}</p>
                            </div>
                          )}
                          {product.categories?.name && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Category:</span>
                              <p className="font-medium">{product.categories.name}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            className="flex-1 h-9 touch-manipulation"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(product.id)}
                            className="flex-1 h-9 touch-manipulation"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No products found matching your criteria.
              </div>
            )}
          </div>
          
            {filteredProducts.length > 0 && (
              <div className="mt-4">
                <DataPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={filteredProducts.length}
                  itemsPerPage={pagination.itemsPerPage}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  hasNextPage={pagination.hasNextPage}
                  hasPreviousPage={pagination.hasPreviousPage}
                  onPageChange={pagination.goToPage}
                  onItemsPerPageChange={pagination.setItemsPerPage}
                  onFirstPage={pagination.goToFirstPage}
                  onLastPage={pagination.goToLastPage}
                  onNextPage={pagination.goToNextPage}
                  onPreviousPage={pagination.goToPreviousPage}
                  getPageNumbers={pagination.getPageNumbers}
                  itemsPerPageOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}