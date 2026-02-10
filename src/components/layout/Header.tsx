import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Zap, LogIn, Search, ShoppingCart, Heart, Package, UserCircle, Wallet, Tag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAffiliateStatus } from '@/hooks/useAffiliateStatus';
import { useRepairRequests } from '@/hooks/useRepairRequests';
import UserProfile from '@/components/auth/UserProfile';
import UserMenuMobile from '@/components/auth/UserMenuMobile';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/offers', label: 'Offers' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useWebsiteSettings();
  const { user, loading } = useAuth();
  const { getTotalItems: getCartCount } = useCart();
  const { getTotalItems: getWishlistCount } = useWishlist();
  const { isAffiliate, affiliateData } = useAffiliateStatus();
  const { hasRepairRequests } = useRepairRequests();

  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();

  // Create dynamic nav links based on user's repair requests
  const dynamicNavLinks = [
    ...navLinks,
    ...(hasRepairRequests ? [{ href: '/mobile-repair', label: 'Mobile Repair' }] : [])
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Mobile Header - Amazon Style */}
      <header className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        {/* Top Bar with Logo and Icons */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            {settings?.shop_logo_url ? (
              <img 
                src={settings.shop_logo_url} 
                alt={settings.shop_name || 'Logo'} 
                className="h-8 w-8 object-contain rounded-lg bg-white/10"
              />
            ) : (
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-bold text-lg text-white">
              {settings?.shop_name || 'ElectroStore'}
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            {user && (
              <Link to="/wallet" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Wallet className="h-5 w-5" />
              </Link>
            )}
            <Link to="/offers" className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
              <Tag className="h-5 w-5 animate-pulse" />
            </Link>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 h-11 bg-white text-gray-900 rounded-lg border-0 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-yellow-400"
            />
          </form>
        </div>
        
        {/* Delivery Location */}
        <div className="flex items-center gap-2 px-4 pb-2 text-white/90 text-sm">
          <MapPin className="h-4 w-4" />
          <span>Deliver to your location</span>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 w-full border-b border-gray-100 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/95">
        <div className="container-fluid">
          <div className="flex h-16 items-center justify-between">
            {/* Left Side - Logo and Affiliate Profile */}
            <div className="flex items-center gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 group">
                {settings?.shop_logo_url ? (
                  <img 
                    src={settings.shop_logo_url} 
                    alt={settings.shop_name || 'Logo'} 
                    className="h-10 w-10 object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary ${settings?.shop_logo_url ? 'hidden' : ''}`}>
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors hidden sm:block">
                  {settings?.shop_name || 'ElectroStore'}
                </span>
              </Link>

              {/* Affiliate Profile Icon - Only show if user is affiliate */}
              {isAffiliate && user && (
                <Link 
                  to="/affiliate/profile" 
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                  title="Affiliate Profile"
                >
                  <div className="relative">
                    {affiliateData?.profile_image_url ? (
                      <img 
                        src={affiliateData.profile_image_url} 
                        alt="Affiliate Profile" 
                        className="h-8 w-8 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-400 transition-colors"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-blue-200 group-hover:border-blue-400 flex items-center justify-center transition-colors">
                        <UserCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-blue-700 group-hover:text-blue-800 hidden lg:block">
                    {affiliateData?.full_name || 'Affiliate'}
                  </span>
                </Link>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {dynamicNavLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">

              <Link to="/orders" className="relative">
                <Button variant="ghost" size="icon" title="Orders">
                  <Package className="h-5 w-5" />
                </Button>
              </Link>

              {user && (
                <Link to="/wallet" className="relative">
                  <Button variant="ghost" size="icon" title="Wallet">
                    <Wallet className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon" title="Cart">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {cartCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </Link>

              <Link to="/wishlist" className="relative">
                <Button variant="ghost" size="icon" title="Wishlist">
                  <Heart className="h-5 w-5" />
                </Button>
                {wishlistCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </Badge>
                )}
              </Link>

              {loading ? (
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              ) : user ? (
                <UserProfile />
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Desktop Mobile Navigation Menu */}
          {isMenuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-100 animate-fade-in bg-white">
              <div className="flex flex-col gap-1">
                {/* Affiliate Profile Link - Mobile */}
                {isAffiliate && user && (
                  <Link
                    to="/affiliate/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border-b border-gray-100 mb-2"
                  >
                    <div className="relative">
                      {affiliateData?.profile_image_url ? (
                        <img 
                          src={affiliateData.profile_image_url} 
                          alt="Affiliate Profile" 
                          className="h-8 w-8 rounded-full object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <div className="font-medium">Affiliate Profile</div>
                      <div className="text-xs text-gray-500">{affiliateData?.full_name || 'Manage your profile'}</div>
                    </div>
                  </Link>
                )}

                {dynamicNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === link.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Mobile User Auth */}
                <div className="px-4 py-2 border-t border-gray-100 mt-2 pt-4">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ) : user ? (
                    <UserMenuMobile onClose={() => setIsMenuOpen(false)} />
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Login</span>
                    </Link>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
