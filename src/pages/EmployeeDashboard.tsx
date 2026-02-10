import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  LogOut, 
  Calendar, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase,
  Building2,
  CalendarDays,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth.tsx';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_hours: number;
  notes: string | null;
}

interface SalaryRecord {
  id: string;
  salary_month: number;
  salary_year: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payment_status: string;
  payment_date: string | null;
}

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { employee, logout, isAuthenticated, isLoading } = useEmployeeAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [salaryLoading, setSalaryLoading] = useState(true);
  const [currentMonthStats, setCurrentMonthStats] = useState({
    present: 0,
    absent: 0,
    halfDay: 0,
    total: 0
  });

  // BUG FIX #6: Add session validation on mount and periodically
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/employee/login');
      return;
    }

    if (employee) {
      fetchAttendanceRecords();
      fetchSalaryRecords();
      
      // Validate session immediately
      validateCurrentSession();
      
      // BUG FIX #6: Set up periodic session validation (every 5 minutes)
      const sessionCheckInterval = setInterval(() => {
        validateCurrentSession();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(sessionCheckInterval);
    }
  }, [employee, isAuthenticated, isLoading, navigate]);

  // BUG FIX #6: Function to validate current session
  const validateCurrentSession = async () => {
    const sessionData = localStorage.getItem('employee_session');
    if (!sessionData) {
      toast.error('Session expired. Please login again.');
      navigate('/employee/login');
      return;
    }

    try {
      const { session_token } = JSON.parse(sessionData);
      
      const { data, error } = await supabase.rpc('validate_employee_session', {
        p_session_token: session_token
      });

      if (error) {
        console.error('Session validation error:', error);
        return;
      }

      if (!data || !data.valid) {
        toast.error(data?.message || 'Session expired. Please login again.');
        await logout();
        navigate('/employee/login');
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!employee) return;

    try {
      setAttendanceLoading(true);
      
      // Get current month attendance
      const currentDate = new Date();
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('attendance_date', format(firstDay, 'yyyy-MM-dd'))
        .lte('attendance_date', format(lastDay, 'yyyy-MM-dd'))
        .order('attendance_date', { ascending: false });

      if (error) throw error;

      setAttendanceRecords(data || []);

      // Calculate stats
      const stats = {
        present: data?.filter(r => r.status === 'Present').length || 0,
        absent: data?.filter(r => r.status === 'Absent').length || 0,
        halfDay: data?.filter(r => r.status === 'Half Day').length || 0,
        total: data?.length || 0
      };
      setCurrentMonthStats(stats);

    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchSalaryRecords = async () => {
    if (!employee) return;

    try {
      setSalaryLoading(true);
      
      const { data, error } = await supabase
        .from('employee_salaries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('salary_year', { ascending: false })
        .order('salary_month', { ascending: false })
        .limit(12); // Last 12 months

      if (error) throw error;
      setSalaryRecords(data || []);

    } catch (error: any) {
      console.error('Error fetching salary records:', error);
      toast.error('Failed to fetch salary records');
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/employee/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800';
      case 'Absent': return 'bg-red-100 text-red-800';
      case 'Half Day': return 'bg-yellow-100 text-yellow-800';
      case 'Leave': return 'bg-blue-100 text-blue-800';
      case 'Holiday': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <CheckCircle className="h-4 w-4" />;
      case 'Absent': return <XCircle className="h-4 w-4" />;
      case 'Half Day': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'On Hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Employee Portal</h1>
                <p className="text-sm text-gray-500">Welcome back, {employee.full_name}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="salary">Salary</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {employee.profile_image_url ? (
                      <img 
                        src={employee.profile_image_url} 
                        alt={employee.full_name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-600">
                        {employee.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Full Name</label>
                          <p className="text-lg font-semibold text-gray-900">{employee.full_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Employee ID</label>
                          <p className="text-lg font-semibold text-gray-900">{employee.employee_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{employee.mobile_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{employee.email}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{employee.role}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{employee.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">
                            Joined {format(new Date(employee.joining_date), 'PPP')}
                          </span>
                        </div>
                        <div>
                          <Badge className={employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {employee.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Current Month Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Present Days</p>
                      <p className="text-2xl font-bold text-green-600">{currentMonthStats.present}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Absent Days</p>
                      <p className="text-2xl font-bold text-red-600">{currentMonthStats.absent}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Half Days</p>
                      <p className="text-2xl font-bold text-yellow-600">{currentMonthStats.halfDay}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Days</p>
                      <p className="text-2xl font-bold text-blue-600">{currentMonthStats.total}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Current Month Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading attendance records...</p>
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No attendance records found for this month</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            <span className="font-medium">
                              {format(new Date(record.attendance_date), 'EEE, MMM dd')}
                            </span>
                          </div>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {record.check_in_time && (
                            <span>In: {record.check_in_time}</span>
                          )}
                          {record.check_out_time && (
                            <span>Out: {record.check_out_time}</span>
                          )}
                          {record.working_hours > 0 && (
                            <span>{record.working_hours}h</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Tab */}
          <TabsContent value="salary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salaryLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading salary records...</p>
                  </div>
                ) : salaryRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No salary records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salaryRecords.map((record) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">
                            {format(new Date(record.salary_year, record.salary_month - 1), 'MMMM yyyy')}
                          </h3>
                          <Badge className={getPaymentStatusColor(record.payment_status)}>
                            {record.payment_status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Attendance</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Present Days:</span>
                                <span className="font-medium">{record.present_days}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Absent Days:</span>
                                <span className="font-medium">{record.absent_days}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Half Days:</span>
                                <span className="font-medium">{record.half_days}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Earnings</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Gross Salary:</span>
                                <span className="font-medium">₹{record.gross_salary.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Deductions:</span>
                                <span className="font-medium text-red-600">-₹{record.total_deductions.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span className="font-medium">Net Salary:</span>
                                <span className="font-bold text-green-600">₹{record.net_salary.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Payment</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <Badge className={getPaymentStatusColor(record.payment_status)} size="sm">
                                  {record.payment_status}
                                </Badge>
                              </div>
                              {record.payment_date && (
                                <div className="flex justify-between">
                                  <span>Paid On:</span>
                                  <span className="font-medium">
                                    {format(new Date(record.payment_date), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployeeDashboard;