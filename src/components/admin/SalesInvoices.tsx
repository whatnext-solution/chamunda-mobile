import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, Printer, Download, Filter, Calendar, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Order {
  id: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  status: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
  customers?: {
    name: string;
    phone?: string;
  };
}

interface OrderItem {
  id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  line_total: number;
}

export default function SalesInvoices() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: '',
    payment_status: '',
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ FIX: Reset pagination when filters change
  useEffect(() => {
    pagination.goToFirstPage();
  }, [searchTerm, statusFilter, paymentStatusFilter, dateRange]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('orders')
        .select(`
          *,
          customers(name, phone),
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (order: Order) => {
    try {
      const { data: orderItems, error } = await (supabase as any)
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;
      
      setSelectedOrder({
        ...order,
        order_items: orderItems || []
      });
      setIsViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch order details');
    }
  };

  const handleEditOrder = async (order: Order) => {
    // ✅ NEW: Implement full edit functionality
    try {
      const { data: orderItems, error } = await (supabase as any)
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;
      
      setSelectedOrder({
        ...order,
        order_items: orderItems || []
      });
      
      // Populate edit form with current values
      setEditFormData({
        status: order.status,
        payment_status: order.payment_status || 'pending',
        payment_method: order.payment_method || 'not_specified',
        notes: order.notes || ''
      });
      
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order for editing');
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await (supabase as any)
        .from('orders')
        .update({
          status: editFormData.status,
          payment_status: editFormData.payment_status,
          payment_method: editFormData.payment_method === 'not_specified' ? null : editFormData.payment_method || null,
          notes: editFormData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('Invoice updated successfully');
      setIsEditDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleDeleteOrder = async (orderId: string, invoiceNumber?: string) => {
    // ✅ FIX: Better confirmation message with invoice number
    const invoiceIdentifier = invoiceNumber || orderId.slice(0, 8);
    if (!confirm(`Are you sure you want to delete Invoice #${invoiceIdentifier}? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete order items
      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await (supabase as any)
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Invoice deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const printInvoice = (order: Order) => {
    // ✅ FIX: Check if order_items exists before printing
    if (!order.order_items || order.order_items.length === 0) {
      toast.error('Cannot print invoice: No items found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .company-info { text-align: center; margin-bottom: 20px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALES INVOICE</h1>
          </div>
          
          <div class="company-info">
            <h2>ElectroStore</h2>
            <p>123 Tech Street, Digital City</p>
            <p>Phone: +1234567890 | Email: contact@electrostore.com</p>
          </div>
          
          <div class="invoice-info">
            <div>
              <strong>Invoice Number:</strong> ${order.invoice_number || order.id.slice(0, 8)}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}<br>
              <strong>Status:</strong> ${order.status.toUpperCase()}
            </div>
            <div>
              <strong>Payment Method:</strong> ${order.payment_method || 'N/A'}<br>
              <strong>Payment Status:</strong> ${(order.payment_status || 'pending').toUpperCase()}
            </div>
          </div>
          
          <div class="customer-info">
            <h3>Bill To:</h3>
            <strong>${order.customers?.name || order.customer_name || 'Walk-in Customer'}</strong><br>
            ${(order.customers?.phone || order.customer_phone) ? `Phone: ${order.customers?.phone || order.customer_phone}<br>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items?.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.product_sku || '-'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${(item.tax_amount || 0).toFixed(2)}</td>
                  <td>₹${item.line_total.toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          <table class="totals">
            <tr><td>Subtotal:</td><td>₹${(order.subtotal || 0).toFixed(2)}</td></tr>
            <tr><td>Tax:</td><td>₹${(order.tax_amount || 0).toFixed(2)}</td></tr>
            <tr><td>Discount:</td><td>-₹${(order.discount_amount || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total:</td><td>₹${(order.total_amount || 0).toFixed(2)}</td></tr>
          </table>
          
          ${order.notes ? `<div><strong>Notes:</strong> ${order.notes}</div>` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer generated invoice.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Invoice Number', 'Customer', 'Date', 'Total Amount', 'Payment Status', 'Status'].join(','),
      ...filteredOrders.map(order => [
        order.invoice_number || order.id.slice(0, 8),
        order.customers?.name || order.customer_name || 'Walk-in Customer',
        new Date(order.created_at).toLocaleDateString(),
        order.total_amount || 0,
        order.payment_status || 'pending',
        order.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partially_paid': return 'secondary';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const customerName = order.customers?.name || order.customer_name || '';
      const invoiceNumber = order.invoice_number || order.id.slice(0, 8);
      
      const matchesSearch = invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
      
      let matchesDate = true;
      if (dateRange !== 'all') {
        const orderDate = new Date(order.created_at);
        const today = new Date();
        
        switch (dateRange) {
          case 'today':
            matchesDate = orderDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, dateRange]);

  const pagination = usePagination({
    totalItems: filteredOrders.length,
    itemsPerPage: 30,
  });

  const paginatedOrders = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, pagination.startIndex, pagination.endIndex]);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Sales Invoices</h1>
        <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
          <Download className="h-4 w-4 mr-2" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Statistics Cards - Responsive Grid: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Total Invoices</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">{orders.length}</div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">All time invoices</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Pending</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
              {orders.filter(order => order.status === 'pending').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Confirmed</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
              {orders.filter(order => order.status === 'completed').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Cancelled</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
              {orders.filter(order => order.status === 'cancelled').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive Grid: 1 col mobile → 2 cols tablet → 4 cols desktop */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 text-sm sm:text-base"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
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

      {/* Invoices List - Dual Display: Desktop Table + Mobile/Tablet Cards */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Invoices ({filteredOrders.length})</CardTitle>
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
              <TableShimmer rows={8} columns={7} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">No invoices found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (lg+) */}
              <div className="hidden lg:block w-full overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold">Invoice #</th>
                      <th className="text-left p-3 text-sm font-semibold">Customer</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Payment</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-sm">{order.invoice_number || order.id.slice(0, 8)}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">{order.customers?.name || order.customer_name || 'Walk-in Customer'}</div>
                            {(order.customers?.phone || order.customer_phone) && (
                              <div className="text-xs text-muted-foreground">{order.customers?.phone || order.customer_phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-sm">₹{(order.total_amount || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={getPaymentStatusBadgeVariant(order.payment_status || 'pending')} className="text-xs">
                            {order.payment_status || 'pending'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewOrder(order)}
                              className="h-8 w-8 p-0"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOrder(order)}
                              className="h-8 w-8 p-0"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printInvoice(order)}
                              className="h-8 w-8 p-0"
                              title="Print Invoice"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOrder(order.id, order.invoice_number || order.id.slice(0, 8))}
                              className="h-8 w-8 p-0"
                              title="Delete Invoice"
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

              {/* Mobile/Tablet Card View (< lg) */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {paginatedOrders.map((order) => (
                  <Card key={order.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate">
                            Invoice #{order.invoice_number || order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                          <Badge variant={getPaymentStatusBadgeVariant(order.payment_status || 'pending')} className="text-xs">
                            {order.payment_status || 'pending'}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer & Amount Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Customer</p>
                          <p className="font-semibold truncate">{order.customers?.name || order.customer_name || 'Walk-in'}</p>
                          {(order.customers?.phone || order.customer_phone) && (
                            <p className="text-xs text-muted-foreground truncate">{order.customers?.phone || order.customer_phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amount</p>
                          <p className="font-bold text-base sm:text-lg text-primary">₹{(order.total_amount || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{order.payment_method || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrder(order)}
                          className="flex-1 h-10 sm:h-9 text-xs sm:text-sm touch-manipulation"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          <span>View</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditOrder(order)}
                          className="flex-1 h-10 sm:h-9 text-xs sm:text-sm touch-manipulation"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printInvoice(order)}
                          className="flex-1 h-10 sm:h-9 text-xs sm:text-sm touch-manipulation"
                        >
                          <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          <span>Print</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteOrder(order.id, order.invoice_number || order.id.slice(0, 8))}
                          className="h-10 sm:h-9 w-10 sm:w-9 p-0 touch-manipulation flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredOrders.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredOrders.length}
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
                    itemsPerPageOptions={[15, 30, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog - Responsive */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        // ✅ FIX: Reset selectedOrder when dialog closes
        if (!open) {
          setSelectedOrder(null);
        }
      }}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-base sm:text-lg md:text-xl">Invoice Details - {selectedOrder?.invoice_number || selectedOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View complete invoice information including customer details, items, and payment status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
          {selectedOrder && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6 py-4">
              {/* Invoice Header - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Customer Information</h3>
                  <div className="text-xs sm:text-sm md:text-base space-y-1.5">
                    <p><strong>Name:</strong> {selectedOrder.customers?.name || selectedOrder.customer_name || 'Walk-in Customer'}</p>
                    {(selectedOrder.customers?.phone || selectedOrder.customer_phone) && (
                      <p><strong>Phone:</strong> {selectedOrder.customers?.phone || selectedOrder.customer_phone}</p>
                    )}
                  </div>
                </div>
                <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Invoice Information</h3>
                  <div className="text-xs sm:text-sm md:text-base space-y-1.5">
                    <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                    <p><strong>Payment Method:</strong> {selectedOrder.payment_method || 'N/A'}</p>
                    <div><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="text-xs ml-2">{selectedOrder.status}</Badge></div>
                  </div>
                </div>
              </div>

              {/* Order Items - Responsive Table */}
              <div>
                <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Items</h3>
                
                {/* Desktop Table View */}
                <div className="hidden md:block w-full overflow-x-auto border-2 rounded-lg shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th className="text-left p-3 border-b-2 font-semibold">Product</th>
                        <th className="text-left p-3 border-b-2 font-semibold">SKU</th>
                        <th className="text-left p-3 border-b-2 font-semibold">Qty</th>
                        <th className="text-left p-3 border-b-2 font-semibold">Rate</th>
                        <th className="text-left p-3 border-b-2 font-semibold">Tax</th>
                        <th className="text-left p-3 border-b-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.order_items?.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium">{item.product_name}</td>
                          <td className="p-3">{item.product_sku || '-'}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">₹{item.unit_price.toFixed(2)}</td>
                          <td className="p-3">₹{(item.tax_amount || 0).toFixed(2)}</td>
                          <td className="p-3 font-semibold text-primary">₹{item.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="md:hidden space-y-2 sm:space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <Card key={item.id} className="border-2 shadow-sm">
                      <CardContent className="p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                        <div className="font-semibold text-sm sm:text-base">{item.product_name}</div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div><span className="text-muted-foreground">SKU:</span> {item.product_sku || '-'}</div>
                          <div><span className="text-muted-foreground">Qty:</span> {item.quantity}</div>
                          <div><span className="text-muted-foreground">Rate:</span> ₹{item.unit_price.toFixed(2)}</div>
                          <div><span className="text-muted-foreground">Tax:</span> ₹{(item.tax_amount || 0).toFixed(2)}</div>
                        </div>
                        <div className="pt-2 border-t font-bold text-sm sm:text-base text-primary">
                          Total: ₹{item.line_total.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Totals - Responsive */}
              <div className="flex justify-center sm:justify-end pt-2">
                <div className="w-full sm:w-72 md:w-80 space-y-2.5 p-4 sm:p-5 border-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 shadow-sm">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">₹{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-semibold">₹{(selectedOrder.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-semibold">-₹{(selectedOrder.discount_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base sm:text-lg md:text-xl border-t-2 pt-2.5 text-primary">
                    <span>Total:</span>
                    <span>₹{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                  <h3 className="font-bold mb-2 text-sm sm:text-base md:text-lg">Notes</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t-2 sticky bottom-0 bg-white pb-2 sm:pb-0">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                  Close
                </Button>
                <Button variant="outline" onClick={() => printInvoice(selectedOrder)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                  <Printer className="h-4 w-4 mr-2" />
                  <span>Print</span>
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setSelectedOrder(null);
          setEditFormData({ status: '', payment_status: '', payment_method: '', notes: '' });
        }
      }}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-base sm:text-lg md:text-xl">
              Edit Invoice - {selectedOrder?.invoice_number || selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update invoice status, payment information, and notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
            {selectedOrder && (
              <div className="space-y-4 sm:space-y-5 py-4">
                {/* Invoice Summary */}
                <div className="p-3 sm:p-4 border-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <h3 className="font-bold mb-2 text-sm sm:text-base">Invoice Summary</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-semibold">{selectedOrder.customers?.name || selectedOrder.customer_name || 'Walk-in'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Amount:</span>
                      <p className="font-semibold text-primary">₹{(selectedOrder.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Items:</span>
                      <p className="font-semibold">{selectedOrder.order_items?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Order Status */}
                    <div>
                      <Label htmlFor="edit-status" className="text-sm font-medium">
                        Order Status <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={editFormData.status} 
                        onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                      >
                        <SelectTrigger id="edit-status" className="h-11 sm:h-10 mt-1.5">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Status */}
                    <div>
                      <Label htmlFor="edit-payment-status" className="text-sm font-medium">
                        Payment Status <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={editFormData.payment_status} 
                        onValueChange={(value) => setEditFormData({...editFormData, payment_status: value})}
                      >
                        <SelectTrigger id="edit-payment-status" className="h-11 sm:h-10 mt-1.5">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partially_paid">Partially Paid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label htmlFor="edit-payment-method" className="text-sm font-medium">
                      Payment Method
                    </Label>
                    <Select 
                      value={editFormData.payment_method} 
                      onValueChange={(value) => setEditFormData({...editFormData, payment_method: value})}
                    >
                      <SelectTrigger id="edit-payment-method" className="h-11 sm:h-10 mt-1.5">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">Not Specified</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="net_banking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="edit-notes" className="text-sm font-medium">
                      Notes
                    </Label>
                    <Textarea
                      id="edit-notes"
                      placeholder="Add any notes or comments about this invoice..."
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                      className="min-h-[100px] mt-1.5 text-sm"
                    />
                  </div>
                </div>

                {/* Warning Message */}
                <div className="p-3 sm:p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Note:</strong> Changing the order status or payment status will update the invoice. 
                    Make sure the information is accurate before saving.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)} 
              className="w-full sm:w-auto h-11 sm:h-10 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateOrder} 
              className="w-full sm:w-auto h-11 sm:h-10 text-sm sm:text-base"
              disabled={!editFormData.status || !editFormData.payment_status}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}