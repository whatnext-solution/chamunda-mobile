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
import { Plus, Edit, Trash2, Search, Receipt, DollarSign, Calendar, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Expense {
  id: string;
  expense_number: string;
  title: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  expense_date: string;
  payment_method: string;
  payment_status: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  expense_categories?: { name: string };
  suppliers?: { name: string };
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    supplier_id: '',
    amount: 0,
    tax_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    payment_status: 'paid',
    receipt_url: '',
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses' as any)
        .select(`
          *,
          expense_categories (name),
          suppliers (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data as any) || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories((data as any) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers((data as any) || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const generateExpenseNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `EXP${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.category_id) {
      toast.error('Title and category are required');
      return;
    }

    // Validate amount
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Validate tax amount
    if (formData.tax_amount < 0) {
      toast.error('Tax amount cannot be negative');
      return;
    }

    // Validate future date
    const today = new Date().toISOString().split('T')[0];
    if (formData.expense_date > today) {
      toast.error('Expense date cannot be in the future');
      return;
    }

    try {
      setLoading(true);
      
      const expenseData = {
        ...formData,
        supplier_id: formData.supplier_id === 'none' ? null : formData.supplier_id || null,
        total_amount: formData.amount + formData.tax_amount,
        expense_number: editingExpense?.expense_number || generateExpenseNumber()
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses' as any)
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        
        // Track expense update
        await storageTrackingService.trackDataOperation({
          operation_type: 'update',
          table_name: 'expenses',
          record_id: editingExpense.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_EXPENSE_UPDATE,
          metadata: {
            expense_title: formData.title,
            amount: expenseData.amount,
            total_amount: expenseData.total_amount,
            payment_method: formData.payment_method,
            payment_status: formData.payment_status
          }
        });
        
        toast.success('Expense updated successfully');
      } else {
        const { data, error } = await supabase
          .from('expenses' as any)
          .insert([expenseData])
          .select()
          .single();

        if (error) throw error;
        
        // Track expense creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'expenses',
          record_id: (data as any).id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_EXPENSE_CREATE,
          metadata: {
            expense_title: formData.title,
            amount: expenseData.amount,
            total_amount: expenseData.total_amount,
            payment_method: formData.payment_method,
            payment_status: formData.payment_status,
            has_receipt: !!formData.receipt_url
          }
        });
        
        toast.success('Expense created successfully');
      }

      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description || '',
      category_id: expense.category_id || '',
      supplier_id: expense.supplier_id || '',
      amount: expense.amount,
      tax_amount: expense.tax_amount,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      payment_status: expense.payment_status,
      receipt_url: expense.receipt_url || '',
      notes: expense.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      setLoading(true);
      const expense = expenses.find(e => e.id === selectedExpense.id);
      
      const { error } = await supabase
        .from('expenses' as any)
        .delete()
        .eq('id', selectedExpense.id);

      if (error) throw error;
      
      // Track expense deletion
      await storageTrackingService.trackDataOperation({
        operation_type: 'delete',
        table_name: 'expenses',
        record_id: selectedExpense.id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_EXPENSE_DELETE,
        metadata: {
          expense_title: expense?.title || 'Unknown',
          amount: expense?.amount || 0,
          total_amount: expense?.total_amount || 0
        }
      });
      
      toast.success('Expense deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      supplier_id: '',
      amount: 0,
      tax_amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_status: 'paid',
      receipt_url: '',
      notes: ''
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.expense_categories?.name === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.payment_status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Expense Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Expense</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b px-4 sm:px-6 pt-4 sm:pt-6">
              <DialogTitle className="text-base sm:text-lg md:text-xl">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="expense-form space-y-4 sm:space-y-5 md:space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm sm:text-base mb-1.5 block">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Expense title"
                    required
                    className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="category_id" className="text-sm sm:text-base mb-1.5 block">Category *</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="text-sm">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm sm:text-base mb-1.5 block">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Expense description"
                  rows={3}
                  className="min-h-[70px] sm:min-h-[80px] md:min-h-[90px] text-sm sm:text-base resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expense_date" className="text-sm sm:text-base mb-1.5 block">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>

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
                  <Label htmlFor="tax_amount" className="text-sm sm:text-base mb-1.5 block">Tax Amount (₹)</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({...formData, tax_amount: Number(e.target.value)})}
                    placeholder="0.00"
                    className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <div>
                  <Label htmlFor="payment_status" className="text-sm sm:text-base mb-1.5 block">Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData({...formData, payment_status: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="receipt_url" className="text-sm sm:text-base mb-1.5 block">Receipt URL</Label>
                <Input
                  id="receipt_url"
                  value={formData.receipt_url}
                  onChange={(e) => setFormData({...formData, receipt_url: e.target.value})}
                  placeholder="Receipt image/document URL"
                  className="h-11 sm:h-10 md:h-11 text-sm sm:text-base"
                />
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

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t sticky bottom-0 bg-white pb-2 sm:pb-0">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 text-sm sm:text-base touch-manipulation">
                    {loading ? 'Saving...' : editingExpense ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">This Month</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  ₹{expenses
                    .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
                    .reduce((sum, e) => sum + e.total_amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                  {expenses.filter(e => e.payment_status === 'pending').length}
                </p>
              </div>
              <Receipt className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Categories</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{categories.length}</p>
              </div>
              <Filter className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 text-sm sm:text-base"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 text-sm sm:text-base">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List - Dual Display: Desktop Table + Mobile/Tablet Cards */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Expenses ({filteredExpenses.length})</CardTitle>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                  </div>
                ))}
              </div>
              
              {/* Table Shimmer */}
              <TableShimmer rows={8} columns={6} />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">No expenses found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (lg+) */}
              <div className="hidden lg:block w-full overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold">Expense #</th>
                      <th className="text-left p-3 text-sm font-semibold">Title</th>
                      <th className="text-left p-3 text-sm font-semibold">Category</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-sm">{expense.expense_number}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">{expense.title}</div>
                            {expense.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {expense.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{expense.expense_categories?.name}</td>
                        <td className="p-3 text-sm">{new Date(expense.expense_date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-sm text-red-600">₹{expense.total_amount.toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(expense.payment_status)} className="text-xs">
                            {expense.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(expense)}
                              className="h-8 w-8 p-0"
                              title="Edit Expense"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                              title="Delete Expense"
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
                {filteredExpenses.map((expense) => (
                  <Card key={expense.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate">{expense.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{expense.expense_number}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(expense.payment_status)} className="text-xs flex-shrink-0">
                          {expense.payment_status}
                        </Badge>
                      </div>

                      {expense.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{expense.description}</p>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Category</p>
                          <p className="font-semibold truncate">{expense.expense_categories?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date</p>
                          <p className="font-medium">{new Date(expense.expense_date).toLocaleDateString()}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Amount</p>
                          <p className="font-bold text-base sm:text-lg text-red-600">₹{expense.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(expense)}
                          className="flex-1 h-10 sm:h-9 text-xs sm:text-sm touch-manipulation"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsDeleteDialogOpen(true);
                          }}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}