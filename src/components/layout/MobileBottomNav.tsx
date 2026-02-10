import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, Package, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { getTotalItems: getCartCount } = useCart();

  const cartCount = getCartCount();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      badge: null
    },
    {
      icon: Search,
      label: 'Products',
      href: '/products',
      badge: null
    },
    {
      icon: ShoppingCart,
      label: 'Cart',
      href: '/cart',
      badge: cartCount > 0 ? cartCount : null
    },
    {
      icon: Package,
      label: 'Orders',
      href: '/orders',
      badge: null
    },
    {
      icon: User,
      label: user ? 'Profile' : 'Login',
      href: user ? '/profile' : '/login',
      badge: null
    }
  ];

  // Don't show on admin or affiliate pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/affiliate')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-bottom shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center relative transition-all duration-200 ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon 
                  className={`h-6 w-6 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-3 h-5 w-5 p-0 flex items-center justify-center text-xs min-w-5 font-bold"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span 
                className={`text-[10px] mt-1 font-medium transition-all duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
