import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CartPageShimmer } from '@/components/ui/EnhancedShimmer';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';
import { useEffect, useState } from 'react';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: cartItems, updateQuantity, removeItem, getTotalPrice } = useCart();
  const { isPageLoading } = useLoading();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Show shimmer during initial load or page transitions
  if (isInitialLoading || isPageLoading) {
    return <CartPageShimmer />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md mx-auto">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-500 mb-6">
              Please login to view your cart and manage your items.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const subtotal = getTotalPrice();
  const shipping = 0; // Free shipping
  const total = subtotal + shipping;

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-32 md:pb-0">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-white border-b md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Cart</h1>
              <p className="text-xs text-gray-500">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block bg-white border-b sticky top-16 z-40">
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
                <h1 className="text-xl font-bold">My Cart</h1>
                <p className="text-sm text-gray-500">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid py-4 md:py-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Add some products to get started</p>
              <Button asChild>
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3 md:space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex gap-3 md:gap-4">
                        {/* Product Image */}
                        <Link 
                          to={`/products/${item.slug}`}
                          className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${item.slug}`}>
                            <h3 className="font-medium text-sm md:text-base text-gray-900 line-clamp-2">
                              {item.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-gray-900">
                              ₹{(item.offer_price || item.price).toFixed(0)}
                            </span>
                            {item.offer_price && (
                              <span className="text-xs text-gray-500 line-through">
                                ₹{item.price.toFixed(0)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls - Mobile */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center border rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="p-2 hover:bg-gray-100 disabled:opacity-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock_quantity}
                                className="p-2 hover:bg-gray-100 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary - Desktop */}
              <div className="hidden lg:block">
                <Card className="sticky top-28">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shipping</span>
                        <span className="font-medium text-green-600">Free</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-6" 
                      size="lg"
                      onClick={handleCheckout}
                    >
                      Proceed to Checkout
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>

                    {/* Promo Section */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900 text-sm">Apply Promo Code</p>
                          <p className="text-xs text-blue-600">Get extra discounts</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Bar */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden z-40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold">₹{total.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  Free Shipping
                </Badge>
              </div>
            </div>
            <Button 
              className="w-full h-12 text-base font-bold" 
              onClick={handleCheckout}
            >
              Checkout
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;
