import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Users, 
  Gift,
  TrendingUp,
  DollarSign,
  Share2,
  Coins,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface Coupon {
  id: string;
  coupon_code: string;
  coupon_title: string;
  description: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  applicable_on: 'all' | 'products' | 'categories';
  is_user_specific: boolean;
  target_user_ids?: string[];
  is_affiliate_specific: boolean;
  affiliate_id?: string;
  coins_integration_type: 'none' | 'earn_extra' | 'purchasable' | 'required';
  bonus_coins_earned: number;
  coins_required_to_unlock: number;
  min_coins_required: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  total_usage_limit?: number;
  per_user_usage_limit: number;
  daily_usage_limit?: number;
  allow_stacking_with_coupons: boolean;
  allow_stacking_with_coins: boolean;
  total_usage_count: number;
  total_discount_given: number;
  total_revenue_generated: number;
  created_at: string;
}

interface CouponFormData {
  coupon_code: string;
  coupon_title: string;
  description: string;
  discount_type: 'flat' | 'percentage';
  discount_value: string;
  max_discount_amount: string;
  min_order_value: string;
  applicable_on: 'all' | 'products' | 'categories';
  is_user_specific: boolean;
  is_affiliate_specific: boolean;
  affiliate_id: string;
  coins_integration_type: 'none' | 'earn_extra' | 'purchasable' | 'required';
  bonus_coins_earned: string;
  coins_required_to_unlock: string;
  min_coins_required: string;
  start_date: string;
  end_date: string;
  total_usage_limit: string;
  per_user_usage_limit: string;
  daily_usage_limit: string;
  allow_stacking_with_coupons: boolean;
  allow_stacking_with_coins: boolean;
}

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'flat' | 'percentage'>('all');

  const [formData, setFormData] = useState<CouponFormData>({
    coupon_code: '',
    coupon_title: '',
    description: '',
    discount_type: 'flat',
    discount_value: '',
    max_discount_amount: '',
    min_order_value: '0',
    applicable_on: 'all',
    is_user_specific: false,
    is_affiliate_specific: false,
    affiliate_id: '',
    coins_integration_type: 'none',
    bonus_coins_earned: '0',
    coins_required_to_unlock: '0',
    min_coins_required: '0',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    total_usage_limit: '',
    per_user_usage_limit: '1',
    daily_usage_limit: '',
    allow_stacking_with_coupons: false,
    allow_stacking_with_coins: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Filter and search effect
  useEffect(() => {
    let filtered = [...coupons];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(coupon => 
        coupon.coupon_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.coupon_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(coupon => 
        statusFilter === 'active' ? coupon.is_active : !coupon.is_active
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(coupon => coupon.discount_type === typeFilter);
    }

    setFilteredCoupons(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [coupons, searchQuery, statusFilter, typeFilter]);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const generateCouponCode = () => {
    const prefix = 'SAVE';
    const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    setFormData(prev => ({ ...prev, coupon_code: `${prefix}${randomNum}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const discountValue = parseFloat(formData.discount_value);
    const minOrderValue = parseFloat(formData.min_order_value);
    
    // BUG FIX #4: Discount value validation
    if (formData.discount_type === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      toast.error('Percentage discount must be between 0 and 100');
      return;
    }
    
    if (formData.discount_type === 'flat' && discountValue <= 0) {
      toast.error('Flat discount must be greater than 0');
      return;
    }
    
    // BUG FIX #6: Minimum order value validation
    if (minOrderValue < 0) {
      toast.error('Minimum order value cannot be negative');
      return;
    }
    
    // BUG FIX #5: Date validation
    if (formData.end_date && formData.end_date < formData.start_date) {
      toast.error('End date must be after start date');
      return;
    }
    
    try {
      const couponCode = formData.coupon_code.toUpperCase();
      
      // BUG FIX #3: Check for duplicate coupon code
      if (!editingCoupon) {
        const { data: existingCoupon, error: checkError } = await (supabase as any)
          .from('coupons')
          .select('id')
          .eq('coupon_code', couponCode)
          .single();
        
        if (existingCoupon) {
          toast.error(`Coupon code "${couponCode}" already exists. Please use a different code.`);
          return;
        }
      } else {
        // When editing, check if code exists for other coupons
        const { data: existingCoupon, error: checkError } = await (supabase as any)
          .from('coupons')
          .select('id')
          .eq('coupon_code', couponCode)
          .neq('id', editingCoupon.id)
          .single();
        
        if (existingCoupon) {
          toast.error(`Coupon code "${couponCode}" already exists. Please use a different code.`);
          return;
        }
      }
      
      const couponData = {
        coupon_code: couponCode,
        coupon_title: formData.coupon_title,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: discountValue,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        min_order_value: minOrderValue,
        applicable_on: formData.applicable_on,
        is_user_specific: formData.is_user_specific,
        is_affiliate_specific: formData.is_affiliate_specific,
        affiliate_id: formData.affiliate_id || null,
        coins_integration_type: formData.coins_integration_type,
        bonus_coins_earned: parseInt(formData.bonus_coins_earned),
        coins_required_to_unlock: parseInt(formData.coins_required_to_unlock),
        min_coins_required: parseInt(formData.min_coins_required),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_user_usage_limit: parseInt(formData.per_user_usage_limit),
        daily_usage_limit: formData.daily_usage_limit ? parseInt(formData.daily_usage_limit) : null,
        allow_stacking_with_coupons: formData.allow_stacking_with_coupons,
        allow_stacking_with_coins: formData.allow_stacking_with_coins,
        is_active: true
      };

      let result;
      if (editingCoupon) {
        result = await (supabase as any)
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
      } else {
        result = await (supabase as any)
          .from('coupons')
          .insert([couponData]);
      }

      if (result.error) throw result.error;

      // BUG FIX #8: Detailed success message
      const discountText = formData.discount_type === 'flat' 
        ? `₹${discountValue}` 
        : `${discountValue}%`;
      toast.success(
        editingCoupon 
          ? `Coupon "${couponCode}" updated successfully with ${discountText} discount!` 
          : `Coupon "${couponCode}" created successfully with ${discountText} discount!`
      );
      
      setShowCreateDialog(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Failed to save coupon');
    }
  };

  const resetForm = () => {
    setFormData({
      coupon_code: '',
      coupon_title: '',
      description: '',
      discount_type: 'flat',
      discount_value: '',
      max_discount_amount: '',
      min_order_value: '0',
      applicable_on: 'all',
      is_user_specific: false,
      is_affiliate_specific: false,
      affiliate_id: '',
      coins_integration_type: 'none',
      bonus_coins_earned: '0',
      coins_required_to_unlock: '0',
      min_coins_required: '0',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      total_usage_limit: '',
      per_user_usage_limit: '1',
      daily_usage_limit: '',
      allow_stacking_with_coupons: false,
      allow_stacking_with_coins: true
    });
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      coupon_code: coupon.coupon_code,
      coupon_title: coupon.coupon_title,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      max_discount_amount: coupon.max_discount_amount?.toString() || '',
      min_order_value: coupon.min_order_value.toString(),
      applicable_on: coupon.applicable_on,
      is_user_specific: coupon.is_user_specific,
      is_affiliate_specific: coupon.is_affiliate_specific,
      affiliate_id: coupon.affiliate_id || '',
      coins_integration_type: coupon.coins_integration_type,
      bonus_coins_earned: coupon.bonus_coins_earned.toString(),
      coins_required_to_unlock: coupon.coins_required_to_unlock.toString(),
      min_coins_required: coupon.min_coins_required.toString(),
      start_date: coupon.start_date.split('T')[0],
      end_date: coupon.end_date?.split('T')[0] || '',
      total_usage_limit: coupon.total_usage_limit?.toString() || '',
      per_user_usage_limit: coupon.per_user_usage_limit.toString(),
      daily_usage_limit: coupon.daily_usage_limit?.toString() || '',
      allow_stacking_with_coupons: coupon.allow_stacking_with_coupons,
      allow_stacking_with_coins: coupon.allow_stacking_with_coins
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (couponId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon deleted successfully!');
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const openDeleteDialog = (couponId: string) => {
    setCouponToDelete(couponId);
    setDeleteDialogOpen(true);
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('coupons')
        .update({ is_active: !currentStatus })
        .eq('id', couponId);

      if (error) throw error;

      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon status:', error);
      toast.error('Failed to update coupon status');
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard!');
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCoupons = filteredCoupons.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">🎉 Coupon Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create and manage promotional coupons
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { resetForm(); setEditingCoupon(null); }}
              className="h-11 sm:h-10 md:h-11 touch-manipulation w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-4 sm:p-5 md:p-6 pb-3">
              <DialogTitle className="text-lg sm:text-xl">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 p-4 sm:p-5 md:p-6 pt-0">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
                  <TabsTrigger value="targeting" className="text-xs sm:text-sm">Targeting</TabsTrigger>
                  <TabsTrigger value="loyalty" className="text-xs sm:text-sm">Loyalty</TabsTrigger>
                  <TabsTrigger value="limits" className="text-xs sm:text-sm">Limits</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="coupon_code" className="text-sm font-medium mb-1.5 block">Coupon Code *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coupon_code"
                          value={formData.coupon_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                          placeholder="SAVE50"
                          required
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                        <Button type="button" variant="outline" onClick={generateCouponCode} className="h-11 sm:h-10 md:h-11 touch-manipulation whitespace-nowrap">
                          Generate
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="coupon_title" className="text-sm font-medium mb-1.5 block">Coupon Title *</Label>
                      <Input
                        id="coupon_title"
                        value={formData.coupon_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, coupon_title: e.target.value }))}
                        placeholder="Welcome Discount"
                        required
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Get amazing discount on your order"
                      rows={3}
                      className="resize-none touch-manipulation"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="discount_type" className="text-sm font-medium mb-1.5 block">Discount Type *</Label>
                      <Select value={formData.discount_type} onValueChange={(value: 'flat' | 'percentage') => 
                        setFormData(prev => ({ ...prev, discount_type: value }))}>
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value" className="text-sm font-medium mb-1.5 block">
                        Discount Value * {formData.discount_type === 'flat' ? '(₹)' : '(%)'}
                      </Label>
                      <Input
                        id="discount_value"
                        type="number"
                        value={formData.discount_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                        placeholder={formData.discount_type === 'flat' ? '100' : '20'}
                        required
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    {formData.discount_type === 'percentage' && (
                      <div>
                        <Label htmlFor="max_discount_amount" className="text-sm font-medium mb-1.5 block">Max Discount (₹)</Label>
                        <Input
                          id="max_discount_amount"
                          type="number"
                          value={formData.max_discount_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: e.target.value }))}
                          placeholder="500"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="min_order_value" className="text-sm font-medium mb-1.5 block">Minimum Order Value (₹)</Label>
                      <Input
                        id="min_order_value"
                        type="number"
                        value={formData.min_order_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_order_value: e.target.value }))}
                        placeholder="0"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="applicable_on" className="text-sm font-medium mb-1.5 block">Applicable On</Label>
                      <Select value={formData.applicable_on} onValueChange={(value: 'all' | 'products' | 'categories') => 
                        setFormData(prev => ({ ...prev, applicable_on: value }))}>
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="products">Selected Products</SelectItem>
                          <SelectItem value="categories">Selected Categories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="start_date" className="text-sm font-medium mb-1.5 block">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date" className="text-sm font-medium mb-1.5 block">End Date (Optional)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="targeting" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_user_specific"
                        checked={formData.is_user_specific}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_user_specific: checked }))}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="is_user_specific" className="text-sm cursor-pointer">User-Specific Coupon</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_affiliate_specific"
                        checked={formData.is_affiliate_specific}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_affiliate_specific: checked }))}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="is_affiliate_specific" className="text-sm cursor-pointer">Affiliate-Specific Coupon</Label>
                    </div>

                    {formData.is_affiliate_specific && (
                      <div>
                        <Label htmlFor="affiliate_id" className="text-sm font-medium mb-1.5 block">Affiliate ID</Label>
                        <Input
                          id="affiliate_id"
                          value={formData.affiliate_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, affiliate_id: e.target.value }))}
                          placeholder="Enter affiliate ID"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-3 sm:space-y-4 mt-4">
                  <div>
                    <Label htmlFor="coins_integration_type" className="text-sm font-medium mb-1.5 block">Loyalty Coins Integration</Label>
                    <Select value={formData.coins_integration_type} onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, coins_integration_type: value }))}>
                      <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Integration</SelectItem>
                        <SelectItem value="earn_extra">Earn Extra Coins</SelectItem>
                        <SelectItem value="purchasable">Purchasable with Coins</SelectItem>
                        <SelectItem value="required">Coins Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.coins_integration_type === 'earn_extra' && (
                    <div>
                      <Label htmlFor="bonus_coins_earned" className="text-sm font-medium mb-1.5 block">Bonus Coins Earned</Label>
                      <Input
                        id="bonus_coins_earned"
                        type="number"
                        value={formData.bonus_coins_earned}
                        onChange={(e) => setFormData(prev => ({ ...prev, bonus_coins_earned: e.target.value }))}
                        placeholder="50"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  )}

                  {formData.coins_integration_type === 'purchasable' && (
                    <div>
                      <Label htmlFor="coins_required_to_unlock" className="text-sm font-medium mb-1.5 block">Coins Required to Unlock</Label>
                      <Input
                        id="coins_required_to_unlock"
                        type="number"
                        value={formData.coins_required_to_unlock}
                        onChange={(e) => setFormData(prev => ({ ...prev, coins_required_to_unlock: e.target.value }))}
                        placeholder="100"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  )}

                  {formData.coins_integration_type === 'required' && (
                    <div>
                      <Label htmlFor="min_coins_required" className="text-sm font-medium mb-1.5 block">Minimum Coins Required</Label>
                      <Input
                        id="min_coins_required"
                        type="number"
                        value={formData.min_coins_required}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_coins_required: e.target.value }))}
                        placeholder="200"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="limits" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="total_usage_limit" className="text-sm font-medium mb-1.5 block">Total Usage Limit</Label>
                      <Input
                        id="total_usage_limit"
                        type="number"
                        value={formData.total_usage_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_usage_limit: e.target.value }))}
                        placeholder="1000"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="per_user_usage_limit" className="text-sm font-medium mb-1.5 block">Per User Limit *</Label>
                      <Input
                        id="per_user_usage_limit"
                        type="number"
                        value={formData.per_user_usage_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, per_user_usage_limit: e.target.value }))}
                        placeholder="1"
                        required
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="daily_usage_limit" className="text-sm font-medium mb-1.5 block">Daily Usage Limit</Label>
                      <Input
                        id="daily_usage_limit"
                        type="number"
                        value={formData.daily_usage_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, daily_usage_limit: e.target.value }))}
                        placeholder="100"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="font-medium text-sm sm:text-base">Stacking Rules</h4>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow_stacking_with_coupons"
                        checked={formData.allow_stacking_with_coupons}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_stacking_with_coupons: checked }))}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="allow_stacking_with_coupons" className="text-sm cursor-pointer">Allow stacking with other coupons</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow_stacking_with_coins"
                        checked={formData.allow_stacking_with_coins}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_stacking_with_coins: checked }))}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="allow_stacking_with_coins" className="text-sm cursor-pointer">Allow stacking with loyalty coins</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t">
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Coupons</p>
                <p className="text-lg sm:text-2xl font-bold">{coupons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Active Coupons</p>
                <p className="text-lg sm:text-2xl font-bold">{coupons.filter(c => c.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Discount</p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  ₹{coupons.reduce((sum, c) => sum + c.total_discount_given, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Usage</p>
                <p className="text-lg sm:text-2xl font-bold">{coupons.reduce((sum, c) => sum + c.total_usage_count, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 sm:h-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 sm:h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {filteredCoupons.length} of {coupons.length} coupons
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupons List */}
      <Card>
        <CardHeader className="p-4 sm:p-5 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">All Coupons</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Gift className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No coupons match your filters' 
                  : 'No coupons found'}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first coupon to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Coupon
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {currentCoupons.map((coupon) => {
                  const isLimitReached = coupon.total_usage_limit && coupon.total_usage_count >= coupon.total_usage_limit;
                  
                  return (
                    <div key={coupon.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base sm:text-lg">{coupon.coupon_title}</h3>
                            <Badge 
                              variant={coupon.is_active ? "default" : "secondary"}
                              className={`text-xs ${coupon.is_active ? "bg-green-100 text-green-800" : ""}`}
                            >
                              {coupon.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {isLimitReached && (
                              <Badge variant="destructive" className="text-xs">
                                Limit Reached
                              </Badge>
                            )}
                            {coupon.is_user_specific && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                User Specific
                              </Badge>
                            )}
                            {coupon.is_affiliate_specific && (
                              <Badge variant="outline" className="text-xs">
                                <Share2 className="h-3 w-3 mr-1" />
                                Affiliate
                              </Badge>
                            )}
                            {coupon.coins_integration_type !== 'none' && (
                              <Badge variant="outline" className="text-xs">
                                <Coins className="h-3 w-3 mr-1" />
                                Coins
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2">
                            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {coupon.coupon_code}
                            </span>
                            <span>
                              {coupon.discount_type === 'flat' 
                                ? `₹${coupon.discount_value} OFF` 
                                : `${coupon.discount_value}% OFF`
                              }
                            </span>
                            <span>Min: ₹{coupon.min_order_value}</span>
                            <span>Used: {coupon.total_usage_count}x
                              {coupon.total_usage_limit && ` / ${coupon.total_usage_limit}`}
                            </span>
                            <span className="hidden sm:inline">Revenue: ₹{coupon.total_revenue_generated.toFixed(0)}</span>
                          </div>
                          
                          {coupon.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{coupon.description}</p>
                          )}
                        </div>
                        
                        <div className="flex sm:flex-col lg:flex-row items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCouponCode(coupon.coupon_code)}
                            title="Copy coupon code"
                            className="h-9 w-9 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                            title="Edit coupon"
                            className="h-9 w-9 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                            title={coupon.is_active ? 'Deactivate' : 'Activate'}
                            className="h-9 w-9 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(coupon.id)}
                            title="Delete coupon"
                            className="text-red-600 hover:text-red-700 h-9 w-9 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredCoupons.length)} of {filteredCoupons.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="h-9 w-9 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this coupon. This action cannot be undone.
              All usage history will be preserved but the coupon will no longer be available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCouponToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => couponToDelete && handleDelete(couponToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CouponManagement;