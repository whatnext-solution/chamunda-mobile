import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { ReturnProvider } from "@/contexts/ReturnContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { EmployeeAuthProvider } from "@/hooks/useEmployeeAuth.tsx";
import URLHashHandler from "./components/auth/URLHashHandler";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import WalletPage from "./pages/WalletPage";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import Offers from "./pages/Offers";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import { ReferralPage } from "./pages/ReferralPage";
import AuthCallback from "./components/auth/AuthCallback";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminDashboard from "./pages/AdminDashboard";
import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AffiliateProfile from "./pages/AffiliateProfile";
import InstagramLogin from "./pages/InstagramLogin";
import InstagramDashboard from "./pages/InstagramDashboard";
import MobileRepairService from "./pages/MobileRepairService";
import MobileRecharge from "./pages/MobileRecharge";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ScrollToTop from "./components/layout/ScrollToTop";

const queryClient = new QueryClient();

// Disable browser's default scroll restoration
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmployeeAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <OrderProvider>
              <ReturnProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true
                    }}
                  >
                    <LoadingProvider>
                      <ScrollToTop excludePatterns={['/admin', '/employee', '/affiliate', '/instagram']} />
                      <URLHashHandler />
                      <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:slug" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/wallet" element={<WalletPage />} />
                    <Route path="/referral" element={<ReferralPage />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/mobile-repair" element={<MobileRepairService />} />
                    <Route path="/mobile-recharge" element={<MobileRecharge />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    
                    {/* Employee Routes */}
                    <Route path="/employee/login" element={<EmployeeLogin />} />
                    <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                    
                    {/* Affiliate Routes */}
                    <Route path="/affiliate/login" element={<AffiliateLogin />} />
                    <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
                    <Route path="/affiliate/profile" element={<AffiliateProfile />} />
                    
                    {/* Instagram Routes */}
                    <Route path="/instagram-login" element={<InstagramLogin />} />
                    <Route path="/instagram-dashboard" element={<InstagramDashboard />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/setup" element={<AdminSetup />} />
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </LoadingProvider>
              </BrowserRouter>
            </TooltipProvider>
          </ReturnProvider>
        </OrderProvider>
      </WishlistProvider>
    </CartProvider>
  </EmployeeAuthProvider>
</AuthProvider>
</QueryClientProvider>
);

export default App;