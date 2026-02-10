import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useAffiliate, AffiliateUser } from '@/hooks/useAffiliate';
import { useProductAffiliate } from '@/hooks/useProductAffiliate';
import ClickAnalytics from '@/components/analytics/ClickAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  ToggleLeft, 
  ToggleRight,
  Users,
  TrendingUp,
  DollarSign,
  MousePointer,
  ShoppingCart,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AffiliateManagement() {
  const {
    affiliates,
    clicks,
    orders,
    commissions,
    payouts,
    loading,
    fetchAffiliates,
    createAffiliate,
    updateAffiliate,
    deleteAffiliate,
    fetchAffiliateClicks,
    fetchAffiliateOrders,
    fetchAffiliateCommissions,
    fetchAffiliatePayouts,
    confirmAffiliateCommission,
    processPayout
  } = useAffiliate();

  const { getProductAffiliateStats } = useProductAffiliate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateUser | null>(null);
  const [affiliateToDelete, setAffiliateToDelete] = useState<AffiliateUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productStats, setProductStats] = useState<any[]>([]);

  // Form state for creating/editing affiliates
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    password: '',
    affiliate_code: '',
    is_active: true
  });

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = 
      affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.mobile_number.includes(searchTerm) ||
      affiliate.affiliate_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && affiliate.is_active) ||
      (statusFilter === 'inactive' && !affiliate.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination({
    totalItems: filteredAffiliates.length,
    itemsPerPage: 20,
  });

  const paginatedAffiliates = filteredAffiliates.slice(
    pagination.startIndex,
    pagination.endIndex
  );

  useEffect(() => {
    fetchAffiliates();
    fetchAffiliateClicks();
    fetchAffiliateOrders();
    fetchAffiliateCommissions();
    fetchAffiliatePayouts();
    loadProductStats();
  }, []);

  const loadProductStats = async () => {
    try {
      const stats = await getProductAffiliateStats();
      setProductStats(stats);
    } catch (error) {
      console.error('Error loading product stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile_number: '',
      password: '',
      affiliate_code: '',
      is_active: true
    });
  };

  const validateForm = async () => {
    // BUG FIX #4: Password strength validation
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      toast.error('Password must contain both letters and numbers');
      return false;
    }

    // BUG FIX #6: Affiliate code format validation
    if (formData.affiliate_code && !/^[A-Z0-9]{4,12}$/.test(formData.affiliate_code)) {
      toast.error('Affiliate code must be 4-12 characters (uppercase letters and numbers only)');
      return false;
    }

    // BUG FIX #3: Duplicate mobile/email check
    try {
      const { data: existingAffiliate, error } = await (supabase as any)
        .from('affiliate_users')
        .select('id, mobile_number')
        .eq('mobile_number', formData.mobile_number)
        .single();

      if (existingAffiliate) {
        toast.error('This mobile number is already registered as an affiliate');
        return false;
      }
    } catch (error: any) {
      // If error is "PGRST116" it means no rows found, which is what we want
      if (error?.code !== 'PGRST116') {
        console.error('Error checking duplicate:', error);
      }
    }

    return true;
  };

  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      const result = await createAffiliate(formData);
      
      // BUG FIX #7: Detailed success message
      const affiliateCode = formData.affiliate_code || result?.affiliate_code || 'Generated';
      toast.success(
        `Affiliate created successfully!`,
        {
          description: `Code: ${affiliateCode} | Mobile: ${formData.mobile_number}`,
          duration: 5000,
        }
      );
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleToggleStatus = async (affiliate: AffiliateUser) => {
    try {
      await updateAffiliate(affiliate.id, { is_active: !affiliate.is_active });
    } catch (error) {
      // Error handled in hook
    }
  };

  const openDeleteDialog = (affiliate: AffiliateUser) => {
    setAffiliateToDelete(affiliate);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAffiliate = async () => {
    if (!affiliateToDelete) return;

    try {
      await deleteAffiliate(affiliateToDelete.id);
      toast.success(`Affiliate "${affiliateToDelete.name}" deleted successfully`);
      setIsDeleteDialogOpen(false);
      setAffiliateToDelete(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleViewAffiliate = (affiliate: AffiliateUser) => {
    setSelectedAffiliate(affiliate);
    setIsViewDialogOpen(true);
  };

  const handleConfirmCommission = async (commissionId: string) => {
    try {
      await confirmAffiliateCommission(commissionId);
      toast.success('Commission confirmed successfully');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleProcessPayout = async (payoutId: string, status: string) => {
    const transactionId = status === 'completed' ? `TXN${Date.now()}` : undefined;
    const notes = status === 'failed' ? 'Payment failed - please retry' : undefined;

    try {
      await processPayout(payoutId, status, transactionId, notes);
      toast.success(`Payout ${status} successfully`);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Calculate overall stats
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.is_active).length;
  const totalClicks = clicks.length;
  const totalOrders = orders.filter(o => o.status === 'confirmed').length;
  const totalCommissions = commissions
    .filter(c => c.status === 'confirmed' && c.transaction_type === 'earned')
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingCommissions = commissions
    .filter(c => c.status === 'pending' && c.transaction_type === 'earned')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Affiliate Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              Add Affiliate
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-lg sm:text-xl">Add New Affiliate</DialogTitle>
              <DialogDescription className="text-sm">
                Create a new affiliate marketer account with login credentials.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleCreateAffiliate} className="affiliate-form space-y-4 sm:space-y-6 py-4">
                <div>
                  <Label htmlFor="name" className="mb-1.5 block text-sm sm:text-base">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter affiliate name"
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile_number" className="mb-1.5 block text-sm sm:text-base">Mobile Number *</Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="mb-1.5 block text-sm sm:text-base">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Login password"
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="affiliate_code" className="mb-1.5 block text-sm sm:text-base">Affiliate Code (Optional)</Label>
                  <Input
                    id="affiliate_code"
                    value={formData.affiliate_code}
                    onChange={(e) => setFormData({ ...formData, affiliate_code: e.target.value.toUpperCase() })}
                    placeholder="Leave empty for auto-generation"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If empty, a unique code will be generated automatically
                  </p>
                </div>

                <div className="flex items-center space-x-2 touch-manipulation">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 touch-manipulation"
                  />
                  <Label htmlFor="is_active" className="text-sm sm:text-base">Active</Label>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    {loading ? 'Creating...' : 'Create Affiliate'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Affiliates</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {activeAffiliates} active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Clicks</CardTitle>
            <MousePointer className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              All affiliate clicks
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Orders</CardTitle>
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed orders
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Commissions</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">₹{totalCommissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed commissions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Pending Commissions</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">₹{pendingCommissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Conversion Rate</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Click to order ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="affiliates" className="space-y-4 sm:space-y-5 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="affiliates" className="text-xs sm:text-sm h-10 sm:h-9">Affiliates</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm h-10 sm:h-9">Analytics</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs sm:text-sm h-10 sm:h-9">Orders</TabsTrigger>
          <TabsTrigger value="commissions" className="text-xs sm:text-sm h-10 sm:h-9">Commissions</TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs sm:text-sm h-10 sm:h-9">Payouts</TabsTrigger>
          <TabsTrigger value="products" className="text-xs sm:text-sm h-10 sm:h-9">Products</TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Affiliate Marketers</CardTitle>
              <CardDescription className="text-sm">
                Manage affiliate accounts and track their performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search affiliates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchAffiliates} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Affiliate</th>
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Performance</th>
                      <th className="text-left p-3">Earnings</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAffiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{affiliate.name}</p>
                            <p className="text-sm text-gray-500">{affiliate.mobile_number}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{affiliate.affiliate_code}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p>{affiliate.total_clicks} clicks</p>
                            <p>{affiliate.total_orders} orders</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium text-green-600">₹{affiliate.total_earnings.toFixed(2)}</p>
                            <p className="text-gray-500">₹{affiliate.pending_commission.toFixed(2)} pending</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(affiliate)}
                          >
                            {affiliate.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAffiliate(affiliate)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(affiliate)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {paginatedAffiliates.map((affiliate) => (
                  <Card key={affiliate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{affiliate.name}</p>
                              <p className="text-xs sm:text-sm text-gray-500">{affiliate.mobile_number}</p>
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{affiliate.affiliate_code}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                            <div>
                              <p className="text-gray-500">Clicks</p>
                              <p className="font-medium">{affiliate.total_clicks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Orders</p>
                              <p className="font-medium">{affiliate.total_orders}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Earnings</p>
                              <p className="font-medium text-green-600">₹{affiliate.total_earnings.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Pending</p>
                              <p className="font-medium text-yellow-600">₹{affiliate.pending_commission.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(affiliate)}
                              className="h-9 touch-manipulation"
                            >
                              {affiliate.is_active ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-green-500 mr-1" />
                                  <span className="text-xs">Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-xs">Inactive</span>
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAffiliate(affiliate)}
                              className="h-9 touch-manipulation"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="text-xs">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(affiliate)}
                              className="h-9 touch-manipulation"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="text-xs">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {filteredAffiliates.length > 0 && (
                <div className="mt-6">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredAffiliates.length}
                    itemsPerPage={pagination.itemsPerPage}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    hasNextPage={pagination.hasNextPage}
                    hasPreviousPage={pagination.hasPreviousPage}
                    onPageChange={pagination.goToPage}
                    onItemsPerPageChange={pagination.setItemsPerPage}
                    onFirstPage={pagination.goToFirstPage}
                    onLastPage={pagination.goToLastPage}
                    onNextPage={pagination.goToNextPage}
                    onPreviousPage={pagination.goToPreviousPage}
                    getPageNumbers={pagination.getPageNumbers}
                    itemsPerPageOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Click Analytics Tab */}
        <TabsContent value="analytics">
          <ClickAnalytics
            data={clicks as any}
            loading={loading}
            onRefresh={() => {
              fetchAffiliateClicks();
              fetchAffiliateOrders();
            }}
            showAffiliateFilter={true}
            title="Admin Click Analytics"
            description="Comprehensive click tracking and analysis for all affiliates"
          />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Affiliate Orders</CardTitle>
              <CardDescription className="text-sm">
                All orders generated through affiliate links
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{order.products?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        Order: {(order as any).orders?.order_number} • {(order as any).orders?.customer_name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        Affiliate: {affiliates.find(a => a.id === order.affiliate_id)?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <p className="font-semibold text-sm sm:text-base text-green-600">₹{order.commission_amount.toFixed(2)}</p>
                      <Badge variant={order.status === 'confirmed' ? "default" : "secondary"} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No affiliate orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Commission Management</CardTitle>
              <CardDescription className="text-sm">
                Review and confirm affiliate commissions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                {commissions.map((commission) => (
                  <div key={commission.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base capitalize">{commission.transaction_type}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{commission.description}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        Affiliate: {affiliates.find(a => a.id === commission.affiliate_id)?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(commission.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="text-left sm:text-right">
                        <p className={`font-semibold text-sm sm:text-base ${
                          commission.transaction_type === 'earned' ? 'text-green-600' : 
                          commission.transaction_type === 'paid' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {commission.transaction_type === 'reversed' ? '-' : '+'}₹{commission.amount.toFixed(2)}
                        </p>
                        <Badge variant={commission.status === 'confirmed' ? "default" : "secondary"} className="text-xs">
                          {commission.status}
                        </Badge>
                      </div>
                      {commission.status === 'pending' && commission.transaction_type === 'earned' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmCommission(commission.id)}
                          className="h-9 touch-manipulation"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Confirm</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {commissions.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No commissions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Payout Management</CardTitle>
              <CardDescription className="text-sm">
                Process affiliate payout requests
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                {payouts.map((payout) => (
                  <div key={payout.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">Payout Request</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        Affiliate: {affiliates.find(a => a.id === payout.affiliate_id)?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Method: {payout.payment_method.toUpperCase()}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(payout.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-sm sm:text-base text-green-600">₹{payout.amount.toFixed(2)}</p>
                        <Badge variant={payout.status === 'completed' ? "default" : "secondary"} className="text-xs">
                          {payout.status}
                        </Badge>
                      </div>
                      {payout.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayout(payout.id, 'completed')}
                            className="h-9 touch-manipulation"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="text-xs">Complete</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleProcessPayout(payout.id, 'failed')}
                            className="h-9 touch-manipulation"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            <span className="text-xs">Reject</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {payouts.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No payout requests yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Stats Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Product Performance</CardTitle>
              <CardDescription className="text-sm">
                Affiliate performance by product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                {productStats.map((stat: any) => (
                  <div key={stat.product_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{stat.product_name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">₹{stat.product_price}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="text-center sm:text-right">
                        <p className="font-medium">{stat.total_orders}</p>
                        <p className="text-gray-500">Total Orders</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="font-medium text-green-600">₹{stat.total_commission.toFixed(2)}</p>
                        <p className="text-gray-500">Total Commission</p>
                      </div>
                    </div>
                  </div>
                ))}
                {productStats.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No product stats available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Affiliate Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Affiliate Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete affiliate information and performance metrics
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
            {selectedAffiliate && (
              <div className="affiliate-details space-y-4 sm:space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">Name</Label>
                    <p className="font-medium text-sm sm:text-base">{selectedAffiliate.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Mobile Number</Label>
                    <p className="font-medium text-sm sm:text-base">{selectedAffiliate.mobile_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Affiliate Code</Label>
                    <Badge variant="outline" className="text-xs sm:text-sm">{selectedAffiliate.affiliate_code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Status</Label>
                    <Badge variant={selectedAffiliate.is_active ? "default" : "secondary"} className="text-xs sm:text-sm">
                      {selectedAffiliate.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">Total Clicks</Label>
                    <p className="text-xl sm:text-2xl font-bold">{selectedAffiliate.total_clicks}</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Total Orders</Label>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{selectedAffiliate.total_orders}</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Total Earnings</Label>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">₹{selectedAffiliate.total_earnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Pending Commission</Label>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">₹{selectedAffiliate.pending_commission.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm sm:text-base">Joined Date</Label>
                  <p className="font-medium text-sm sm:text-base">{new Date(selectedAffiliate.created_at).toLocaleDateString()}</p>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex justify-end">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete affiliate "{affiliateToDelete?.name}"?
              <br /><br />
              <strong>This action cannot be undone.</strong> All associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Click history</li>
                <li>Order records</li>
                <li>Commission history</li>
                <li>Payout records</li>
              </ul>
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAffiliate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Affiliate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}