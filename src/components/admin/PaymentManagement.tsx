import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { Plus, Search, CreditCard, ArrowUpRight, ArrowDownLeft, Calendar, Eye, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  payment_number: string;
  payment_type: string;
  reference_type: string;
  reference_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  bank_name?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
  created_at: string;
  customers?: { name: string };
  suppliers?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  outstanding_balance: number;
}

interface Supplier {
  id: string;
  name: string;
  outstanding_balance: number;
}

interface Order {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  suppliers?: { name: string };
  total_amount: number;
  payment_status: string;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [formData, setFormData] = useState({
    payment_type: 'received',
    reference_type: 'order',
    reference_id: '',
    customer_id: '',
    supplier_id: '',
    amount: 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    fetchSuppliers();
    fetchOrders();
    fetchPurchaseInvoices();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments' as any)
        .select(`
          *,
          customers (name),
          suppliers (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as any) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers' as any)
        .select('id, name, outstanding_balance')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers((data as any) || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('id, name, outstanding_balance')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers((data as any) || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('id, invoice_number, customer_name, total_amount, payment_status')
        .in('payment_status', ['pending', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchPurchaseInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoices' as any)
        .select(`
          id,
          invoice_number,
          total_amount,
          payment_status,
          suppliers (name)
        `)
        .in('payment_status', ['pending', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseInvoices((data as any) || []);
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
    }
  };

  const generatePaymentNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PAY${timestamp}`;
  };

  // Get total paid amount for an order/invoice
  const getTotalPaidAmount = async (referenceType: string, referenceId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('payments' as any)
        .select('amount')
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId);

      if (error) throw error;
      return (data as any[])?.reduce((sum, p) => sum + p.amount, 0) || 0;
    } catch (error) {
      console.error('Error fetching total paid amount:', error);
      return 0;
    }
  };

  // Validate payment amount against order/invoice total
  const validatePaymentAmount = async (referenceType: string, referenceId: string, amount: number, excludePaymentId?: string): Promise<{ valid: boolean; message: string; totalPaid: number; totalAmount: number }> => {
    try {
      let totalAmount = 0;
      
      // Get reference total amount
      if (referenceType === 'order') {
        const order = orders.find(o => o.id === referenceId);
        if (order) totalAmount = order.total_amount;
      } else if (referenceType === 'purchase_invoice') {
        const invoice = purchaseInvoices.find(i => i.id === referenceId);
        if (invoice) totalAmount = invoice.total_amount;
      }

      if (totalAmount === 0) {
        return { valid: false, message: 'Reference not found', totalPaid: 0, totalAmount: 0 };
      }

      // Get total already paid (excluding current payment if editing)
      const { data, error } = await supabase
        .from('payments' as any)
        .select('amount')
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId);

      if (error) throw error;

      let totalPaid = 0;
      if (data && Array.isArray(data)) {
        totalPaid = (data as any[])
          .filter(p => !excludePaymentId || p.id !== excludePaymentId)
          .reduce((sum, p) => sum + p.amount, 0);
      }

      const remainingAmount = totalAmount - totalPaid;

      if (amount > remainingAmount) {
        return {
          valid: false,
          message: `Payment amount exceeds remaining balance. Total: ₹${totalAmount}, Already Paid: ₹${totalPaid}, Remaining: ₹${remainingAmount}`,
          totalPaid,
          totalAmount
        };
      }

      return { valid: true, message: '', totalPaid, totalAmount };
    } catch (error) {
      console.error('Error validating payment amount:', error);
      return { valid: false, message: 'Validation error', totalPaid: 0, totalAmount: 0 };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reference_id || formData.amount <= 0) {
      toast.error('Reference and amount are required');
      return;
    }

    // Validate amount is not zero
    if (formData.amount === 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    // Validate future date
    const today = new Date().toISOString().split('T')[0];
    if (formData.payment_date > today) {
      toast.error('Payment date cannot be in the future');
      return;
    }

    try {
      setLoading(true);
      
      // Check for overpayment
      if (formData.reference_type === 'order') {
        const order = orders.find(o => o.id === formData.reference_id);
        if (order) {
          // Get existing payments for this order
          const { data: existingPayments } = await supabase
            .from('payments' as any)
            .select('amount')
            .eq('reference_type', 'order')
            .eq('reference_id', formData.reference_id);
          
          const totalPaid = (existingPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const remainingAmount = order.total_amount - totalPaid;
          
          if (formData.amount > remainingAmount) {
            toast.error(`Payment amount exceeds remaining balance. Remaining: ₹${remainingAmount.toFixed(2)}`);
            setLoading(false);
            return;
          }
        }
      } else if (formData.reference_type === 'purchase_invoice') {
        const invoice = purchaseInvoices.find(i => i.id === formData.reference_id);
        if (invoice) {
          // Get existing payments for this invoice
          const { data: existingPayments } = await supabase
            .from('payments' as any)
            .select('amount')
            .eq('reference_type', 'purchase_invoice')
            .eq('reference_id', formData.reference_id);
          
          const totalPaid = (existingPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const remainingAmount = invoice.total_amount - totalPaid;
          
          if (formData.amount > remainingAmount) {
            toast.error(`Payment amount exceeds remaining balance. Remaining: ₹${remainingAmount.toFixed(2)}`);
            setLoading(false);
            return;
          }
        }
      }
      
      const paymentData = {
        ...formData,
        payment_number: editingPayment ? editingPayment.payment_number : generatePaymentNumber(),
        customer_id: formData.payment_type === 'received' ? (formData.customer_id === 'none' ? null : formData.customer_id || null) : null,
        supplier_id: formData.payment_type === 'paid' ? (formData.supplier_id === 'none' ? null : formData.supplier_id || null) : null,
        transaction_id: formData.transaction_id || null,
        bank_name: formData.bank_name || null,
        cheque_number: formData.cheque_number || null,
        cheque_date: formData.cheque_date || null
      };

      if (editingPayment) {
        // Update existing payment
        const { data, error } = await supabase
          .from('payments' as any)
          .update(paymentData)
          .eq('id', editingPayment.id)
          .select()
          .single();

        if (error) throw error;

        // Track payment update
        await storageTrackingService.trackDataOperation({
          operation_type: 'update',
          table_name: 'payments',
          record_id: editingPayment.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_PAYMENT_CREATE,
          metadata: {
            payment_number: paymentData.payment_number,
            payment_type: formData.payment_type,
            amount: formData.amount,
            operation: 'payment_update'
          }
        });

        toast.success('Payment updated successfully!');
      } else {
        // Create new payment
        const { data, error } = await supabase
          .from('payments' as any)
          .insert([paymentData])
          .select()
          .single();

        if (error) throw error;

        // Track payment creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'payments',
          record_id: (data as any).id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_PAYMENT_CREATE,
          metadata: {
            payment_number: paymentData.payment_number,
            payment_type: formData.payment_type,
            reference_type: formData.reference_type,
            amount: formData.amount,
            payment_method: formData.payment_method,
            customer_id: formData.customer_id,
            supplier_id: formData.supplier_id
          }
        });

        toast.success('Payment recorded successfully!');
      }

      // Update the reference record's payment status with total paid amount
      if (formData.reference_type === 'order') {
        const order = orders.find(o => o.id === formData.reference_id);
        if (order) {
          // Get all payments for this order
          const { data: allPayments } = await supabase
            .from('payments' as any)
            .select('amount')
            .eq('reference_type', 'order')
            .eq('reference_id', formData.reference_id);
          
          const totalPaid = (allPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const newStatus = totalPaid >= order.total_amount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
          
          await supabase
            .from('orders' as any)
            .update({ payment_status: newStatus })
            .eq('id', formData.reference_id);
          
          // Track order payment status update
          await storageTrackingService.trackDataOperation({
            operation_type: 'update',
            table_name: 'orders',
            record_id: formData.reference_id,
            operation_source: DATA_OPERATION_SOURCES.ADMIN_PAYMENT_CREATE,
            metadata: {
              invoice_number: order.invoice_number,
              old_payment_status: order.payment_status,
              new_payment_status: newStatus,
              total_paid: totalPaid,
              payment_amount: formData.amount,
              operation: 'payment_status_update'
            }
          });
        }
      } else if (formData.reference_type === 'purchase_invoice') {
        const invoice = purchaseInvoices.find(i => i.id === formData.reference_id);
        if (invoice) {
          // Get all payments for this invoice
          const { data: allPayments } = await supabase
            .from('payments' as any)
            .select('amount')
            .eq('reference_type', 'purchase_invoice')
            .eq('reference_id', formData.reference_id);
          
          const totalPaid = (allPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const newStatus = totalPaid >= invoice.total_amount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
          
          await supabase
            .from('purchase_invoices' as any)
            .update({ 
              payment_status: newStatus,
              paid_amount: totalPaid
            })
            .eq('id', formData.reference_id);
        }
      }

      // Update customer/supplier outstanding balance
      if (formData.customer_id && formData.customer_id !== 'none') {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          const newBalance = Math.max(0, customer.outstanding_balance - formData.amount);
          await supabase
            .from('customers' as any)
            .update({ outstanding_balance: newBalance })
            .eq('id', formData.customer_id);
        }
      }

      if (formData.supplier_id && formData.supplier_id !== 'none') {
        const supplier = suppliers.find(s => s.id === formData.supplier_id);
        if (supplier) {
          const newBalance = Math.max(0, supplier.outstanding_balance - formData.amount);
          await supabase
            .from('suppliers' as any)
            .update({ outstanding_balance: newBalance })
            .eq('id', formData.supplier_id);
        }
      }

      resetForm();
      fetchPayments();
      fetchOrders();
      fetchPurchaseInvoices();
      fetchCustomers();
      fetchSuppliers();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      payment_type: 'received',
      reference_type: 'order',
      reference_id: '',
      customer_id: '',
      supplier_id: '',
      amount: 0,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_id: '',
      bank_name: '',
      cheque_number: '',
      cheque_date: '',
      notes: ''
    });
    setIsDialogOpen(false);
    setEditingPayment(null);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      payment_type: payment.payment_type,
      reference_type: payment.reference_type,
      reference_id: payment.reference_id,
      customer_id: payment.customers ? payment.customers.name : '',
      supplier_id: payment.suppliers ? payment.suppliers.name : '',
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      transaction_id: payment.transaction_id || '',
      bank_name: payment.bank_name || '',
      cheque_number: payment.cheque_number || '',
      cheque_date: payment.cheque_date || '',
      notes: payment.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleView = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const handleDeleteClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPayment) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('payments' as any)
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // Track payment deletion
      await storageTrackingService.trackDataOperation({
        operation_type: 'delete',
        table_name: 'payments',
        record_id: selectedPayment.id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_PAYMENT_CREATE,
        metadata: {
          payment_number: selectedPayment.payment_number,
          payment_type: selectedPayment.payment_type,
          amount: selectedPayment.amount,
          operation: 'payment_delete'
        }
      });

      // Recalculate payment status for the reference
      if (selectedPayment.reference_type === 'order') {
        const { data: remainingPayments } = await supabase
          .from('payments' as any)
          .select('amount')
          .eq('reference_type', 'order')
          .eq('reference_id', selectedPayment.reference_id)
          .neq('id', selectedPayment.id);

        const order = orders.find(o => o.id === selectedPayment.reference_id);
        if (order) {
          const totalPaid = (remainingPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const newStatus = totalPaid >= order.total_amount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

          await supabase
            .from('orders' as any)
            .update({ payment_status: newStatus })
            .eq('id', selectedPayment.reference_id);
        }
      } else if (selectedPayment.reference_type === 'purchase_invoice') {
        const { data: remainingPayments } = await supabase
          .from('payments' as any)
          .select('amount')
          .eq('reference_type', 'purchase_invoice')
          .eq('reference_id', selectedPayment.reference_id)
          .neq('id', selectedPayment.id);

        const invoice = purchaseInvoices.find(i => i.id === selectedPayment.reference_id);
        if (invoice) {
          const totalPaid = (remainingPayments as any)?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const newStatus = totalPaid >= invoice.total_amount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

          await supabase
            .from('purchase_invoices' as any)
            .update({ 
              payment_status: newStatus,
              paid_amount: totalPaid
            })
            .eq('id', selectedPayment.reference_id);
        }
      }

      toast.success('Payment deleted successfully!');
      setIsDeleteDialogOpen(false);
      setSelectedPayment(null);
      fetchPayments();
      fetchOrders();
      fetchPurchaseInvoices();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setMethodFilter('all');
    setCurrentPage(1);
  };

  const getPaymentTypeIcon = (type: string) => {
    return type === 'received' ? ArrowDownLeft : ArrowUpRight;
  };

  const getPaymentTypeBadgeVariant = (type: string) => {
    return type === 'received' ? 'default' : 'secondary';
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesType && matchesMethod;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, methodFilter]);

  const paymentStats = {
    totalReceived: payments
      .filter(p => p.payment_type === 'received')
      .reduce((sum, p) => sum + p.amount, 0),
    totalPaid: payments
      .filter(p => p.payment_type === 'paid')
      .reduce((sum, p) => sum + p.amount, 0),
    todayReceived: payments
      .filter(p => p.payment_type === 'received' && p.payment_date === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + p.amount, 0),
    todayPaid: payments
      .filter(p => p.payment_type === 'paid' && p.payment_date === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Payment Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              <span>Record Payment</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
              <DialogTitle className="text-base sm:text-lg md:text-xl">
                {editingPayment ? 'Edit Payment' : 'Record Payment'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingPayment ? 'Update payment transaction details.' : 'Record a new payment transaction for customers or suppliers.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="payment-form space-y-4 sm:space-y-5 md:space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="payment_type" className="text-sm sm:text-base mb-1.5 block">Payment Type</Label>
                  <Select value={formData.payment_type} onValueChange={(value) => setFormData({...formData, payment_type: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Payment Received</SelectItem>
                      <SelectItem value="paid">Payment Made</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference_type" className="text-sm sm:text-base mb-1.5 block">Reference Type</Label>
                  <Select value={formData.reference_type} onValueChange={(value) => setFormData({...formData, reference_type: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.payment_type === 'received' && (
                        <SelectItem value="order">Sales Order</SelectItem>
                      )}
                      {formData.payment_type === 'paid' && (
                        <SelectItem value="purchase_invoice">Purchase Invoice</SelectItem>
                      )}
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="reference_id" className="text-sm sm:text-base mb-1.5 block">Reference</Label>
                <Select value={formData.reference_id} onValueChange={(value) => setFormData({...formData, reference_id: value})}>
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                    <SelectValue placeholder="Select reference" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.reference_type === 'order' && orders.map((order) => (
                      <SelectItem key={order.id} value={order.id} className="text-sm">
                        {order.invoice_number} - {order.customer_name} (₹{order.total_amount})
                      </SelectItem>
                    ))}
                    {formData.reference_type === 'purchase_invoice' && purchaseInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id} className="text-sm">
                        {invoice.invoice_number} - {invoice.suppliers?.name} (₹{invoice.total_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_type === 'received' && (
                <div>
                  <Label htmlFor="customer_id" className="text-sm sm:text-base mb-1.5 block">Customer (Optional)</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Customer</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id} className="text-sm">
                          {customer.name} (Outstanding: ₹{customer.outstanding_balance})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.payment_type === 'paid' && (
                <div>
                  <Label htmlFor="supplier_id" className="text-sm sm:text-base mb-1.5 block">Supplier (Optional)</Label>
                  <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Supplier</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id} className="text-sm">
                          {supplier.name} (Outstanding: ₹{supplier.outstanding_balance})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="amount" className="text-sm sm:text-base mb-1.5 block">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    placeholder="0.00"
                    required
                    className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_date" className="text-sm sm:text-base mb-1.5 block">Payment Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_method" className="text-sm sm:text-base mb-1.5 block">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.payment_method === 'online' || formData.payment_method === 'upi' || formData.payment_method === 'card') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="transaction_id" className="text-sm sm:text-base mb-1.5 block">Transaction ID</Label>
                    <Input
                      id="transaction_id"
                      value={formData.transaction_id}
                      onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                      placeholder="Transaction ID"
                      className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_name" className="text-sm sm:text-base mb-1.5 block">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      placeholder="Bank name"
                      className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                    />
                  </div>
                </div>
              )}

              {formData.payment_method === 'cheque' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="cheque_number" className="text-sm sm:text-base mb-1.5 block">Cheque Number</Label>
                    <Input
                      id="cheque_number"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({...formData, cheque_number: e.target.value})}
                      placeholder="Cheque number"
                      className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cheque_date" className="text-sm sm:text-base mb-1.5 block">Cheque Date</Label>
                    <Input
                      id="cheque_date"
                      type="date"
                      value={formData.cheque_date}
                      onChange={(e) => setFormData({...formData, cheque_date: e.target.value})}
                      className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-sm sm:text-base mb-1.5 block">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Payment notes"
                  rows={3}
                  className="min-h-[70px] sm:min-h-[80px] md:min-h-[90px] text-sm sm:text-base resize-none"
                />
              </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t sticky bottom-0 bg-white pb-2 sm:pb-0">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    {loading ? (editingPayment ? 'Updating...' : 'Recording...') : (editingPayment ? 'Update Payment' : 'Record Payment')}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Received</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">₹{paymentStats.totalReceived.toLocaleString()}</p>
              </div>
              <ArrowDownLeft className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Paid</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">₹{paymentStats.totalPaid.toLocaleString()}</p>
              </div>
              <ArrowUpRight className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Today Received</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">₹{paymentStats.todayReceived.toLocaleString()}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Today Paid</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">₹{paymentStats.todayPaid.toLocaleString()}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg md:text-xl">Filters</CardTitle>
            {(searchTerm || typeFilter !== 'all' || methodFilter !== 'all') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 text-xs sm:text-sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 text-sm sm:text-base"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List - Dual Display: Desktop Table + Mobile/Tablet Cards */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Payments ({filteredPayments.length})</CardTitle>
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
              <TableShimmer rows={8} columns={8} />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">No payments found matching your criteria.</p>
              {(searchTerm || typeFilter !== 'all' || methodFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-4 h-10 text-sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (lg+) */}
              <div className="hidden lg:block w-full overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold">Payment #</th>
                      <th className="text-left p-3 text-sm font-semibold">Type</th>
                      <th className="text-left p-3 text-sm font-semibold">Party</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Method</th>
                      <th className="text-left p-3 text-sm font-semibold">Reference</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => {
                      const Icon = getPaymentTypeIcon(payment.payment_type);
                      return (
                        <tr key={payment.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-semibold text-sm">{payment.payment_number}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${payment.payment_type === 'received' ? 'text-green-500' : 'text-red-500'}`} />
                              <Badge variant={getPaymentTypeBadgeVariant(payment.payment_type)} className="text-xs">
                                {payment.payment_type}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {payment.customers?.name || payment.suppliers?.name || '-'}
                          </td>
                          <td className="p-3 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="p-3 font-semibold text-sm">
                            <span className={payment.payment_type === 'received' ? 'text-green-600' : 'text-red-600'}>
                              {payment.payment_type === 'received' ? '+' : '-'}₹{payment.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 capitalize text-sm">{payment.payment_method.replace('_', ' ')}</td>
                          <td className="p-3 capitalize text-sm">{payment.reference_type.replace('_', ' ')}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(payment)}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(payment)}
                                className="h-8 w-8 p-0"
                                title="Edit Payment"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(payment)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Payment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View (< lg) */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {paginatedPayments.map((payment) => {
                  const Icon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Card key={payment.id} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm sm:text-base truncate">
                              {payment.payment_number}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Icon className={`h-4 w-4 ${payment.payment_type === 'received' ? 'text-green-500' : 'text-red-500'}`} />
                            <Badge variant={getPaymentTypeBadgeVariant(payment.payment_type)} className="text-xs">
                              {payment.payment_type}
                            </Badge>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Party</p>
                            <p className="font-semibold truncate">{payment.customers?.name || payment.suppliers?.name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Amount</p>
                            <p className={`font-bold text-base sm:text-lg ${payment.payment_type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                              {payment.payment_type === 'received' ? '+' : '-'}₹{payment.amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Method</p>
                            <p className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Reference</p>
                            <p className="font-medium capitalize">{payment.reference_type.replace('_', ' ')}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(payment)}
                            className="flex-1 h-9 text-xs sm:text-sm touch-manipulation"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                            className="flex-1 h-9 text-xs sm:text-sm touch-manipulation"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(payment)}
                            className="flex-1 h-9 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 touch-manipulation"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-9 px-3 text-xs sm:text-sm touch-manipulation"
                    >
                      Previous
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
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-9 w-9 p-0 text-xs sm:text-sm touch-manipulation"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 px-3 text-xs sm:text-sm touch-manipulation"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl">Payment Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete information about this payment transaction.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Number</Label>
                  <p className="font-semibold text-sm sm:text-base">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedPayment.payment_type === 'received' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant={getPaymentTypeBadgeVariant(selectedPayment.payment_type)} className="text-xs">
                      {selectedPayment.payment_type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className={`font-bold text-lg ${selectedPayment.payment_type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPayment.payment_type === 'received' ? '+' : '-'}₹{selectedPayment.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Date</Label>
                  <p className="font-semibold text-sm sm:text-base">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <p className="font-semibold text-sm sm:text-base capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reference Type</Label>
                  <p className="font-semibold text-sm sm:text-base capitalize">{selectedPayment.reference_type.replace('_', ' ')}</p>
                </div>
                {selectedPayment.customers && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer</Label>
                    <p className="font-semibold text-sm sm:text-base">{selectedPayment.customers.name}</p>
                  </div>
                )}
                {selectedPayment.suppliers && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Supplier</Label>
                    <p className="font-semibold text-sm sm:text-base">{selectedPayment.suppliers.name}</p>
                  </div>
                )}
                {selectedPayment.transaction_id && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                    <p className="font-semibold text-sm sm:text-base">{selectedPayment.transaction_id}</p>
                  </div>
                )}
                {selectedPayment.bank_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank Name</Label>
                    <p className="font-semibold text-sm sm:text-base">{selectedPayment.bank_name}</p>
                  </div>
                )}
                {selectedPayment.cheque_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cheque Number</Label>
                    <p className="font-semibold text-sm sm:text-base">{selectedPayment.cheque_number}</p>
                  </div>
                )}
                {selectedPayment.cheque_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cheque Date</Label>
                    <p className="font-semibold text-sm sm:text-base">{new Date(selectedPayment.cheque_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {selectedPayment.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm sm:text-base mt-1 p-3 bg-gray-50 rounded-md">{selectedPayment.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Created At</Label>
                <p className="text-xs sm:text-sm">{new Date(selectedPayment.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="h-10 touch-manipulation">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Delete Payment</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete this payment?
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="py-4 space-y-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-semibold">Payment: {selectedPayment.payment_number}</p>
                <p className="text-sm">Amount: ₹{selectedPayment.amount.toLocaleString()}</p>
                <p className="text-sm">Type: {selectedPayment.payment_type}</p>
                <p className="text-sm">Date: {new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This will also update the payment status of the associated order/invoice.
              </p>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
              className="h-10 sm:h-9 touch-manipulation"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="h-10 sm:h-9 touch-manipulation"
            >
              {loading ? 'Deleting...' : 'Delete Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}