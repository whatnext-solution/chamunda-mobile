import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ShoppingBag, 
  Coins, 
  Star, 
  Package,
  Zap,
  Gift,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useEligibleProducts } from '@/hooks/useEligibleProducts';
import { useLoyaltyCoins } from '@/hooks/useLoyaltyCoins';
import { toast } from 'sonner';

export const EligibleProducts = () => {
  const { eligibleProducts, loading, error, purchaseWithCoins, hasEligibleProducts } = useEligibleProducts();
  const { wallet } = useLoyaltyCoins();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchaseClick = (product: any) => {
    setSelectedProduct(product);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct) return;

    setPurchasing(true);
    try {
      const success = await purchaseWithCoins(selectedProduct);
      if (success) {
        setIsConfirmDialogOpen(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Products You Can Redeem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-32 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasEligibleProducts) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Products You Can Redeem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
            <p className="text-muted-foreground mb-4">
              You don't have enough coins to redeem any product yet.
            </p>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700 mb-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Keep Shopping to Earn More Coins!</span>
              </div>
              <p className="text-sm text-yellow-600">
                Current Balance: <strong>{wallet?.available_coins || 0} coins</strong>
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Shop more products to earn coins and unlock amazing rewards!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-600" />
              Products You Can Redeem
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              {eligibleProducts.length} Available
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="relative h-32 bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${product.image_url ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gray-100`}>
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  {/* Coin Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-white">
                      <Coins className="h-3 w-3 mr-1" />
                      {product.coins_required_to_buy}
                    </Badge>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                  
                  {product.categories?.name && (
                    <p className="text-xs text-muted-foreground mb-2">{product.categories.name}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground line-through">₹{product.price}</span>
                      {product.offer_price && (
                        <span className="text-green-600 ml-2">₹{product.offer_price}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Stock: {product.stock_quantity}
                    </Badge>
                  </div>

                  {/* Redeem Button */}
                  <Button
                    onClick={() => handlePurchaseClick(product)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    size="sm"
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    Redeem with Coins
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Show More Button if many products */}
          {eligibleProducts.length > 6 && (
            <div className="text-center mt-6">
              <Button variant="outline" className="flex items-center gap-2">
                View All {eligibleProducts.length} Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirm Coin Redemption
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem coins for this product?
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{selectedProduct.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    Regular Price: ₹{selectedProduct.price}
                  </p>
                </div>
              </div>

              {/* Coin Transaction Details */}
              <div className="space-y-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex justify-between text-sm">
                  <span>Current Balance:</span>
                  <span className="font-medium">{wallet?.available_coins || 0} coins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Coins Required:</span>
                  <span className="font-medium text-yellow-700">-{selectedProduct.coins_required_to_buy} coins</span>
                </div>
                <div className="border-t border-yellow-300 pt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Remaining Balance:</span>
                    <span>{(wallet?.available_coins || 0) - selectedProduct.coins_required_to_buy} coins</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  className="flex-1"
                  disabled={purchasing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPurchase}
                  disabled={purchasing}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  {purchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 mr-2" />
                      Confirm Redemption
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};