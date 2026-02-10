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
import { Plus, Search, Eye, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  status: string;
  notes?: string;
  created_at: string;
  suppliers?: { name: string };
  purchase_items?: PurchaseItem[];
}

interface PurchaseItem {
  id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
  batch_number?: string;
  expiry_date?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  cost_price?: number;
}

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount_amount: number;
    batch_number: string;
    expiry_date: string;
  }>>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    discount_amount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          suppliers (name),
          purchase_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, cost_price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PIN${timestamp}`;
  };

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      discount_amount: 0,
      batch_number: '',
      expiry_date: ''
    }]);
  };

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-fill product details when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.cost_price || 0;
      }
    }
    
    setPurchaseItems(updatedItems);
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0);
    const totalTax = purchaseItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const totalDiscount = purchaseItems.reduce((sum, item) => 
      sum + item.discount_amount, 0) + formData.discount_amount;
    const total = subtotal + totalTax - totalDiscount;
    
    return { subtotal, totalTax, totalDiscount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.supplier_id || purchaseItems.length === 0) {
      toast.error('Supplier and at least one item are required');
      return;
    }

    // Validate all items
    for (let i = 0; i < purchaseItems.length; i++) {
      const item = purchaseItems[i];
      
      if (!item.product_id) {
        toast.error(`Please select a product for item ${i + 1}`);
        return;
      }
      
      if (item.quantity <= 0) {
        toast.error(`Quantity must be at least 1 for item ${i + 1}`);
        return;
      }
      
      if (item.unit_price < 0) {
        toast.error(`Unit price cannot be negative for item ${i + 1}`);
        return;
      }
      
      if (item.discount_amount < 0) {
        toast.error(`Discount cannot be negative for item ${i + 1}`);
        return;
      }
      
      if (item.tax_rate < 0) {
        toast.error(`Tax rate cannot be negative for item ${i + 1}`);
        return;
      }
    }

    try {
      setLoading(true);
      const { subtotal, totalTax, totalDiscount, total } = calculateTotals();
      
      const invoiceData = {
        ...formData,
        invoice_number: editingInvoice?.invoice_number || generateInvoiceNumber(),
        subtotal,
        tax_amount: totalTax,
        discount_amount: totalDiscount,
        total_amount: total,
        paid_amount: 0,
        payment_status: 'pending',
        status: 'draft'
      };

      let invoiceId: string;

      if (editingInvoice) {
        const { error } = await supabase
          .from('purchase_invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        invoiceId = editingInvoice.id;
        
        // Delete existing items
        await supabase
          .from('purchase_items')
          .delete()
          .eq('purchase_invoice_id', invoiceId);
      } else {
        const { data: invoice, error } = await supabase
          .from('purchase_invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (error) throw error;
        invoiceId = invoice.id;
      }

      // Create purchase items
      const itemsData = purchaseItems.map(item => ({
        purchase_invoice_id: invoiceId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.quantity * item.unit_price * item.tax_rate / 100,
        discount_amount: item.discount_amount,
        line_total: (item.quantity * item.unit_price * (1 + item.tax_rate / 100)) - item.discount_amount,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success(`Purchase invoice ${editingInvoice ? 'updated' : 'created'} successfully!`);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: PurchaseInvoice) => {
    try {
      const { data: items, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_invoice_id', invoice.id);

      if (error) throw error;
      
      setSelectedInvoice({
        ...invoice,
        purchase_items: items || []
      });
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to fetch invoice details');
    }
  };

  const handleEdit = async (invoice: PurchaseInvoice) => {
    try {
      // Fetch complete invoice with items and product IDs
      const { data: items, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_invoice_id', invoice.id);

      if (error) throw error;

      // Fetch supplier_id from purchase_invoices table
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .select('supplier_id')
        .eq('id', invoice.id)
        .single();

      if (invoiceError) throw invoiceError;

      setEditingInvoice(invoice);
      setFormData({
        supplier_id: invoiceData.supplier_id || '',
        supplier_invoice_number: invoice.supplier_invoice_number || '',
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || '',
        discount_amount: invoice.discount_amount,
        notes: invoice.notes || ''
      });
      
      // Load purchase items with product IDs
      setPurchaseItems(items?.map(item => ({
        product_id: item.product_id || '',
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_amount: item.discount_amount,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || ''
      })) || []);
      
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error loading invoice for edit:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (invoice: PurchaseInvoice) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;
      toast.success('Invoice deleted successfully');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      supplier_invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      discount_amount: 0,
      notes: ''
    });
    setPurchaseItems([]);
    setEditingInvoice(null);
    setIsDialogOpen(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'received': return 'default';
      case 'sent': return 'secondary';
      case 'draft': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'pending': return 'outline';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.suppliers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || invoice.payment_status === paymentStatusFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Purchase Invoices</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[95vw] md:w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-lg sm:text-xl">
                {editingInvoice ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleSubmit} className="purchase-invoice-form space-y-4 sm:space-y-5 md:space-y-6 py-4">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="supplier_id" className="mb-1.5 block text-sm sm:text-base">Supplier *</Label>
                  <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier_invoice_number" className="mb-1.5 block text-sm sm:text-base">Supplier Invoice #</Label>
                  <Input
                    id="supplier_invoice_number"
                    value={formData.supplier_invoice_number}
                    onChange={(e) => setFormData({...formData, supplier_invoice_number: e.target.value})}
                    placeholder="Supplier's invoice number"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="invoice_date" className="mb-1.5 block text-sm sm:text-base">Invoice Date</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="due_date" className="mb-1.5 block text-sm sm:text-base">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              {/* Purchase Items */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
                  <Label className="text-sm sm:text-base">Purchase Items</Label>
                  <Button type="button" onClick={addPurchaseItem} size="sm" className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {/* Mobile: Scrollable cards, Desktop: Grid */}
                <div className="space-y-4">
                  {purchaseItems.map((item, index) => (
                    <div key={index} className="p-3 border rounded space-y-3 sm:space-y-0">
                      {/* Mobile: Stacked layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-8 gap-2 sm:gap-2">
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Product</Label>
                        <Select 
                          value={item.product_id} 
                          onValueChange={(value) => updatePurchaseItem(index, 'product_id', value)}
                        >
                          <SelectTrigger className="h-10 sm:h-9 touch-manipulation">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseItem(index, 'quantity', Number(e.target.value))}
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updatePurchaseItem(index, 'unit_price', Number(e.target.value))}
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Tax %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.tax_rate}
                          onChange={(e) => updatePurchaseItem(index, 'tax_rate', Number(e.target.value))}
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Discount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.discount_amount}
                          onChange={(e) => updatePurchaseItem(index, 'discount_amount', Number(e.target.value))}
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Batch #</Label>
                        <Input
                          value={item.batch_number}
                          onChange={(e) => updatePurchaseItem(index, 'batch_number', e.target.value)}
                          placeholder="Batch"
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs sm:text-sm">Expiry</Label>
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updatePurchaseItem(index, 'expiry_date', e.target.value)}
                          className="h-10 sm:h-9 touch-manipulation"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePurchaseItem(index)}
                          className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">Remove</span>
                        </Button>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="discount_amount" className="mb-1.5 block text-sm sm:text-base">Overall Discount (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({...formData, discount_amount: Number(e.target.value)})}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div></div>
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
              {purchaseItems.length > 0 && (
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
                    <div className="flex justify-between text-sm sm:text-base">
                      <span>Discount:</span>
                      <span>-₹{calculateTotals().totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base sm:text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{calculateTotals().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    {loading ? 'Saving...' : editingInvoice ? 'Update' : 'Create'}
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
            <CardTitle className="text-xs sm:text-sm font-medium">Total Invoices</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">All time invoices</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Draft</CardTitle>
            <Package className="h-4 w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
              {invoices.filter(invoice => invoice.status === 'draft').length}
            </div>
            <p className="text-xs text-muted-foreground">Draft invoices</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Received</CardTitle>
            <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              {invoices.filter(invoice => invoice.status === 'received').length}
            </div>
            <p className="text-xs text-muted-foreground">Received invoices</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium">Cancelled</CardTitle>
            <Package className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">
              {invoices.filter(invoice => invoice.status === 'cancelled').length}
            </div>
            <p className="text-xs text-muted-foreground">Cancelled invoices</p>
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
                placeholder="Search invoices..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            {(searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all') && (
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

      {/* Invoices List - Dual Display: Desktop Table + Mobile/Tablet Cards */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Purchase Invoices ({filteredInvoices.length})</CardTitle>
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
          ) : (
            <>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first purchase invoice to get started'}
                  </p>
                  {(searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all') && (
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
                      <th className="text-left p-3 text-sm font-semibold">Invoice #</th>
                      <th className="text-left p-3 text-sm font-semibold">Supplier</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Payment</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td className="p-3 font-semibold text-sm">{invoice.invoice_number}</td>
                        <td className="p-3 text-sm">{invoice.suppliers?.name}</td>
                        <td className="p-3 text-sm">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-sm">₹{invoice.total_amount.toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={getPaymentStatusBadgeVariant(invoice.payment_status)} className="text-xs">
                            {invoice.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewInvoice(invoice)}
                              className="h-8 w-8 p-0"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(invoice)}
                              className="h-8 w-8 p-0"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(invoice)}
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

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{invoice.invoice_number}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{invoice.suppliers?.name}</p>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs whitespace-nowrap">
                            {invoice.status}
                          </Badge>
                          <Badge variant={getPaymentStatusBadgeVariant(invoice.payment_status)} className="text-xs whitespace-nowrap">
                            {invoice.payment_status}
                          </Badge>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm pt-2 border-t">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Date</p>
                          <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Amount</p>
                          <p className="font-semibold">₹{invoice.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(invoice)}
                          className="flex-1 h-9 touch-manipulation"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(invoice)}
                          className="flex-1 h-9 touch-manipulation"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(invoice)}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog - Responsive */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Purchase Invoice - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            {selectedInvoice && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 py-4">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Supplier Information</h3>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><strong>Name:</strong> {selectedInvoice.suppliers?.name}</p>
                      <p><strong>Invoice Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                      {selectedInvoice.due_date && (
                        <p><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Invoice Information</h3>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><strong>Supplier Invoice #:</strong> {selectedInvoice.supplier_invoice_number || 'N/A'}</p>
                      <p><strong>Status:</strong> {selectedInvoice.status}</p>
                      <p><strong>Payment Status:</strong> {selectedInvoice.payment_status}</p>
                    </div>
                  </div>
                </div>

                {/* Purchase Items */}
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th className="text-left p-2 border">Product</th>
                          <th className="text-left p-2 border">Qty</th>
                          <th className="text-left p-2 border">Rate</th>
                          <th className="text-left p-2 border">Tax</th>
                          <th className="text-left p-2 border">Total</th>
                          <th className="text-left p-2 border">Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.purchase_items?.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2 border">{item.product_name}</td>
                            <td className="p-2 border">{item.quantity}</td>
                            <td className="p-2 border">₹{item.unit_price.toFixed(2)}</td>
                            <td className="p-2 border">₹{item.tax_amount.toFixed(2)}</td>
                            <td className="p-2 border">₹{item.line_total.toFixed(2)}</td>
                            <td className="p-2 border">{item.batch_number || '-'}</td>
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
                      <span>₹{selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>₹{selectedInvoice.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-₹{selectedInvoice.discount_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm sm:text-base md:text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{selectedInvoice.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>₹{selectedInvoice.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Balance:</span>
                      <span>₹{(selectedInvoice.total_amount - selectedInvoice.paid_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Notes</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">{selectedInvoice.notes}</p>
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
            <DialogTitle>Delete Purchase Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete purchase invoice{' '}
              <span className="font-semibold text-foreground">
                {invoiceToDelete?.invoice_number}
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
              {deleting ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}