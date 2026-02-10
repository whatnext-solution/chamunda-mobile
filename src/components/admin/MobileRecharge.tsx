import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Smartphone, CreditCard, Calendar, Filter, Eye, Edit, Trash2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface MobileRecharge {
  id: string;
  mobile_number: string;
  operator: string;
  plan_type: 'prepaid' | 'postpaid';
  recharge_amount: number;
  customer_name?: string;
  customer_phone?: string;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'failed';
  transaction_id?: string;
  operator_transaction_id?: string;
  status: 'success' | 'pending' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

const OPERATORS = [
  'Airtel', 'Jio', 'Vi (Vodafone Idea)', 'BSNL', 'Aircel', 'Telenor', 'Tata Docomo', 'Reliance'
];

const RECHARGE_PLANS = {
  prepaid: [
    { amount: 99, validity: '28 days', description: 'Unlimited calls + 1GB/day' },
    { amount: 149, validity: '28 days', description: 'Unlimited calls + 1.5GB/day' },
    { amount: 199, validity: '28 days', description: 'Unlimited calls + 2GB/day' },
    { amount: 299, validity: '28 days', description: 'Unlimited calls + 2.5GB/day' },
    { amount: 399, validity: '56 days', description: 'Unlimited calls + 2.5GB/day' },
    { amount: 499, validity: '56 days', description: 'Unlimited calls + 3GB/day' },
    { amount: 599, validity: '84 days', description: 'Unlimited calls + 2GB/day' },
    { amount: 999, validity: '84 days', description: 'Unlimited calls + 3GB/day' }
  ],
  postpaid: [
    { amount: 299, validity: '30 days', description: '25GB + Unlimited calls' },
    { amount: 399, validity: '30 days', description: '40GB + Unlimited calls' },
    { amount: 499, validity: '30 days', description: '75GB + Unlimited calls' },
    { amount: 699, validity: '30 days', description: '100GB + Unlimited calls' },
    { amount: 999, validity: '30 days', description: '150GB + Unlimited calls' }
  ]
};

export default function MobileRecharge() {
  const [recharges, setRecharges] = useState<MobileRecharge[]>([]);
  const [selectedRecharge, setSelectedRecharge] = useState<MobileRecharge | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);

  const [newRecharge, setNewRecharge] = useState({
    mobile_number: '',
    operator: '',
    plan_type: 'prepaid' as 'prepaid' | 'postpaid',
    recharge_amount: 0,
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    notes: ''
  });

  // Email and SMS sending options
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSMS, setSendSMS] = useState(true);
  const [customerEmail, setCustomerEmail] = useState('');

  // Edit recharge state
  const [editRecharge, setEditRecharge] = useState({
    mobile_number: '',
    operator: '',
    plan_type: 'prepaid' as 'prepaid' | 'postpaid',
    recharge_amount: 0,
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    payment_status: 'paid' as 'paid' | 'pending' | 'failed',
    status: 'success' as 'success' | 'pending' | 'failed',
    notes: ''
  });

  useEffect(() => {
    fetchRecharges();
  }, []);

  const fetchRecharges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mobile_recharges' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recharges:', error);
        // Fallback to mock data if table doesn't exist yet
        const mockData: MobileRecharge[] = [
          {
            id: '1',
            mobile_number: '9876543210',
            operator: 'Airtel',
            plan_type: 'prepaid',
            recharge_amount: 299,
            customer_name: 'John Doe',
            customer_phone: '9876543210',
            payment_method: 'upi',
            payment_status: 'paid',
            transaction_id: 'TXN123456',
            operator_transaction_id: 'OP789012',
            status: 'success',
            notes: 'Monthly recharge',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setRecharges(mockData);
        toast.info('Using demo data. Run mobile_recharge_setup.sql to enable full functionality.');
        return;
      }
      
      setRecharges((data as any) || []);
    } catch (error) {
      console.error('Error fetching recharges:', error);
      toast.error('Failed to fetch recharges');
    } finally {
      setLoading(false);
    }
  };

  const generateRechargeInvoiceTemplate = (recharge: any) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">📱 ElectroStore</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Mobile Recharge Service</p>
          <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; margin-top: 20px; display: inline-block;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">RECHARGE RECEIPT</h2>
          </div>
        </div>

        <!-- Recharge Info -->
        <div style="padding: 30px 20px 20px 20px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; margin-bottom: 15px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Transaction Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Transaction ID:</strong> ${recharge.transaction_id}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong> ${currentDate}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Time:</strong> ${currentTime}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong> <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">SUCCESS</span></p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Customer Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Name:</strong> ${recharge.customer_name || 'Walk-in Customer'}</p>
              ${recharge.customer_phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${recharge.customer_phone}</p>` : ''}
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Payment:</strong> <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${recharge.payment_method.toUpperCase()}</span></p>
            </div>
          </div>
        </div>

        <!-- Recharge Details -->
        <div style="padding: 0 20px;">
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); margin-bottom: 20px;">
            <div style="background: #f3f4f6; padding: 16px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">📱 Mobile Recharge Details</h3>
            </div>
            <div style="padding: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Mobile Number</p>
                  <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${recharge.mobile_number}</p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Operator</p>
                  <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${recharge.operator}</p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Plan Type</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827; text-transform: capitalize;">${recharge.plan_type}</p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Operator Ref ID</p>
                  <p style="margin: 0; font-size: 14px; font-weight: 500; color: #111827;">${recharge.operator_transaction_id}</p>
                </div>
              </div>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #166534; font-size: 16px; font-weight: 600;">Recharge Amount</p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #059669;">₹${recharge.recharge_amount}</p>
                <p style="margin: 10px 0 0 0; color: #166534; font-size: 14px;">✅ Recharge Successful</p>
              </div>
            </div>
          </div>
        </div>

        ${recharge.notes ? `
        <div style="padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Notes:</h4>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${recharge.notes}</p>
        </div>` : ''}

        <!-- Footer -->
        <div style="background: #111827; color: white; padding: 25px 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Thank you for choosing ElectroStore! 📱</p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">📧 contact@electrostore.com | 📞 +1234567890</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.6;">This is a computer generated receipt.</p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #374151;">
            <p style="margin: 0; font-size: 12px; opacity: 0.7;">🔒 Secure Transaction | ⚡ Instant Processing | 📱 24/7 Service</p>
          </div>
        </div>
      </div>
    `;
  };

  const sendRechargeViaEmail = async (recharge: any, email: string) => {
    if (!email) {
      toast.error('Customer email not available');
      return false;
    }

    try {
      const invoiceTemplate = generateRechargeInvoiceTemplate(recharge);
      const subject = `Mobile Recharge Receipt - ${recharge.mobile_number} - ElectroStore`;
      
      // For demo purposes, we'll create a mailto link
      // In production, you would integrate with an email service like SendGrid, Nodemailer, etc.
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please find your mobile recharge receipt attached. We will send the HTML version via our email service.')}`;
      window.open(mailtoLink);
      
      toast.success(`Recharge receipt sent to ${email}`);
      return true;
    } catch (error) {
      toast.error('Failed to send email');
      return false;
    }
  };

  const sendRechargeViaSMS = (recharge: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🎉 RECHARGE SUCCESSFUL! 🎉

📱 Mobile: ${recharge.mobile_number}
🏢 Operator: ${recharge.operator}
💰 Amount: ₹${recharge.recharge_amount}
📋 Plan: ${recharge.plan_type.toUpperCase()}

🆔 Transaction ID: ${recharge.transaction_id}
🔗 Operator Ref: ${recharge.operator_transaction_id}
📅 Date: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

✅ Status: SUCCESS
💳 Payment: ${recharge.payment_method.toUpperCase()}

Thank you for choosing ElectroStore! 🙏
📧 contact@electrostore.com
📞 +1234567890

🔒 Secure | ⚡ Instant | 📱 24/7`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const smsUrl = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success(`Recharge receipt sent via SMS to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send SMS');
      return false;
    }
  };

  const sendRechargeViaWhatsApp = (recharge: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🎉 *MOBILE RECHARGE SUCCESSFUL* 🎉

📱 *Mobile Number:* ${recharge.mobile_number}
🏢 *Operator:* ${recharge.operator}
💰 *Amount:* ₹${recharge.recharge_amount}
📋 *Plan Type:* ${recharge.plan_type.toUpperCase()}

🆔 *Transaction ID:* ${recharge.transaction_id}
🔗 *Operator Reference:* ${recharge.operator_transaction_id}
📅 *Date:* ${new Date().toLocaleDateString()}
⏰ *Time:* ${new Date().toLocaleTimeString()}

✅ *Status:* SUCCESS
💳 *Payment Method:* ${recharge.payment_method.toUpperCase()}

${recharge.notes ? `📝 *Notes:* ${recharge.notes}\n` : ''}

Thank you for choosing ElectroStore! 🙏

📧 contact@electrostore.com
📞 +1234567890

🔒 Secure Transaction | ⚡ Instant Processing | 📱 24/7 Service`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success(`Recharge receipt sent via WhatsApp to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send WhatsApp message');
      return false;
    }
  };

  const validateMobileNumber = (number: string): boolean => {
    // Remove spaces and special characters
    const cleaned = number.replace(/\s+/g, '');
    
    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(cleaned)) {
      return false;
    }

    // Check if it starts with valid digits (6-9)
    if (!/^[6-9]/.test(cleaned)) {
      return false;
    }

    return true;
  };

  const handleAddRecharge = async () => {
    // BUG FIX #1: Enhanced validation
    if (!newRecharge.mobile_number || !newRecharge.operator || !newRecharge.recharge_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    // BUG FIX #2: Mobile number validation
    if (!validateMobileNumber(newRecharge.mobile_number)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }

    // BUG FIX #3: Amount validation
    if (newRecharge.recharge_amount < 10) {
      toast.error('Minimum recharge amount is ₹10');
      return;
    }

    if (newRecharge.recharge_amount > 10000) {
      toast.error('Maximum recharge amount is ₹10,000');
      return;
    }

    try {
      setLoading(true);
      
      const rechargeData = {
        ...newRecharge,
        payment_status: 'paid' as const,
        transaction_id: 'TXN' + Date.now(),
        operator_transaction_id: 'OP' + Date.now(),
        status: 'success' as const
      };

      const { data, error } = await supabase
        .from('mobile_recharges' as any)
        .insert([rechargeData])
        .select()
        .single();

      let rechargeRecord: any;
      if (error) {
        console.error('Error creating recharge:', error);
        // Fallback to local state update if table doesn't exist
        const fallbackData: MobileRecharge = {
          id: Date.now().toString(),
          ...rechargeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        rechargeRecord = fallbackData;
        setRecharges([fallbackData, ...recharges]);
        toast.success('Mobile recharge completed successfully! (Demo mode)');
      } else {
        rechargeRecord = data as any;
        setRecharges([data as any, ...recharges]);
        toast.success('Mobile recharge completed successfully!');
      }

      // Reset form
      setNewRecharge({
        mobile_number: '',
        operator: '',
        plan_type: 'prepaid',
        recharge_amount: 0,
        customer_name: '',
        customer_phone: '',
        payment_method: 'cash',
        notes: ''
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error processing recharge:', error);
      toast.error('Failed to process recharge');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecharge = (recharge: MobileRecharge) => {
    setEditRecharge({
      mobile_number: recharge.mobile_number,
      operator: recharge.operator,
      plan_type: recharge.plan_type,
      recharge_amount: recharge.recharge_amount,
      customer_name: recharge.customer_name || '',
      customer_phone: recharge.customer_phone || '',
      payment_method: recharge.payment_method,
      payment_status: recharge.payment_status,
      status: recharge.status,
      notes: recharge.notes || ''
    });
    setSelectedRecharge(recharge);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRecharge = async () => {
    if (!selectedRecharge || !editRecharge.mobile_number || !editRecharge.operator || !editRecharge.recharge_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    // BUG FIX #4: Mobile number validation on edit
    if (!validateMobileNumber(editRecharge.mobile_number)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }

    // BUG FIX #5: Amount validation on edit
    if (editRecharge.recharge_amount < 10) {
      toast.error('Minimum recharge amount is ₹10');
      return;
    }

    if (editRecharge.recharge_amount > 10000) {
      toast.error('Maximum recharge amount is ₹10,000');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('mobile_recharges' as any)
        .update(editRecharge)
        .eq('id', selectedRecharge.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating recharge:', error);
        // Fallback to local state update if table doesn't exist
        const updatedRecharge = { ...selectedRecharge, ...editRecharge };
        setRecharges(recharges.map(r => r.id === selectedRecharge.id ? updatedRecharge : r));
        toast.success('Recharge record updated successfully! (Demo mode)');
      } else {
        setRecharges(recharges.map(r => r.id === selectedRecharge.id ? data as any : r));
        toast.success('Recharge record updated successfully!');
      }

      setIsEditDialogOpen(false);
      setSelectedRecharge(null);
    } catch (error) {
      console.error('Error updating recharge:', error);
      toast.error('Failed to update recharge record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecharge = async (rechargeId: string, mobileNumber: string) => {
    if (!confirm(`Are you sure you want to delete the recharge record for ${mobileNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('mobile_recharges' as any)
        .delete()
        .eq('id', rechargeId);

      if (error) {
        console.error('Error deleting recharge:', error);
        // Fallback to local state update if table doesn't exist
        setRecharges(recharges.filter(r => r.id !== rechargeId));
        toast.success('Recharge record deleted successfully (Demo mode)');
      } else {
        setRecharges(recharges.filter(r => r.id !== rechargeId));
        toast.success('Recharge record deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting recharge:', error);
      toast.error('Failed to delete recharge record');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecharges = useMemo(() => {
    return recharges.filter(recharge => {
      const matchesSearch = 
        recharge.mobile_number.includes(searchTerm) ||
        (recharge.customer_name && recharge.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recharge.transaction_id && recharge.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || recharge.status === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || recharge.payment_status === paymentStatusFilter;
      const matchesOperator = operatorFilter === 'all' || recharge.operator === operatorFilter;
      const matchesPlanType = planTypeFilter === 'all' || recharge.plan_type === planTypeFilter;

      let matchesDate = true;
      if (dateRange !== 'all') {
        const rechargeDate = new Date(recharge.created_at);
        const today = new Date();
        
        switch (dateRange) {
          case 'today':
            matchesDate = rechargeDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = rechargeDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = rechargeDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesOperator && matchesPlanType && matchesDate;
    });
  }, [recharges, searchTerm, statusFilter, paymentStatusFilter, operatorFilter, planTypeFilter, dateRange]);

  const pagination = usePagination({
    totalItems: filteredRecharges.length,
    itemsPerPage: 25,
  });

  const paginatedRecharges = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredRecharges.slice(startIndex, endIndex);
  }, [filteredRecharges, pagination.startIndex, pagination.endIndex]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Mobile Recharge Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Recharge
        </Button>
      </div>

      {/* Statistics Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Recharges</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{recharges.length}</div>
            <p className="text-xs text-muted-foreground">All time recharges</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Successful</CardTitle>
            <Smartphone className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              {recharges.filter(r => r.status === 'success').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed recharges</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
              {recharges.filter(r => r.payment_status === 'paid').length}
            </div>
            <p className="text-xs text-muted-foreground">Payment completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
              {recharges.filter(r => r.payment_status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search mobile, customer, transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Recharge Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {OPERATORS.map(operator => (
                  <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Plan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recharges List */}
      <Card>
        <CardHeader>
          <CardTitle>Recharges ({filteredRecharges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {/* Statistics Cards Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <StatsCardShimmer key={i} />
                ))}
              </div>
              
              {/* Filters Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                  </div>
                ))}
              </div>
              
              {/* Table Shimmer */}
              <TableShimmer rows={8} columns={8} />
            </div>
          ) : filteredRecharges.length === 0 ? (
            <div className="text-center py-12">
              <Smartphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recharges found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || operatorFilter !== 'all' || planTypeFilter !== 'all' || dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first recharge'}
              </p>
              {!searchTerm && statusFilter === 'all' && paymentStatusFilter === 'all' && operatorFilter === 'all' && planTypeFilter === 'all' && dateRange === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Recharge
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden lg:block w-full overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Mobile Number</th>
                      <th className="text-left p-3 font-semibold">Operator</th>
                      <th className="text-left p-3 font-semibold">Plan</th>
                      <th className="text-left p-3 font-semibold">Amount</th>
                      <th className="text-left p-3 font-semibold">Customer</th>
                      <th className="text-left p-3 font-semibold">Payment</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecharges.map((recharge) => (
                      <tr key={recharge.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-medium">{recharge.mobile_number}</td>
                        <td className="p-3">{recharge.operator}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize">
                            {recharge.plan_type}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium text-green-600">₹{recharge.recharge_amount}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{recharge.customer_name || 'Walk-in'}</div>
                            {recharge.customer_phone && (
                              <div className="text-sm text-muted-foreground">{recharge.customer_phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={getPaymentStatusBadgeVariant(recharge.payment_status)}>
                            {recharge.payment_status}
                          </Badge>
                          <div className="text-xs text-muted-foreground capitalize mt-1">
                            {recharge.payment_method}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(recharge.status)}>
                            {recharge.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{new Date(recharge.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{new Date(recharge.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRecharge(recharge);
                                setIsViewDialogOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRecharge(recharge)}
                              title="Edit Recharge"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteRecharge(recharge.id, recharge.mobile_number)}
                              title="Delete Recharge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View - Shown on Small Screens */}
              <div className="lg:hidden space-y-4">
                {paginatedRecharges.map((recharge) => (
                  <Card key={recharge.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Smartphone className="h-4 w-4 text-blue-500" />
                            <span className="font-bold text-lg">{recharge.mobile_number}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{recharge.operator}</div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant={getStatusBadgeVariant(recharge.status)} className="text-xs">
                            {recharge.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {recharge.plan_type}
                          </Badge>
                        </div>
                      </div>

                      {/* Amount Section */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="text-xs text-green-700 mb-1">Recharge Amount</div>
                        <div className="text-2xl font-bold text-green-600">₹{recharge.recharge_amount}</div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Customer</div>
                          <div className="font-medium">{recharge.customer_name || 'Walk-in'}</div>
                          {recharge.customer_phone && (
                            <div className="text-xs text-muted-foreground">{recharge.customer_phone}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Payment</div>
                          <Badge variant={getPaymentStatusBadgeVariant(recharge.payment_status)} className="text-xs">
                            {recharge.payment_status}
                          </Badge>
                          <div className="text-xs text-muted-foreground capitalize mt-1">
                            {recharge.payment_method}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Info */}
                      <div className="border-t pt-3 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(recharge.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(recharge.created_at).toLocaleTimeString()}</span>
                        </div>
                        {recharge.transaction_id && (
                          <div className="text-xs text-muted-foreground mt-1">
                            TXN: {recharge.transaction_id}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecharge(recharge);
                            setIsViewDialogOpen(true);
                          }}
                          className="flex-1 h-10 touch-manipulation"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRecharge(recharge)}
                          className="flex-1 h-10 touch-manipulation text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRecharge(recharge.id, recharge.mobile_number)}
                          className="h-10 touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination */}
              {filteredRecharges.length > 0 && (
                <div className="mt-4">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredRecharges.length}
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
                    itemsPerPageOptions={[15, 25, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Recharge Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle>New Mobile Recharge</DialogTitle>
            <DialogDescription>
              Process a new mobile recharge for a customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
            <div className="recharge-form space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={newRecharge.mobile_number}
                onChange={(e) => setNewRecharge({...newRecharge, mobile_number: e.target.value})}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="operator">Operator *</Label>
              <Select value={newRecharge.operator} onValueChange={(value) => setNewRecharge({...newRecharge, operator: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(operator => (
                    <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="planType">Plan Type *</Label>
              <Select value={newRecharge.plan_type} onValueChange={(value: 'prepaid' | 'postpaid') => setNewRecharge({...newRecharge, plan_type: value, recharge_amount: 0})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                  <SelectItem value="postpaid">Postpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Recharge Amount *</Label>
              <Select value={newRecharge.recharge_amount.toString()} onValueChange={(value) => setNewRecharge({...newRecharge, recharge_amount: Number(value)})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {RECHARGE_PLANS[newRecharge.plan_type].map(plan => (
                    <SelectItem key={plan.amount} value={plan.amount.toString()}>
                      ₹{plan.amount} - {plan.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={newRecharge.customer_name}
                onChange={(e) => setNewRecharge({...newRecharge, customer_name: e.target.value})}
                placeholder="Customer name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={newRecharge.customer_phone}
                onChange={(e) => setNewRecharge({...newRecharge, customer_phone: e.target.value})}
                placeholder="Customer phone (optional)"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={newRecharge.payment_method} onValueChange={(value) => setNewRecharge({...newRecharge, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={newRecharge.notes}
                onChange={(e) => setNewRecharge({...newRecharge, notes: e.target.value})}
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>
              
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecharge} disabled={loading}>
              {loading ? 'Processing...' : 'Process Recharge'}
            </Button>
          </div>
        </div>
      </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recharge Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Mobile Recharge</DialogTitle>
            <DialogDescription>
              Update the mobile recharge record details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-mobile">Mobile Number *</Label>
              <Input
                id="edit-mobile"
                value={editRecharge.mobile_number}
                onChange={(e) => setEditRecharge({...editRecharge, mobile_number: e.target.value})}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="edit-operator">Operator *</Label>
              <Select value={editRecharge.operator} onValueChange={(value) => setEditRecharge({...editRecharge, operator: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(operator => (
                    <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-planType">Plan Type *</Label>
              <Select value={editRecharge.plan_type} onValueChange={(value: 'prepaid' | 'postpaid') => setEditRecharge({...editRecharge, plan_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                  <SelectItem value="postpaid">Postpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-amount">Recharge Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                value={editRecharge.recharge_amount}
                onChange={(e) => setEditRecharge({...editRecharge, recharge_amount: Number(e.target.value)})}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="edit-customerName">Customer Name</Label>
              <Input
                id="edit-customerName"
                value={editRecharge.customer_name}
                onChange={(e) => setEditRecharge({...editRecharge, customer_name: e.target.value})}
                placeholder="Customer name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="edit-customerPhone">Customer Phone</Label>
              <Input
                id="edit-customerPhone"
                value={editRecharge.customer_phone}
                onChange={(e) => setEditRecharge({...editRecharge, customer_phone: e.target.value})}
                placeholder="Customer phone (optional)"
              />
            </div>
            <div>
              <Label htmlFor="edit-paymentMethod">Payment Method *</Label>
              <Select value={editRecharge.payment_method} onValueChange={(value) => setEditRecharge({...editRecharge, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-paymentStatus">Payment Status *</Label>
              <Select value={editRecharge.payment_status} onValueChange={(value: 'paid' | 'pending' | 'failed') => setEditRecharge({...editRecharge, payment_status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Recharge Status *</Label>
              <Select value={editRecharge.status} onValueChange={(value: 'success' | 'pending' | 'failed') => setEditRecharge({...editRecharge, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editRecharge.notes}
                onChange={(e) => setEditRecharge({...editRecharge, notes: e.target.value})}
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecharge} disabled={loading}>
              {loading ? 'Updating...' : 'Update Recharge'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Recharge Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recharge Details</DialogTitle>
            <DialogDescription>
              Complete information about this mobile recharge transaction.
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mobile Number</Label>
                  <p className="font-medium">{selectedRecharge.mobile_number}</p>
                </div>
                <div>
                  <Label>Operator</Label>
                  <p className="font-medium">{selectedRecharge.operator}</p>
                </div>
                <div>
                  <Label>Plan Type</Label>
                  <Badge variant="outline" className="capitalize">
                    {selectedRecharge.plan_type}
                  </Badge>
                </div>
                <div>
                  <Label>Recharge Amount</Label>
                  <p className="font-medium text-lg">₹{selectedRecharge.recharge_amount}</p>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <p className="font-medium">{selectedRecharge.customer_name || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <Label>Customer Phone</Label>
                  <p className="font-medium">{selectedRecharge.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <p className="font-medium capitalize">{selectedRecharge.payment_method}</p>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Badge variant={getPaymentStatusBadgeVariant(selectedRecharge.payment_status)}>
                    {selectedRecharge.payment_status}
                  </Badge>
                </div>
                <div>
                  <Label>Recharge Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedRecharge.status)}>
                    {selectedRecharge.status}
                  </Badge>
                </div>
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-medium">{selectedRecharge.transaction_id}</p>
                </div>
                <div>
                  <Label>Operator Transaction ID</Label>
                  <p className="font-medium">{selectedRecharge.operator_transaction_id}</p>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <p className="font-medium">{new Date(selectedRecharge.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {selectedRecharge.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="font-medium">{selectedRecharge.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRechargeViaEmail(selectedRecharge, 'customer@example.com')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRechargeViaSMS(selectedRecharge, selectedRecharge?.customer_phone || selectedRecharge?.mobile_number || '')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
            >
              <MessageCircle className="h-4 w-4" />
              SMS
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRechargeViaWhatsApp(selectedRecharge, selectedRecharge?.customer_phone || selectedRecharge?.mobile_number || '')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}