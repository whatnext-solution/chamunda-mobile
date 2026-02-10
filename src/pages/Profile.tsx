import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LazyWrapper } from '@/components/ui/LazyWrapper';
import { ProfileShimmer } from '@/components/ui/Shimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Save, 
  X,
  Heart,
  ShoppingBag,
  Clock,
  Settings,
  LogOut,
  Camera,
  Bell,
  CreditCard,
  HelpCircle,
  Shield,
  Coins,
  Gift,
  Users
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { LoyaltyCoinsWallet } from '@/components/loyalty/LoyaltyCoinsWallet';
import { ReferralDashboard } from '@/components/referral/ReferralDashboard';
import UserCoupons from '@/components/user/UserCoupons';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { getTotalItems: getCartCount } = useCart();
  const { getTotalItems: getWishlistCount } = useWishlist();
  const { isPageLoading } = useLoading();
  const [isEditing, setIsEditing] = useState(false);
  
  // Get active tab from URL params or default to 'profile'
  const activeTab = searchParams.get('tab') || 'profile';
  
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, City, State 12345'
  });

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Show shimmer during page loading
  if (isPageLoading) {
    return (
      <MainLayout>
        <LazyWrapper delay={100} fallback={<ProfileShimmer />}>
          <ProfileShimmer />
        </LazyWrapper>
      </MainLayout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please login to view and manage your profile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();

  const handleSave = () => {
    // In a real app, this would update the user profile
    setIsEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const quickActions = [
    {
      icon: ShoppingBag,
      label: 'My Orders',
      description: 'Track your orders',
      action: () => navigate('/orders'),
      count: 3,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Coins,
      label: 'Loyalty Coins',
      description: 'Your coin balance',
      action: () => handleTabChange('loyalty'),
      count: 0, // Will be updated with actual coin balance
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Users,
      label: 'Refer & Earn',
      description: 'Invite friends & earn coins',
      action: () => handleTabChange('referral'),
      count: 0, // Will be updated with referral count
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Heart,
      label: 'Wishlist',
      description: 'Your saved items',
      action: () => navigate('/wishlist'),
      count: wishlistCount,
      color: 'bg-red-100 text-red-600'
    },
  ];

  const menuItems = [
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Manage notifications',
      href: '/notifications'
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      description: 'Manage payment options',
      href: '/payment-methods'
    },
    {
      icon: MapPin,
      label: 'Addresses',
      description: 'Manage delivery addresses',
      href: '/addresses'
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'App preferences',
      href: '/settings'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help and support',
      href: '/support'
    },
    {
      icon: Shield,
      label: 'Privacy & Security',
      description: 'Privacy settings',
      href: '/privacy'
    }
  ];

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
              <h1 className="text-xl font-bold">Profile</h1>
            </div>
          </div>
        </div>

        <div className="container-fluid py-6 space-y-6">
          {/* Tab Navigation */}
          <Card className="bg-white border border-gray-100">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeTab === 'profile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('profile')}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant={activeTab === 'loyalty' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('loyalty')}
                  className="flex items-center gap-2"
                >
                  <Coins className="h-4 w-4" />
                  Loyalty Coins
                </Button>
                <Button
                  variant={activeTab === 'coupons' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('coupons')}
                  className="flex items-center gap-2"
                >
                  <Gift className="h-4 w-4" />
                  My Coupons
                </Button>
                <Button
                  variant={activeTab === 'referral' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('referral')}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Refer & Earn
                </Button>
                <Button
                  variant={activeTab === 'orders' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('orders')}
                  className="flex items-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Orders
                </Button>
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('settings')}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Profile Card */}
              <Card className="bg-white border border-gray-100">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={user?.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-xl">
                            {formData.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Camera className="h-4 w-4 text-primary-foreground" />
                        </button>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{formData.name}</h2>
                        <p className="text-muted-foreground">{formData.email}</p>
                        <Badge variant="secondary" className="mt-1">
                          Verified Account
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleSave} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span>{formData.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>{formData.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span>{formData.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <span>{formData.address}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={action.action}
                        className="flex flex-col items-center p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white"
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${action.color}`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-sm text-center">{action.label}</span>
                        {action.count > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {action.count}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Loyalty Coins Tab */}
          {activeTab === 'loyalty' && (
            <LoyaltyCoinsWallet />
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <UserCoupons />
          )}

          {/* Referral Tab */}
          {activeTab === 'referral' && (
            <ReferralDashboard />
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <Card className="bg-white border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  My Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button onClick={() => navigate('/')}>
                    Start Shopping
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              {/* Menu Items */}
              <Card className="bg-white border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {menuItems.map((item, index) => (
                    <div key={item.label}>
                      <Link
                        to={item.href}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <item.icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{item.label}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                      </Link>
                      {index < menuItems.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sign Out */}
              <Card className="bg-white border border-gray-100">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;