import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Star,
  Smartphone,
  MapPin,
  Wrench,
  IndianRupee,
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  cancelledRequests: number;
  avgRating: number;
  totalRevenue: number;
  avgCompletionTime: number;
  issueBreakdown: Record<string, number>;
  serviceTypeBreakdown: Record<string, number>;
  deviceTypeBreakdown: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    requests: number;
    completed: number;
    revenue: number;
  }>;
}

interface Technician {
  id: string;
  name: string;
  totalRepairs: number;
  avgRating: number;
  currentWorkload: number;
  specializations: string[];
  certificationLevel: string;
}

export const RepairAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [dateRange, setDateRange] = useState('7'); // days
  const [selectedMetric, setSelectedMetric] = useState('requests');

  useEffect(() => {
    fetchAnalytics();
    fetchTechnicians();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Fetch repair requests data
      const { data: requests, error: requestsError } = await (supabase as any)
        .from('repair_requests')
        .select(`
          *,
          repair_quotations (total_amount),
          repair_feedback (rating)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (requestsError) throw requestsError;

      // Process analytics data
      const totalRequests = requests?.length || 0;
      const completedRequests = requests?.filter(r => 
        ['repair_completed', 'delivered'].includes(r.status)
      ).length || 0;
      const pendingRequests = requests?.filter(r => 
        !['repair_completed', 'delivered', 'cancelled'].includes(r.status)
      ).length || 0;
      const cancelledRequests = requests?.filter(r => r.status === 'cancelled').length || 0;

      // Calculate average rating
      const ratingsData = requests?.flatMap(r => {
        if (r.repair_feedback && Array.isArray(r.repair_feedback)) {
          return r.repair_feedback.map(f => f.rating).filter(rating => rating != null);
        }
        return [];
      }) || [];
      const avgRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length 
        : 0;

      // Calculate total revenue
      const totalRevenue = requests?.reduce((sum, r) => {
        if (r.repair_quotations && Array.isArray(r.repair_quotations) && r.repair_quotations.length > 0) {
          const quotation = r.repair_quotations[0];
          return sum + (quotation?.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Issue breakdown
      const issueBreakdown: Record<string, number> = {};
      requests?.forEach(r => {
        if (r.issue_types && Array.isArray(r.issue_types)) {
          r.issue_types.forEach((issue: string) => {
            issueBreakdown[issue] = (issueBreakdown[issue] || 0) + 1;
          });
        }
      });

      // Service type breakdown
      const serviceTypeBreakdown: Record<string, number> = {};
      requests?.forEach(r => {
        serviceTypeBreakdown[r.service_type] = (serviceTypeBreakdown[r.service_type] || 0) + 1;
      });

      // Device type breakdown
      const deviceTypeBreakdown: Record<string, number> = {};
      requests?.forEach(r => {
        deviceTypeBreakdown[r.device_type] = (deviceTypeBreakdown[r.device_type] || 0) + 1;
      });

      // Daily trends (simplified)
      const dailyTrends = [];
      for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayRequests = requests?.filter(r => 
          new Date(r.created_at).toDateString() === date.toDateString()
        ) || [];
        
        dailyTrends.push({
          date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          requests: dayRequests.length,
          completed: dayRequests.filter(r => 
            ['repair_completed', 'delivered'].includes(r.status)
          ).length,
          revenue: dayRequests.reduce((sum, r) => {
            if (r.repair_quotations && Array.isArray(r.repair_quotations) && r.repair_quotations.length > 0) {
              const quotation = r.repair_quotations[0];
              return sum + (quotation?.total_amount || 0);
            }
            return sum;
          }, 0)
        });
      }

      setAnalytics({
        totalRequests,
        completedRequests,
        pendingRequests,
        cancelledRequests,
        avgRating,
        totalRevenue,
        avgCompletionTime: 48, // Placeholder
        issueBreakdown,
        serviceTypeBreakdown,
        deviceTypeBreakdown,
        dailyTrends
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('repair_technicians')
        .select('*')
        .eq('is_active', true)
        .order('total_repairs_completed', { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error('Error fetching technicians:', error);
    }
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Requests', analytics.totalRequests],
      ['Completed Requests', analytics.completedRequests],
      ['Pending Requests', analytics.pendingRequests],
      ['Cancelled Requests', analytics.cancelledRequests],
      ['Average Rating', analytics.avgRating.toFixed(2)],
      ['Total Revenue', `₹${analytics.totalRevenue.toFixed(2)}`],
      ['Average Completion Time', `${analytics.avgCompletionTime} hours`]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Unable to load analytics data.</p>
      </div>
    );
  }

  const issueLabels: Record<string, string> = {
    'screen_broken': 'Screen Issues',
    'battery_issue': 'Battery Issues',
    'charging_problem': 'Charging Issues',
    'water_damage': 'Water Damage',
    'software_issue': 'Software Issues',
    'speaker_mic': 'Speaker/Mic Issues',
    'camera_issue': 'Camera Issues',
    'network_issue': 'Network Issues',
    'other': 'Other Issues'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repair Analytics</h2>
          <p className="text-gray-600">Performance metrics and insights</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{analytics.completedRequests}</p>
                <p className="text-xs text-gray-500">
                  {analytics.totalRequests > 0 
                    ? `${((analytics.completedRequests / analytics.totalRequests) * 100).toFixed(1)}% completion rate`
                    : 'No data'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {analytics.avgRating > 0 ? analytics.avgRating.toFixed(1) : 'N/A'}
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-3 w-3 ${
                        star <= analytics.avgRating 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{analytics.totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: ₹{analytics.totalRequests > 0 
                    ? (analytics.totalRevenue / analytics.totalRequests).toFixed(0)
                    : '0'
                  } per request
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Issue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.issueBreakdown && Object.entries(analytics.issueBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([issue, count]) => (
                <div key={issue} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {issueLabels[issue] || issue}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.totalRequests > 0 ? (count / analytics.totalRequests) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {(!analytics.issueBreakdown || Object.keys(analytics.issueBreakdown).length === 0) && (
                <p className="text-gray-500 text-center py-4">No issue data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.serviceTypeBreakdown && Object.entries(analytics.serviceTypeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      type === 'doorstep' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="text-sm capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({analytics.totalRequests > 0 ? ((count / analytics.totalRequests) * 100).toFixed(1) : '0'}%)
                    </span>
                  </div>
                </div>
              ))}
              {(!analytics.serviceTypeBreakdown || Object.keys(analytics.serviceTypeBreakdown).length === 0) && (
                <p className="text-gray-500 text-center py-4">No service type data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      {technicians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Technician Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Technician</th>
                    <th className="text-left py-2">Specializations</th>
                    <th className="text-center py-2">Level</th>
                    <th className="text-center py-2">Completed</th>
                    <th className="text-center py-2">Rating</th>
                    <th className="text-center py-2">Workload</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => (
                    <tr key={tech.id} className="border-b">
                      <td className="py-3">
                        <div className="font-medium">{tech.name}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {tech.specializations && Array.isArray(tech.specializations) && tech.specializations.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec.replace('_', ' ')}
                            </Badge>
                          ))}
                          {tech.specializations && Array.isArray(tech.specializations) && tech.specializations.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tech.specializations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <Badge className={
                          tech.certificationLevel === 'expert' ? 'bg-green-100 text-green-800' :
                          tech.certificationLevel === 'senior' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {tech.certificationLevel}
                        </Badge>
                      </td>
                      <td className="text-center py-3 font-medium">
                        {tech.totalRepairs}
                      </td>
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-sm">
                            {tech.avgRating > 0 ? tech.avgRating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <span className={`text-sm ${
                          tech.currentWorkload > 3 ? 'text-red-600' : 
                          tech.currentWorkload > 1 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {tech.currentWorkload}/5
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.dailyTrends && analytics.dailyTrends.length > 0 ? (
              analytics.dailyTrends.map((day, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium w-16">{day.date}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Requests: {day.requests}</span>
                      <span>Completed: {day.completed}</span>
                      <span>Revenue: ₹{day.revenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.dailyTrends && analytics.dailyTrends.length > 0 ? 
                            Math.max((day.requests / Math.max(...analytics.dailyTrends.map(d => d.requests || 0), 1)) * 100, 5) : 5}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {day.requests > 0 ? `${((day.completed / day.requests) * 100).toFixed(0)}%` : '0%'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No daily trend data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};