import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { Plus, Edit, Trash2, Search, Phone, Mail, Building, Calendar, User, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  lead_number: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: string;
  priority: string;
  estimated_value?: number;
  expected_close_date?: string;
  description?: string;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  lead_activities?: LeadActivity[];
  employees?: {
    id: string;
    full_name: string;
  };
}

interface LeadActivity {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  activity_date: string;
  completed: boolean;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

export default function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [deletingLead, setDeletingLead] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'website',
    status: 'new',
    priority: 'medium',
    estimated_value: 0,
    expected_close_date: '',
    description: '',
    notes: '',
    assigned_to: ''
  });
  const [activityData, setActivityData] = useState({
    activity_type: 'call',
    title: '',
    description: '',
    activity_date: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, status')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Don't show error toast as it's not critical
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lead_activities (*),
          employees:assigned_to (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const generateLeadNumber = () => {
    const timestamp = Date.now().toString().slice(-5);
    return `LEAD${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // BUG FIX #1: Name validation
    if (!formData.name.trim()) {
      toast.error('Lead name is required');
      return;
    }

    // BUG FIX #2: Phone OR Email required
    if (!formData.phone?.trim() && !formData.email?.trim()) {
      toast.error('Either phone number or email is required');
      return;
    }

    // BUG FIX #3: Email format validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    // BUG FIX #4: Phone number validation (10 digits)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    }

    // BUG FIX #5: Negative value validation
    if (formData.estimated_value && formData.estimated_value < 0) {
      toast.error('Estimated value cannot be negative');
      return;
    }

    // BUG FIX #6: Past date validation
    if (formData.expected_close_date) {
      const selectedDate = new Date(formData.expected_close_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error('Expected close date cannot be in the past');
        return;
      }
    }

    try {
      setLoading(true);

      // BUG FIX #1: Check for duplicate phone/email
      if (!editingLead) {
        if (formData.phone) {
          const { data: existingByPhone } = await supabase
            .from('leads')
            .select('id, name')
            .eq('phone', formData.phone)
            .maybeSingle();

          if (existingByPhone) {
            toast.error(`Lead with this phone number already exists: ${existingByPhone.name}`);
            setLoading(false);
            return;
          }
        }

        if (formData.email) {
          const { data: existingByEmail } = await supabase
            .from('leads')
            .select('id, name')
            .eq('email', formData.email)
            .maybeSingle();

          if (existingByEmail) {
            toast.error(`Lead with this email already exists: ${existingByEmail.name}`);
            setLoading(false);
            return;
          }
        }
      }
      
      const leadData = {
        ...formData,
        estimated_value: formData.estimated_value || null,
        expected_close_date: formData.expected_close_date || null,
        lead_number: editingLead?.lead_number || generateLeadNumber()
      };

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id);

        if (error) throw error;
        
        // Track lead update
        await storageTrackingService.trackDataOperation({
          operation_type: 'update',
          table_name: 'leads',
          record_id: editingLead.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_LEAD_UPDATE,
          metadata: {
            lead_name: formData.name,
            lead_number: editingLead.lead_number,
            company: formData.company,
            source: formData.source,
            status: formData.status,
            priority: formData.priority,
            estimated_value: formData.estimated_value
          }
        });
        
        toast.success('Lead updated successfully');
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single();

        if (error) throw error;
        
        // Track lead creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'leads',
          record_id: data.id,
          operation_source: DATA_OPERATION_SOURCES.ADMIN_LEAD_CREATE,
          metadata: {
            lead_name: formData.name,
            lead_number: leadData.lead_number,
            company: formData.company,
            source: formData.source,
            status: formData.status,
            priority: formData.priority,
            estimated_value: formData.estimated_value,
            has_email: !!formData.email,
            has_phone: !!formData.phone
          }
        });
        
        toast.success('Lead created successfully');
      }

      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLead || !activityData.title.trim()) {
      toast.error('Activity title is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: selectedLead.id,
          ...activityData
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Track lead activity creation
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'lead_activities',
        record_id: data.id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_LEAD_FOLLOWUP_CREATE,
        metadata: {
          lead_name: selectedLead.name,
          lead_number: selectedLead.lead_number,
          activity_type: activityData.activity_type,
          activity_title: activityData.title,
          activity_date: activityData.activity_date
        }
      });
      
      toast.success('Activity added successfully');
      setActivityData({
        activity_type: 'call',
        title: '',
        description: '',
        activity_date: new Date().toISOString().slice(0, 16)
      });
      setIsActivityDialogOpen(false);
      fetchLeads();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source || 'website',
      status: lead.status,
      priority: lead.priority,
      estimated_value: lead.estimated_value || 0,
      expected_close_date: lead.expected_close_date || '',
      description: lead.description || '',
      notes: lead.notes || '',
      assigned_to: lead.assigned_to || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // BUG FIX #8: Use custom dialog instead of browser confirm
    setLeadToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      setDeletingLead(true);
      const lead = leads.find(l => l.id === leadToDelete);
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete);

      if (error) throw error;
      
      // Track lead deletion
      await storageTrackingService.trackDataOperation({
        operation_type: 'delete',
        table_name: 'leads',
        record_id: leadToDelete,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_LEAD_DELETE,
        metadata: {
          lead_name: lead?.name || 'Unknown',
          lead_number: lead?.lead_number || 'Unknown',
          company: lead?.company || 'Unknown',
          estimated_value: lead?.estimated_value || 0
        }
      });
      
      toast.success('Lead deleted successfully');
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setDeletingLead(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'website',
      status: 'new',
      priority: 'medium',
      estimated_value: 0,
      expected_close_date: '',
      description: '',
      notes: '',
      assigned_to: ''
    });
    setEditingLead(null);
    setIsDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'won': return 'default';
      case 'qualified': return 'secondary';
      case 'proposal': return 'outline';
      case 'negotiation': return 'outline';
      case 'contacted': return 'secondary';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.lead_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesSource;
  });

  const leadStats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    won: leads.filter(l => l.status === 'won').length,
    totalValue: leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0)
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Lead Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-lg sm:text-xl">
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
              <form onSubmit={handleSubmit} className="lead-form space-y-4 sm:space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="name" className="mb-1.5 block text-sm sm:text-base">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Lead name"
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="mb-1.5 block text-sm sm:text-base">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Company name"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="phone" className="mb-1.5 block text-sm sm:text-base">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Phone number"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-1.5 block text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Email address"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="source" className="mb-1.5 block text-sm sm:text-base">Source</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="mb-1.5 block text-sm sm:text-base">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority" className="mb-1.5 block text-sm sm:text-base">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="estimated_value" className="mb-1.5 block text-sm sm:text-base">Estimated Value (₹)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: Number(e.target.value)})}
                    placeholder="0"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="expected_close_date" className="mb-1.5 block text-sm sm:text-base">Expected Close Date</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="mb-1.5 block text-sm sm:text-base">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Lead description"
                  rows={2}
                  className="touch-manipulation resize-none"
                />
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

                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                    {loading ? 'Saving...' : editingLead ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Leads</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{leadStats.total}</p>
              </div>
              <User className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">New</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{leadStats.new}</p>
              </div>
              <Plus className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Qualified</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{leadStats.qualified}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Won</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{leadStats.won}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Value</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">₹{leadStats.totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 sm:p-5 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="advertisement">Advertisement</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                  </div>
                ))}
              </div>
              
              {/* Lead Cards Shimmer */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <StatsCardShimmer key={i} />
                ))}
              </div>
            </div>
          ) : filteredLeads.length === 0 ? (
            // BUG FIX #20: Empty state message
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first lead'}
              </p>
              {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && sourceFilter === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Lead
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <p className="text-sm text-muted-foreground">{lead.lead_number}</p>
                        {lead.company && (
                          <p className="text-sm text-muted-foreground">{lead.company}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(lead.priority)}>
                          {lead.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                      {lead.source && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {lead.estimated_value && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Estimated Value:</span>
                          <span className="font-medium">₹{lead.estimated_value.toLocaleString()}</span>
                        </div>
                        {lead.expected_close_date && (
                          <div className="flex justify-between text-sm">
                            <span>Expected Close:</span>
                            <span>{new Date(lead.expected_close_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(lead)}
                          className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
                        >
                          <Edit className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(lead.id)}
                          className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">Delete</span>
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsActivityDialogOpen(true);
                        }}
                        className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                      >
                        Add Activity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Add Activity - {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
            <form onSubmit={handleAddActivity} className="space-y-4 sm:space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="activity_type" className="mb-1.5 block text-sm sm:text-base">Activity Type</Label>
                  <Select value={activityData.activity_type} onValueChange={(value) => setActivityData({...activityData, activity_type: value})}>
                    <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="activity_date" className="mb-1.5 block text-sm sm:text-base">Date & Time</Label>
                  <Input
                    id="activity_date"
                    type="datetime-local"
                    value={activityData.activity_date}
                    onChange={(e) => setActivityData({...activityData, activity_date: e.target.value})}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="activity_title" className="mb-1.5 block text-sm sm:text-base">Title *</Label>
                <Input
                  id="activity_title"
                  value={activityData.title}
                  onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                  placeholder="Activity title"
                  required
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>

              <div>
                <Label htmlFor="activity_description" className="mb-1.5 block text-sm sm:text-base">Description</Label>
                <Textarea
                  id="activity_description"
                  value={activityData.description}
                  onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                  placeholder="Activity description"
                  rows={3}
                  className="touch-manipulation resize-none"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => setIsActivityDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
                  Add Activity
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - BUG FIX #8 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead
              {leadToDelete && leads.find(l => l.id === leadToDelete) && (
                <span className="font-semibold"> "{leads.find(l => l.id === leadToDelete)?.name}"</span>
              )}
              {' '}and all associated activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLead}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletingLead}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingLead ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}