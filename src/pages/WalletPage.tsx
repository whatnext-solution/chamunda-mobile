import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { 
  Wallet, 
  Coins, 
  TrendingUp, 
  Star, 
  Gift, 
  RefreshCw,
  ShoppingCart,
  History,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { UnifiedWallet } from '@/components/wallet/UnifiedWallet';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';

export default function WalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPageLoading } = useLoading();
  const { 
    wallet, 
    walletBreakdown,
    availableBalance,
    loading,
    isAffiliate,
    isInstagramUser,
    hasNoMarketingRole,
    canSwitchMarketingRole,
    setMarketingRole
  } = useUnifiedWallet();

  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Show shimmer during page loading
  if (isPageLoading || loading) {
    return <WalletPageShimmer />;
  }

  const handleRoleSelection = async (role: 'affiliate' | 'instagram') => {
    if (!canSwitchMarketingRole(role)) {
      toast.error(`Cannot switch to ${role} role. You already have a marketing role assigned.`);
      return;
    }

    try {
      setRoleChangeLoading(true);
      await setMarketingRole(role);
      
      // Navigate to appropriate dashboard
      if (role === 'affiliate') {
        navigate('/affiliate-login');
      } else if (role === 'instagram') {
        navigate('/instagram-dashboard');
      }
    } catch (error: any) {
      console.error('Role selection error:', error);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleShopNow = () => {
    navigate('/');
  };

  const getRecommendedProducts = () => {
    if (!wallet || availableBalance < 10) return [];
    
    // Mock recommended products based on wallet balance
    const products = [
      { id: '1', name: 'Mobile Screen Protector', price: 15, coins_required: 150 },
      { id: '2', name: 'Phone Case', price: 25, coins_required: 250 },
      { id: '3', name: 'Wireless Earbuds', price: 50, coins_required: 500 },
      { id: '4', name: 'Power Bank', price: 75, coins_required: 750 },
      { id: '5', name: 'Bluetooth Speaker', price: 100, coins_required: 1000 }
    ];

    return products.filter(product => product.price <= availableBalance);
  };

  const recommendedProducts = getRecommendedProducts();

  if (loading) {
    return <WalletPageShimmer />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-primary" />
              My Wallet
            </h1>
            <p className="text-muted-foreground">
              Manage your credits, earnings, and rewards in one place
            </p>
          </div>
          {wallet && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                ₹{availableBalance.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Available Balance
              </div>
            </div>
          )}
        </div>

        {/* Marketing Role Selection (for new users) */}
        {hasNoMarketingRole && (
          <Alert className="border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <strong>Choose Your Marketing Path!</strong>
                  <p className="text-sm mt-1">
                    Select how you'd like to earn additional rewards. This choice is permanent and cannot be changed later.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleRoleSelection('affiliate')}
                    disabled={roleChangeLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Become Affiliate Marketer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    onClick={() => handleRoleSelection('instagram')}
                    disabled={roleChangeLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Become Instagram Influencer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Affiliate:</strong> Earn commission by sharing product links
                  <br />
                  💡 <strong>Instagram:</strong> Earn coins by posting stories about our products
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Role-specific Navigation */}
        {(isAffiliate || isInstagramUser) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isAffiliate && (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">Affiliate Marketer</div>
                        <div className="text-sm text-muted-foreground">
                          Access your affiliate dashboard to track earnings
                        </div>
                      </div>
                    </>
                  )}
                  {isInstagramUser && (
                    <>
                      <Star className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-semibold">Instagram Influencer</div>
                        <div className="text-sm text-muted-foreground">
                          Access your Instagram dashboard to manage campaigns
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => navigate(isAffiliate ? '/affiliate-login' : '/instagram-dashboard')}
                  variant="outline"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Wallet Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="redeem" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Redeem
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <UnifiedWallet 
              showTransactionHistory={false} 
              showRoleManagement={hasNoMarketingRole}
            />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleShopNow}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    <span>Shop & Earn Coins</span>
                  </Button>
                  
                  {isAffiliate && (
                    <Button
                      onClick={() => navigate('/affiliate-login')}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                    >
                      <TrendingUp className="h-6 w-6" />
                      <span>Affiliate Dashboard</span>
                    </Button>
                  )}
                  
                  {isInstagramUser && (
                    <Button
                      onClick={() => navigate('/instagram-dashboard')}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                    >
                      <Star className="h-6 w-6" />
                      <span>Instagram Dashboard</span>
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <Settings className="h-6 w-6" />
                    <span>Profile Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <UnifiedWallet 
              showTransactionHistory={true} 
              showRoleManagement={false}
            />
          </TabsContent>

          <TabsContent value="redeem" className="space-y-6">
            {/* Redemption Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Redeem Your Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableBalance < 10 ? (
                  <div className="text-center py-8">
                    <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Insufficient Balance</h3>
                    <p className="text-muted-foreground mb-4">
                      You need at least ₹10 to start redeeming credits.
                    </p>
                    <Button onClick={handleShopNow}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Shop Now to Earn More
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Checkout Redemption */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Use at Checkout</h4>
                          <p className="text-sm text-muted-foreground">
                            Apply your wallet balance during checkout
                          </p>
                        </div>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <Button onClick={handleShopNow} className="w-full">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Shop Now & Use Wallet
                      </Button>
                    </div>

                    {/* Recommended Products */}
                    {recommendedProducts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Products You Can Afford</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recommendedProducts.slice(0, 4).map((product) => (
                            <div key={product.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    ₹{product.price}
                                  </div>
                                </div>
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Wallet Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Wallet Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Marketing Role Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Marketing Role</h4>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAffiliate && (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span>Affiliate Marketer</span>
                          </>
                        )}
                        {isInstagramUser && (
                          <>
                            <Star className="h-4 w-4 text-purple-600" />
                            <span>Instagram Influencer</span>
                          </>
                        )}
                        {hasNoMarketingRole && (
                          <>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>No Marketing Role</span>
                          </>
                        )}
                      </div>
                      <Badge variant={
                        isAffiliate ? 'default' : 
                        isInstagramUser ? 'secondary' : 
                        'outline'
                      }>
                        {wallet?.marketing_role || 'none'}
                      </Badge>
                    </div>
                  </div>
                  
                  {(isAffiliate || isInstagramUser) && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your marketing role is locked and cannot be changed. This ensures fair 
                        reward distribution and prevents abuse of the system.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Wallet Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Wallet Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Wallet Created</div>
                      <div>{wallet ? new Date(wallet.created_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Updated</div>
                      <div>{wallet ? new Date(wallet.last_updated).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Help & Support */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Help & Support</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Info className="h-4 w-4 mr-2" />
                      How Wallet Works
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Transaction History
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report an Issue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </MainLayout>
  );
}