import { Link } from 'react-router-dom';
import { Tag, Heart, ShoppingCart, Coins, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductOfferStatus } from '@/hooks/useOfferProducts';
import { ProductImage } from '@/components/ui/StandardizedImage';
import { toast } from 'sonner';
import { useState } from 'react';

interface RelatedProductCardProps {
  product: Product;
}

export function RelatedProductCard({ product }: RelatedProductCardProps) {
  const { addItem: addToWishlist, isInWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { user } = useAuth();
  const { data: offerStatus } = useProductOfferStatus(product.id);
  const [imageError, setImageError] = useState(false);
  
  const hasDiscount = product.offer_price && product.offer_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.offer_price!) / product.price) * 100)
    : 0;
  
  const finalPrice = product.offer_price || product.price;
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
      price: finalPrice,
      offer_price: product.offer_price,
      image_url: product.image_url || '',
      stock_quantity: product.stock_quantity,
      slug: product.slug
    });
  };

  const isWishlisted = user ? isInWishlist(product.id) : false;

  return (
    <>
      {/* Mobile List Layout */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="flex p-3 gap-3">
          {/* Left Side - Product Image */}
          <div className="relative flex-shrink-0">
            <Link to={`/products/${product.slug}`}>
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                {product.image_url && !imageError ? (
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full"
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
                className={`h-3 w-3 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
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
                      {discountPercent}% OFF
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

              {/* Offer Badge */}
              {isOnOffer && (
                <Badge className="bg-orange-500 text-white text-xs mt-1 w-fit">
                  <Tag className="h-3 w-3 mr-1" />
                  Special Offer
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
                <ProductImage
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
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
              {hasDiscount && (
                <Badge className="bg-red-500 text-white text-xs">
                  {discountPercent}% OFF
                </Badge>
              )}
              {isOnOffer && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Tag className="h-3 w-3 mr-1" />
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
                className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
              />
            </button>
          </div>

          <div className="p-4">
            {/* Category */}
            {product.categories && (
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {product.categories.name}
              </span>
            )}

            <Link to={`/products/${product.slug}`}>
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors mt-1">
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

            {/* Rating */}
            <div className="flex items-center gap-1 mt-1">
              <div className="flex text-yellow-400 text-sm">
                {'★'.repeat(4)}{'☆'.repeat(1)}
              </div>
              <span className="text-xs text-gray-500">(4.0)</span>
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