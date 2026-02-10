import { Link } from 'react-router-dom';
import { MessageCircle, Tag, Heart, ShoppingCart, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { useProductOfferStatus } from '@/hooks/useOfferProducts';
import { DualCoinsDisplay } from '@/components/loyalty/DualCoinsDisplay';
import { ProductImageGallery } from '@/components/ui/ProductImageGallery';
import { ProductImage } from '@/components/ui/StandardizedImage';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: settings } = useStoreSettings();
  const { addItem: addToWishlist, isInWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { user } = useAuth();
  const { isSystemEnabled } = useLoyaltyCoins();
  const { data: offerStatus } = useProductOfferStatus(product.id);
  
  const hasDiscount = product.offer_price && product.offer_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.offer_price!) / product.price) * 100)
    : 0;
  
  const finalPrice = product.offer_price || product.price;
  const productUrl = `${window.location.origin}/products/${product.slug}`;
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
      price: product.price,
      offer_price: product.offer_price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      slug: product.slug
    });
  };

  const isWishlisted = user ? isInWishlist(product.id) : false;

  return (
    <div className="group hover:shadow-lg transition-all duration-300 bg-white rounded-xl border border-gray-100 hover:border-gray-200 overflow-hidden">
      {/* Image Gallery */}
      <Link to={`/products/${product.slug}`} className="block relative aspect-square overflow-hidden">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold z-10">
            {discountPercent}% OFF
          </div>
        )}

        {/* Offer Badge */}
        {isOnOffer && !hasDiscount && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold z-10 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            OFFER
          </div>
        )}

        {/* Both Discount and Offer */}
        {hasDiscount && isOnOffer && (
          <div className="absolute top-2 left-2 space-y-1 z-10">
            <div className="bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
              {discountPercent}% OFF
            </div>
            <div className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
              <Tag className="w-3 h-3" />
              OFFER
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            handleAddToWishlist();
          }}
          className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2">
        {/* Category */}
        {product.categories && (
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {product.categories.name}
          </span>
        )}

        {/* Name */}
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2">
          {finalPrice === 0 ? (
            <Badge className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-1">
              FREE
            </Badge>
          ) : hasDiscount ? (
            <>
              <span className="text-base sm:text-lg font-bold text-gray-900">₹{product.offer_price!.toFixed(2)}</span>
              <span className="text-xs sm:text-sm text-gray-500 line-through">₹{product.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-base sm:text-lg font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
          )}
        </div>

        {/* Rating (placeholder) */}
        <div className="flex items-center gap-1">
          <div className="flex text-yellow-400">
            {'★'.repeat(4)}{'☆'.repeat(1)}
          </div>
          <span className="text-xs text-gray-500">(4.0)</span>
        </div>

        {/* Loyalty Coins Info */}
        <DualCoinsDisplay
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          offerPrice={product.offer_price}
          mode="card"
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs sm:text-sm px-2 sm:px-3"
            onClick={handleAddToCart}
            disabled={product.stock_quantity === 0}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
}