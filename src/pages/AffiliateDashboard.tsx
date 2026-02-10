import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useProductAffiliate } from '@/hooks/useProductAffiliate';
import ClickAnalytics from '@/components/analytics/ClickAnalytics';
import AffiliateCoupons from '@/components/affiliate/AffiliateCoupons';
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer, 
  ShoppingCart, 
  Copy, 
  ExternalLink,
  LogOut,
  User,
  Calendar,
  Share2,
  Wallet,
  BarChart3,
  Download,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Link,
  Smartphone,
  Facebook,
  Twitter,
  Instagram,
  MessageCircle,
  Mail,
  QrCode,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Package,
  Settings,
  ChevronDown,
  Link2,
  FileText,
  Zap,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface AffiliateSession {
  id: string;
  name: string;
  mobile_number: string;
  affiliate_code: string;
  loginTime: string;
}

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const [affiliateSession, setAffiliateSession] = useState<AffiliateSession | null>(null);
  const [affiliateProducts, setAffiliateProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  
  const {
    clicks,
    orders,
    commissions,
    payouts,
    loading,
    fetchAffiliateClicks,
    fetchAffiliateOrders,
    fetchAffiliateCommissions,
    fetchAffiliatePayouts,
    requestPayout
  } = useAffiliate();

  const {
    getAffiliateEnabledProducts,
    generateAffiliateLink,
    calculateCommission
  } = useProductAffiliate();

  // Pagination for different sections
  const productsPagination = usePagination({
    totalItems: filteredProducts.length,
    itemsPerPage: 12,
  });

  const clicksPagination = usePagination({
    totalItems: clicks.length,
    itemsPerPage: 10,
  });

  const ordersPagination = usePagination({
    totalItems: orders.length,
    itemsPerPage: 10,
  });

  const commissionsPagination = usePagination({
    totalItems: commissions.length,
    itemsPerPage: 10,
  });

  const payoutsPagination = usePagination({
    totalItems: payouts.length,
    itemsPerPage: 10,
  });

  useEffect(() => {
    // Check if affiliate is logged in
    const sessionData = localStorage.getItem('affiliate_session');
    if (!sessionData) {
      navigate('/affiliate/login');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      setAffiliateSession(session);
      
      // Fetch affiliate data with loading state
      const fetchData = async () => {
        setInitialLoading(true);
        try {
          await Promise.all([
            fetchAffiliateClicks(session.id),
            fetchAffiliateOrders(session.id),
            fetchAffiliateCommissions(session.id),
            fetchAffiliatePayouts(session.id),
            loadAffiliateProducts()
          ]);
        } catch (error) {
          console.error('Error fetching affiliate data:', error);
        } finally {
          setInitialLoading(false);
        }
      };
      
      fetchData();

      // BUG FIX #10: Session expiry check - Check every 5 minutes
      const sessionCheckInterval = setInterval(() => {
        const currentSession = localStorage.getItem('affiliate_session');
        if (!currentSession) {
          toast.error('Session expired. Please login again.');
          navigate('/affiliate/login');
        }
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(sessionCheckInterval);
    } catch (error) {
      console.error('Error parsing affiliate session:', error);
      navigate('/affiliate/login');
    }
  }, []);

  const loadAffiliateProducts = async () => {
    try {
      const products = await getAffiliateEnabledProducts();
      setAffiliateProducts(products);
      setFilteredProducts(products);
    } catch (error) {
      console.error('Error loading affiliate products:', error);
    }
  };

  // Filter products based on search and category
  useEffect(() => {
    let filtered = affiliateProducts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.products.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter (if you have categories)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item =>
        item.products.category_id === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, affiliateProducts]);

  const refreshData = async () => {
    if (!affiliateSession) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAffiliateClicks(affiliateSession.id),
        fetchAffiliateOrders(affiliateSession.id),
        fetchAffiliateCommissions(affiliateSession.id),
        fetchAffiliatePayouts(affiliateSession.id),
        loadAffiliateProducts()
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('affiliate_session');
    toast.success('Logged out successfully');
    navigate('/affiliate/login');
  };

  const copyAffiliateLink = (productSlug: string) => {
    if (!affiliateSession) return;
    
    const link = generateAffiliateLink(productSlug, affiliateSession.affiliate_code);
    
    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        // Add visual feedback
        setCopiedLinks(prev => new Set([...prev, productSlug]));
        setTimeout(() => {
          setCopiedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(productSlug);
            return newSet;
          });
        }, 2000);
        
        toast.success('Affiliate link copied!', {
          description: `Ready to share ${productSlug}`,
          duration: 3000,
        });
      }).catch(() => {
        fallbackCopyTextToClipboard(link, productSlug);
      });
    } else {
      // Fallback for older browsers or non-HTTPS
      fallbackCopyTextToClipboard(link, productSlug);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, productSlug: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedLinks(prev => new Set([...prev, productSlug]));
        setTimeout(() => {
          setCopiedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(productSlug);
            return newSet;
          });
        }, 2000);
        toast.success('Affiliate link copied!');
      } else {
        toast.error('Failed to copy link');
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      toast.error('Copy not supported in this browser');
    }
    
    document.body.removeChild(textArea);
  };

  const copyShortLink = async (productSlug: string, productName: string) => {
    if (!affiliateSession) return;
    
    const shortLink = `${window.location.origin}/p/${productSlug}?ref=${affiliateSession.affiliate_code}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shortLink);
        setCopiedLinks(prev => new Set([...prev, `${productSlug}-short`]));
        setTimeout(() => {
          setCopiedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(`${productSlug}-short`);
            return newSet;
          });
        }, 2000);
        
        toast.success('Short link copied!', {
          description: `Compact link for ${productName}`,
          duration: 3000,
        });
      } catch (error) {
        fallbackCopyTextToClipboard(shortLink, `${productSlug}-short`);
      }
    } else {
      fallbackCopyTextToClipboard(shortLink, `${productSlug}-short`);
    }
  };

  const copyLinkWithPreview = (productSlug: string, productName: string, productPrice: number, imageUrl?: string) => {
    if (!affiliateSession) return;
    
    const link = generateAffiliateLink(productSlug, affiliateSession.affiliate_code);
    const commission = calculateCommission('percentage', 5, productPrice);
    
    const linkPreview = `🛍️ ${productName}
💰 Price: ₹${productPrice}
🎯 Your Commission: ₹${commission.toFixed(2)}
🔗 ${link}

#Affiliate #Shopping #Deals`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(linkPreview).then(() => {
        setCopiedLinks(prev => new Set([...prev, `${productSlug}-preview`]));
        setTimeout(() => {
          setCopiedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(`${productSlug}-preview`);
            return newSet;
          });
        }, 2000);
        
        toast.success('Link with preview copied!', {
          description: 'Ready to paste with product details',
          duration: 3000,
        });
      }).catch(() => {
        fallbackCopyTextToClipboard(linkPreview, `${productSlug}-preview`);
      });
    } else {
      fallbackCopyTextToClipboard(linkPreview, `${productSlug}-preview`);
    }
  };

  const shareOnSocialMedia = (platform: string, productSlug: string, productName: string) => {
    if (!affiliateSession) return;
    
    const link = generateAffiliateLink(productSlug, affiliateSession.affiliate_code);
    const message = `Check out this amazing product: ${productName}`;
    
    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${link}`)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(message)}&body=${encodeURIComponent(`${message}\n\n${link}`)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  const generateQRCode = (productSlug: string) => {
    if (!affiliateSession) return;
    
    const link = generateAffiliateLink(productSlug, affiliateSession.affiliate_code);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
    
    // Open QR code in new window
    const qrWindow = window.open('', '_blank');
    if (qrWindow) {
      qrWindow.document.write(`
        <html>
          <head><title>QR Code - Affiliate Link</title></head>
          <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>Scan to visit product page</h2>
            <img src="${qrUrl}" alt="QR Code" style="border: 1px solid #ccc; padding: 10px;">
            <p style="margin-top: 20px; word-break: break-all; font-size: 12px;">${link}</p>
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print QR Code</button>
          </body>
        </html>
      `);
    }
  };

  const handleAdvancedPayoutRequest = async () => {
    if (!affiliateSession || !payoutAmount || !payoutDetails) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (amount < 100) {
      toast.error('Minimum payout amount is ₹100');
      return;
    }

    const availableAmount = totalEarnings - paidCommission;
    if (amount > availableAmount) {
      toast.error(`Insufficient balance. Available: ₹${availableAmount.toFixed(2)}`);
      return;
    }

    try {
      const paymentDetails = {
        method: payoutMethod,
        details: payoutDetails,
        requested_amount: amount
      };

      await requestPayout(amount, payoutMethod as any, paymentDetails);
      setIsPayoutDialogOpen(false);
      setPayoutAmount('');
      setPayoutDetails('');
      toast.success('Payout request submitted successfully');
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to submit payout request');
    }
  };

  const exportData = (type: string) => {
    let data: any[] = [];
    let filename = '';
    
    switch (type) {
      case 'clicks':
        data = clicks.map(click => ({
          Product: click.products?.name || 'Unknown',
          'Click Date': new Date(click.clicked_at).toLocaleString(),
          Converted: click.converted_to_order ? 'Yes' : 'No',
          'Order ID': click.order_id || 'N/A'
        }));
        filename = 'affiliate_clicks.csv';
        break;
      case 'orders':
        data = orders.map(order => ({
          Product: order.products?.name || 'Unknown',
          'Order Date': new Date(order.created_at).toLocaleString(),
          'Commission Amount': `₹${order.commission_amount.toFixed(2)}`,
          Status: order.status,
          'Customer': order.customer_name || 'Unknown'
        }));
        filename = 'affiliate_orders.csv';
        break;
      case 'commissions':
        data = commissions.map(commission => ({
          Type: commission.transaction_type,
          Amount: `₹${commission.amount.toFixed(2)}`,
          Status: commission.status,
          Description: commission.description,
          Date: new Date(commission.created_at).toLocaleString()
        }));
        filename = 'affiliate_commissions.csv';
        break;
    }

    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`${type} data exported successfully`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConversionRate = () => {
    if (clicks.length === 0) return 0;
    const convertedClicks = clicks.filter(click => click.converted_to_order).length;
    return ((convertedClicks / clicks.length) * 100).toFixed(1);
  };

  // Paginated data
  const paginatedProducts = useMemo(() => {
    const startIndex = productsPagination.startIndex;
    const endIndex = productsPagination.endIndex;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, productsPagination.startIndex, productsPagination.endIndex]);

  const paginatedClicks = useMemo(() => {
    const startIndex = clicksPagination.startIndex;
    const endIndex = clicksPagination.endIndex;
    return clicks.slice(startIndex, endIndex);
  }, [clicks, clicksPagination.startIndex, clicksPagination.endIndex]);

  const paginatedOrders = useMemo(() => {
    const startIndex = ordersPagination.startIndex;
    const endIndex = ordersPagination.endIndex;
    return orders.slice(startIndex, endIndex);
  }, [orders, ordersPagination.startIndex, ordersPagination.endIndex]);

  const paginatedCommissions = useMemo(() => {
    const startIndex = commissionsPagination.startIndex;
    const endIndex = commissionsPagination.endIndex;
    return commissions.slice(startIndex, endIndex);
  }, [commissions, commissionsPagination.startIndex, commissionsPagination.endIndex]);

  const paginatedPayouts = useMemo(() => {
    const startIndex = payoutsPagination.startIndex;
    const endIndex = payoutsPagination.endIndex;
    return payouts.slice(startIndex, endIndex);
  }, [payouts, payoutsPagination.startIndex, payoutsPagination.endIndex]);

  if (!affiliateSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading affiliate dashboard...</p>
        </div>
      </div>
    );
  }
  const totalClicks = clicks.length;
  const totalOrders = orders.filter(o => o.status === 'confirmed').length;
  const totalEarnings = commissions
    .filter(c => c.status === 'confirmed' && c.transaction_type === 'earned')
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingCommission = commissions
    .filter(c => c.status === 'pending' && c.transaction_type === 'earned')
    .reduce((sum, c) => sum + c.amount, 0);
  const paidCommission = commissions
    .filter(c => c.status === 'confirmed' && c.transaction_type === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome back, {affiliateSession.name}! 👋
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Code: <strong>{affiliateSession.affiliate_code}</strong></span>
                  <span>•</span>
                  <span>Conversion Rate: <strong>{getConversionRate()}%</strong></span>
                  <span>•</span>
                  <span>Member since {new Date(affiliateSession.loginTime).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/affiliate/profile')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {initialLoading ? (
            // Shimmer effect for stats cards
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <MousePointer className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalClicks}</div>
                  <p className="text-xs text-muted-foreground">
                    +{clicks.filter(c => new Date(c.clicked_at) > new Date(Date.now() - 7*24*60*60*1000)).length} this week
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {getConversionRate()}% conversion rate
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₹{totalEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Confirmed earnings
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">₹{pendingCommission.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting confirmation
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                  <Wallet className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₹{(totalEarnings - paidCommission).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for payout
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="clicks">Clicks</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Affiliate Products</CardTitle>
                    <CardDescription>
                      Generate affiliate links and start earning commissions
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {filteredProducts.length} products available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {/* Add category options here */}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const allLinks = filteredProducts.map(item => {
                        const link = generateAffiliateLink(item.products.slug, affiliateSession.affiliate_code);
                        return `${item.products.name}: ${link}`;
                      }).join('\n\n');
                      
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(allLinks).then(() => {
                          toast.success(`Copied ${filteredProducts.length} affiliate links!`, {
                            description: 'All visible product links copied to clipboard',
                            duration: 4000,
                          });
                        }).catch(() => {
                          fallbackCopyTextToClipboard(allLinks, 'bulk-copy');
                        });
                      } else {
                        fallbackCopyTextToClipboard(allLinks, 'bulk-copy');
                      }
                    }}
                    disabled={filteredProducts.length === 0}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Links
                  </Button>
                </div>

                {initialLoading || loading ? (
                  // Shimmer effect for products
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Card key={index} className="overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-200"></div>
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                          <div className="flex space-x-2 mb-2">
                            <div className="h-8 bg-gray-200 rounded flex-1"></div>
                            <div className="h-8 bg-gray-200 rounded flex-1"></div>
                          </div>
                          <div className="flex space-x-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="h-8 bg-gray-200 rounded flex-1"></div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedProducts.map((item) => {
                        const product = item.products;
                        const settings = item;
                        const commission = calculateCommission(
                          settings.commission_type,
                          settings.commission_value,
                          product.offer_price || product.price
                        );

                        return (
                          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-square bg-gray-100 relative group">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package className="h-12 w-12" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="text-xs bg-white/90">
                                  {settings.commission_type === 'percentage' ? `${settings.commission_value}%` : `₹${settings.commission_value}`}
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                                {product.name}
                              </h3>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <span className="text-lg font-bold text-green-600">
                                    ₹{product.offer_price || product.price}
                                  </span>
                                  {product.offer_price && (
                                    <span className="text-sm text-gray-500 line-through ml-2">
                                      ₹{product.price}
                                    </span>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  ₹{commission.toFixed(2)} commission
                                </Badge>
                              </div>
                              
                              {/* Enhanced Action Buttons */}
                              <div className="space-y-2">
                                <div className="flex space-x-2">
                                  {/* Copy Link Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy Link
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                      <DropdownMenuItem onClick={() => copyAffiliateLink(product.slug)}>
                                        <Link2 className="h-4 w-4 mr-2" />
                                        Full Link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => copyShortLink(product.slug, product.name)}>
                                        <Zap className="h-4 w-4 mr-2" />
                                        Short Link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => copyLinkWithPreview(product.slug, product.name, product.offer_price || product.price, product.image_url)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Link + Preview
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => generateQRCode(product.slug)}>
                                        <QrCode className="h-4 w-4 mr-2" />
                                        Generate QR Code
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  
                                  {/* Quick Share */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => shareOnSocialMedia('whatsapp', product.slug, product.name)}
                                    className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    Share
                                  </Button>
                                </div>
                                
                                {/* Social Share Buttons */}
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => shareOnSocialMedia('facebook', product.slug, product.name)}
                                    className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Share on Facebook"
                                  >
                                    <Facebook className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => shareOnSocialMedia('twitter', product.slug, product.name)}
                                    className="flex-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                    title="Share on Twitter"
                                  >
                                    <Twitter className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => shareOnSocialMedia('telegram', product.slug, product.name)}
                                    className="flex-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                    title="Share on Telegram"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => shareOnSocialMedia('email', product.slug, product.name)}
                                    className="flex-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                    title="Share via Email"
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const link = generateAffiliateLink(product.slug, affiliateSession.affiliate_code);
                                      window.open(link, '_blank');
                                    }}
                                    className="flex-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    title="Preview Product"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {filteredProducts.length === 0 && !loading && (
                      <div className="text-center py-12">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No products found</p>
                        <p className="text-sm text-gray-400">
                          {searchTerm ? 'Try adjusting your search terms' : 'No affiliate products available yet'}
                        </p>
                      </div>
                    )}

                    {/* Products Pagination */}
                    {filteredProducts.length > 0 && (
                      <div className="mt-6">
                        <DataPagination
                          currentPage={productsPagination.currentPage}
                          totalPages={productsPagination.totalPages}
                          totalItems={filteredProducts.length}
                          itemsPerPage={productsPagination.itemsPerPage}
                          startIndex={productsPagination.startIndex}
                          endIndex={productsPagination.endIndex}
                          hasNextPage={productsPagination.hasNextPage}
                          hasPreviousPage={productsPagination.hasPreviousPage}
                          onPageChange={productsPagination.goToPage}
                          onItemsPerPageChange={productsPagination.setItemsPerPage}
                          onFirstPage={productsPagination.goToFirstPage}
                          onLastPage={productsPagination.goToLastPage}
                          onNextPage={productsPagination.goToNextPage}
                          onPreviousPage={productsPagination.goToPreviousPage}
                          getPageNumbers={productsPagination.getPageNumbers}
                          itemsPerPageOptions={[6, 12, 24, 48]}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <AffiliateCoupons />
          </TabsContent>

          {/* Clicks Tab */}
          <TabsContent value="clicks">
            <ClickAnalytics
              data={clicks as any}
              loading={initialLoading || loading}
              onRefresh={refreshData}
              showAffiliateFilter={false}
              affiliateId={affiliateSession?.id}
              title="My Click Analytics"
              description="Detailed analysis of clicks on your affiliate links"
            />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Affiliate Orders</CardTitle>
                    <CardDescription>
                      Orders generated through your affiliate links
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {orders.length} total orders
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => exportData('orders')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {initialLoading || loading ? (
                  <TableShimmer rows={5} columns={3} />
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(order.status)}
                            <div>
                              <p className="font-medium">{order.products?.name || 'Unknown Product'}</p>
                              <p className="text-sm text-gray-500">
                                Customer: {order.customer_name || 'Unknown'} • 
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-400">
                                Qty: {order.quantity} • Price: ₹{order.product_price} • 
                                Rate: {order.commission_type === 'percentage' ? `${order.commission_rate}%` : `₹${order.commission_rate}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">₹{order.commission_amount.toFixed(2)}</p>
                            <Badge variant={
                              order.status === 'confirmed' ? "default" : 
                              order.status === 'pending' ? "secondary" :
                              order.status === 'cancelled' ? "destructive" : "outline"
                            }>
                              {order.status}
                            </Badge>
                            {order.confirmed_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                Confirmed: {new Date(order.confirmed_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {paginatedOrders.length === 0 && !loading && (
                        <div className="text-center py-12">
                          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-2">No orders yet</p>
                          <p className="text-sm text-gray-400">
                            Start promoting products to generate your first order
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Orders Pagination */}
                    {orders.length > 0 && (
                      <div className="mt-6">
                        <DataPagination
                          currentPage={ordersPagination.currentPage}
                          totalPages={ordersPagination.totalPages}
                          totalItems={orders.length}
                          itemsPerPage={ordersPagination.itemsPerPage}
                          startIndex={ordersPagination.startIndex}
                          endIndex={ordersPagination.endIndex}
                          hasNextPage={ordersPagination.hasNextPage}
                          hasPreviousPage={ordersPagination.hasPreviousPage}
                          onPageChange={ordersPagination.goToPage}
                          onItemsPerPageChange={ordersPagination.setItemsPerPage}
                          onFirstPage={ordersPagination.goToFirstPage}
                          onLastPage={ordersPagination.goToLastPage}
                          onNextPage={ordersPagination.goToNextPage}
                          onPreviousPage={ordersPagination.goToPreviousPage}
                          getPageNumbers={ordersPagination.getPageNumbers}
                          itemsPerPageOptions={[5, 10, 25, 50]}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Commission History</CardTitle>
                    <CardDescription>
                      Track all your commission transactions
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {commissions.length} transactions
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => exportData('commissions')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {initialLoading || loading ? (
                  <TableShimmer rows={5} columns={3} />
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedCommissions.map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(commission.status)}
                            <div>
                              <p className="font-medium capitalize flex items-center">
                                {commission.transaction_type}
                                {commission.transaction_type === 'earned' && <TrendingUp className="h-4 w-4 ml-2 text-green-500" />}
                                {commission.transaction_type === 'paid' && <Wallet className="h-4 w-4 ml-2 text-blue-500" />}
                                {commission.transaction_type === 'reversed' && <XCircle className="h-4 w-4 ml-2 text-red-500" />}
                              </p>
                              <p className="text-sm text-gray-500">{commission.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(commission.created_at).toLocaleDateString()}
                                {commission.processed_at && (
                                  <span> • Processed: {new Date(commission.processed_at).toLocaleDateString()}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold text-lg ${
                              commission.transaction_type === 'earned' ? 'text-green-600' : 
                              commission.transaction_type === 'paid' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {commission.transaction_type === 'reversed' ? '-' : '+'}₹{commission.amount.toFixed(2)}
                            </p>
                            <Badge variant={
                              commission.status === 'confirmed' ? "default" : 
                              commission.status === 'pending' ? "secondary" : "outline"
                            }>
                              {commission.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {paginatedCommissions.length === 0 && !loading && (
                        <div className="text-center py-12">
                          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-2">No commissions yet</p>
                          <p className="text-sm text-gray-400">
                            Commissions will appear here when customers purchase through your links
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Commissions Pagination */}
                    {commissions.length > 0 && (
                      <div className="mt-6">
                        <DataPagination
                          currentPage={commissionsPagination.currentPage}
                          totalPages={commissionsPagination.totalPages}
                          totalItems={commissions.length}
                          itemsPerPage={commissionsPagination.itemsPerPage}
                          startIndex={commissionsPagination.startIndex}
                          endIndex={commissionsPagination.endIndex}
                          hasNextPage={commissionsPagination.hasNextPage}
                          hasPreviousPage={commissionsPagination.hasPreviousPage}
                          onPageChange={commissionsPagination.goToPage}
                          onItemsPerPageChange={commissionsPagination.setItemsPerPage}
                          onFirstPage={commissionsPagination.goToFirstPage}
                          onLastPage={commissionsPagination.goToLastPage}
                          onNextPage={commissionsPagination.goToNextPage}
                          onPreviousPage={commissionsPagination.goToPreviousPage}
                          getPageNumbers={commissionsPagination.getPageNumbers}
                          itemsPerPageOptions={[5, 10, 25, 50]}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Payout Management</CardTitle>
                    <CardDescription>
                      Request and track your commission payouts
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right mr-4">
                      <p className="text-sm text-gray-500">Available Balance</p>
                      <p className="text-lg font-bold text-green-600">₹{(totalEarnings - paidCommission).toFixed(2)}</p>
                    </div>
                    <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                      <DialogTrigger asChild>
                        <Button disabled={totalEarnings - paidCommission < 100}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Request Payout
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Request Payout</DialogTitle>
                          <DialogDescription>
                            Minimum payout amount is ₹100. Available balance: ₹{(totalEarnings - paidCommission).toFixed(2)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Payout Amount (₹)</Label>
                            <Input
                              id="amount"
                              type="number"
                              min="100"
                              max={totalEarnings - paidCommission}
                              value={payoutAmount}
                              onChange={(e) => setPayoutAmount(e.target.value)}
                              placeholder="Enter amount"
                            />
                          </div>
                          <div>
                            <Label htmlFor="method">Payment Method</Label>
                            <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="manual">Manual Payment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="details">
                              {payoutMethod === 'upi' ? 'UPI ID' : 
                               payoutMethod === 'bank_transfer' ? 'Account Details' : 'Payment Details'}
                            </Label>
                            <Input
                              id="details"
                              value={payoutDetails}
                              onChange={(e) => setPayoutDetails(e.target.value)}
                              placeholder={
                                payoutMethod === 'upi' ? 'your-upi@paytm' :
                                payoutMethod === 'bank_transfer' ? 'Account Number, IFSC' :
                                'Payment details'
                              }
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAdvancedPayoutRequest}>
                              Submit Request
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {initialLoading || loading ? (
                  <TableShimmer rows={5} columns={3} />
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedPayouts.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(payout.status)}
                            <div>
                              <p className="font-medium">Payout Request</p>
                              <p className="text-sm text-gray-500">
                                Method: {payout.payment_method.toUpperCase()} • 
                                {new Date(payout.requested_at).toLocaleDateString()}
                              </p>
                              {payout.transaction_id && (
                                <p className="text-xs text-gray-400">
                                  Transaction ID: {payout.transaction_id}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">₹{payout.amount.toFixed(2)}</p>
                            <Badge variant={
                              payout.status === 'completed' ? "default" : 
                              payout.status === 'processing' ? "secondary" :
                              payout.status === 'failed' ? "destructive" : "outline"
                            }>
                              {payout.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {paginatedPayouts.length === 0 && !loading && (
                        <div className="text-center py-12">
                          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-2">No payout requests yet</p>
                          <p className="text-sm text-gray-400">
                            Request your first payout when you have at least ₹100 in earnings
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Payouts Pagination */}
                    {payouts.length > 0 && (
                      <div className="mt-6">
                        <DataPagination
                          currentPage={payoutsPagination.currentPage}
                          totalPages={payoutsPagination.totalPages}
                          totalItems={payouts.length}
                          itemsPerPage={payoutsPagination.itemsPerPage}
                          startIndex={payoutsPagination.startIndex}
                          endIndex={payoutsPagination.endIndex}
                          hasNextPage={payoutsPagination.hasNextPage}
                          hasPreviousPage={payoutsPagination.hasPreviousPage}
                          onPageChange={payoutsPagination.goToPage}
                          onItemsPerPageChange={payoutsPagination.setItemsPerPage}
                          onFirstPage={payoutsPagination.goToFirstPage}
                          onLastPage={payoutsPagination.goToLastPage}
                          onNextPage={payoutsPagination.goToNextPage}
                          onPreviousPage={payoutsPagination.goToPreviousPage}
                          getPageNumbers={payoutsPagination.getPageNumbers}
                          itemsPerPageOptions={[5, 10, 25, 50]}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}