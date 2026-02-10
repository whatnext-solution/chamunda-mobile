import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign,
  Calculator,
  CreditCard,
  FileText,
  Download,
  Eye,
  Edit,
  Check,
  X,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  Calendar,
  Banknote,
  Smartphone,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackDataOperation } from '@/services/storageTrackingService';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  department: string;
  salary_type: string;
  base_salary: number;
  status: string;
}

interface SalaryRecord {
  id: string;
  employee_id: string;
  salary_month: number;
  salary_year: number;
  total_working_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  holiday_days: number;
  total_working_hours: number;
  base_salary: number;
  gross_salary: number;
  bonus: number;
  incentives: number;
  overtime_amount: number;
  absent_deduction: number;
  late_penalty: number;
  advance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_status: string;
  payment_date?: string;
  payment_mode?: string;
  transaction_reference?: string;
  payment_notes?: string;
  generated_at: string;
  employee?: Employee;
}

interface SalaryFormData {
  employee_id: string;
  salary_month: string;
  salary_year: string;
  bonus: string;
  incentives: string;
  overtime_amount: string;
  late_penalty: string;
  advance_deduction: string;
  other_deductions: string;
  payment_mode: string;
  transaction_reference: string;
  payment_notes: string;
}

const SalaryManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState<SalaryFormData>({
    employee_id: '',
    salary_month: new Date().getMonth() + 1 + '',
    salary_year: new Date().getFullYear() + '',
    bonus: '0',
    incentives: '0',
    overtime_amount: '0',
    late_penalty: '0',
    advance_deduction: '0',
    other_deductions: '0',
    payment_mode: 'Bank Transfer',
    transaction_reference: '',
    payment_notes: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const paymentModes = ['Cash', 'Bank Transfer', 'UPI'];
  const paymentStatuses = ['Pending', 'Paid', 'On Hold'];

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('id, employee_id, full_name, role, department, salary_type, base_salary, status')
        .eq('status', 'Active')
        .order('full_name');

      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('employee_salaries')
        .select(`
          *,
          employee:employees(id, employee_id, full_name, role, department, salary_type, base_salary, status)
        `)
        .eq('salary_month', selectedMonth)
        .eq('salary_year', selectedYear)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setSalaries((data || []) as SalaryRecord[]);
    } catch (error: any) {
      console.error('Error fetching salaries:', error);
      toast.error('Failed to fetch salary records');
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = async (employeeId: string, month: number, year: number) => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_monthly_salary', {
          emp_id: employeeId,
          month: month,
          year: year
        });

      if (error) throw error;
      return data[0] || { calculated_gross: 0, calculated_deductions: 0, calculated_net: 0 };
    } catch (error: any) {
      console.error('Error calculating salary:', error);
      return { calculated_gross: 0, calculated_deductions: 0, calculated_net: 0 };
    }
  };

  const getAttendanceSummary = async (employeeId: string, month: number, year: number) => {
    try {
      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select('status, working_hours')
        .eq('employee_id', employeeId)
        .gte('attendance_date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('attendance_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

      if (error) throw error;

      const summary = {
        total_working_days: 26, // Default working days
        present_days: data?.filter((a: any) => a.status === 'Present').length || 0,
        absent_days: data?.filter((a: any) => a.status === 'Absent').length || 0,
        half_days: data?.filter((a: any) => a.status === 'Half Day').length || 0,
        leave_days: data?.filter((a: any) => a.status === 'Leave').length || 0,
        holiday_days: data?.filter((a: any) => a.status === 'Holiday').length || 0,
        total_working_hours: data?.reduce((sum: number, a: any) => sum + (a.working_hours || 0), 0) || 0
      };

      return summary;
    } catch (error: any) {
      console.error('Error getting attendance summary:', error);
      return {
        total_working_days: 26,
        present_days: 0,
        absent_days: 0,
        half_days: 0,
        leave_days: 0,
        holiday_days: 0,
        total_working_hours: 0
      };
    }
  };

  const handleGenerateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const employee = employees.find(e => e.id === formData.employee_id);
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      const month = parseInt(formData.salary_month);
      const year = parseInt(formData.salary_year);

      // Check if salary already exists
      const existingSalary = salaries.find(s => 
        s.employee_id === formData.employee_id && 
        s.salary_month === month && 
        s.salary_year === year
      );

      if (existingSalary) {
        toast.error('Salary already generated for this employee and month');
        return;
      }

      // Get attendance summary
      const attendanceSummary = await getAttendanceSummary(formData.employee_id, month, year);
      
      // Calculate base salary
      let grossSalary = 0;
      let absentDeduction = 0;

      if (employee.salary_type === 'Monthly') {
        grossSalary = employee.base_salary;
        absentDeduction = (employee.base_salary / attendanceSummary.total_working_days) * attendanceSummary.absent_days;
      } else if (employee.salary_type === 'Daily') {
        grossSalary = employee.base_salary * (attendanceSummary.present_days + (attendanceSummary.half_days * 0.5));
      } else if (employee.salary_type === 'Hourly') {
        grossSalary = employee.base_salary * attendanceSummary.total_working_hours;
      }

      const bonus = parseFloat(formData.bonus) || 0;
      const incentives = parseFloat(formData.incentives) || 0;
      const overtimeAmount = parseFloat(formData.overtime_amount) || 0;
      const latePenalty = parseFloat(formData.late_penalty) || 0;
      const advanceDeduction = parseFloat(formData.advance_deduction) || 0;
      const otherDeductions = parseFloat(formData.other_deductions) || 0;

      const totalDeductions = absentDeduction + latePenalty + advanceDeduction + otherDeductions;
      const netSalary = grossSalary + bonus + incentives + overtimeAmount - totalDeductions;

      const salaryData = {
        employee_id: formData.employee_id,
        salary_month: month,
        salary_year: year,
        ...attendanceSummary,
        base_salary: employee.base_salary,
        gross_salary: grossSalary,
        bonus: bonus,
        incentives: incentives,
        overtime_amount: overtimeAmount,
        absent_deduction: absentDeduction,
        late_penalty: latePenalty,
        advance_deduction: advanceDeduction,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        payment_status: 'Pending'
      };

      const { error } = await (supabase as any)
        .from('employee_salaries')
        .insert([salaryData]);

      if (error) throw error;

      // Track salary generation
      await trackDataOperation({
        operation_type: 'create',
        table_name: 'employee_salaries',
        record_id: `${formData.employee_id}_${month}_${year}`,
        operation_source: 'admin_salary_generate',
        metadata: {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          salary_month: month,
          salary_year: year,
          gross_salary: grossSalary,
          net_salary: netSalary,
          present_days: attendanceSummary.present_days,
          absent_days: attendanceSummary.absent_days,
          admin_action: 'monthly_salary_generation'
        }
      });

      toast.success('Salary generated successfully');
      fetchSalaries();
      resetForm();
      setIsGenerateDialogOpen(false);
    } catch (error: any) {
      console.error('Error generating salary:', error);
      toast.error('Failed to generate salary');
    }
  };

  const handleBulkGenerate = async () => {
    if (!confirm(`Generate salary for all employees for ${months[selectedMonth - 1]} ${selectedYear}?`)) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const employee of employees) {
        try {
          // Check if salary already exists
          const existingSalary = salaries.find(s => 
            s.employee_id === employee.id && 
            s.salary_month === selectedMonth && 
            s.salary_year === selectedYear
          );

          if (existingSalary) continue;

          // Get attendance summary
          const attendanceSummary = await getAttendanceSummary(employee.id, selectedMonth, selectedYear);
          
          // Calculate salary
          let grossSalary = 0;
          let absentDeduction = 0;

          if (employee.salary_type === 'Monthly') {
            grossSalary = employee.base_salary;
            absentDeduction = (employee.base_salary / attendanceSummary.total_working_days) * attendanceSummary.absent_days;
          } else if (employee.salary_type === 'Daily') {
            grossSalary = employee.base_salary * (attendanceSummary.present_days + (attendanceSummary.half_days * 0.5));
          } else if (employee.salary_type === 'Hourly') {
            grossSalary = employee.base_salary * attendanceSummary.total_working_hours;
          }

          const totalDeductions = absentDeduction;
          const netSalary = grossSalary - totalDeductions;

          const salaryData = {
            employee_id: employee.id,
            salary_month: selectedMonth,
            salary_year: selectedYear,
            ...attendanceSummary,
            base_salary: employee.base_salary,
            gross_salary: grossSalary,
            bonus: 0,
            incentives: 0,
            overtime_amount: 0,
            absent_deduction: absentDeduction,
            late_penalty: 0,
            advance_deduction: 0,
            other_deductions: 0,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            payment_status: 'Pending'
          };

          const { error } = await (supabase as any)
            .from('employee_salaries')
            .insert([salaryData]);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error generating salary for ${employee.full_name}:`, error);
          errorCount++;
        }
      }

      // Track bulk generation
      await trackDataOperation({
        operation_type: 'create',
        table_name: 'employee_salaries',
        record_id: `bulk_${selectedMonth}_${selectedYear}`,
        operation_source: 'admin_salary_bulk_generate',
        metadata: {
          salary_month: selectedMonth,
          salary_year: selectedYear,
          success_count: successCount,
          error_count: errorCount,
          total_employees: employees.length,
          admin_action: 'bulk_salary_generation'
        }
      });

      toast.success(`Generated salary for ${successCount} employees${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
      fetchSalaries();
    } catch (error: any) {
      console.error('Error bulk generating salaries:', error);
      toast.error('Failed to bulk generate salaries');
    }
  };

  const handlePayment = async (salary: SalaryRecord) => {
    try {
      const { error } = await (supabase as any)
        .from('employee_salaries')
        .update({
          payment_status: 'Paid',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          payment_mode: formData.payment_mode,
          transaction_reference: formData.transaction_reference,
          payment_notes: formData.payment_notes
        })
        .eq('id', salary.id);

      if (error) throw error;

      // Track payment
      await trackDataOperation({
        operation_type: 'update',
        table_name: 'employee_salaries',
        record_id: salary.id,
        operation_source: 'admin_salary_payment',
        metadata: {
          employee_id: salary.employee?.employee_id,
          employee_name: salary.employee?.full_name,
          salary_month: salary.salary_month,
          salary_year: salary.salary_year,
          net_salary: salary.net_salary,
          payment_mode: formData.payment_mode,
          transaction_reference: formData.transaction_reference,
          admin_action: 'salary_payment_processing'
        }
      });

      toast.success('Payment recorded successfully');
      fetchSalaries();
      setIsPaymentDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      salary_month: selectedMonth + '',
      salary_year: selectedYear + '',
      bonus: '0',
      incentives: '0',
      overtime_amount: '0',
      late_penalty: '0',
      advance_deduction: '0',
      other_deductions: '0',
      payment_mode: 'Bank Transfer',
      transaction_reference: '',
      payment_notes: ''
    });
    setSelectedSalary(null);
  };

  const openPaymentDialog = (salary: SalaryRecord) => {
    setSelectedSalary(salary);
    setFormData({
      ...formData,
      payment_mode: 'Bank Transfer',
      transaction_reference: '',
      payment_notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const openViewDialog = (salary: SalaryRecord) => {
    setSelectedSalary(salary);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Paid': 'bg-green-100 text-green-800',
      'On Hold': 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>;
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'Cash': return <Banknote className="h-4 w-4" />;
      case 'UPI': return <Smartphone className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const filteredSalaries = salaries.filter(salary => {
    const matchesEmployee = filterEmployee === 'all' || salary.employee_id === filterEmployee;
    const matchesStatus = filterStatus === 'all' || salary.payment_status === filterStatus;
    return matchesEmployee && matchesStatus;
  });

  const getSalaryStats = () => {
    const totalSalaries = salaries.length;
    const paidSalaries = salaries.filter(s => s.payment_status === 'Paid').length;
    const pendingSalaries = salaries.filter(s => s.payment_status === 'Pending').length;
    const totalAmount = salaries.reduce((sum, s) => sum + s.net_salary, 0);
    const paidAmount = salaries.filter(s => s.payment_status === 'Paid').reduce((sum, s) => sum + s.net_salary, 0);

    return {
      total: totalSalaries,
      paid: paidSalaries,
      pending: pendingSalaries,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount
    };
  };

  const stats = getSalaryStats();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Salary Management</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Generate and manage employee salaries</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <Button 
            variant="outline"
            onClick={handleBulkGenerate}
            className="flex-1 sm:flex-none h-11 sm:h-10 md:h-11 touch-manipulation flex items-center gap-2 justify-center"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Generate</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex-1 sm:flex-none h-11 sm:h-10 md:h-11 touch-manipulation flex items-center gap-2 justify-center">
                <Plus className="h-4 w-4" />
                Generate Salary
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
              <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Generate Salary</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-1">
                <SalaryForm 
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleGenerateSalary}
                  employees={employees}
                  months={months}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Month/Year Selector - Responsive */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Viewing:</span>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="flex-1 sm:w-48 h-11 sm:h-10 md:h-11 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32 sm:w-32 h-11 sm:h-10 md:h-11 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Responsive: 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Salaries</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Paid</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">{stats.paid}</p>
              </div>
              <Check className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate">{stats.pending}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold truncate">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-full sm:w-64 h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {paymentStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Salary Records - Responsive */}
      <div className="space-y-3 sm:space-y-4">
        {filteredSalaries.map((salary) => (
          <Card key={salary.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-300">
                      {salary.employee?.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{salary.employee?.full_name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {salary.employee?.employee_id} • {salary.employee?.role}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">₹{salary.net_salary.toLocaleString()}</p>
                  {getStatusBadge(salary.payment_status)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                  <p className="font-semibold text-sm sm:text-base">{salary.present_days}/{salary.total_working_days}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Gross Salary</p>
                  <p className="font-semibold text-sm sm:text-base">₹{salary.gross_salary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Deductions</p>
                  <p className="font-semibold text-sm sm:text-base text-red-600">₹{salary.total_deductions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Bonus/Incentives</p>
                  <p className="font-semibold text-sm sm:text-base text-green-600">
                    ₹{(salary.bonus + salary.incentives + salary.overtime_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openViewDialog(salary)}
                  className="flex-1 h-10 sm:h-9 touch-manipulation text-xs sm:text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                {salary.payment_status === 'Pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPaymentDialog(salary)}
                    className="flex-1 h-10 sm:h-9 touch-manipulation text-green-600 text-xs sm:text-sm"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                )}
                {salary.payment_status === 'Paid' && salary.payment_mode && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded text-xs sm:text-sm text-green-700 dark:text-green-400 justify-center sm:justify-start">
                    {getPaymentModeIcon(salary.payment_mode)}
                    <span>{salary.payment_mode}</span>
                    {salary.payment_date && (
                      <span className="hidden sm:inline">• {format(new Date(salary.payment_date), 'MMM dd')}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSalaries.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No salary records found</h3>
            <p className="text-gray-600 mb-4">
              {salaries.length === 0 
                ? `Generate salaries for ${months[selectedMonth - 1]} ${selectedYear}`
                : 'Try adjusting your filters'
              }
            </p>
            {salaries.length === 0 && (
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Salary
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog - Responsive */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            {selectedSalary && (
              <PaymentForm 
                salary={selectedSalary}
                formData={formData}
                setFormData={setFormData}
                onSubmit={() => handlePayment(selectedSalary)}
                paymentModes={paymentModes}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Responsive */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Salary Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            {selectedSalary && (
              <SalaryDetails salary={selectedSalary} months={months} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Salary Form Component
const SalaryForm = ({ formData, setFormData, onSubmit, employees, months }: any) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employee_id" className="mb-1.5 block">Employee *</Label>
          <Select 
            value={formData.employee_id} 
            onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
          >
            <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="salary_month" className="mb-1.5 block">Month *</Label>
          <Select 
            value={formData.salary_month} 
            onValueChange={(value) => setFormData({ ...formData, salary_month: value })}
          >
            <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month: string, index: number) => (
                <SelectItem key={index} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="salary_year" className="mb-1.5 block">Year *</Label>
          <Select 
            value={formData.salary_year} 
            onValueChange={(value) => setFormData({ ...formData, salary_year: value })}
          >
            <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Additional Components</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bonus" className="mb-1.5 block">Bonus (₹)</Label>
            <Input
              id="bonus"
              type="number"
              step="0.01"
              min="0"
              value={formData.bonus}
              onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
          <div>
            <Label htmlFor="incentives" className="mb-1.5 block">Incentives (₹)</Label>
            <Input
              id="incentives"
              type="number"
              step="0.01"
              min="0"
              value={formData.incentives}
              onChange={(e) => setFormData({ ...formData, incentives: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
          <div>
            <Label htmlFor="overtime_amount" className="mb-1.5 block">Overtime Amount (₹)</Label>
            <Input
              id="overtime_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.overtime_amount}
              onChange={(e) => setFormData({ ...formData, overtime_amount: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Deductions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="late_penalty" className="mb-1.5 block">Late Penalty (₹)</Label>
            <Input
              id="late_penalty"
              type="number"
              step="0.01"
              min="0"
              value={formData.late_penalty}
              onChange={(e) => setFormData({ ...formData, late_penalty: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
          <div>
            <Label htmlFor="advance_deduction" className="mb-1.5 block">Advance Deduction (₹)</Label>
            <Input
              id="advance_deduction"
              type="number"
              step="0.01"
              min="0"
              value={formData.advance_deduction}
              onChange={(e) => setFormData({ ...formData, advance_deduction: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
          <div>
            <Label htmlFor="other_deductions" className="mb-1.5 block">Other Deductions (₹)</Label>
            <Input
              id="other_deductions"
              type="number"
              step="0.01"
              min="0"
              value={formData.other_deductions}
              onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2 -mx-1 px-1">
        <Button type="submit" className="w-full h-11 sm:h-10 md:h-11 touch-manipulation">
          Generate Salary
        </Button>
      </div>
    </form>
  );
};

// Payment Form Component
const PaymentForm = ({ salary, formData, setFormData, onSubmit, paymentModes }: any) => {
  return (
    <div className="space-y-4 pt-4">
      <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium mb-2 text-sm sm:text-base">{salary.employee?.full_name}</h4>
        <p className="text-xl sm:text-2xl font-bold text-green-600">₹{salary.net_salary.toLocaleString()}</p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Net Salary Amount</p>
      </div>

      <div>
        <Label htmlFor="payment_mode" className="mb-1.5 block">Payment Mode *</Label>
        <Select 
          value={formData.payment_mode} 
          onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
        >
          <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
            <SelectValue placeholder="Select payment mode" />
          </SelectTrigger>
          <SelectContent>
            {paymentModes.map((mode: string) => (
              <SelectItem key={mode} value={mode}>
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="transaction_reference" className="mb-1.5 block">Transaction Reference</Label>
        <Input
          id="transaction_reference"
          value={formData.transaction_reference}
          onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
          placeholder="Transaction ID, Check number, etc."
          className="h-11 sm:h-10 md:h-11 touch-manipulation"
        />
      </div>

      <div>
        <Label htmlFor="payment_notes" className="mb-1.5 block">Payment Notes</Label>
        <Textarea
          id="payment_notes"
          value={formData.payment_notes}
          onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
          rows={3}
          placeholder="Additional notes about the payment"
          className="touch-manipulation resize-none"
        />
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2 -mx-1 px-1">
        <Button onClick={onSubmit} className="w-full h-11 sm:h-10 md:h-11 touch-manipulation">
          Record Payment
        </Button>
      </div>
    </div>
  );
};

// Salary Details Component
const SalaryDetails = ({ salary, months }: any) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{salary.employee?.full_name}</h3>
          <p className="text-gray-600">{salary.employee?.employee_id} • {salary.employee?.role}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{months[salary.salary_month - 1]} {salary.salary_year}</p>
          {salary.payment_status === 'Paid' ? (
            <Badge className="bg-green-100 text-green-800">Paid</Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Working Days:</span>
              <span className="font-semibold">{salary.total_working_days}</span>
            </div>
            <div className="flex justify-between">
              <span>Present Days:</span>
              <span className="font-semibold text-green-600">{salary.present_days}</span>
            </div>
            <div className="flex justify-between">
              <span>Absent Days:</span>
              <span className="font-semibold text-red-600">{salary.absent_days}</span>
            </div>
            <div className="flex justify-between">
              <span>Half Days:</span>
              <span className="font-semibold text-yellow-600">{salary.half_days}</span>
            </div>
            <div className="flex justify-between">
              <span>Leave Days:</span>
              <span className="font-semibold text-blue-600">{salary.leave_days}</span>
            </div>
            <div className="flex justify-between">
              <span>Holiday Days:</span>
              <span className="font-semibold text-purple-600">{salary.holiday_days}</span>
            </div>
            {salary.total_working_hours > 0 && (
              <div className="flex justify-between">
                <span>Total Working Hours:</span>
                <span className="font-semibold">{salary.total_working_hours}h</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Base Salary:</span>
              <span className="font-semibold">₹{salary.base_salary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Salary:</span>
              <span className="font-semibold">₹{salary.gross_salary.toLocaleString()}</span>
            </div>
            {salary.bonus > 0 && (
              <div className="flex justify-between">
                <span>Bonus:</span>
                <span className="font-semibold text-green-600">+₹{salary.bonus.toLocaleString()}</span>
              </div>
            )}
            {salary.incentives > 0 && (
              <div className="flex justify-between">
                <span>Incentives:</span>
                <span className="font-semibold text-green-600">+₹{salary.incentives.toLocaleString()}</span>
              </div>
            )}
            {salary.overtime_amount > 0 && (
              <div className="flex justify-between">
                <span>Overtime:</span>
                <span className="font-semibold text-green-600">+₹{salary.overtime_amount.toLocaleString()}</span>
              </div>
            )}
            {salary.absent_deduction > 0 && (
              <div className="flex justify-between">
                <span>Absent Deduction:</span>
                <span className="font-semibold text-red-600">-₹{salary.absent_deduction.toLocaleString()}</span>
              </div>
            )}
            {salary.late_penalty > 0 && (
              <div className="flex justify-between">
                <span>Late Penalty:</span>
                <span className="font-semibold text-red-600">-₹{salary.late_penalty.toLocaleString()}</span>
              </div>
            )}
            {salary.advance_deduction > 0 && (
              <div className="flex justify-between">
                <span>Advance Deduction:</span>
                <span className="font-semibold text-red-600">-₹{salary.advance_deduction.toLocaleString()}</span>
              </div>
            )}
            {salary.other_deductions > 0 && (
              <div className="flex justify-between">
                <span>Other Deductions:</span>
                <span className="font-semibold text-red-600">-₹{salary.other_deductions.toLocaleString()}</span>
              </div>
            )}
            <hr />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Net Salary:</span>
              <span className="font-bold text-green-600">₹{salary.net_salary.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {salary.payment_status === 'Paid' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Payment Date:</span>
              <span className="font-semibold">
                {salary.payment_date ? format(new Date(salary.payment_date), 'PPP') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span className="font-semibold">{salary.payment_mode}</span>
            </div>
            {salary.transaction_reference && (
              <div className="flex justify-between">
                <span>Transaction Reference:</span>
                <span className="font-semibold">{salary.transaction_reference}</span>
              </div>
            )}
            {salary.payment_notes && (
              <div>
                <span className="font-medium">Notes:</span>
                <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1">{salary.payment_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-500">
        <p>Generated: {format(new Date(salary.generated_at), 'PPP')}</p>
      </div>
    </div>
  );
};

export default SalaryManagement;