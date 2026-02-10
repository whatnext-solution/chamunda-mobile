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
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { Plus, Edit, Trash2, Search, Building, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  credit_days: number;
  credit_limit: number;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
}

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    credit_days: 30,
    credit_limit: 0,
    is_active: true
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', editingSupplier.id);

        if (error) throw error;
        
        // Track supplier update
        await storageTrackingService.trackDataOperation({
          operation_type: 'update',
          table_name: 'suppliers',
          record_id: editingSupplier.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_SUPPLIER_UPDATE,
          metadata: {
            supplier_name: formData.name,
            contact_person: formData.contact_person,
            credit_limit: formData.credit_limit,
            credit_days: formData.credit_days
          }
        });
        
        toast.success('Supplier updated successfully');
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        
        // Track supplier creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'suppliers',
          record_id: data.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_SUPPLIER_CREATE,
          metadata: {
            supplier_name: formData.name,
            contact_person: formData.contact_person,
            credit_limit: formData.credit_limit,
            credit_days: formData.credit_days,
            has_gst: !!formData.gst_number
          }
        });
        
        toast.success('Supplier created successfully');
      }

      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gst_number: supplier.gst_number || '',
      pan_number: supplier.pan_number || '',
      credit_days: supplier.credit_days,
      credit_limit: supplier.credit_limit,
      is_active: supplier.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const supplier = suppliers.find(s => s.id === id);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Track supplier deletion
      await storageTrackingService.trackDataOperation({
        operation_type: 'delete',
        table_name: 'suppliers',
        record_id: id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_SUPPLIER_DELETE,
        metadata: {
          supplier_name: supplier?.name || 'Unknown',
          contact_person: supplier?.contact_person || 'Unknown'
        }
      });
      
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
      credit_days: 30,
      credit_limit: 0,
      is_active: true
    });
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.phone && supplier.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Supplier Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col w-[95vw] sm:w-full">
            <DialogHeader className="flex-shrink-0 pb-4 border-b">
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleSubmit} className="supplier-form space-y-4 md:space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    placeholder="Pincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                    placeholder="GST number"
                  />
                </div>
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({...formData, pan_number: e.target.value})}
                    placeholder="PAN number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credit_days">Credit Days</Label>
                  <Input
                    id="credit_days"
                    type="number"
                    value={formData.credit_days}
                    onChange={(e) => setFormData({...formData, credit_days: Number(e.target.value)})}
                    placeholder="Credit days"
                  />
                </div>
                <div>
                  <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: Number(e.target.value)})}
                    placeholder="Credit limit"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Suppliers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {/* Filters Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                  </div>
                ))}
              </div>
              
              {/* Supplier Cards Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <StatsCardShimmer key={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{supplier.name}</h3>
                        {supplier.contact_person && (
                          <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                        )}
                      </div>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.city}, {supplier.state}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Credit Days:</span>
                        <span>{supplier.credit_days} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Credit Limit:</span>
                        <span>₹{supplier.credit_limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Outstanding:</span>
                        <span className={supplier.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          ₹{supplier.outstanding_balance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}