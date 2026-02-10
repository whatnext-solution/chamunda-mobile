import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { Plus, Edit, Trash2, Search, Phone, Mail, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  customer_type: string;
  credit_limit: number;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    customer_type: 'retail',
    credit_limit: 0,
    is_active: true
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      
      if (editingCustomer) {
        const { error } = await (supabase as any)
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        // Track customer update
        await storageTrackingService.trackDataOperation({
          operation_type: 'update',
          table_name: 'customers',
          record_id: editingCustomer.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_UPDATE,
          metadata: {
            customer_name: formData.name,
            customer_type: formData.customer_type,
            credit_limit: formData.credit_limit,
            updated_fields: Object.keys(formData)
          }
        });
        
        toast.success('Customer updated successfully');
      } else {
        const { data, error } = await (supabase as any)
          .from('customers')
          .insert([{
            ...formData,
            outstanding_balance: 0
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Track customer creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'customers',
          record_id: data.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_CREATE,
          metadata: {
            customer_name: formData.name,
            customer_type: formData.customer_type,
            credit_limit: formData.credit_limit,
            has_email: !!formData.email,
            has_phone: !!formData.phone
          }
        });
        
        toast.success('Customer created successfully');
      }

      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp_number: customer.whatsapp_number || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      gst_number: customer.gst_number || '',
      customer_type: customer.customer_type,
      credit_limit: customer.credit_limit,
      is_active: customer.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const customer = customers.find(c => c.id === id);
      
      const { error } = await (supabase as any)
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Track customer deletion
      await storageTrackingService.trackDataOperation({
        operation_type: 'delete',
        table_name: 'customers',
        record_id: id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_DELETE,
        metadata: {
          customer_name: customer?.name || 'Unknown',
          customer_type: customer?.customer_type || 'Unknown'
        }
      });
      
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      customer_type: 'retail',
      credit_limit: 0,
      is_active: true
    });
    setEditingCustomer(null);
    setIsDialogOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (customer.phone && customer.phone.includes(searchTerm));
      const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, typeFilter]);

  const pagination = usePagination({
    totalItems: filteredCustomers.length,
    itemsPerPage: 15,
  });

  const paginatedCustomers = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, pagination.startIndex, pagination.endIndex]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Customer Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-10 sm:h-11">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col w-[95vw] sm:w-full">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-base sm:text-lg">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingCustomer ? 'Update customer information and contact details.' : 'Create a new customer account with contact and billing information.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleSubmit} className="customer-form space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm">Customer Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter customer name"
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_type" className="text-xs sm:text-sm">Customer Type</Label>
                  <Select value={formData.customer_type} onValueChange={(value) => setFormData({...formData, customer_type: value})}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="phone" className="text-xs sm:text-sm">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Phone number"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp_number" className="text-xs sm:text-sm">WhatsApp</Label>
                  <Input
                    id="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                    placeholder="WhatsApp number"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Email address"
                  className="h-10 sm:h-11"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs sm:text-sm">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full address"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="city" className="text-xs sm:text-sm">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs sm:text-sm">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode" className="text-xs sm:text-sm">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    placeholder="Pincode"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="gst_number" className="text-xs sm:text-sm">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                    placeholder="GST number"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="credit_limit" className="text-xs sm:text-sm">Credit Limit (₹)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: Number(e.target.value)})}
                    placeholder="Credit limit"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="text-xs sm:text-sm cursor-pointer">Active</Label>
              </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-10 sm:h-11">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-10 sm:h-11">
                    {loading ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers List - Responsive Card Grid */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
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
          ) : (
            <>
              {/* Responsive Grid: 1 col mobile → 2 cols tablet → 3 cols desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {paginatedCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow border">
                  <CardContent className="p-3 sm:p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{customer.name}</h3>
                        <Badge variant={customer.customer_type === 'retail' ? 'default' : 'secondary'} className="mt-1 text-xs">
                          {customer.customer_type}
                        </Badge>
                      </div>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-xs sm:text-sm">
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.city}, {customer.state}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Info */}
                    <div className="mt-3 sm:mt-4 pt-3 border-t">
                      <div className="flex justify-between text-xs sm:text-sm mb-1">
                        <span className="text-muted-foreground">Credit Limit:</span>
                        <span className="font-medium">₹{customer.credit_limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className={`font-medium ${customer.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{customer.outstanding_balance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 sm:mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(customer)}
                        className="flex-1 h-9 text-xs sm:text-sm"
                      >
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(customer.id)}
                        className="h-9 px-3"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No customers found matching your criteria.</p>
                </div>
              )}
              
              {filteredCustomers.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredCustomers.length}
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
                    itemsPerPageOptions={[9, 15, 30, 60]}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}