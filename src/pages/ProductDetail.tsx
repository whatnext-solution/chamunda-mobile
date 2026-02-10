import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProduct, useProducts } from '@/hooks/useProducts';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ProductCard } from '@/components/products/ProductCard';
import { RelatedProductCard } from '@/components/products/RelatedProductCard';
import { DualCoinsDisplay } from '@/components/loyalty/DualCoinsDisplay';
import { ProductImageGallery } from '@/components/ui/ProductImageGallery';
import { LazyWrapper } from '@/components/ui/LazyWrapper';
import { ProductDetailPageShimmer } from '@/components/ui/EnhancedShimmer';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  ShoppingCart, 
  Tag, 
  Package, 
  Truck, 
  Shield, 
  Star,
  Check,
  X,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useAffiliate } from '@/hooks/useAffiliate';

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem: addToWishlist, isInWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { data: product, isLoading, error } = useProduct(slug!);
  const { data: relatedProducts } = useProducts({ 
    categoryId: product?.category_id || undefined, 
    limit: 4 
  });
  const { data: settings } = useStoreSettings();
  const { trackAffiliateClick } = useAffiliate();
  
  const [quantity, setQuantity] = useState(1);

  // Track affiliate click if ref parameter is present
  useEffect(() => {
    if (product?.id) {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateRef = urlParams.get('ref');
      
      if (affiliateRef) {
        console.log('Tracking affiliate click:', affiliateRef, product.id);
        trackAffiliateClick(affiliateRef, product.id);
        
        // Clean URL by removing ref parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ref');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [product?.id, trackAffiliateClick]);

  if (isLoading) {
    return (
      <MainLayout>
        <ProductDetailPageShimmer />
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="container-fluid py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasDiscount = product.offer_price && product.offer_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.offer_price!) / product.price) * 100)
    : 0;
  
  const currentPrice = product.offer_price || product.price;
  const productUrl = window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || product.name,
          url: productUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
        // Fallback to clipboard if share fails
        copyToClipboard(productUrl);
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(productUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('Product link copied to clipboard!');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success('Product link copied to clipboard!');
          } else {
            toast.error('Failed to copy link. Please copy manually.');
          }
        } catch (err) {
          console.error('Fallback copy failed:', err);
          toast.error('Copy not supported. Please copy the URL manually.');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  const handleAddToWishlist = () => {
    if (!user) {
      toast.error('Please login to add items to wishlist', {
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }

    if (!product) return;

    addToWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      offer_price: product.offer_price,
      image_url: product.image_url,
      slug: product.slug,
      stock_quantity: product.stock_quantity
    });
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to add items to cart', {
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }

    if (!product) return;

    // ✅ Actually add to cart with selected quantity
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      offer_price: product.offer_price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      slug: product.slug,
      quantity: quantity
    });
    
    toast.success(`Added ${quantity} item(s) to cart!`);
  };

  return (
    <MainLayout>
      <div className="container-fluid py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
        {/* Breadcrumb - Mobile Optimized */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-foreground flex-shrink-0">Home</Link>
          <span className="flex-shrink-0">/</span>
          <Link to="/products" className="hover:text-foreground flex-shrink-0">Products</Link>
          {product.categories && (
            <>
              <span className="flex-shrink-0">/</span>
              <span className="hover:text-foreground flex-shrink-0">{product.categories.name}</span>
            </>
          )}
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 mb-12 lg:mb-16">
          {/* Product Images Gallery - Mobile First */}
          <div className="order-1 lg:order-1">
            <div className="space-y-4">
              <ProductImageGallery
                productId={product.id}
                productName={product.name}
                fallbackImage={product.image_url}
                showThumbnails={true}
                maxHeight="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]"
                className="w-full"
              />
              
              {/* Wishlist Button Overlay */}
              <div className="relative -mt-16 z-10 flex justify-end pr-4">
                <button
                  onClick={handleAddToWishlist}
                  className="w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                >
                  <Heart className={`w-5 h-5 transition-colors ${
                    product && isInWishlist(product.id) 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-gray-600 hover:text-red-500'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Product Info - Mobile Second */}
          <div className="order-2 lg:order-2 space-y-4 lg:space-y-6 px-2 sm:px-0">
            {/* Category & Stock Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              {product.categories && (
                <Badge variant="secondary" className="text-xs w-fit">
                  {product.categories.name}
                </Badge>
              )}
              <div className="flex items-center gap-2">
                {product.stock_quantity > 0 ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    In Stock ({product.stock_quantity})
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Out of Stock
                  </Badge>
                )}
              </div>
            </div>

            {/* Product Name */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>

            {/* Rating (placeholder) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex text-yellow-400">
                {'★'.repeat(4)}{'☆'.repeat(1)}
              </div>
              <span className="text-sm text-muted-foreground">(4.0) • 120 reviews</span>
            </div>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {/* Price */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">₹{product.offer_price!.toFixed(2)}</span>
                    <span className="text-base sm:text-lg text-muted-foreground line-through">₹{product.price.toFixed(2)}</span>
                    <Badge className="bg-red-100 text-red-800 w-fit">
                      <Tag className="h-3 w-3 mr-1" />
                      {discountPercent}% OFF
                    </Badge>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">₹{product.price.toFixed(2)}</span>
                )}
              </div>
              {hasDiscount && (
                <p className="text-sm text-green-600 font-medium">
                  You save ₹{(product.price - product.offer_price!).toFixed(2)}
                </p>
              )}
            </div>

            {/* Loyalty Coins Display */}
            <DualCoinsDisplay
              productId={product.id}
              productName={product.name}
              productPrice={product.price}
              offerPrice={product.offer_price}
              mode="detail"
              onCoinRedeem={(coinsRequired) => {
                toast.info(`Coin redemption feature coming soon! Required: ${coinsRequired} coins`);
              }}
            />

            {/* Quantity Selector - Only show if in stock */}
            {product.stock_quantity > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 p-0 text-lg"
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-medium text-lg bg-gray-50 py-2 px-3 rounded border">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="h-10 w-10 p-0 text-lg"
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons - Mobile Optimized */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="w-full sm:flex-1 bg-primary hover:bg-primary/90 h-12 text-base font-semibold"
                  disabled={product.stock_quantity === 0}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
                
                {/* ✅ Buy Now Button */}
                <Button
                  size="lg"
                  variant="default"
                  className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 h-12 text-base font-semibold"
                  disabled={product.stock_quantity === 0}
                  onClick={() => {
                    handleAddToCart();
                    navigate('/checkout');
                  }}
                >
                  Buy Now
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleShare}
                  className="w-full sm:w-auto sm:px-6 h-12"
                >
                  <Share2 className="h-5 w-5 sm:mr-0 mr-2" />
                  <span className="sm:hidden">Share Product</span>
                </Button>
              </div>
              
              {product.stock_quantity === 0 && (
                <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">
                  This product is currently out of stock. Contact us for availability.
                </p>
              )}
            </div>

            {/* Features - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t bg-gray-50 p-4 rounded-lg">
              <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                <Truck className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex-1 sm:flex-none">
                  <p className="text-sm font-medium">Free Delivery</p>
                  <p className="text-xs text-muted-foreground">On orders above ₹50</p>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                <Shield className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex-1 sm:flex-none">
                  <p className="text-sm font-medium">Warranty</p>
                  <p className="text-xs text-muted-foreground">Manufacturer warranty</p>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                <MessageCircle className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex-1 sm:flex-none">
                  <p className="text-sm font-medium">Support</p>
                  <p className="text-xs text-muted-foreground">24/7 customer care</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <Card className="mb-12 lg:mb-16">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Product Description</h2>
              <div className="prose max-w-none">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold">Related Products</h2>
              <Link to="/products">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">View All Products</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts
                .filter(p => p.id !== product.id)
                .slice(0, 4)
                .map((relatedProduct) => (
                  <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;