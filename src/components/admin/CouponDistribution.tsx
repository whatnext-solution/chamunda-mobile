import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Users, 
  Gift, 
  Mail, 
  MessageSquare,
  UserCheck,
  Search,
  Filter,
  Calendar,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
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

interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  created_at: string;
  last_order_date?: string;
  total_orders?: number;
  total_spent?: number;
}

interface Coupon {
  id: string;
  coupon_code: string;
  coupon_title: string;
  description: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  min_order_value: number;
  is_active: boolean;
  end_date?: string;
}

interface DistributionData {
  coupon_id: string;
  user_selection: 'all' | 'specific' | 'filtered';
  selected_users: string[];
  filter_criteria: {
    min_orders?: number;
    min_spent?: number;
    inactive_days?: number;
    registration_days?: number;
  };
  assignment_reason: string;
  send_notification: boolean;
  notification_method: 'email' | 'sms' | 'both';
  custom_message: string;
  expires_in_days?: number;
}

const CouponDistribution = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [distributionData, setDistributionData] = useState<DistributionData>({
    coupon_id: '',
    user_selection: 'specific',
    selected_users: [],
    filter_criteria: {},
    assignment_reason: '',
    send_notification: true,
    notification_method: 'email',
    custom_message: '',
    expires_in_days: 30
  });

  useEffect(() => {
    fetchUsers();
    fetchCoupons();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get users from user_profiles table (using type assertion for table not in types)
      const { data: usersData, error } = await (supabase as any)
        .from('user_profiles')
        .select(`
          id,
          user_id,
          email,
          phone,
          full_name,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get order statistics for each user
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user: any) => {
          // Get order statistics for each user by joining orders with customers
          const { data: orderStats } = await (supabase as any)
            .from('orders')
            .select(`
              created_at, 
              total_amount,
              customers!inner(email)
            `)
            .eq('customers.email', user.email);

          const totalOrders = orderStats?.length || 0;
          const totalSpent = orderStats?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
          const lastOrderDate = orderStats?.length > 0 
            ? [...orderStats].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;

          return {
            id: user.user_id, // Use user_id for consistency
            email: user.email,
            phone: user.phone,
            full_name: user.full_name,
            created_at: user.created_at,
            total_orders: totalOrders,
            total_spent: totalSpent,
            last_order_date: lastOrderDate
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm)
    );
  });

  const getFilteredUsers = () => {
    const { filter_criteria } = distributionData;
    
    return users.filter(user => {
      // Minimum orders filter
      if (filter_criteria.min_orders && (user.total_orders || 0) < filter_criteria.min_orders) {
        return false;
      }
      
      // Minimum spent filter
      if (filter_criteria.min_spent && (user.total_spent || 0) < filter_criteria.min_spent) {
        return false;
      }
      
      // Inactive days filter
      if (filter_criteria.inactive_days) {
        const daysSinceLastOrder = user.last_order_date 
          ? Math.floor((Date.now() - new Date(user.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        if (daysSinceLastOrder < filter_criteria.inactive_days) {
          return false;
        }
      }
      
      // Registration days filter
      if (filter_criteria.registration_days) {
        const daysSinceRegistration = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceRegistration < filter_criteria.registration_days) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleUserSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const validateDistribution = () => {
    // BUG FIX #5: Validate coupon selection
    if (!distributionData.coupon_id) {
      toast.error('Please select a coupon');
      return false;
    }

    // BUG FIX #4: Validate coupon is active and not expired
    const selectedCoupon = coupons.find(c => c.id === distributionData.coupon_id);
    if (!selectedCoupon) {
      toast.error('Selected coupon not found');
      return false;
    }

    if (!selectedCoupon.is_active) {
      toast.error('Cannot distribute inactive coupon. Please activate it first.');
      return false;
    }

    if (selectedCoupon.end_date && new Date(selectedCoupon.end_date) < new Date()) {
      toast.error('Cannot distribute expired coupon. Please select an active coupon.');
      return false;
    }

    // Validate user selection
    let targetUsers: string[] = [];
    switch (distributionData.user_selection) {
      case 'all':
        targetUsers = users.map(u => u.id);
        break;
      case 'specific':
        targetUsers = selectedUsers;
        break;
      case 'filtered':
        targetUsers = getFilteredUsers().map(u => u.id);
        break;
    }

    if (targetUsers.length === 0) {
      toast.error('No users selected for coupon distribution');
      return false;
    }

    return true;
  };

  const handleDistributeCoupons = async () => {
    if (!validateDistribution()) {
      return;
    }

    // BUG FIX #6: Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmDistribution = async () => {
    let targetUsers: string[] = [];
    
    switch (distributionData.user_selection) {
      case 'all':
        targetUsers = users.map(u => u.id);
        break;
      case 'specific':
        targetUsers = selectedUsers;
        break;
      case 'filtered':
        targetUsers = getFilteredUsers().map(u => u.id);
        break;
    }

    try {
      setLoading(true);
      setShowConfirmDialog(false);
      
      const selectedCoupon = coupons.find(c => c.id === distributionData.coupon_id);
      
      // BUG FIX #3: Check for duplicate assignments
      const { data: existingAssignments } = await (supabase as any)
        .from('user_coupons')
        .select('user_id')
        .eq('coupon_id', distributionData.coupon_id)
        .in('user_id', targetUsers)
        .eq('is_used', false);

      const existingUserIds = new Set((existingAssignments || []).map((a: any) => a.user_id));
      const newUsers = targetUsers.filter(userId => !existingUserIds.has(userId));
      const skippedUsers = targetUsers.length - newUsers.length;

      if (newUsers.length === 0) {
        toast.error('All selected users already have this coupon assigned');
        return;
      }

      if (skippedUsers > 0) {
        toast.warning(`Skipping ${skippedUsers} users who already have this coupon`);
      }
      
      // Calculate expiry date
      const expiresAt = distributionData.expires_in_days 
        ? new Date(Date.now() + distributionData.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Distribute coupons to new users only
      const userCoupons = newUsers.map(userId => ({
        user_id: userId,
        coupon_id: distributionData.coupon_id,
        assignment_reason: distributionData.assignment_reason || 'Admin distribution',
        expires_at: expiresAt,
        assigned_at: new Date().toISOString()
      }));

      const { error: insertError } = await (supabase as any)
        .from('user_coupons')
        .insert(userCoupons);

      if (insertError) throw insertError;

      // Send notifications if requested
      let notificationResult = null;
      if (distributionData.send_notification) {
        notificationResult = await sendNotifications(newUsers);
      }

      // BUG FIX #7: Detailed success message
      const successMessage = `
        ✅ Coupon "${selectedCoupon?.coupon_code}" distributed successfully!
        • Users: ${newUsers.length} ${skippedUsers > 0 ? `(${skippedUsers} skipped)` : ''}
        • Reason: ${distributionData.assignment_reason || 'Admin distribution'}
        • Expiry: ${distributionData.expires_in_days ? `${distributionData.expires_in_days} days` : 'No expiry'}
        ${notificationResult ? `• Notifications: ${notificationResult.success} sent, ${notificationResult.failed} failed` : ''}
      `.trim();
      
      toast.success(successMessage, { duration: 5000 });
      setShowDistributeDialog(false);
      resetDistributionData();
      
    } catch (error) {
      console.error('Error distributing coupons:', error);
      toast.error('Failed to distribute coupons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendNotifications = async (userIds: string[]) => {
    try {
      const selectedCoupon = coupons.find(c => c.id === distributionData.coupon_id);
      if (!selectedCoupon) return { success: 0, failed: 0 };

      // Get user details for notifications (using type assertion for table not in types)
      const { data: usersData } = await (supabase as any)
        .from('user_profiles')
        .select('user_id, email, phone, full_name')
        .in('user_id', userIds);

      if (!usersData || usersData.length === 0) return { success: 0, failed: 0 };

      // Prepare coupon data for notification
      const couponNotificationData = {
        couponCode: selectedCoupon.coupon_code,
        couponTitle: selectedCoupon.coupon_title,
        discountValue: selectedCoupon.discount_value,
        discountType: selectedCoupon.discount_type,
        minOrderValue: selectedCoupon.min_order_value,
        expiryDate: selectedCoupon.end_date,
        customMessage: distributionData.custom_message
      };

      // Prepare recipients
      const recipients = usersData.map((user: any) => ({
        email: user.email,
        phone: user.phone,
        name: user.full_name
      }));

      // Send bulk notifications
      const result = await notificationService.sendBulkCouponNotifications(
        recipients,
        distributionData.notification_method,
        couponNotificationData
      );

      console.log('Notification results:', result);
      
      // BUG FIX #10: Better notification error handling
      if (result.failed > 0) {
        toast.warning(`Notifications: ${result.success} sent successfully, ${result.failed} failed`);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications. Coupons were distributed but notifications failed.');
      return { success: 0, failed: userIds.length };
    }
  };

  const resetDistributionData = () => {
    setDistributionData({
      coupon_id: '',
      user_selection: 'specific',
      selected_users: [],
      filter_criteria: {},
      assignment_reason: '',
      send_notification: true,
      notification_method: 'email',
      custom_message: '',
      expires_in_days: 30
    });
    setSelectedUsers([]);
  };

  const getUserStats = (user: User) => {
    const daysSinceRegistration = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastOrder = user.last_order_date 
      ? Math.floor((Date.now() - new Date(user.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return { daysSinceRegistration, daysSinceLastOrder };
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // BUG FIX #8: Real-time filter count update
  const filteredUsersCount = getFilteredUsers().length;

  // Check if distribute button should be disabled
  const isDistributeDisabled = !distributionData.coupon_id || 
    (distributionData.user_selection === 'specific' && selectedUsers.length === 0) ||
    (distributionData.user_selection === 'filtered' && filteredUsersCount === 0);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">🎁 Coupon Distribution</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Send coupons to customers via email, SMS, or notifications</p>
        </div>
        <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setShowDistributeDialog(true)}
              className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
            >
              <Send className="h-4 w-4 mr-2" />
              <span className="sm:inline">Distribute Coupons</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 md:p-6">
            <DialogHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10 pb-3 sm:pb-4">
              <DialogTitle className="text-lg sm:text-xl md:text-2xl">Distribute Coupons to Customers</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="coupon" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
                <TabsTrigger value="coupon" className="text-xs sm:text-sm h-10 sm:h-9">
                  <span className="hidden sm:inline">Select </span>Coupon
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm h-10 sm:h-9">
                  <span className="hidden sm:inline">Select </span>Users
                </TabsTrigger>
                <TabsTrigger value="notification" className="text-xs sm:text-sm h-10 sm:h-9">
                  Notification
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs sm:text-sm h-10 sm:h-9">
                  Review<span className="hidden sm:inline"> & Send</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="coupon" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="coupon_select" className="mb-1.5 block text-sm sm:text-base">Select Coupon to Distribute</Label>
                  <Select 
                    value={distributionData.coupon_id} 
                    onValueChange={(value) => setDistributionData(prev => ({ ...prev, coupon_id: value }))}
                  >
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue placeholder="Choose a coupon" />
                    </SelectTrigger>
                    <SelectContent>
                      {coupons.map((coupon) => (
                        <SelectItem key={coupon.id} value={coupon.id}>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono">{coupon.coupon_code}</span>
                            <span>-</span>
                            <span>{coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`} OFF</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignment_reason" className="mb-1.5 block text-sm sm:text-base">Assignment Reason</Label>
                  <Input
                    id="assignment_reason"
                    value={distributionData.assignment_reason}
                    onChange={(e) => setDistributionData(prev => ({ ...prev, assignment_reason: e.target.value }))}
                    placeholder="e.g., Welcome bonus, Loyalty reward"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="expires_in_days" className="mb-1.5 block text-sm sm:text-base">Expires in Days (Optional)</Label>
                  <Input
                    id="expires_in_days"
                    type="number"
                    value={distributionData.expires_in_days || ''}
                    onChange={(e) => setDistributionData(prev => ({ ...prev, expires_in_days: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="30"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4 mt-4">
                <div>
                  <Label className="mb-1.5 block text-sm sm:text-base">User Selection Method</Label>
                  <Select 
                    value={distributionData.user_selection} 
                    onValueChange={(value: 'all' | 'specific' | 'filtered') => 
                      setDistributionData(prev => ({ ...prev, user_selection: value }))
                    }
                  >
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="specific">Specific Users</SelectItem>
                      <SelectItem value="filtered">Filtered Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {distributionData.user_selection === 'filtered' && (
                  <div className="space-y-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 className="font-medium text-sm sm:text-base">Filter Criteria</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label className="mb-1.5 block text-sm">Minimum Orders</Label>
                        <Input
                          type="number"
                          value={distributionData.filter_criteria.min_orders || ''}
                          onChange={(e) => setDistributionData(prev => ({
                            ...prev,
                            filter_criteria: { ...prev.filter_criteria, min_orders: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          placeholder="e.g., 5"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm">Minimum Spent (₹)</Label>
                        <Input
                          type="number"
                          value={distributionData.filter_criteria.min_spent || ''}
                          onChange={(e) => setDistributionData(prev => ({
                            ...prev,
                            filter_criteria: { ...prev.filter_criteria, min_spent: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          placeholder="e.g., 10000"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm">Inactive for Days</Label>
                        <Input
                          type="number"
                          value={distributionData.filter_criteria.inactive_days || ''}
                          onChange={(e) => setDistributionData(prev => ({
                            ...prev,
                            filter_criteria: { ...prev.filter_criteria, inactive_days: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          placeholder="e.g., 30"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm">Registered Since Days</Label>
                        <Input
                          type="number"
                          value={distributionData.filter_criteria.registration_days || ''}
                          onChange={(e) => setDistributionData(prev => ({
                            ...prev,
                            filter_criteria: { ...prev.filter_criteria, registration_days: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          placeholder="e.g., 7"
                          className="h-11 sm:h-10 md:h-11 touch-manipulation"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Filtered users: {filteredUsersCount}
                    </div>
                  </div>
                )}

                {distributionData.user_selection === 'specific' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-1.5 block text-sm sm:text-base">Search Users</Label>
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by email, name, or phone..."
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {filteredUsers.map((user) => {
                        const { daysSinceRegistration, daysSinceLastOrder } = getUserStats(user);
                        const isSelected = selectedUsers.includes(user.id);
                        
                        return (
                          <div key={user.id} className="flex items-start sm:items-center gap-3 p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-900 touch-manipulation">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                              className="mt-1 sm:mt-0 w-4 h-4 touch-manipulation"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate">{user.full_name || user.email}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</div>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {user.total_orders || 0} orders
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  ₹{user.total_spent || 0}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {daysSinceRegistration}d old
                                </Badge>
                                {daysSinceLastOrder && (
                                  <Badge variant="outline" className="text-xs">
                                    {daysSinceLastOrder}d inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="text-sm text-muted-foreground font-medium">
                      Selected: {selectedUsers.length} users
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notification" className="space-y-4 mt-4">
                <div className="flex items-center space-x-2 touch-manipulation">
                  <input
                    type="checkbox"
                    id="send_notification"
                    checked={distributionData.send_notification}
                    onChange={(e) => setDistributionData(prev => ({ ...prev, send_notification: e.target.checked }))}
                    className="w-4 h-4 touch-manipulation"
                  />
                  <Label htmlFor="send_notification" className="text-sm sm:text-base">Send notification to users</Label>
                </div>

                {distributionData.send_notification && (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-1.5 block text-sm sm:text-base">Notification Method</Label>
                      <Select 
                        value={distributionData.notification_method} 
                        onValueChange={(value: 'email' | 'sms' | 'both') => 
                          setDistributionData(prev => ({ ...prev, notification_method: value }))
                        }
                      >
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="both">Email + SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="custom_message" className="mb-1.5 block text-sm sm:text-base">Custom Message (Optional)</Label>
                      <Textarea
                        id="custom_message"
                        value={distributionData.custom_message}
                        onChange={(e) => setDistributionData(prev => ({ ...prev, custom_message: e.target.value }))}
                        placeholder="Add a personal message to your customers..."
                        rows={4}
                        className="touch-manipulation resize-none"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="review" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm sm:text-base">Distribution Summary</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="font-medium text-sm sm:text-base text-blue-800 dark:text-blue-200">Selected Coupon</div>
                      <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 mt-1 truncate">
                        {coupons.find(c => c.id === distributionData.coupon_id)?.coupon_code || 'None selected'}
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="font-medium text-sm sm:text-base text-green-800 dark:text-green-200">Target Users</div>
                      <div className="text-xs sm:text-sm text-green-600 dark:text-green-300 mt-1">
                        {distributionData.user_selection === 'all' ? users.length :
                         distributionData.user_selection === 'specific' ? selectedUsers.length :
                         getFilteredUsers().length} users
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="font-medium text-sm sm:text-base text-purple-800 dark:text-purple-200">Notification</div>
                      <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-300 mt-1 truncate">
                        {distributionData.send_notification ? distributionData.notification_method : 'No notification'}
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="font-medium text-sm sm:text-base text-orange-800 dark:text-orange-200">Expiry</div>
                      <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-300 mt-1">
                        {distributionData.expires_in_days ? `${distributionData.expires_in_days} days` : 'No expiry'}
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDistributeDialog(false)}
                      className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDistributeCoupons} 
                      disabled={loading || isDistributeDisabled}
                      className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
                    >
                      {loading ? 'Distributing...' : 'Distribute Coupons'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Users</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Active Coupons</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{coupons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Selected Users</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{selectedUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Ready to Send</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{distributionData.coupon_id && selectedUsers.length > 0 ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader className="p-4 sm:p-5 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Customer List ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:max-w-sm h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {currentUsers.map((user) => {
                const { daysSinceRegistration, daysSinceLastOrder } = getUserStats(user);
                const isSelected = selectedUsers.includes(user.id);
                
                return (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 touch-manipulation">
                    <div className="flex items-start sm:items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                        className="mt-1 sm:mt-0 w-4 h-4 touch-manipulation"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{user.full_name || user.email}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs sm:text-sm text-muted-foreground">{user.phone}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 ml-7 sm:ml-0">
                      <Badge variant="outline" className="text-xs">
                        {user.total_orders || 0} orders
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        ₹{user.total_spent || 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {daysSinceRegistration}d old
                      </Badge>
                      {daysSinceLastOrder !== null && (
                        <Badge 
                          variant={daysSinceLastOrder > 30 ? "destructive" : "outline"} 
                          className="text-xs"
                        >
                          {daysSinceLastOrder}d inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
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
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Coupon Distribution</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const selectedCoupon = coupons.find(c => c.id === distributionData.coupon_id);
                let targetCount = 0;
                switch (distributionData.user_selection) {
                  case 'all':
                    targetCount = users.length;
                    break;
                  case 'specific':
                    targetCount = selectedUsers.length;
                    break;
                  case 'filtered':
                    targetCount = filteredUsersCount;
                    break;
                }
                
                return (
                  <div className="space-y-2 mt-2">
                    <p>You are about to distribute the following coupon:</p>
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg space-y-1">
                      <p className="font-semibold">Coupon: {selectedCoupon?.coupon_code}</p>
                      <p className="text-sm">Discount: {selectedCoupon?.discount_type === 'flat' ? `₹${selectedCoupon?.discount_value}` : `${selectedCoupon?.discount_value}%`}</p>
                      <p className="text-sm">Target Users: {targetCount}</p>
                      {distributionData.assignment_reason && (
                        <p className="text-sm">Reason: {distributionData.assignment_reason}</p>
                      )}
                      {distributionData.send_notification && (
                        <p className="text-sm">Notification: {distributionData.notification_method}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This action cannot be undone. Users who already have this coupon will be skipped.
                    </p>
                  </div>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDistribution} disabled={loading}>
              {loading ? 'Distributing...' : 'Confirm & Distribute'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CouponDistribution;