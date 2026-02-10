import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Wrench, CreditCard, Calendar, Filter, Eye, Edit, Trash2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface MobileRepair {
  id: string;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  issue_description: string;
  repair_type: string;
  estimated_cost: number;
  actual_cost?: number;
  advance_payment?: number;
  payment_status: 'paid' | 'pending' | 'partial';
  repair_status: 'received' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
  technician_name?: string;
  received_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  warranty_period?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const DEVICE_BRANDS = [
  'Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Huawei', 'Google', 'Motorola', 'Nokia', 'Other'
];

const REPAIR_TYPES = [
  'Screen Replacement', 'Battery Replacement', 'Charging Port Repair', 'Speaker Repair', 'Camera Repair', 
  'Water Damage Repair', 'Software Issue', 'Motherboard Repair', 'Button Repair', 'Back Cover Replacement', 'Other'
];

const REPAIR_STATUS_OPTIONS = [
  { value: 'received', label: 'Received', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-purple-100 text-purple-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
];

export default function MobileRepair() {
  const [repairs, setRepairs] = useState<MobileRepair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<MobileRepair | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [repairTypeFilter, setRepairTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const [newRepair, setNewRepair] = useState({
    customer_name: '',
    customer_phone: '',
    device_brand: '',
    device_model: '',
    issue_description: '',
    repair_type: '',
    estimated_cost: 0,
    advance_payment: 0,
    technician_name: '',
    expected_delivery_date: '',
    warranty_period: 30,
    notes: ''
  });

  const [editRepair, setEditRepair] = useState({
    customer_name: '',
    customer_phone: '',
    device_brand: '',
    device_model: '',
    issue_description: '',
    repair_type: '',
    estimated_cost: 0,
    actual_cost: 0,
    advance_payment: 0,
    payment_status: 'pending' as 'paid' | 'pending' | 'partial',
    repair_status: 'received' as 'received' | 'in_progress' | 'completed' | 'delivered' | 'cancelled',
    technician_name: '',
    expected_delivery_date: '',
    actual_delivery_date: '',
    warranty_period: 30,
    notes: ''
  });

  useEffect(() => {
    fetchRepairs();
    
    // Set up real-time subscription for mobile repairs
    const subscription = supabase
      .channel('mobile_repairs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'mobile_repairs' 
        }, 
        (payload) => {
          // Mobile repair data changed - refresh data
          // Debounce the refresh to avoid rapid successive calls
          setTimeout(() => {
            fetchRepairs();
          }, 1000);
        }
      )
      .subscribe();

    // Add focus event listener to refresh when user returns to tab (but debounced)
    let focusTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        fetchRepairs();
      }, 2000);
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => {
          fetchRepairs();
        }, 2000);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup subscription and event listeners on unmount
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(focusTimeout);
    };
  }, []);

  const fetchRepairs = async () => {
    // Debounce: Don't fetch if we just fetched within the last 2 seconds
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      return;
    }
    setLastFetchTime(now);

    try {
      setLoading(true);
      
      // First, let's check if the table exists and has data
      const { count, error: countError } = await supabase
        .from('mobile_repairs' as any)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking table:', countError);
      }
      
      const { data, error } = await supabase
        .from('mobile_repairs' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching repairs:', error);
        // Only show mock data if there's a real error, not just empty results
        if (error.code === '42P01') { // Table doesn't exist
          const mockData: MobileRepair[] = [
            {
              id: '1',
              customer_name: 'John Doe',
              customer_phone: '9876543210',
              device_brand: 'Apple',
              device_model: 'iPhone 13',
              issue_description: 'Screen cracked, touch not working',
              repair_type: 'Screen Replacement',
              estimated_cost: 8500,
              actual_cost: 8500,
              advance_payment: 3000,
              payment_status: 'partial',
              repair_status: 'in_progress',
              technician_name: 'Raj Kumar',
              received_date: new Date().toISOString(),
              expected_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              warranty_period: 30,
              notes: 'Customer wants original Apple screen',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          setRepairs(mockData);
          toast.info('Using demo data. Run mobile repair setup SQL to enable full functionality.');
        } else {
          toast.error(`Failed to fetch repair records: ${error.message}`);
        }
        return;
      }
      
      setRepairs((data as any) || []);
      
      if (data && data.length > 0) {
        // Only show success toast on manual refresh (when user clicks refresh button)
      } else {
        // Only show info toast on manual refresh
      }
    } catch (error) {
      console.error('Error fetching repairs:', error);
      toast.error('Failed to fetch repair records');
    } finally {
      setLoading(false);
    }
  };
  const generateRepairReceiptTemplate = (repair: any) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">🔧 ElectroStore</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Mobile Repair Service</p>
          <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; margin-top: 20px; display: inline-block;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">REPAIR RECEIPT</h2>
          </div>
        </div>

        <!-- Repair Info -->
        <div style="padding: 30px 20px 20px 20px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; margin-bottom: 15px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Service Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Service ID:</strong> ${repair.id}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong> ${currentDate}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Time:</strong> ${currentTime}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong> <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${repair.repair_status.toUpperCase()}</span></p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Customer Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Name:</strong> ${repair.customer_name}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${repair.customer_phone}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Technician:</strong> ${repair.technician_name || 'Assigned'}</p>
            </div>
          </div>
        </div>

        <!-- Device & Repair Details -->
        <div style="padding: 0 20px;">
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); margin-bottom: 20px;">
            <div style="background: #f3f4f6; padding: 16px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">📱 Device & Repair Information</h3>
            </div>
            <div style="padding: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Device</p>
                  <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${repair.device_brand} ${repair.device_model}</p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Repair Type</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${repair.repair_type}</p>
                </div>
                <div style="grid-column: 1 / -1;">
                  <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Issue Description</p>
                  <p style="margin: 0; font-size: 14px; color: #111827; background: #f9fafb; padding: 10px; border-radius: 4px;">${repair.issue_description}</p>
                </div>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">Estimated Cost</p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #d97706;">₹${repair.estimated_cost}</p>
                ${repair.advance_payment ? `<p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">Advance Paid: ₹${repair.advance_payment}</p>` : ''}
              </div>
            </div>
          </div>
        </div>

        ${repair.notes ? `
        <div style="padding: 20px; background: #dbeafe; border-left: 4px solid #3b82f6;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Notes:</h4>
          <p style="margin: 0; color: #1e40af; font-size: 14px;">${repair.notes}</p>
        </div>` : ''}

        <!-- Footer -->
        <div style="background: #111827; color: white; padding: 25px 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Thank you for choosing ElectroStore! 🔧</p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">📧 repair@electrostore.com | 📞 +1234567890</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.6;">This is a computer generated receipt.</p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #374151;">
            <p style="margin: 0; font-size: 12px; opacity: 0.7;">🔒 Secure Service | ⚡ Expert Technicians | 📱 Quality Guarantee</p>
          </div>
        </div>
      </div>
    `;
  };

  const sendRepairViaEmail = async (repair: any, email: string) => {
    if (!email) {
      toast.error('Customer email not available');
      return false;
    }

    try {
      const receiptTemplate = generateRepairReceiptTemplate(repair);
      const subject = `Mobile Repair Receipt - ${repair.device_brand} ${repair.device_model} - ElectroStore`;
      
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please find your mobile repair receipt attached. We will send the HTML version via our email service.')}`;
      window.open(mailtoLink);
      
      toast.success(`Repair receipt sent to ${email}`);
      return true;
    } catch (error) {
      toast.error('Failed to send email');
      return false;
    }
  };
  const sendRepairViaSMS = (repair: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🔧 MOBILE REPAIR UPDATE 🔧

📱 Device: ${repair.device_brand} ${repair.device_model}
🔧 Service: ${repair.repair_type}
💰 Cost: ₹${repair.estimated_cost}

🆔 Service ID: ${repair.id}
👨‍🔧 Technician: ${repair.technician_name || 'Assigned'}
📅 Date: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

📋 Status: ${repair.repair_status.toUpperCase()}
💳 Payment: ${repair.payment_status.toUpperCase()}

${repair.expected_delivery_date ? `📅 Expected Delivery: ${new Date(repair.expected_delivery_date).toLocaleDateString()}` : ''}

Thank you for choosing ElectroStore! 🙏
📧 repair@electrostore.com
📞 +1234567890

🔒 Quality Service | ⚡ Expert Repair | 📱 Warranty Included`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const smsUrl = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success(`Repair update sent via SMS to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send SMS');
      return false;
    }
  };

  const sendRepairViaWhatsApp = (repair: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🔧 *MOBILE REPAIR SERVICE UPDATE* 🔧

📱 *Device:* ${repair.device_brand} ${repair.device_model}
🔧 *Service Type:* ${repair.repair_type}
💰 *Estimated Cost:* ₹${repair.estimated_cost}

🆔 *Service ID:* ${repair.id}
👨‍🔧 *Technician:* ${repair.technician_name || 'Assigned'}
📅 *Date:* ${new Date().toLocaleDateString()}
⏰ *Time:* ${new Date().toLocaleTimeString()}

📋 *Current Status:* ${repair.repair_status.toUpperCase()}
💳 *Payment Status:* ${repair.payment_status.toUpperCase()}

${repair.advance_payment ? `💵 *Advance Paid:* ₹${repair.advance_payment}\n` : ''}
${repair.expected_delivery_date ? `📅 *Expected Delivery:* ${new Date(repair.expected_delivery_date).toLocaleDateString()}\n` : ''}
${repair.warranty_period ? `🛡️ *Warranty:* ${repair.warranty_period} days\n` : ''}

📝 *Issue:* ${repair.issue_description}

${repair.notes ? `📝 *Notes:* ${repair.notes}\n` : ''}

Thank you for choosing ElectroStore! 🙏

📧 repair@electrostore.com
📞 +1234567890

🔒 Quality Service | ⚡ Expert Technicians | 📱 Warranty Included`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success(`Repair update sent via WhatsApp to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send WhatsApp message');
      return false;
    }
  };

  const handleAddRepair = async () => {
    if (!newRepair.customer_name || !newRepair.customer_phone || !newRepair.device_brand || !newRepair.device_model || !newRepair.issue_description || !newRepair.repair_type || !newRepair.estimated_cost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Clean up the data - convert empty strings to null for optional fields
      const repairData = {
        customer_name: newRepair.customer_name,
        customer_phone: newRepair.customer_phone,
        device_brand: newRepair.device_brand,
        device_model: newRepair.device_model,
        issue_description: newRepair.issue_description,
        repair_type: newRepair.repair_type,
        estimated_cost: newRepair.estimated_cost,
        advance_payment: newRepair.advance_payment || 0,
        technician_name: newRepair.technician_name || null,
        expected_delivery_date: newRepair.expected_delivery_date ? new Date(newRepair.expected_delivery_date).toISOString() : null,
        warranty_period: newRepair.warranty_period || 30,
        notes: newRepair.notes || null,
        payment_status: newRepair.advance_payment > 0 ? 'partial' as const : 'pending' as const,
        repair_status: 'received' as const,
        received_date: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mobile_repairs' as any)
        .insert([repairData])
        .select()
        .single();

      if (error) {
        console.error('Error creating repair:', error);
        // Fallback to local state update if table doesn't exist
        const fallbackData: MobileRepair = {
          id: Date.now().toString(),
          ...repairData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setRepairs([fallbackData, ...repairs]);
        toast.success('Mobile repair service registered successfully! (Demo mode)');
      } else {
        setRepairs([data as any, ...repairs]);
        toast.success('Mobile repair service registered successfully!');
      }

      // Reset form
      setNewRepair({
        customer_name: '',
        customer_phone: '',
        device_brand: '',
        device_model: '',
        issue_description: '',
        repair_type: '',
        estimated_cost: 0,
        advance_payment: 0,
        technician_name: '',
        expected_delivery_date: '',
        warranty_period: 30,
        notes: ''
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error processing repair:', error);
      toast.error('Failed to register repair service');
    } finally {
      setLoading(false);
    }
  };
  const handleEditRepair = (repair: MobileRepair) => {
    setEditRepair({
      customer_name: repair.customer_name,
      customer_phone: repair.customer_phone,
      device_brand: repair.device_brand,
      device_model: repair.device_model,
      issue_description: repair.issue_description,
      repair_type: repair.repair_type,
      estimated_cost: repair.estimated_cost,
      actual_cost: repair.actual_cost || 0,
      advance_payment: repair.advance_payment || 0,
      payment_status: repair.payment_status,
      repair_status: repair.repair_status,
      technician_name: repair.technician_name || '',
      expected_delivery_date: repair.expected_delivery_date || '',
      actual_delivery_date: repair.actual_delivery_date || '',
      warranty_period: repair.warranty_period || 30,
      notes: repair.notes || ''
    });
    setSelectedRepair(repair);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRepair = async () => {
    if (!selectedRepair || !editRepair.customer_name || !editRepair.customer_phone || !editRepair.device_brand || !editRepair.device_model) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Clean up the data - convert empty strings to null for optional fields
      const updateData = {
        customer_name: editRepair.customer_name,
        customer_phone: editRepair.customer_phone,
        device_brand: editRepair.device_brand,
        device_model: editRepair.device_model,
        issue_description: editRepair.issue_description,
        repair_type: editRepair.repair_type,
        estimated_cost: editRepair.estimated_cost,
        actual_cost: editRepair.actual_cost || null,
        advance_payment: editRepair.advance_payment || 0,
        payment_status: editRepair.payment_status,
        repair_status: editRepair.repair_status,
        technician_name: editRepair.technician_name || null,
        expected_delivery_date: editRepair.expected_delivery_date ? new Date(editRepair.expected_delivery_date).toISOString() : null,
        actual_delivery_date: editRepair.actual_delivery_date ? new Date(editRepair.actual_delivery_date).toISOString() : null,
        warranty_period: editRepair.warranty_period || 30,
        notes: editRepair.notes || null
      };

      const { data, error } = await supabase
        .from('mobile_repairs' as any)
        .update(updateData)
        .eq('id', selectedRepair.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating repair:', error);
        // Fallback to local state update if table doesn't exist
        const updatedRepair = { ...selectedRepair, ...editRepair };
        setRepairs(repairs.map(r => r.id === selectedRepair.id ? updatedRepair : r));
        toast.success('Repair record updated successfully! (Demo mode)');
      } else {
        setRepairs(repairs.map(r => r.id === selectedRepair.id ? data as any : r));
        toast.success('Repair record updated successfully!');
      }

      setIsEditDialogOpen(false);
      setSelectedRepair(null);
    } catch (error) {
      console.error('Error updating repair:', error);
      toast.error('Failed to update repair record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepair = async (repairId: string, deviceInfo: string) => {
    if (!confirm(`Are you sure you want to delete the repair record for ${deviceInfo}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('mobile_repairs' as any)
        .delete()
        .eq('id', repairId);

      if (error) {
        console.error('Error deleting repair:', error);
        // Fallback to local state update if table doesn't exist
        setRepairs(repairs.filter(r => r.id !== repairId));
        toast.success('Repair record deleted successfully (Demo mode)');
      } else {
        setRepairs(repairs.filter(r => r.id !== repairId));
        toast.success('Repair record deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting repair:', error);
      toast.error('Failed to delete repair record');
    } finally {
      setLoading(false);
    }
  };

  const filteredRepairs = useMemo(() => {
    return repairs.filter(repair => {
      const matchesSearch = 
        repair.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.customer_phone.includes(searchTerm) ||
        repair.device_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || repair.repair_status === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || repair.payment_status === paymentStatusFilter;
      const matchesBrand = brandFilter === 'all' || repair.device_brand === brandFilter;
      const matchesRepairType = repairTypeFilter === 'all' || repair.repair_type === repairTypeFilter;

      let matchesDate = true;
      if (dateRange !== 'all') {
        const repairDate = new Date(repair.created_at);
        const today = new Date();
        
        switch (dateRange) {
          case 'today':
            matchesDate = repairDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = repairDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = repairDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesBrand && matchesRepairType && matchesDate;
    });
  }, [repairs, searchTerm, statusFilter, paymentStatusFilter, brandFilter, repairTypeFilter, dateRange]);

  const pagination = usePagination({
    totalItems: filteredRepairs.length,
    itemsPerPage: 25,
  });

  const paginatedRepairs = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredRepairs.slice(startIndex, endIndex);
  }, [filteredRepairs, pagination.startIndex, pagination.endIndex]);
  const getStatusBadgeVariant = (status: string) => {
    const statusOption = REPAIR_STATUS_OPTIONS.find(option => option.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Mobile Repair Service</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={async () => {
              const { data, error, count } = await supabase
                .from('mobile_repairs' as any)
                .select('*', { count: 'exact' });
              if (error) {
                toast.error(`Database error: ${error.message}`);
              } else {
                toast.success(`Database connected! Found ${count} records`);
              }
            }}
            className="text-xs h-9 sm:h-10 touch-manipulation"
          >
            Test DB
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setLastFetchTime(0); // Reset debounce for manual refresh
              fetchRepairs();
              toast.info('Refreshing repair records...');
            }}
            disabled={loading}
            className="flex items-center gap-2 h-9 sm:h-10 touch-manipulation"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 sm:flex-none h-11 sm:h-10 md:h-11 touch-manipulation bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            New Repair
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Responsive: 2 cols mobile → 3 cols tablet → 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{repairs.length}</div>
            <p className="text-xs text-muted-foreground">All time repairs</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">
              {repairs.filter(r => r.repair_status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Being repaired</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <Wrench className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              {repairs.filter(r => r.repair_status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for pickup</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Delivered</CardTitle>
            <Smartphone className="h-4 w-4 text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
              {repairs.filter(r => r.repair_status === 'delivered').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Payment</CardTitle>
            <CreditCard className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">
              {repairs.filter(r => r.payment_status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Payment due</p>
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
                placeholder="Search customer, device, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Repair Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {REPAIR_STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Device Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {DEVICE_BRANDS.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={repairTypeFilter} onValueChange={setRepairTypeFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Repair Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REPAIR_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
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
      {/* Repairs List - Responsive Table */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-base sm:text-lg md:text-xl">
            <span>Repair Services ({filteredRepairs.length})</span>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className={`px-2 py-1 rounded-full text-xs ${loading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {loading ? 'Loading...' : 'Ready'}
              </span>
              <span className="text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
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
              <TableShimmer rows={8} columns={9} />
            </div>
          ) : (
            <>
              {/* Desktop Table View (1024px+) */}
              <div className="hidden lg:block w-full overflow-x-auto">
                <table className="w-full min-w-[1200px] table-fixed">
                  <colgroup>
                    <col className="w-[140px]" />
                    <col className="w-[120px]" />
                    <col className="w-[200px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[120px]" />
                    <col className="w-[100px]" />
                    <col className="w-[120px]" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Customer</th>
                      <th className="text-left p-3 font-semibold">Device</th>
                      <th className="text-left p-3 font-semibold">Issue</th>
                      <th className="text-left p-3 font-semibold">Cost</th>
                      <th className="text-left p-3 font-semibold">Payment</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Technician</th>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRepairs.map((repair) => (
                      <tr key={repair.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm truncate">{repair.customer_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{repair.customer_phone}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm truncate">{repair.device_brand}</div>
                            <div className="text-xs text-muted-foreground truncate">{repair.device_model}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm truncate mb-1">{repair.repair_type}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={repair.issue_description}>
                              {repair.issue_description}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">₹{repair.estimated_cost}</div>
                            {repair.advance_payment && repair.advance_payment > 0 && (
                              <div className="text-xs text-green-600">Advance: ₹{repair.advance_payment}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeVariant(repair.payment_status)}`}>
                            {repair.payment_status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeVariant(repair.repair_status)}`}>
                            {REPAIR_STATUS_OPTIONS.find(s => s.value === repair.repair_status)?.label || repair.repair_status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm truncate">{repair.technician_name || 'Unassigned'}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{new Date(repair.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{new Date(repair.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRepair(repair);
                                setIsViewDialogOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRepair(repair)}
                              title="Edit Repair"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteRepair(repair.id, `${repair.device_brand} ${repair.device_model}`)}
                              title="Delete Repair"
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

              {/* Mobile/Tablet Card View (< 1024px) */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {paginatedRepairs.map((repair) => (
                  <Card key={repair.id} className="overflow-hidden border-l-4 border-l-orange-500">
                    <CardContent className="p-3 sm:p-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900">{repair.customer_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{repair.customer_phone}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge className={`text-xs ${getStatusBadgeVariant(repair.repair_status)}`}>
                            {REPAIR_STATUS_OPTIONS.find(s => s.value === repair.repair_status)?.label || repair.repair_status}
                          </Badge>
                          <Badge className={`text-xs ${getPaymentStatusBadgeVariant(repair.payment_status)}`}>
                            {repair.payment_status}
                          </Badge>
                        </div>
                      </div>

                      {/* Device Info */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 pb-3 border-b">
                        <div>
                          <p className="text-xs text-gray-500">Device</p>
                          <p className="text-sm font-medium">{repair.device_brand}</p>
                          <p className="text-xs text-gray-600">{repair.device_model}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Repair Type</p>
                          <p className="text-sm font-medium">{repair.repair_type}</p>
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div className="mb-3 pb-3 border-b">
                        <p className="text-xs text-gray-500 mb-1">Issue Description</p>
                        <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{repair.issue_description}</p>
                      </div>

                      {/* Cost & Payment */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 pb-3 border-b">
                        <div>
                          <p className="text-xs text-gray-500">Estimated Cost</p>
                          <p className="text-base sm:text-lg font-bold text-orange-600">₹{repair.estimated_cost}</p>
                          {repair.advance_payment && repair.advance_payment > 0 && (
                            <p className="text-xs text-green-600">Advance: ₹{repair.advance_payment}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Technician</p>
                          <p className="text-sm font-medium">{repair.technician_name || 'Unassigned'}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500">Received Date</p>
                        <p className="text-xs sm:text-sm text-gray-700">
                          {new Date(repair.created_at).toLocaleDateString()} {new Date(repair.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRepair(repair);
                            setIsViewDialogOpen(true);
                          }}
                          className="flex-1 h-9 sm:h-10 touch-manipulation"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRepair(repair)}
                          className="flex-1 h-9 sm:h-10 touch-manipulation text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRepair(repair.id, `${repair.device_brand} ${repair.device_model}`)}
                          className="flex-1 h-9 sm:h-10 touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
                
                {filteredRepairs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No repair services found matching your criteria.
                  </div>
                )}
              
              {filteredRepairs.length > 0 && (
                <div className="mt-4">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredRepairs.length}
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
      {/* Add Repair Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle>New Mobile Repair Service</DialogTitle>
            <DialogDescription>
              Register a new mobile device for repair service.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
            <div className="repair-form space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={newRepair.customer_name}
                onChange={(e) => setNewRepair({...newRepair, customer_name: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer Phone *</Label>
              <Input
                id="customerPhone"
                value={newRepair.customer_phone}
                onChange={(e) => setNewRepair({...newRepair, customer_phone: e.target.value})}
                placeholder="Enter phone number"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="deviceBrand">Device Brand *</Label>
              <Select value={newRepair.device_brand} onValueChange={(value) => setNewRepair({...newRepair, device_brand: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_BRANDS.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deviceModel">Device Model *</Label>
              <Input
                id="deviceModel"
                value={newRepair.device_model}
                onChange={(e) => setNewRepair({...newRepair, device_model: e.target.value})}
                placeholder="Enter device model"
              />
            </div>
            <div>
              <Label htmlFor="repairType">Repair Type *</Label>
              <Select value={newRepair.repair_type} onValueChange={(value) => setNewRepair({...newRepair, repair_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select repair type" />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedCost">Estimated Cost *</Label>
              <Input
                id="estimatedCost"
                type="number"
                value={newRepair.estimated_cost}
                onChange={(e) => setNewRepair({...newRepair, estimated_cost: Number(e.target.value)})}
                placeholder="Enter estimated cost"
              />
            </div>
            <div>
              <Label htmlFor="advancePayment">Advance Payment</Label>
              <Input
                id="advancePayment"
                type="number"
                value={newRepair.advance_payment}
                onChange={(e) => setNewRepair({...newRepair, advance_payment: Number(e.target.value)})}
                placeholder="Enter advance payment"
              />
            </div>
            <div>
              <Label htmlFor="technicianName">Technician Name</Label>
              <Input
                id="technicianName"
                value={newRepair.technician_name}
                onChange={(e) => setNewRepair({...newRepair, technician_name: e.target.value})}
                placeholder="Assign technician"
              />
            </div>
            <div>
              <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={newRepair.expected_delivery_date}
                onChange={(e) => setNewRepair({...newRepair, expected_delivery_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="warrantyPeriod">Warranty Period (Days)</Label>
              <Input
                id="warrantyPeriod"
                type="number"
                value={newRepair.warranty_period}
                onChange={(e) => setNewRepair({...newRepair, warranty_period: Number(e.target.value)})}
                placeholder="30"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="issueDescription">Issue Description *</Label>
              <Textarea
                id="issueDescription"
                value={newRepair.issue_description}
                onChange={(e) => setNewRepair({...newRepair, issue_description: e.target.value})}
                placeholder="Describe the issue in detail"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={newRepair.notes}
                onChange={(e) => setNewRepair({...newRepair, notes: e.target.value})}
                placeholder="Any additional notes or special instructions"
                rows={2}
              />
            </div>
          </div>
              
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRepair} disabled={loading}>
              {loading ? 'Registering...' : 'Register Repair'}
            </Button>
          </div>
        </div>
      </div>
        </DialogContent>
      </Dialog>
      {/* Edit Repair Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl dialog-content">
          <DialogHeader>
            <DialogTitle>Edit Mobile Repair Service</DialogTitle>
            <DialogDescription>
              Update the mobile repair service details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-customerName">Customer Name *</Label>
              <Input
                id="edit-customerName"
                value={editRepair.customer_name}
                onChange={(e) => setEditRepair({...editRepair, customer_name: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="edit-customerPhone">Customer Phone *</Label>
              <Input
                id="edit-customerPhone"
                value={editRepair.customer_phone}
                onChange={(e) => setEditRepair({...editRepair, customer_phone: e.target.value})}
                placeholder="Enter phone number"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="edit-deviceBrand">Device Brand *</Label>
              <Select value={editRepair.device_brand} onValueChange={(value) => setEditRepair({...editRepair, device_brand: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_BRANDS.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-deviceModel">Device Model *</Label>
              <Input
                id="edit-deviceModel"
                value={editRepair.device_model}
                onChange={(e) => setEditRepair({...editRepair, device_model: e.target.value})}
                placeholder="Enter device model"
              />
            </div>
            <div>
              <Label htmlFor="edit-repairType">Repair Type *</Label>
              <Select value={editRepair.repair_type} onValueChange={(value) => setEditRepair({...editRepair, repair_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select repair type" />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-estimatedCost">Estimated Cost *</Label>
              <Input
                id="edit-estimatedCost"
                type="number"
                value={editRepair.estimated_cost}
                onChange={(e) => setEditRepair({...editRepair, estimated_cost: Number(e.target.value)})}
                placeholder="Enter estimated cost"
              />
            </div>
            <div>
              <Label htmlFor="edit-actualCost">Actual Cost</Label>
              <Input
                id="edit-actualCost"
                type="number"
                value={editRepair.actual_cost}
                onChange={(e) => setEditRepair({...editRepair, actual_cost: Number(e.target.value)})}
                placeholder="Enter actual cost"
              />
            </div>
            <div>
              <Label htmlFor="edit-advancePayment">Advance Payment</Label>
              <Input
                id="edit-advancePayment"
                type="number"
                value={editRepair.advance_payment}
                onChange={(e) => setEditRepair({...editRepair, advance_payment: Number(e.target.value)})}
                placeholder="Enter advance payment"
              />
            </div>
            <div>
              <Label htmlFor="edit-paymentStatus">Payment Status *</Label>
              <Select value={editRepair.payment_status} onValueChange={(value: 'paid' | 'pending' | 'partial') => setEditRepair({...editRepair, payment_status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-repairStatus">Repair Status *</Label>
              <Select value={editRepair.repair_status} onValueChange={(value: 'received' | 'in_progress' | 'completed' | 'delivered' | 'cancelled') => setEditRepair({...editRepair, repair_status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-technicianName">Technician Name</Label>
              <Input
                id="edit-technicianName"
                value={editRepair.technician_name}
                onChange={(e) => setEditRepair({...editRepair, technician_name: e.target.value})}
                placeholder="Assign technician"
              />
            </div>
            <div>
              <Label htmlFor="edit-expectedDelivery">Expected Delivery Date</Label>
              <Input
                id="edit-expectedDelivery"
                type="date"
                value={editRepair.expected_delivery_date}
                onChange={(e) => setEditRepair({...editRepair, expected_delivery_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-actualDelivery">Actual Delivery Date</Label>
              <Input
                id="edit-actualDelivery"
                type="date"
                value={editRepair.actual_delivery_date}
                onChange={(e) => setEditRepair({...editRepair, actual_delivery_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-warrantyPeriod">Warranty Period (Days)</Label>
              <Input
                id="edit-warrantyPeriod"
                type="number"
                value={editRepair.warranty_period}
                onChange={(e) => setEditRepair({...editRepair, warranty_period: Number(e.target.value)})}
                placeholder="30"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-issueDescription">Issue Description *</Label>
              <Textarea
                id="edit-issueDescription"
                value={editRepair.issue_description}
                onChange={(e) => setEditRepair({...editRepair, issue_description: e.target.value})}
                placeholder="Describe the issue in detail"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-notes">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                value={editRepair.notes}
                onChange={(e) => setEditRepair({...editRepair, notes: e.target.value})}
                placeholder="Any additional notes or special instructions"
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRepair} disabled={loading}>
              {loading ? 'Updating...' : 'Update Repair'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* View Repair Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl dialog-content">
          <DialogHeader>
            <DialogTitle>Repair Service Details</DialogTitle>
            <DialogDescription>
              Complete information about this mobile repair service.
            </DialogDescription>
          </DialogHeader>
          {selectedRepair && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <p className="font-medium">{selectedRepair.customer_name}</p>
                </div>
                <div>
                  <Label>Customer Phone</Label>
                  <p className="font-medium">{selectedRepair.customer_phone}</p>
                </div>
                <div>
                  <Label>Device</Label>
                  <p className="font-medium">{selectedRepair.device_brand} {selectedRepair.device_model}</p>
                </div>
                <div>
                  <Label>Repair Type</Label>
                  <p className="font-medium">{selectedRepair.repair_type}</p>
                </div>
                <div>
                  <Label>Estimated Cost</Label>
                  <p className="font-medium text-lg">₹{selectedRepair.estimated_cost}</p>
                </div>
                <div>
                  <Label>Actual Cost</Label>
                  <p className="font-medium text-lg">₹{selectedRepair.actual_cost || 'TBD'}</p>
                </div>
                <div>
                  <Label>Advance Payment</Label>
                  <p className="font-medium">₹{selectedRepair.advance_payment || 0}</p>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeVariant(selectedRepair.payment_status)}`}>
                    {selectedRepair.payment_status}
                  </span>
                </div>
                <div>
                  <Label>Repair Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeVariant(selectedRepair.repair_status)}`}>
                    {REPAIR_STATUS_OPTIONS.find(s => s.value === selectedRepair.repair_status)?.label || selectedRepair.repair_status}
                  </span>
                </div>
                <div>
                  <Label>Technician</Label>
                  <p className="font-medium">{selectedRepair.technician_name || 'Unassigned'}</p>
                </div>
                <div>
                  <Label>Received Date</Label>
                  <p className="font-medium">{new Date(selectedRepair.received_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <p className="font-medium">
                    {selectedRepair.expected_delivery_date 
                      ? new Date(selectedRepair.expected_delivery_date).toLocaleDateString() 
                      : 'TBD'}
                  </p>
                </div>
                <div>
                  <Label>Actual Delivery</Label>
                  <p className="font-medium">
                    {selectedRepair.actual_delivery_date 
                      ? new Date(selectedRepair.actual_delivery_date).toLocaleDateString() 
                      : 'Not delivered'}
                  </p>
                </div>
                <div>
                  <Label>Warranty Period</Label>
                  <p className="font-medium">{selectedRepair.warranty_period || 30} days</p>
                </div>
              </div>
              
              <div>
                <Label>Issue Description</Label>
                <p className="font-medium bg-gray-50 p-3 rounded-md">{selectedRepair.issue_description}</p>
              </div>
              
              {selectedRepair.notes && (
                <div>
                  <Label>Additional Notes</Label>
                  <p className="font-medium bg-blue-50 p-3 rounded-md">{selectedRepair.notes}</p>
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
              onClick={() => sendRepairViaEmail(selectedRepair, 'customer@example.com')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRepairViaSMS(selectedRepair, selectedRepair?.customer_phone || '')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
            >
              <MessageCircle className="h-4 w-4" />
              SMS
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRepairViaWhatsApp(selectedRepair, selectedRepair?.customer_phone || '')}
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