import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  UserCheck,
  Calculator,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Copy,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { trackDataOperation } from '@/services/storageTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  role: string;
  department: string;
  joining_date: string;
  salary_type: string;
  base_salary: number;
  status: string;
  profile_image_url?: string;
  address?: string;
  emergency_contact?: string;
  created_at: string;
  // Login credentials info
  has_login?: boolean;
  login_enabled?: boolean;
  username?: string;
  last_login_at?: string;
}

interface EmployeeFormData {
  full_name: string;
  mobile_number: string;
  email: string;
  role: string;
  department: string;
  joining_date: Date;
  salary_type: string;
  base_salary: string;
  address: string;
  emergency_contact: string;
  profile_image_url: string;
}

const EmployeeManagement = () => {
  // BUG FIX #4: Add admin role check
  const { isAdmin, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [credentialsData, setCredentialsData] = useState({
    username: '',
    password: '',
    auto_generate: true
  });

  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    mobile_number: '',
    email: '',
    role: '',
    department: '',
    joining_date: new Date(),
    salary_type: 'Monthly',
    base_salary: '',
    address: '',
    emergency_contact: '',
    profile_image_url: ''
  });

  const roles = ['Sales', 'Technician', 'Office Staff', 'Manager'];
  const salaryTypes = ['Monthly', 'Daily', 'Hourly'];
  const departments = ['Sales', 'Technical', 'Administration', 'HR', 'Finance', 'Marketing'];

  // BUG FIX #4: Check admin access on mount
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select(`
          *,
          employee_credentials (
            username,
            login_enabled,
            last_login_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include login info
      const employeesWithLogin = (data || []).map((emp: any) => ({
        ...emp,
        has_login: emp.employee_credentials && emp.employee_credentials.length > 0,
        login_enabled: emp.employee_credentials?.[0]?.login_enabled || false,
        username: emp.employee_credentials?.[0]?.username || '',
        last_login_at: emp.employee_credentials?.[0]?.last_login_at || null
      }));
      
      setEmployees(employeesWithLogin as Employee[]);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // BUG FIX #1: Check for duplicate mobile number and email
      if (!selectedEmployee) {
        // Only check for duplicates when creating new employee
        const { data: existingEmployees, error: checkError } = await (supabase as any)
          .from('employees')
          .select('id, mobile_number, email')
          .or(`mobile_number.eq.${formData.mobile_number},email.eq.${formData.email}`);

        if (checkError) {
          console.error('Error checking duplicates:', checkError);
        } else if (existingEmployees && existingEmployees.length > 0) {
          const duplicateMobile = existingEmployees.find((emp: any) => emp.mobile_number === formData.mobile_number);
          const duplicateEmail = existingEmployees.find((emp: any) => emp.email === formData.email);
          
          if (duplicateMobile) {
            toast.error('Mobile number already exists. Please use a different mobile number.');
            return;
          }
          if (duplicateEmail) {
            toast.error('Email already exists. Please use a different email address.');
            return;
          }
        }
      } else {
        // When editing, check duplicates excluding current employee
        const { data: existingEmployees, error: checkError } = await (supabase as any)
          .from('employees')
          .select('id, mobile_number, email')
          .or(`mobile_number.eq.${formData.mobile_number},email.eq.${formData.email}`)
          .neq('id', selectedEmployee.id);

        if (checkError) {
          console.error('Error checking duplicates:', checkError);
        } else if (existingEmployees && existingEmployees.length > 0) {
          const duplicateMobile = existingEmployees.find((emp: any) => emp.mobile_number === formData.mobile_number);
          const duplicateEmail = existingEmployees.find((emp: any) => emp.email === formData.email);
          
          if (duplicateMobile) {
            toast.error('Mobile number already exists. Please use a different mobile number.');
            return;
          }
          if (duplicateEmail) {
            toast.error('Email already exists. Please use a different email address.');
            return;
          }
        }
      }

      const employeeData = {
        full_name: formData.full_name,
        mobile_number: formData.mobile_number,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        joining_date: format(formData.joining_date, 'yyyy-MM-dd'),
        salary_type: formData.salary_type,
        base_salary: parseFloat(formData.base_salary),
        address: formData.address,
        emergency_contact: formData.emergency_contact,
        profile_image_url: formData.profile_image_url
      };

      let result;
      if (selectedEmployee) {
        // Update existing employee
        result = await (supabase as any)
          .from('employees')
          .update(employeeData)
          .eq('id', selectedEmployee.id)
          .select()
          .single();
        
        if (!result.error) {
          // Track update operation
          await trackDataOperation({
            operation_type: 'update',
            table_name: 'employees',
            record_id: selectedEmployee.id,
            operation_source: 'admin_employee_update',
            metadata: {
              employee_id: selectedEmployee.employee_id,
              employee_name: formData.full_name,
              role: formData.role,
              department: formData.department,
              salary_type: formData.salary_type,
              base_salary: parseFloat(formData.base_salary),
              admin_action: 'employee_profile_update'
            }
          });
          toast.success('Employee updated successfully');
        }
      } else {
        // Create new employee
        result = await (supabase as any)
          .from('employees')
          .insert([employeeData])
          .select()
          .single();
        
        if (!result.error) {
          // Track create operation
          await trackDataOperation({
            operation_type: 'create',
            table_name: 'employees',
            record_id: result.data.id,
            operation_source: 'admin_employee_create',
            metadata: {
              employee_name: formData.full_name,
              role: formData.role,
              department: formData.department,
              salary_type: formData.salary_type,
              base_salary: parseFloat(formData.base_salary),
              joining_date: format(formData.joining_date, 'yyyy-MM-dd'),
              admin_action: 'new_employee_registration'
            }
          });
          toast.success('Employee created successfully');
        }
      }

      if (result.error) throw result.error;

      fetchEmployees();
      resetForm();
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.full_name}?`)) return;

    try {
      const { error } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      // Track delete operation
      await trackDataOperation({
        operation_type: 'delete',
        table_name: 'employees',
        record_id: employee.id,
        operation_source: 'admin_employee_delete',
        metadata: {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          role: employee.role,
          department: employee.department,
          admin_action: 'employee_removal'
        }
      });

      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleStatusToggle = async (employee: Employee) => {
    const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const { error } = await (supabase as any)
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employee.id);

      if (error) throw error;

      // Track status change
      await trackDataOperation({
        operation_type: 'update',
        table_name: 'employees',
        record_id: employee.id,
        operation_source: 'admin_employee_status',
        metadata: {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          old_status: employee.status,
          new_status: newStatus,
          admin_action: 'status_change'
        }
      });

      toast.success(`Employee ${newStatus.toLowerCase()} successfully`);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      mobile_number: '',
      email: '',
      role: '',
      department: '',
      joining_date: new Date(),
      salary_type: 'Monthly',
      base_salary: '',
      address: '',
      emergency_contact: '',
      profile_image_url: ''
    });
    setSelectedEmployee(null);
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      mobile_number: employee.mobile_number,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      joining_date: new Date(employee.joining_date),
      salary_type: employee.salary_type,
      base_salary: employee.base_salary.toString(),
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      profile_image_url: employee.profile_image_url || ''
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const openCredentialsDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setCredentialsData({
      username: employee.email || employee.mobile_number,
      password: '',
      auto_generate: true
    });
    setIsCredentialsDialogOpen(true);
  };

  const handleCreateCredentials = async () => {
    if (!selectedEmployee) return;

    try {
      const username = credentialsData.username.trim();
      const password = credentialsData.auto_generate ? null : credentialsData.password.trim();

      if (!username) {
        toast.error('Username is required');
        return;
      }

      if (!credentialsData.auto_generate && !password) {
        toast.error('Password is required when not auto-generating');
        return;
      }

      const { data, error } = await (supabase as any).rpc('create_employee_credentials', {
        emp_id: selectedEmployee.id,
        username_input: username,
        password_input: password,
        admin_id: null // You can get current admin ID from auth context
      });

      if (error) throw error;

      const result = data[0];
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      // BUG FIX #2: Don't show password in toast, only copy to clipboard
      toast.success('Login credentials created successfully!');
      
      // Copy credentials to clipboard securely
      if (credentialsData.auto_generate && result.password) {
        navigator.clipboard.writeText(`Username: ${result.username}\nPassword: ${result.password}`);
        toast.info('Credentials copied to clipboard. Please share securely with employee.');
      } else {
        toast.info('Login credentials created. Employee can now login.');
      }

      // Track operation
      await trackDataOperation({
        operation_type: 'create',
        table_name: 'employee_credentials',
        record_id: selectedEmployee.id,
        operation_source: 'admin_employee_credentials',
        metadata: {
          employee_id: selectedEmployee.employee_id,
          employee_name: selectedEmployee.full_name,
          username: result.username,
          admin_action: 'create_login_credentials'
        }
      });

      fetchEmployees();
      setIsCredentialsDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating credentials:', error);
      toast.error('Failed to create login credentials');
    }
  };

  const handleToggleLoginAccess = async (employee: Employee) => {
    if (!employee.has_login) {
      openCredentialsDialog(employee);
      return;
    }

    try {
      const newStatus = !employee.login_enabled;
      
      const { error } = await (supabase as any)
        .from('employee_credentials')
        .update({ login_enabled: newStatus })
        .eq('employee_id', employee.id);

      if (error) throw error;

      toast.success(`Login access ${newStatus ? 'enabled' : 'disabled'} for ${employee.full_name}`);
      
      // Track operation
      await trackDataOperation({
        operation_type: 'update',
        table_name: 'employee_credentials',
        record_id: employee.id,
        operation_source: 'admin_employee_login_toggle',
        metadata: {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          old_status: employee.login_enabled,
          new_status: newStatus,
          admin_action: 'toggle_login_access'
        }
      });

      fetchEmployees();
    } catch (error: any) {
      console.error('Error toggling login access:', error);
      toast.error('Failed to update login access');
    }
  };

  const handleResetPassword = async (employee: Employee) => {
    if (!employee.has_login) {
      toast.error('Employee does not have login credentials');
      return;
    }

    if (!confirm(`Reset password for ${employee.full_name}?`)) return;

    try {
      // Generate new password
      const { data, error } = await (supabase as any).rpc('create_employee_credentials', {
        emp_id: employee.id,
        username_input: employee.username,
        password_input: null, // Auto-generate
        admin_id: null
      });

      if (error) throw error;

      const result = data[0];
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      // BUG FIX #2: Copy new password to clipboard securely without displaying
      if (result.password) {
        navigator.clipboard.writeText(`Username: ${result.username}\nNew Password: ${result.password}`);
        toast.success('Password reset successfully! New credentials copied to clipboard.');
        toast.info('Please share the new password securely with the employee.');
      } else {
        toast.success('Password reset successfully!');
      }

      // Track operation
      await trackDataOperation({
        operation_type: 'update',
        table_name: 'employee_credentials',
        record_id: employee.id,
        operation_source: 'admin_password_reset',
        metadata: {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          admin_action: 'password_reset'
        }
      });

    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Manager': return <Briefcase className="h-4 w-4" />;
      case 'Sales': return <DollarSign className="h-4 w-4" />;
      case 'Technician': return <UserCheck className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Employee Management</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your employees, roles, and basic information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
              <DialogTitle className="text-lg sm:text-xl">Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-1">
              <EmployeeForm 
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                roles={roles}
                departments={departments}
                salaryTypes={salaryTypes}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Employees</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{employees.length}</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">
                  {employees.filter(e => e.status === 'Active').length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">
                  {employees.filter(e => e.status === 'Inactive').length}
                </p>
              </div>
              <XCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Departments</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  {new Set(employees.map(e => e.department)).size}
                </p>
              </div>
              <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48 h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {employee.profile_image_url ? (
                      <img 
                        src={employee.profile_image_url} 
                        alt={employee.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-gray-600">
                        {employee.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{employee.full_name}</h3>
                    <p className="text-sm text-gray-500">{employee.employee_id}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(employee.status)}>
                  {employee.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {getRoleIcon(employee.role)}
                  <span>{employee.role} • {employee.department}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{employee.mobile_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>{employee.salary_type}: ₹{employee.base_salary.toLocaleString()}</span>
                </div>
                {/* Login Status */}
                <div className="flex items-center gap-2 text-sm">
                  {employee.has_login ? (
                    <>
                      {employee.login_enabled ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Unlock className="h-4 w-4" />
                          <span>Login Enabled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <Lock className="h-4 w-4" />
                          <span>Login Disabled</span>
                        </div>
                      )}
                      {employee.last_login_at && (
                        <span className="text-gray-500 text-xs">
                          Last: {format(new Date(employee.last_login_at), 'MMM dd')}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Key className="h-4 w-4" />
                      <span>No Login Access</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openViewDialog(employee)}
                  className="flex-1 sm:flex-none min-w-[80px] sm:min-w-0 h-9 sm:h-8 touch-manipulation"
                >
                  <Eye className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">View</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(employee)}
                  className="flex-1 sm:flex-none min-w-[80px] sm:min-w-0 h-9 sm:h-8 touch-manipulation"
                >
                  <Edit className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleLoginAccess(employee)}
                  className={`flex-shrink-0 h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation ${
                    employee.has_login 
                      ? employee.login_enabled 
                        ? 'text-red-600 hover:text-red-700' 
                        : 'text-green-600 hover:text-green-700'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                  title={
                    employee.has_login 
                      ? employee.login_enabled 
                        ? 'Disable Login' 
                        : 'Enable Login'
                      : 'Create Login'
                  }
                >
                  {employee.has_login ? (
                    employee.login_enabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                </Button>
                {employee.has_login && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPassword(employee)}
                    className="flex-shrink-0 h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation text-orange-600 hover:text-orange-700"
                    title="Reset Password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusToggle(employee)}
                  className={`flex-shrink-0 h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation ${employee.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}
                  title={employee.status === 'Active' ? 'Deactivate' : 'Activate'}
                >
                  {employee.status === 'Active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(employee)}
                  className="flex-shrink-0 h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first employee'
              }
            </p>
            {!searchTerm && filterRole === 'all' && filterStatus === 'all' && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm 
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            roles={roles}
            departments={departments}
            salaryTypes={salaryTypes}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeDetails employee={selectedEmployee} />
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Create Login Credentials
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Creating login credentials for <strong>{selectedEmployee.full_name}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={credentialsData.username}
                    onChange={(e) => setCredentialsData({ ...credentialsData, username: e.target.value })}
                    placeholder="Email or mobile number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Employee will use this to login
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_generate"
                      checked={credentialsData.auto_generate}
                      onChange={(e) => setCredentialsData({ 
                        ...credentialsData, 
                        auto_generate: e.target.checked,
                        password: e.target.checked ? '' : credentialsData.password
                      })}
                      className="rounded"
                    />
                    <Label htmlFor="auto_generate">Auto-generate secure password</Label>
                  </div>
                  
                  {!credentialsData.auto_generate && (
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={credentialsData.password}
                        onChange={(e) => setCredentialsData({ ...credentialsData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  )}
                </div>

                {credentialsData.auto_generate && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A secure password will be generated and copied to your clipboard.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateCredentials} className="flex-1">
                  <Key className="h-4 w-4 mr-2" />
                  Create Credentials
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCredentialsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Employee Form Component
const EmployeeForm = ({ formData, setFormData, onSubmit, roles, departments, salaryTypes, isEdit = false }: any) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="mobile_number">Mobile Number *</Label>
          <Input
            id="mobile_number"
            value={formData.mobile_number}
            onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role: string) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="department">Department *</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept: string) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="joining_date">Joining Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.joining_date ? format(formData.joining_date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.joining_date}
                onSelect={(date) => date && setFormData({ ...formData, joining_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="salary_type">Salary Type *</Label>
          <Select value={formData.salary_type} onValueChange={(value) => setFormData({ ...formData, salary_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select salary type" />
            </SelectTrigger>
            <SelectContent>
              {salaryTypes.map((type: string) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="base_salary">
            Base Salary * 
            <span className="text-sm text-gray-500 ml-1">
              ({formData.salary_type === 'Monthly' ? '₹/month' : formData.salary_type === 'Daily' ? '₹/day' : '₹/hour'})
            </span>
          </Label>
          <Input
            id="base_salary"
            type="number"
            step="0.01"
            value={formData.base_salary}
            onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="emergency_contact">Emergency Contact</Label>
          <Input
            id="emergency_contact"
            value={formData.emergency_contact}
            onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label>Profile Image</Label>
        <ImageUpload
          onImageUploaded={(url) => setFormData({ ...formData, profile_image_url: url })}
          currentImage={formData.profile_image_url}
          folder="employee-profiles"
          uploadSource="employee_profiles"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {isEdit ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
};

// Employee Details Component
const EmployeeDetails = ({ employee }: { employee: Employee }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          {employee.profile_image_url ? (
            <img 
              src={employee.profile_image_url} 
              alt={employee.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-gray-600">
              {employee.full_name.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold">{employee.full_name}</h3>
          <p className="text-gray-600">{employee.employee_id}</p>
          <Badge className={employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {employee.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Role:</span>
            <span>{employee.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Department:</span>
            <span>{employee.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Mobile:</span>
            <span>{employee.mobile_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Email:</span>
            <span>{employee.email}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Joining Date:</span>
            <span>{format(new Date(employee.joining_date), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Salary Type:</span>
            <span>{employee.salary_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Base Salary:</span>
            <span>₹{employee.base_salary.toLocaleString()}</span>
          </div>
          {employee.emergency_contact && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Emergency:</span>
              <span>{employee.emergency_contact}</span>
            </div>
          )}
        </div>
      </div>

      {employee.address && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Address:</span>
          </div>
          <p className="text-gray-700 bg-gray-50 p-3 rounded">{employee.address}</p>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>Created: {format(new Date(employee.created_at), 'PPP')}</p>
      </div>
    </div>
  );
};

export default EmployeeManagement;