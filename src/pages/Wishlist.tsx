import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WishlistPageShimmer } from '@/components/ui/EnhancedShimmer';
import { Heart, ShoppingCart, ArrowLeft, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: wishlistItems, removeItem, loading } = useWishlist();
  const { addItem: addToCart } = useCart();

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please login to view your wishlist and save your favorite items.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      offer_price: item.offer_price,
      image_url: item.image_url,
      stock_quantity: item.stock_quantity,
      slug: item.slug
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
          <div className="container-fluid py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">My Wishlist</h1>
                <p className="text-sm text-muted-foreground">
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid py-6">
          {loading ? (
            <WishlistPageShimmer />
          ) : wishlistItems.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">Save items you love for later</p>
              <Button asChild>
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlistItems.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link to={`/products/${item.slug}`} className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Heart className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.slug}`}>
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                            {item.name}
                          </h3>
                        </Link>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {item.offer_price ? (
                            <>
                              <span className="text-lg font-bold text-foreground">
                                ₹{item.offer_price.toFixed(2)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{item.price.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-foreground">
                              ₹{item.price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Stock Status */}
                        <div className="mt-2">
                          {item.stock_quantity > 0 ? (
                            <span className="text-sm text-green-600 font-medium">
                              In Stock ({item.stock_quantity} available)
                            </span>
                          ) : (
                            <span className="text-sm text-red-600 font-medium">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            disabled={item.stock_quantity === 0}
                            className="flex-1"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Continue Shopping */}
              <div className="text-center pt-6">
                <Button asChild variant="outline" size="lg">
                  <Link to="/products">
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Wishlist;