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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Save,
  Plus,
  Filter,
  Download,
  Eye,
  UserCheck,
  UserX,
  Timer,
  Coffee,
  Home
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackDataOperation } from '@/services/storageTrackingService';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  department: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  working_hours?: number;
  notes?: string;
  is_locked: boolean;
  employee?: Employee;
}

interface AttendanceFormData {
  employee_id: string;
  attendance_date: Date;
  status: string;
  check_in_time: string;
  check_out_time: string;
  working_hours: string;
  notes: string;
}

const AttendanceManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isMarkDialogOpen, setIsMarkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const [formData, setFormData] = useState<AttendanceFormData>({
    employee_id: '',
    attendance_date: new Date(),
    status: 'Present',
    check_in_time: '09:00',
    check_out_time: '18:00',
    working_hours: '8',
    notes: ''
  });

  const attendanceStatuses = [
    { value: 'Present', label: 'Present', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'Absent', label: 'Absent', icon: XCircle, color: 'bg-red-100 text-red-800' },
    { value: 'Half Day', label: 'Half Day', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Leave', label: 'Leave', icon: Coffee, color: 'bg-blue-100 text-blue-800' },
    { value: 'Holiday', label: 'Holiday', icon: Home, color: 'bg-purple-100 text-purple-800' }
  ];

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, [selectedDate, selectedMonth]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('id, employee_id, full_name, role, department, status')
        .eq('status', 'Active')
        .order('full_name');

      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select(`
          *,
          employee:employees(id, employee_id, full_name, role, department, status)
        `)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setAttendance((data || []) as AttendanceRecord[]);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const attendanceData = {
        employee_id: formData.employee_id,
        attendance_date: format(formData.attendance_date, 'yyyy-MM-dd'),
        status: formData.status,
        check_in_time: formData.status === 'Present' || formData.status === 'Half Day' ? formData.check_in_time : null,
        check_out_time: formData.status === 'Present' || formData.status === 'Half Day' ? formData.check_out_time : null,
        working_hours: formData.status === 'Present' ? parseFloat(formData.working_hours) : 
                      formData.status === 'Half Day' ? parseFloat(formData.working_hours) / 2 : 0,
        notes: formData.notes
      };

      let result;
      if (selectedRecord) {
        // Update existing record
        result = await (supabase as any)
          .from('employee_attendance')
          .update(attendanceData)
          .eq('id', selectedRecord.id)
          .select()
          .single();
        
        if (!result.error) {
          const employee = employees.find(e => e.id === formData.employee_id);
          await trackDataOperation({
            operation_type: 'update',
            table_name: 'employee_attendance',
            record_id: selectedRecord.id,
            operation_source: 'admin_attendance_update',
            metadata: {
              employee_id: employee?.employee_id,
              employee_name: employee?.full_name,
              attendance_date: format(formData.attendance_date, 'yyyy-MM-dd'),
              old_status: selectedRecord.status,
              new_status: formData.status,
              working_hours: attendanceData.working_hours,
              admin_action: 'attendance_modification'
            }
          });
          toast.success('Attendance updated successfully');
        }
      } else {
        // Create new record
        result = await (supabase as any)
          .from('employee_attendance')
          .insert([attendanceData])
          .select()
          .single();
        
        if (!result.error) {
          const employee = employees.find(e => e.id === formData.employee_id);
          await trackDataOperation({
            operation_type: 'create',
            table_name: 'employee_attendance',
            record_id: result.data.id,
            operation_source: 'admin_attendance_mark',
            metadata: {
              employee_id: employee?.employee_id,
              employee_name: employee?.full_name,
              attendance_date: format(formData.attendance_date, 'yyyy-MM-dd'),
              status: formData.status,
              working_hours: attendanceData.working_hours,
              admin_action: 'daily_attendance_marking'
            }
          });
          toast.success('Attendance marked successfully');
        }
      }

      if (result.error) throw result.error;

      fetchAttendance();
      resetForm();
      setIsMarkDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      if (error.code === '23505') {
        toast.error('Attendance already marked for this employee on this date');
      } else {
        toast.error('Failed to save attendance');
      }
    }
  };

  const handleBulkMarkAttendance = async (status: string) => {
    if (!confirm(`Mark all active employees as ${status} for ${format(selectedDate, 'PPP')}?`)) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existingAttendance = attendance.filter(a => a.attendance_date === dateStr);
      const employeesToMark = employees.filter(emp => 
        !existingAttendance.some(att => att.employee_id === emp.id)
      );

      if (employeesToMark.length === 0) {
        toast.info('All employees already have attendance marked for this date');
        return;
      }

      const attendanceRecords = employeesToMark.map(emp => ({
        employee_id: emp.id,
        attendance_date: dateStr,
        status: status,
        check_in_time: status === 'Present' ? '09:00:00' : null,
        check_out_time: status === 'Present' ? '18:00:00' : null,
        working_hours: status === 'Present' ? 8 : status === 'Half Day' ? 4 : 0,
        notes: `Bulk marked as ${status}`
      }));

      const { error } = await (supabase as any)
        .from('employee_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      // Track bulk operation
      await trackDataOperation({
        operation_type: 'create',
        table_name: 'employee_attendance',
        record_id: 'bulk_' + dateStr,
        operation_source: 'admin_attendance_bulk',
        metadata: {
          attendance_date: dateStr,
          status: status,
          employees_count: employeesToMark.length,
          employee_names: employeesToMark.map(e => e.full_name).join(', '),
          admin_action: 'bulk_attendance_marking'
        }
      });

      toast.success(`Marked ${employeesToMark.length} employees as ${status}`);
      fetchAttendance();
    } catch (error: any) {
      console.error('Error bulk marking attendance:', error);
      toast.error('Failed to bulk mark attendance');
    }
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setFormData({
      employee_id: record.employee_id,
      attendance_date: new Date(record.attendance_date),
      status: record.status,
      check_in_time: record.check_in_time || '09:00',
      check_out_time: record.check_out_time || '18:00',
      working_hours: record.working_hours?.toString() || '8',
      notes: record.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      attendance_date: selectedDate,
      status: 'Present',
      check_in_time: '09:00',
      check_out_time: '18:00',
      working_hours: '8',
      notes: ''
    });
    setSelectedRecord(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = attendanceStatuses.find(s => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <Badge className={statusConfig.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getDailyAttendance = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.filter(a => a.attendance_date === dateStr);
  };

  const getEmployeeAttendance = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.find(a => a.employee_id === employeeId && a.attendance_date === dateStr);
  };

  const getMonthlyStats = () => {
    const totalDays = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const absentCount = attendance.filter(a => a.status === 'Absent').length;
    const halfDayCount = attendance.filter(a => a.status === 'Half Day').length;
    const leaveCount = attendance.filter(a => a.status === 'Leave').length;
    const holidayCount = attendance.filter(a => a.status === 'Holiday').length;

    return {
      total: totalDays,
      present: presentCount,
      absent: absentCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      holiday: holidayCount
    };
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesEmployee = filterEmployee === 'all' || record.employee_id === filterEmployee;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesEmployee && matchesStatus;
  });

  const monthlyStats = getMonthlyStats();

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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Attendance Management</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Track and manage employee attendance</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isMarkDialogOpen} onOpenChange={setIsMarkDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex-1 sm:flex-none h-11 sm:h-10 md:h-11 touch-manipulation flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
              <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Mark Attendance</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-1">
                <AttendanceForm 
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleMarkAttendance}
                  employees={employees}
                  attendanceStatuses={attendanceStatuses}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards - Responsive: 2 cols mobile → 3 cols tablet → 6 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Records</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{monthlyStats.total}</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Present</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">{monthlyStats.present}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Absent</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">{monthlyStats.absent}</p>
              </div>
              <XCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Half Day</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate">{monthlyStats.halfDay}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Leave</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 truncate">{monthlyStats.leave}</p>
              </div>
              <Coffee className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Holiday</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 truncate">{monthlyStats.holiday}</p>
              </div>
              <Home className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto sm:h-10">
          <TabsTrigger value="daily" className="text-xs sm:text-sm h-10 sm:h-9 touch-manipulation">Daily View</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs sm:text-sm h-10 sm:h-9 touch-manipulation">Monthly Calendar</TabsTrigger>
          <TabsTrigger value="records" className="text-xs sm:text-sm h-10 sm:h-9 touch-manipulation">All Records</TabsTrigger>
        </TabsList>

        {/* Daily View */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">Daily Attendance - {format(selectedDate, 'PPP')}</span>
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Change Date</span>
                        <span className="sm:hidden">Date</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkMarkAttendance('Present')}
                    className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Mark All Present</span>
                    <span className="sm:hidden">All Present</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkMarkAttendance('Holiday')}
                    className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Mark Holiday</span>
                    <span className="sm:hidden">Holiday</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {employees.map((employee) => {
                  const attendanceRecord = getEmployeeAttendance(employee.id, selectedDate);
                  return (
                    <div key={employee.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {employee.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm sm:text-base truncate">{employee.full_name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{employee.employee_id} • {employee.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                        {attendanceRecord ? (
                          <>
                            {getStatusBadge(attendanceRecord.status)}
                            {attendanceRecord.check_in_time && (
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden md:inline">
                                {attendanceRecord.check_in_time} - {attendanceRecord.check_out_time}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(attendanceRecord)}
                              disabled={attendanceRecord.is_locked}
                              className="h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                employee_id: employee.id,
                                attendance_date: selectedDate
                              });
                              setIsMarkDialogOpen(true);
                            }}
                            className="h-9 sm:h-8 touch-manipulation text-xs sm:text-sm"
                          >
                            Mark Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Calendar */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <CardTitle className="text-base sm:text-lg md:text-xl">Monthly Calendar - {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Change Month
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-1 sm:p-2 text-center font-medium text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {eachDayOfInterval({
                  start: startOfMonth(selectedMonth),
                  end: endOfMonth(selectedMonth)
                }).map(date => {
                  const dailyAttendance = getDailyAttendance(date);
                  const presentCount = dailyAttendance.filter(a => a.status === 'Present').length;
                  const totalEmployees = employees.length;
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-1 sm:p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation ${
                        isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="text-xs sm:text-sm font-medium">{format(date, 'd')}</div>
                      {dailyAttendance.length > 0 && (
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                          {presentCount}/{totalEmployees}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Records */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <CardTitle className="text-base sm:text-lg md:text-xl">Attendance Records</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger className="w-full sm:w-48 h-11 sm:h-10 md:h-11 touch-manipulation">
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
                      {attendanceStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="space-y-2 sm:space-y-3">
                {filteredAttendance.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {record.employee?.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base truncate">{record.employee?.full_name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {format(new Date(record.attendance_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                      {getStatusBadge(record.status)}
                      {record.check_in_time && (
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden md:inline">
                          {record.check_in_time} - {record.check_out_time}
                        </span>
                      )}
                      {record.working_hours && (
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden lg:inline">
                          {record.working_hours}h
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(record)}
                        disabled={record.is_locked}
                        className="h-9 sm:h-8 w-9 sm:w-8 p-0 touch-manipulation"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredAttendance.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No attendance records found</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Start by marking attendance for your employees</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
          <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Edit Attendance</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <AttendanceForm 
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleMarkAttendance}
              employees={employees}
              attendanceStatuses={attendanceStatuses}
              isEdit={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Attendance Form Component
const AttendanceForm = ({ formData, setFormData, onSubmit, employees, attendanceStatuses, isEdit = false }: any) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div>
        <Label htmlFor="employee_id" className="mb-1.5 block">Employee *</Label>
        <Select 
          value={formData.employee_id} 
          onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
          disabled={isEdit}
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
        <Label htmlFor="attendance_date" className="mb-1.5 block">Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal h-11 sm:h-10 md:h-11 touch-manipulation">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.attendance_date ? format(formData.attendance_date, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.attendance_date}
              onSelect={(date) => date && setFormData({ ...formData, attendance_date: date })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="status" className="mb-1.5 block">Status *</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {attendanceStatuses.map((status: any) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(formData.status === 'Present' || formData.status === 'Half Day') && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="check_in_time" className="mb-1.5 block">Check In Time</Label>
              <Input
                id="check_in_time"
                type="time"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>
            <div>
              <Label htmlFor="check_out_time" className="mb-1.5 block">Check Out Time</Label>
              <Input
                id="check_out_time"
                type="time"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="working_hours" className="mb-1.5 block">Working Hours</Label>
            <Input
              id="working_hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={formData.working_hours}
              onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
              className="h-11 sm:h-10 md:h-11 touch-manipulation"
            />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="notes" className="mb-1.5 block">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="touch-manipulation resize-none"
        />
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2 -mx-1 px-1">
        <Button type="submit" className="w-full h-11 sm:h-10 md:h-11 touch-manipulation">
          {isEdit ? 'Update Attendance' : 'Mark Attendance'}
        </Button>
      </div>
    </form>
  );
};

export default AttendanceManagement;