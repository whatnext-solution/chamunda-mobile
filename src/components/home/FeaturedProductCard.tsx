import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Heart, 
  ShoppingCart, 
  Eye, 
  Coins,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface FeaturedProductCardProps {
  product: Product;
}

export function FeaturedProductCard({ product }: FeaturedProductCardProps) {
  const { data: settings } = useStoreSettings();
  const { addItem: addToWishlist, isInWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);

  // Calculate offer status
  const offerStatus = settings?.offers?.find(offer => 
    offer.applicable_products?.includes(product.id) && 
    offer.is_active
  );
  const isOnOffer = !!offerStatus;

  const handleAddToWishlist = () => {
    if (!user) {
      toast.error('Please login to add items to wishlist', {
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }

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
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.offer_price || product.price,
      offer_price: product.offer_price,
      image_url: product.image_url || '',
      stock_quantity: product.stock_quantity,
      slug: product.slug
    });
  };

  const finalPrice = product.offer_price || product.price;
  const hasDiscount = product.offer_price && product.offer_price < product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.offer_price!) / product.price) * 100)
    : 0;

  return (
    <>
      {/* Mobile List Layout */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="flex p-4 gap-4">
          {/* Left Side - Product Image */}
          <div className="relative flex-shrink-0">
            <Link to={`/products/${product.slug}`}>
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                {product.image_url && !imageError ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            </Link>
            
            {/* Wishlist Button */}
            <button
              onClick={handleAddToWishlist}
              className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-sm border border-gray-200"
            >
              <Heart 
                className={`h-3 w-3 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
              />
            </button>
          </div>

          {/* Right Side - Product Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <Link to={`/products/${product.slug}`}>
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 hover:text-primary transition-colors">
                  {product.name}
                </h3>
              </Link>
              
              {/* Price */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-bold text-gray-900">
                  ₹{finalPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xs text-gray-500 line-through">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <Badge className="bg-red-500 text-white text-xs px-1 py-0">
                      {discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Loyalty Coins */}
              {product.coins_earned_per_purchase > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                  <Coins className="h-3 w-3" />
                  <span>Earn {product.coins_earned_per_purchase} coins</span>
                </div>
              )}

              {/* Featured Badge */}
              {product.is_featured && (
                <Badge className="bg-blue-500 text-white text-xs mt-1">
                  Featured
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.href = `/products/${product.slug}`}
                className="flex-1 text-xs px-2 py-1 h-7"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="flex-1 text-xs px-2 py-1 h-7"
                disabled={product.stock_quantity <= 0}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                {product.stock_quantity <= 0 ? 'Out' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Grid Layout */}
      <div className="hidden sm:block">
        <div className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="relative aspect-square overflow-hidden">
            <Link to={`/products/${product.slug}`}>
              {product.image_url && !imageError ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </Link>

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.is_featured && (
                <Badge className="bg-blue-500 text-white text-xs">
                  Featured
                </Badge>
              )}
              {hasDiscount && (
                <Badge className="bg-red-500 text-white text-xs">
                  {discountPercentage}% OFF
                </Badge>
              )}
              {isOnOffer && (
                <Badge className="bg-green-500 text-white text-xs">
                  Special Offer
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={handleAddToWishlist}
              className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
            >
              <Heart 
                className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
              />
            </button>
          </div>

          <div className="p-4">
            <Link to={`/products/${product.slug}`}>
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-bold text-gray-900">
                ₹{finalPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  ₹{product.price.toFixed(2)}
                </span>
              )}
            </div>

            {product.coins_earned_per_purchase > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <Coins className="h-3 w-3" />
                <span>Earn {product.coins_earned_per_purchase} coins</span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.href = `/products/${product.slug}`}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="flex-1"
                disabled={product.stock_quantity <= 0}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}