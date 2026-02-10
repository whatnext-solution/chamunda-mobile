import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Eye, ArrowLeft, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseReturn {
  id: string;
  return_number: string;
  return_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  credit_note_number?: string;
  status: string;
  reason?: string;
  notes?: string;
  created_at: string;
  suppliers?: { name: string };
  purchase_invoices?: { invoice_number: string };
  purchase_return_items?: PurchaseReturnItem[];
}

interface PurchaseReturnItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  reason?: string;
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  suppliers?: { name: string };
  total_amount: number;
  purchase_items?: PurchaseItem[];
}

interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export default function PurchaseReturns() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
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
    original_purchase_id: '',
    supplier_id: '',
    credit_note_number: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchReturns();
    fetchPurchaseInvoices();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_returns')
        .select(`
          *,
          suppliers (name),
          purchase_invoices (invoice_number),
          purchase_return_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          suppliers (name),
          purchase_items (*)
        `)
        .eq('status', 'received')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseInvoices(data || []);
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
    }
  };

  const generateReturnNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PRET${timestamp}`;
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    const invoice = purchaseInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      // Fetch supplier_id from purchase_invoices table
      const { data: invoiceData, error } = await supabase
        .from('purchase_invoices')
        .select('supplier_id')
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error('Error fetching invoice supplier:', error);
        toast.error('Failed to load supplier information');
        return;
      }

      setSelectedInvoice(invoice);
      setFormData({
        ...formData, 
        original_purchase_id: invoiceId,
        supplier_id: invoiceData.supplier_id || '' // ✅ Set from invoice
      });
      // Initialize return items from purchase items
      setReturnItems(invoice.purchase_items?.map(item => ({
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

    // Validate return quantities
    for (const item of validItems) {
      const purchasedItem = selectedInvoice?.purchase_items?.find(pi => pi.product_id === item.product_id);
      if (purchasedItem && item.quantity > purchasedItem.quantity) {
        toast.error(`Return quantity for ${item.product_name} cannot exceed purchased quantity (${purchasedItem.quantity})`);
        return;
      }
    }

    try {
      setLoading(true);
      
      // Create purchase return
      const { data: purchaseReturn, error: returnError } = await supabase
        .from('purchase_returns')
        .insert([{
          return_number: generateReturnNumber(),
          original_purchase_id: formData.original_purchase_id,
          supplier_id: formData.supplier_id,
          subtotal,
          tax_amount: totalTax,
          total_amount: total,
          credit_note_number: formData.credit_note_number,
          status: 'pending',
          reason: formData.reason,
          notes: formData.notes
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = validItems.map(item => ({
        purchase_return_id: purchaseReturn.id,
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
        .from('purchase_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // ⚠️ NOTE: Inventory will NOT be reduced immediately
      // Inventory should only be reduced when return is APPROVED
      // This is a pending return, inventory sync will happen on approval

      toast.success(`Return ${purchaseReturn.return_number} created successfully! Awaiting approval.`);
      resetForm();
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReturn = async (returnItem: PurchaseReturn) => {
    try {
      const { data: returnItems, error } = await supabase
        .from('purchase_return_items')
        .select('*')
        .eq('purchase_return_id', returnItem.id);

      if (error) throw error;
      
      setSelectedReturn({
        ...returnItem,
        purchase_return_items: returnItems || []
      });
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('Failed to fetch return details');
    }
  };

  const handleEditReturn = (returnItem: PurchaseReturn) => {
    // For now, show a message that editing is not implemented
    // In a full implementation, you would populate the form with return data
    toast.info('Edit functionality will be implemented in the next update');
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<PurchaseReturn | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (returnItem: PurchaseReturn) => {
    setReturnToDelete(returnItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!returnToDelete) return;

    try {
      setDeleting(true);

      // First delete return items
      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .delete()
        .eq('purchase_return_id', returnToDelete.id);

      if (itemsError) throw itemsError;

      // Then delete the return
      const { error: returnError } = await supabase
        .from('purchase_returns')
        .delete()
        .eq('id', returnToDelete.id);

      if (returnError) throw returnError;

      toast.success('Purchase return deleted successfully');
      setDeleteDialogOpen(false);
      setReturnToDelete(null);
      fetchReturns();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Failed to delete return');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      original_purchase_id: '',
      supplier_id: '',
      credit_note_number: '',
      reason: '',
      notes: ''
    });
    setSelectedInvoice(null);
    setReturnItems([]);
    setIsDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processed': return 'default';
      case 'approved': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (returnItem.suppliers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Purchase Returns</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              Create Return
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[95vw] md:w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-lg sm:text-xl">Create Purchase Return</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleSubmit} className="purchase-return-form space-y-4 sm:space-y-5 md:space-y-6 py-4">
              {/* Invoice Selection */}
              <div>
                <Label htmlFor="invoice" className="mb-1.5 block text-sm sm:text-base">Select Purchase Invoice *</Label>
                <Select value={formData.original_purchase_id} onValueChange={handleInvoiceSelect}>
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue placeholder="Select a purchase invoice to return" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {invoice.suppliers?.name} (₹{invoice.total_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvoice && (
                <>
                  {/* Return Items */}
                  <div>
                    <Label className="text-sm sm:text-base">Return Items</Label>
                    <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                      {returnItems.map((item, index) => (
                        <div key={index} className="p-3 border rounded space-y-3 sm:space-y-0">
                          {/* Mobile: Stacked layout, Desktop: Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 sm:gap-4">
                            <div className="sm:col-span-2">
                              <p className="font-medium text-sm sm:text-base">{item.product_name}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">₹{item.unit_price}</p>
                            </div>
                            <div>
                              <Label className="text-xs sm:text-sm">Quantity</Label>
                              <Input
                                type="number"
                                min="0"
                                max={selectedInvoice.purchase_items?.find(pi => pi.product_id === item.product_id)?.quantity || 0}
                                value={item.quantity}
                                onChange={(e) => updateReturnItem(index, 'quantity', Number(e.target.value))}
                                className="h-10 sm:h-9 touch-manipulation"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs sm:text-sm">Reason</Label>
                              <Select value={item.reason} onValueChange={(value) => updateReturnItem(index, 'reason', value)}>
                                <SelectTrigger className="h-10 sm:h-9 touch-manipulation">
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="defective">Defective</SelectItem>
                                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                  <SelectItem value="excess_quantity">Excess Quantity</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-right">
                              <Label className="text-xs sm:text-sm">Total</Label>
                              <p className="font-medium text-sm sm:text-base">
                                ₹{(item.quantity * item.unit_price * (1 + item.tax_rate / 100)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="credit_note_number" className="mb-1.5 block text-sm sm:text-base">Credit Note Number</Label>
                      <Input
                        id="credit_note_number"
                        value={formData.credit_note_number}
                        onChange={(e) => setFormData({...formData, credit_note_number: e.target.value})}
                        placeholder="Credit note number"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reason" className="mb-1.5 block text-sm sm:text-base">Return Reason</Label>
                      <Input
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        placeholder="Overall return reason"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="mb-1.5 block text-sm sm:text-base">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes"
                      rows={2}
                      className="touch-manipulation resize-none"
                    />
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-64 space-y-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Subtotal:</span>
                        <span>₹{calculateTotals().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Tax:</span>
                        <span>₹{calculateTotals().totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base sm:text-lg border-t pt-2">
                        <span>Total Return:</span>
                        <span>₹{calculateTotals().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !selectedInvoice} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Returns</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{returns.length}</div>
            <p className="text-xs text-muted-foreground">All time returns</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
              {returns.filter(ret => ret.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Confirmed</CardTitle>
            <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              {returns.filter(ret => ret.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">Approved returns</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Cancelled</CardTitle>
            <Package className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">
              {returns.filter(ret => ret.status === 'cancelled').length}
            </div>
            <p className="text-xs text-muted-foreground">Cancelled returns</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {(searchTerm || statusFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Returns List - Dual Display: Desktop Table + Mobile/Tablet Cards */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Purchase Returns ({filteredReturns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          {loading ? (
            <div className="space-y-4">
              {/* Statistics Cards Shimmer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <StatsCardShimmer key={i} />
                ))}
              </div>
              
              {/* Filters Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                  </div>
                ))}
              </div>
              
              {/* Table Shimmer */}
              <TableShimmer rows={8} columns={8} />
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No returns found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first purchase return to get started'}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-900">
                      <th className="text-left p-3 text-sm font-semibold">Return #</th>
                      <th className="text-left p-3 text-sm font-semibold">Invoice #</th>
                      <th className="text-left p-3 text-sm font-semibold">Supplier</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Credit Note</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map((returnItem) => (
                      <tr key={returnItem.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td className="p-3 font-semibold text-sm">{returnItem.return_number}</td>
                        <td className="p-3 text-sm text-muted-foreground">{returnItem.purchase_invoices?.invoice_number || '-'}</td>
                        <td className="p-3 text-sm">{returnItem.suppliers?.name}</td>
                        <td className="p-3 text-sm">{new Date(returnItem.return_date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-sm">₹{returnItem.total_amount.toLocaleString()}</td>
                        <td className="p-3 text-sm">{returnItem.credit_note_number || '-'}</td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(returnItem.status)} className="text-xs">
                            {returnItem.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReturn(returnItem)}
                              className="h-8 w-8 p-0"
                              title="View Return"
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
                              onClick={() => handleDeleteClick(returnItem)}
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

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {filteredReturns.map((returnItem) => (
                  <Card key={returnItem.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{returnItem.return_number}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            Invoice: {returnItem.purchase_invoices?.invoice_number || '-'}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{returnItem.suppliers?.name}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(returnItem.status)} className="text-xs whitespace-nowrap ml-2">
                          {returnItem.status}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm pt-2 border-t">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Date</p>
                          <p className="font-medium">{new Date(returnItem.return_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Amount</p>
                          <p className="font-semibold">₹{returnItem.total_amount.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground mb-0.5">Credit Note</p>
                          <p className="font-medium">{returnItem.credit_note_number || '-'}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReturn(returnItem)}
                          className="flex-1 h-9 touch-manipulation"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditReturn(returnItem)}
                          className="flex-1 h-9 touch-manipulation"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(returnItem)}
                          className="h-9 w-9 p-0 touch-manipulation"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Return Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Purchase Return Details - {selectedReturn?.return_number}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            {selectedReturn && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 py-4">
                {/* Return Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Supplier Information</h3>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><strong>Name:</strong> {selectedReturn.suppliers?.name}</p>
                      <p><strong>Return Date:</strong> {new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Return Information</h3>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><strong>Original Invoice:</strong> {selectedReturn.purchase_invoices?.invoice_number}</p>
                      <p><strong>Credit Note:</strong> {selectedReturn.credit_note_number || 'N/A'}</p>
                      <p><strong>Status:</strong> {selectedReturn.status}</p>
                      {selectedReturn.reason && <p><strong>Reason:</strong> {selectedReturn.reason}</p>}
                    </div>
                  </div>
                </div>

                {/* Return Items */}
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Returned Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th className="text-left p-2 border">Product</th>
                          <th className="text-left p-2 border">Qty</th>
                          <th className="text-left p-2 border">Rate</th>
                          <th className="text-left p-2 border">Tax</th>
                          <th className="text-left p-2 border">Total</th>
                          <th className="text-left p-2 border">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.purchase_return_items?.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2 border">{item.product_name}</td>
                            <td className="p-2 border">{item.quantity}</td>
                            <td className="p-2 border">₹{item.unit_price.toFixed(2)}</td>
                            <td className="p-2 border">₹{item.tax_amount.toFixed(2)}</td>
                            <td className="p-2 border">₹{item.line_total.toFixed(2)}</td>
                            <td className="p-2 border">{item.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-64 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedReturn.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>₹{selectedReturn.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm sm:text-base md:text-lg border-t pt-2">
                      <span>Total Return:</span>
                      <span>₹{selectedReturn.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedReturn.notes && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Notes</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-4 border-t flex justify-end">
            <Button onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Purchase Return</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete purchase return{' '}
              <span className="font-semibold text-foreground">
                {returnToDelete?.return_number}
              </span>
              ?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              {deleting ? 'Deleting...' : 'Delete Return'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}