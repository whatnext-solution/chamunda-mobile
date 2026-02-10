import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Eye, ArrowLeft, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface SalesReturn {
  id: string;
  return_number: string;
  customer_name: string;
  return_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  refund_method: string;
  refund_status: string;
  reason?: string;
  notes?: string;
  created_at: string;
  orders?: { invoice_number: string };
  sales_return_items?: SalesReturnItem[];
}

interface SalesReturnItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  reason?: string;
}

interface Order {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export default function SalesReturns() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [returnItems, setReturnItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    reason: string;
  }>>([]);
  const [formData, setFormData] = useState({
    original_order_id: '',
    refund_method: 'cash',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchReturns();
    fetchOrders();
  }, []);

  // ✅ FIX: Reset pagination when filters change
  useEffect(() => {
    if (pagination) {
      pagination.goToFirstPage();
    }
  }, [searchTerm, statusFilter]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_returns' as any)
        .select(`
          *,
          orders (invoice_number),
          sales_return_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data as any) || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders' as any)
        .select(`
          id,
          invoice_number,
          customer_name,
          total_amount,
          order_items (*)
        `)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const generateReturnNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `RET${timestamp}`;
  };

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setFormData({...formData, original_order_id: orderId});
      // Initialize return items from order items
      setReturnItems(order.order_items?.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: 0,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        reason: ''
      })) || []);
    }
  };

  const updateReturnItem = (index: number, field: string, value: any) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setReturnItems(updatedItems);
  };

  const calculateTotals = () => {
    const validItems = returnItems.filter(item => item.quantity > 0);
    const subtotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalTax = validItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const total = subtotal + totalTax;
    
    return { subtotal, totalTax, total, validItems };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { subtotal, totalTax, total, validItems } = calculateTotals();
    
    if (validItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    try {
      setLoading(true);
      
      // Create sales return
      const { data: salesReturn, error: returnError } = await supabase
        .from('sales_returns' as any)
        .insert([{
          return_number: generateReturnNumber(),
          original_order_id: formData.original_order_id,
          customer_id: null, // Will be set from order
          customer_name: selectedOrder?.customer_name || '',
          subtotal,
          tax_amount: totalTax,
          total_amount: total,
          refund_method: formData.refund_method,
          refund_status: 'pending',
          reason: formData.reason,
          notes: formData.notes
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = validItems.map(item => ({
        sales_return_id: (salesReturn as any).id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.quantity * item.unit_price * item.tax_rate / 100,
        line_total: item.quantity * item.unit_price + (item.quantity * item.unit_price * item.tax_rate / 100),
        reason: item.reason
      }));

      const { error: itemsError } = await supabase
        .from('sales_return_items' as any)
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update inventory
      for (const item of validItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          const newQuantity = product.stock_quantity + item.quantity;
          
          await supabase
            .from('products')
            .update({ stock_quantity: newQuantity })
            .eq('id', item.product_id);

          // Create inventory transaction
          await supabase
            .from('inventory_transactions' as any)
            .insert([{
              product_id: item.product_id,
              transaction_type: 'return',
              reference_type: 'sales_return',
              reference_id: (salesReturn as any).id,
              quantity_change: item.quantity,
              quantity_before: product.stock_quantity,
              quantity_after: newQuantity,
              unit_cost: item.unit_price,
              notes: `Sales Return - ${(salesReturn as any).return_number}`
            }]);
        }
      }

      toast.success(`Return ${(salesReturn as any).return_number} created successfully!`);
      resetForm();
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReturn = async (returnItem: SalesReturn) => {
    try {
      const { data: returnItems, error } = await supabase
        .from('sales_return_items' as any)
        .select('*')
        .eq('sales_return_id', returnItem.id);

      if (error) throw error;
      
      setSelectedReturn({
        ...returnItem,
        sales_return_items: (returnItems as any) || []
      });
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('Failed to fetch return details');
    }
  };

  const handleEditReturn = (returnItem: SalesReturn) => {
    // For now, show a message that editing is not implemented
    // In a full implementation, you would populate the form with return data
    toast.info('Edit functionality will be implemented in the next update');
  };

  const handleDeleteReturn = async (returnId: string, returnNumber?: string) => {
    // ✅ FIX: Better confirmation message with return number
    const returnIdentifier = returnNumber || returnId.slice(0, 8);
    if (!confirm(`Are you sure you want to delete Return #${returnIdentifier}? This action cannot be undone and will not restore inventory.`)) {
      return;
    }

    try {
      // First delete return items
      const { error: itemsError } = await supabase
        .from('sales_return_items' as any)
        .delete()
        .eq('sales_return_id', returnId);

      if (itemsError) throw itemsError;

      // Then delete the return
      const { error: returnError } = await supabase
        .from('sales_returns' as any)
        .delete()
        .eq('id', returnId);

      if (returnError) throw returnError;

      toast.success(`Return #${returnIdentifier} deleted successfully`);
      fetchReturns();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Failed to delete return');
    }
  };

  const resetForm = () => {
    setFormData({
      original_order_id: '',
      refund_method: 'cash',
      reason: '',
      notes: ''
    });
    setSelectedOrder(null);
    setReturnItems([]);
    setIsDialogOpen(false);
  };

  // ✅ NEW: Reset filters function
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(returnItem => {
      const matchesSearch = returnItem.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           returnItem.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || returnItem.refund_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [returns, searchTerm, statusFilter]);

  // ✅ NEW: Add pagination
  const pagination = usePagination({
    totalItems: filteredReturns.length,
    itemsPerPage: 20,
  });

  const paginatedReturns = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredReturns.slice(startIndex, endIndex);
  }, [filteredReturns, pagination.startIndex, pagination.endIndex]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Sales Returns</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
              <Plus className="h-4 w-4 sm:h-4 sm:w-4 mr-2" />
              <span>Create Return</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
              <DialogTitle className="text-base sm:text-lg md:text-xl">Create Sales Return</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="sales-return-form space-y-4 sm:space-y-5 md:space-y-6 py-4">
              {/* Order Selection */}
              <div>
                <Label htmlFor="order" className="text-sm sm:text-base mb-1.5 block">Select Order *</Label>
                <Select value={formData.original_order_id} onValueChange={handleOrderSelect}>
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                    <SelectValue placeholder="Select an order to return" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id} className="text-sm sm:text-base">
                        {order.invoice_number} - {order.customer_name} (₹{order.total_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <>
                  {/* Return Items - Responsive */}
                  <div>
                    <Label className="text-sm sm:text-base mb-2 block">Return Items</Label>
                    <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50/50">
                      {returnItems.map((item, index) => (
                        <div key={index} className="flex flex-col md:grid md:grid-cols-6 gap-3 md:gap-4 md:items-center p-3 sm:p-4 border rounded-lg bg-white shadow-sm">
                          <div className="md:col-span-2">
                            <p className="font-semibold text-sm sm:text-base">{item.product_name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Unit Price: ₹{item.unit_price}</p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm mb-1 block">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              max={selectedOrder.order_items?.find(oi => oi.product_id === item.product_id)?.quantity || 0}
                              value={item.quantity}
                              onChange={(e) => updateReturnItem(index, 'quantity', Number(e.target.value))}
                              className="h-10 sm:h-9 md:h-10 text-sm sm:text-base"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs sm:text-sm mb-1 block">Reason</Label>
                            <Select value={item.reason} onValueChange={(value) => updateReturnItem(index, 'reason', value)}>
                              <SelectTrigger className="h-10 sm:h-9 md:h-10 text-sm sm:text-base">
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="defective">Defective</SelectItem>
                                <SelectItem value="wrong_item">Wrong Item</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                                <SelectItem value="not_satisfied">Not Satisfied</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0">
                            <Label className="text-xs sm:text-sm md:hidden mb-1 block">Line Total</Label>
                            <p className="font-bold text-base sm:text-lg text-primary">
                              ₹{(item.quantity * item.unit_price * (1 + item.tax_rate / 100)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Details - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="refund_method" className="text-sm sm:text-base mb-1.5 block">Refund Method</Label>
                      <Select value={formData.refund_method} onValueChange={(value) => setFormData({...formData, refund_method: value})}>
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="credit">Store Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reason" className="text-sm sm:text-base mb-1.5 block">Return Reason</Label>
                      <Input
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        placeholder="Overall return reason"
                        className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm sm:text-base mb-1.5 block">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes"
                      rows={3}
                      className="min-h-[70px] sm:min-h-[80px] md:min-h-[90px] text-sm sm:text-base resize-none"
                    />
                  </div>

                  {/* Totals - Responsive */}
                  <div className="flex justify-center sm:justify-end pt-2">
                    <div className="w-full sm:w-72 md:w-80 space-y-2.5 p-4 sm:p-5 border-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold">₹{calculateTotals().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-semibold">₹{calculateTotals().totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base sm:text-lg md:text-xl border-t-2 pt-2.5 text-primary">
                        <span>Total Refund:</span>
                        <span>₹{calculateTotals().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t sticky bottom-0 bg-white pb-2 sm:pb-0">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !selectedOrder} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    {loading ? 'Creating...' : 'Create Return'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Total Returns</CardTitle>
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">{returns.length}</div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">All time returns</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Pending</CardTitle>
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
              {returns.filter(ret => ret.refund_status === 'pending').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Awaiting refund</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Confirmed</CardTitle>
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
              {returns.filter(ret => ret.refund_status === 'completed').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Refund completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5 lg:p-6">
            <CardTitle className="text-xs sm:text-sm md:text-base font-medium">Cancelled</CardTitle>
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
              {returns.filter(ret => ret.refund_status === 'cancelled').length}
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Cancelled returns</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive: 1 col mobile → 3 cols desktop */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 text-sm sm:text-base"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ NEW: Clear Filters Button */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns List - Dual Display: Table (Desktop) + Cards (Mobile/Tablet) */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Returns ({filteredReturns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          {loading ? (
            <TableShimmer rows={8} columns={7} />
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm sm:text-base">No returns found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (lg+) */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold">Return #</th>
                      <th className="text-left p-3 text-sm font-semibold">Customer</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Refund Method</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReturns.map((returnItem) => (
                      <tr key={returnItem.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-sm">{returnItem.return_number}</td>
                        <td className="p-3 text-sm">{returnItem.customer_name}</td>
                        <td className="p-3 text-sm">{new Date(returnItem.return_date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-sm">₹{returnItem.total_amount.toLocaleString()}</td>
                        <td className="p-3 capitalize text-sm">{returnItem.refund_method}</td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(returnItem.refund_status)} className="text-xs">
                            {returnItem.refund_status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReturn(returnItem)}
                              className="h-8 w-8 p-0"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditReturn(returnItem)}
                              className="h-8 w-8 p-0"
                              title="Edit Return"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteReturn(returnItem.id, returnItem.return_number)}
                              className="h-8 w-8 p-0"
                              title="Delete Return"
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
                {paginatedReturns.map((returnItem) => (
                  <Card key={returnItem.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-3">
                        {/* Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm sm:text-base truncate">{returnItem.return_number}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{returnItem.customer_name}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(returnItem.refund_status)} className="text-xs flex-shrink-0">
                            {returnItem.refund_status}
                          </Badge>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm pt-2 border-t">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Date</p>
                            <p className="font-medium">{new Date(returnItem.return_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Amount</p>
                            <p className="font-bold text-primary">₹{returnItem.total_amount.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-0.5">Refund Method</p>
                            <p className="font-medium capitalize">{returnItem.refund_method}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReturn(returnItem)}
                            className="flex-1 h-10 sm:h-9 touch-manipulation text-xs sm:text-sm"
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                            <span>View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditReturn(returnItem)}
                            className="flex-1 h-10 sm:h-9 touch-manipulation text-xs sm:text-sm"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReturn(returnItem.id, returnItem.return_number)}
                            className="h-10 sm:h-9 w-10 sm:w-9 p-0 touch-manipulation flex-shrink-0"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ✅ NEW: Pagination */}
              {filteredReturns.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredReturns.length}
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
                    itemsPerPageOptions={[10, 20, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Return Dialog - Responsive */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-base sm:text-lg md:text-xl">Return Details - {selectedReturn?.return_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
            {selectedReturn && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 py-4">
                {/* Return Header - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
                    <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Customer Information</h3>
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base">
                      <p><strong>Name:</strong> {selectedReturn.customer_name}</p>
                      <p><strong>Return Date:</strong> {new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
                    <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Return Information</h3>
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base">
                      <p><strong>Refund Method:</strong> <span className="capitalize">{selectedReturn.refund_method}</span></p>
                      <p className="flex items-center gap-2"><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedReturn.refund_status)} className="text-xs">{selectedReturn.refund_status}</Badge></p>
                      {selectedReturn.reason && <p><strong>Reason:</strong> {selectedReturn.reason}</p>}
                    </div>
                  </div>
                </div>

                {/* Return Items - Dual Display */}
                <div>
                  <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Returned Items</h3>
                  
                  {/* Desktop Table View (lg+) */}
                  <div className="hidden lg:block overflow-x-auto border-2 rounded-lg shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Product</th>
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Qty</th>
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Rate</th>
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Tax</th>
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Total</th>
                          <th className="text-left p-3 border-b-2 text-sm font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.sales_return_items?.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                            <td className="p-3 text-sm font-medium">{item.product_name}</td>
                            <td className="p-3 text-sm">{item.quantity}</td>
                            <td className="p-3 text-sm">₹{item.unit_price.toFixed(2)}</td>
                            <td className="p-3 text-sm">₹{item.tax_amount.toFixed(2)}</td>
                            <td className="p-3 text-sm font-semibold text-primary">₹{item.line_total.toFixed(2)}</td>
                            <td className="p-3 text-sm capitalize">{item.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile/Tablet Card View (< lg) */}
                  <div className="lg:hidden space-y-2 sm:space-y-3">
                    {selectedReturn.sales_return_items?.map((item) => (
                      <Card key={item.id} className="border-2 shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="space-y-2 sm:space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-semibold text-sm sm:text-base flex-1 min-w-0">{item.product_name}</p>
                              <p className="font-bold text-sm sm:text-base text-primary flex-shrink-0">₹{item.line_total.toFixed(2)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm pt-2 border-t">
                              <div>
                                <p className="text-muted-foreground mb-0.5">Quantity</p>
                                <p className="font-semibold">{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Rate</p>
                                <p className="font-semibold">₹{item.unit_price.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Tax</p>
                                <p className="font-semibold">₹{item.tax_amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Reason</p>
                                <p className="font-semibold capitalize">{item.reason || '-'}</p>
                              </div>
                            </div>
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
                      <span className="font-semibold">₹{selectedReturn.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-semibold">₹{selectedReturn.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base sm:text-lg md:text-xl border-t-2 pt-2.5 text-primary">
                      <span>Total Refund:</span>
                      <span>₹{selectedReturn.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedReturn.notes && (
                  <div className="p-3 sm:p-4 md:p-5 border-2 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                    <h3 className="font-bold mb-2 text-sm sm:text-base md:text-lg">Notes</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm md:text-base">{selectedReturn.notes}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4 sm:pt-6 border-t-2 sticky bottom-0 bg-white pb-2 sm:pb-0">
                  <Button onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}