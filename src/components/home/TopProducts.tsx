import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  Eye, 
  Coins,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface TopProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  category_id?: string;
  category_name?: string;
  is_featured: boolean;
  coins_earned_per_purchase: number;
  coins_required_to_buy: number;
  is_coin_purchase_enabled: boolean;
  stock_quantity: number;
  top_product_order: number;
  created_at: string;
}

interface TopProductsSettings {
  enabled: boolean;
  maxCount: number;
  title: string;
  subtitle: string;
  displayStyle: 'grid' | 'slider';
}

export const TopProducts = () => {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [settings, setSettings] = useState<TopProductsSettings>({
    enabled: true,
    maxCount: 8,
    title: 'Top Products',
    subtitle: 'Discover our most popular and highly-rated products',
    displayStyle: 'grid'
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addItem: addToCart } = useCart();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  useEffect(() => {
    fetchTopProducts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'top_products_enabled',
          'top_products_max_count',
          'top_products_section_title',
          'top_products_section_subtitle',
          'top_products_display_style'
        ]);

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>) || {};

      setSettings({
        enabled: settingsMap.top_products_enabled === 'true',
        maxCount: parseInt(settingsMap.top_products_max_count) || 8,
        title: settingsMap.top_products_section_title || 'Top Products',
        subtitle: settingsMap.top_products_section_subtitle || 'Discover our most popular and highly-rated products',
        displayStyle: (settingsMap.top_products_display_style as 'grid' | 'slider') || 'grid'
      });
    } catch (error) {
      console.error('Error fetching top products settings:', error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      
      // First try to use the function
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_top_products', { limit_count: 8 });

      if (!functionError && functionData) {
        setProducts(functionData);
        return;
      }

      // Fallback to direct query if function doesn't exist
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          price,
          offer_price,
          image_url,
          category_id,
          is_featured,
          coins_earned_per_purchase,
          coins_required_to_buy,
          is_coin_purchase_enabled,
          stock_quantity,
          top_product_order,
          created_at,
          categories!inner(name)
        `)
        .eq('is_top_product', true)
        .eq('is_visible', true)
        .gt('stock_quantity', 0)
        .order('top_product_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(product => ({
        ...product,
        category_name: product.categories?.name || 'Uncategorized'
      })) || [];

      setProducts(transformedData);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: TopProduct) => {
    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.offer_price || product.price,
        offer_price: product.offer_price,
        image_url: product.image_url || '',
        stock_quantity: product.stock_quantity,
        slug: product.slug
      });
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlistToggle = async (product: TopProduct) => {
    try {
      if (isInWishlist(product.id)) {
        removeItem(product.id);
      } else {
        addItem({
          id: product.id,
          name: product.name,
          price: product.offer_price || product.price,
          offer_price: product.offer_price,
          image_url: product.image_url || '',
          slug: product.slug,
          stock_quantity: product.stock_quantity
        });
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const calculateDiscount = (price: number, offerPrice?: number) => {
    if (!offerPrice || offerPrice >= price) return 0;
    return Math.round(((price - offerPrice) / price) * 100);
  };

  // Don't render if disabled or no products
  if (!settings.enabled || products.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg p-3 sm:p-4 animate-pulse">
                <div className="h-32 sm:h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{settings.title}</h2>
            <div className="p-2 bg-blue-100 rounded-full">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            {settings.subtitle}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {products.map((product, index) => {
            const discount = calculateDiscount(product.price, product.offer_price);
            const finalPrice = product.offer_price || product.price;
            const inWishlist = isInWishlist(product.id);

            return (
              <Card 
                key={product.id} 
                className="group hover:shadow-lg transition-all duration-300 bg-white rounded-xl border border-gray-100 hover:border-gray-200 overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative overflow-hidden rounded-t-lg">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-32 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-32 sm:h-48 bg-gray-200 flex items-center justify-center">
                        <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Top Product Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        #{index + 1} Top
                      </Badge>
                    </div>

                    {/* Discount Badge */}
                    {discount > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">
                          {discount}% OFF
                        </Badge>
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={() => handleWishlistToggle(product)}
                      className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                    >
                      <Heart 
                        className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                      />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-3 sm:p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      {product.category_name && (
                        <p className="text-xs text-gray-500 mt-1">{product.category_name}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <span className="text-base sm:text-lg font-bold text-gray-900">
                        ₹{finalPrice.toFixed(2)}
                      </span>
                      {product.offer_price && (
                        <span className="text-xs sm:text-sm text-gray-500 line-through">
                          ₹{product.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Loyalty Coins */}
                    {product.coins_earned_per_purchase > 0 && (
                      <div className="flex items-center gap-1 mb-2 sm:mb-3 text-xs text-amber-600">
                        <Coins className="h-3 w-3" />
                        <span>Earn {product.coins_earned_per_purchase} coins</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/products/${product.slug}`)}
                        variant="outline"
                        className="w-full text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        className="w-full text-xs sm:text-sm px-2 sm:px-3"
                        disabled={product.stock_quantity <= 0}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View All Products Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/products')}
            size="lg"
            className="px-8 py-3"
          >
            View All Products
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TopProducts;