import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Coins, Gift, Zap, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { DualCoinsDisplay } from '@/components/loyalty/DualCoinsDisplay';
import { LazyImage } from '@/components/ui/LazyWrapper';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  is_featured?: boolean;
  stock_quantity?: number;
  rating?: number;
  reviews_count?: number;
}

interface ModernProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  showLoyaltyCoins?: boolean;
}

export function ModernProductCard({ 
  product, 
  variant = 'default',
  showLoyaltyCoins = true 
}: ModernProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addItem: addToCart } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  const isWishlisted = isInWishlist(product.id);
  const finalPrice = product.offer_price || product.price;
  const hasDiscount = product.offer_price && product.offer_price < product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.offer_price!) / product.price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      offer_price: product.offer_price,
      image_url: product.image_url || '',
      slug: product.slug,
      stock_quantity: product.stock_quantity || 0
    });
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isWishlisted) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        offer_price: product.offer_price,
        image_url: product.image_url,
        slug: product.slug,
        stock_quantity: product.stock_quantity
      });
      toast.success('Added to wishlist!');
    }
  };

  const cardClasses = {
    default: "group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden",
    compact: "group bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden",
    featured: "group bg-white rounded-2xl border-2 border-primary/20 hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden relative"
  };

  return (
    <Link to={`/products/${product.slug}`} className="block">
      <div className={cardClasses[variant]}>
        {/* Featured Badge */}
        {variant === 'featured' && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-md">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="destructive" className="shadow-md animate-pulse">
              -{discountPercentage}%
            </Badge>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-3 ${hasDiscount ? 'right-16' : 'right-3'} z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all duration-200 ${
            isWishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Product Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {!imageError && product.image_url ? (
            <LazyImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Quick Add to Cart - Hover Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              onClick={handleAddToCart}
              size="sm"
              className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          </div>

          {/* Stock Status */}
          {product.stock_quantity !== undefined && product.stock_quantity <= 5 && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                {product.stock_quantity === 0 ? 'Out of Stock' : `Only ${product.stock_quantity} left`}
              </Badge>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.floor(product.rating!)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                ({product.reviews_count || 0})
              </span>
            </div>
          )}

          {/* Loyalty Coins */}
          {showLoyaltyCoins && (
            <div className="space-y-1">
              <DualCoinsDisplay
                productId={product.id}
                productName={product.name}
                productPrice={product.price}
                offerPrice={product.offer_price}
                mode="compact"
              />
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  ₹{finalPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-500 line-through">
                    ₹{product.price.toLocaleString()}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="text-xs text-green-600 font-medium">
                  You save ₹{(product.price - finalPrice).toLocaleString()}
                </div>
              )}
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              size="sm"
              className="shrink-0 shadow-sm hover:shadow-md transition-shadow duration-200"
              disabled={product.stock_quantity === 0}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>

          {/* Express Delivery Badge */}
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Zap className="h-3 w-3" />
            <span>Express Delivery Available</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Skeleton loader for product cards
export function ProductCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'featured' }) {
  const cardClasses = {
    default: "bg-white rounded-xl border border-gray-100 overflow-hidden",
    compact: "bg-white rounded-lg border border-gray-100 overflow-hidden",
    featured: "bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
  };

  return (
    <div className={cardClasses[variant]}>
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}