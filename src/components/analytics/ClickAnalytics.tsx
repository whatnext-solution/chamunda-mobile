import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  MousePointer, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Users,
  ShoppingCart,
  DollarSign,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

interface ClickData {
  id: string;
  affiliate_id?: string;
  product_id: string;
  user_session_id: string;
  ip_address: string;
  user_agent: string;
  referrer_url?: string;
  clicked_at: string;
  converted_to_order: boolean;
  order_id?: string;
  device_type?: string;
  browser?: string;
  location?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  products?: {
    name: string;
    price: number;
    slug: string;
  };
  affiliates?: {
    name: string;
    affiliate_code: string;
  };
}

interface ClickAnalyticsProps {
  data: ClickData[];
  loading?: boolean;
  onRefresh?: () => void;
  showAffiliateFilter?: boolean;
  affiliateId?: string;
  title?: string;
  description?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ClickAnalytics({ 
  data, 
  loading = false, 
  onRefresh,
  showAffiliateFilter = false,
  affiliateId,
  title = "Click Analytics",
  description = "Comprehensive click tracking and analysis"
}: ClickAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [conversionFilter, setConversionFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [timeGrouping, setTimeGrouping] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(click => {
        const clickDate = new Date(click.clicked_at);
        return clickDate >= dateRange.from! && clickDate <= dateRange.to!;
      });
    }

    // Affiliate filter
    if (selectedAffiliate !== 'all') {
      filtered = filtered.filter(click => click.affiliate_id === selectedAffiliate);
    }

    // Product filter
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(click => click.product_id === selectedProduct);
    }

    // Device filter
    if (deviceFilter !== 'all') {
      filtered = filtered.filter(click => click.device_type === deviceFilter);
    }

    // Conversion filter
    if (conversionFilter !== 'all') {
      if (conversionFilter === 'converted') {
        filtered = filtered.filter(click => click.converted_to_order);
      } else if (conversionFilter === 'not_converted') {
        filtered = filtered.filter(click => !click.converted_to_order);
      }
    }

    return filtered;
  }, [data, dateRange, selectedAffiliate, selectedProduct, deviceFilter, conversionFilter]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredData.length,
    itemsPerPage: 25,
  });

  const paginatedData = filteredData.slice(
    pagination.startIndex,
    pagination.endIndex
  );

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalClicks = filteredData.length;
    const convertedClicks = filteredData.filter(click => click.converted_to_order).length;
    const conversionRate = totalClicks > 0 ? (convertedClicks / totalClicks) * 100 : 0;
    
    const uniqueUsers = new Set(filteredData.map(click => click.user_session_id)).size;
    const uniqueProducts = new Set(filteredData.map(click => click.product_id)).size;
    
    // Device breakdown
    const deviceBreakdown = filteredData.reduce((acc, click) => {
      const device = click.device_type || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top products
    const productBreakdown = filteredData.reduce((acc, click) => {
      const productName = click.products?.name || 'Unknown Product';
      if (!acc[productName]) {
        acc[productName] = { clicks: 0, conversions: 0 };
      }
      acc[productName].clicks += 1;
      if (click.converted_to_order) {
        acc[productName].conversions += 1;
      }
      return acc;
    }, {} as Record<string, { clicks: number; conversions: number }>);

    // Time series data
    const timeSeriesData = filteredData.reduce((acc, click) => {
      const date = new Date(click.clicked_at);
      let key: string;
      
      switch (timeGrouping) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!acc[key]) {
        acc[key] = { date: key, clicks: 0, conversions: 0 };
      }
      acc[key].clicks += 1;
      if (click.converted_to_order) {
        acc[key].conversions += 1;
      }
      return acc;
    }, {} as Record<string, { date: string; clicks: number; conversions: number }>);

    return {
      totalClicks,
      convertedClicks,
      conversionRate,
      uniqueUsers,
      uniqueProducts,
      deviceBreakdown,
      productBreakdown,
      timeSeriesData: Object.values(timeSeriesData).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [filteredData, timeGrouping]);

  // Get unique values for filters
  const uniqueAffiliates = useMemo(() => {
    const affiliates = data
      .filter(click => click.affiliates)
      .map(click => ({ id: click.affiliate_id!, name: click.affiliates!.name, code: click.affiliates!.affiliate_code }));
    return Array.from(new Map(affiliates.map(a => [a.id, a])).values());
  }, [data]);

  const uniqueProducts = useMemo(() => {
    const products = data
      .filter(click => click.products)
      .map(click => ({ id: click.product_id, name: click.products!.name }));
    return Array.from(new Map(products.map(p => [p.id, p])).values());
  }, [data]);

  // Chart configurations
  const chartConfig: ChartConfig = {
    clicks: {
      label: "Clicks",
      color: "#0088FE",
    },
    conversions: {
      label: "Conversions",
      color: "#00C49F",
    },
  };

  const exportData = () => {
    const csvData = filteredData.map(click => ({
      'Date': new Date(click.clicked_at).toLocaleString(),
      'Product': click.products?.name || 'Unknown',
      'Affiliate': click.affiliates?.name || 'Direct',
      'Device': click.device_type || 'Unknown',
      'Browser': click.browser || 'Unknown',
      'Location': click.location || 'Unknown',
      'Converted': click.converted_to_order ? 'Yes' : 'No',
      'Order ID': click.order_id || 'N/A',
      'UTM Source': click.utm_source || 'N/A',
      'UTM Medium': click.utm_medium || 'N/A',
      'UTM Campaign': click.utm_campaign || 'N/A'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `click-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Click analytics data exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportData} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            
            {showAffiliateFilter && (
              <div>
                <label className="text-sm font-medium mb-2 block">Affiliate</label>
                <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Affiliates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Affiliates</SelectItem>
                    {uniqueAffiliates.map(affiliate => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        {affiliate.name} ({affiliate.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Device Type</label>
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Conversion Status</label>
              <Select value={conversionFilter} onValueChange={setConversionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clicks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clicks</SelectItem>
                  <SelectItem value="converted">Converted Only</SelectItem>
                  <SelectItem value="not_converted">Not Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Chart Type</label>
              <Select value={chartType} onValueChange={(value: 'line' | 'bar' | 'area') => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Grouping</label>
              <Select value={timeGrouping} onValueChange={(value: 'hour' | 'day' | 'week' | 'month') => setTimeGrouping(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hourly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueUsers} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.convertedClicks}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Clicks</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.timeSeriesData.length > 0 
                ? Math.round(analytics.totalClicks / analytics.timeSeriesData.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Performance</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...analytics.timeSeriesData.map(d => d.clicks), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Highest daily clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Click Trends Over Time</CardTitle>
            <CardDescription>
              Clicks and conversions by {timeGrouping}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
                {chartType === 'line' && (
                  <LineChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="clicks" stroke="#0088FE" strokeWidth={2} />
                    <Line type="monotone" dataKey="conversions" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                )}
                {chartType === 'bar' && (
                  <BarChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clicks" fill="#0088FE" />
                    <Bar dataKey="conversions" fill="#00C49F" />
                  </BarChart>
                )}
                {chartType === 'area' && (
                  <AreaChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="clicks" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="conversions" stackId="1" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} />
                  </AreaChart>
                )}
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>
              Clicks by device type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
                <PieChart>
                  <Pie
                    data={Object.entries(analytics.deviceBreakdown).map(([device, count]) => ({
                      name: device,
                      value: count
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(analytics.deviceBreakdown).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products Performance</CardTitle>
          <CardDescription>
            Products with highest click-through and conversion rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.productBreakdown)
              .sort(([,a], [,b]) => b.clicks - a.clicks)
              .slice(0, 10)
              .map(([productName, stats]) => (
                <div key={productName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{productName}</p>
                    <p className="text-sm text-gray-500">
                      {stats.clicks} clicks • {stats.conversions} conversions
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(1) : 0}% CVR
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Click Data */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Click Data</CardTitle>
          <CardDescription>
            Individual click records with full details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableShimmer rows={10} columns={6} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Date & Time</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">Source</th>
                      <th className="text-left p-3">Device</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((click) => (
                      <tr key={click.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium">
                              {new Date(click.clicked_at).toLocaleDateString()}
                            </p>
                            <p className="text-gray-500">
                              {new Date(click.clicked_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium">{click.products?.name || 'Unknown Product'}</p>
                            <p className="text-gray-500">₹{click.products?.price || 0}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {click.affiliates ? (
                              <>
                                <p className="font-medium">{click.affiliates.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {click.affiliates.affiliate_code}
                                </Badge>
                              </>
                            ) : (
                              <p className="text-gray-500">Direct</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium">{click.device_type || 'Unknown'}</p>
                            <p className="text-gray-500">{click.browser || 'Unknown Browser'}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-medium">{click.location || 'Unknown'}</p>
                            <p className="text-gray-500">{click.ip_address}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={click.converted_to_order ? "default" : "secondary"}>
                            {click.converted_to_order ? 'Converted' : 'Click Only'}
                          </Badge>
                          {click.converted_to_order && click.order_id && (
                            <p className="text-xs text-green-600 mt-1">
                              Order #{click.order_id.slice(-6)}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredData.length > 0 && (
                <div className="mt-6">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredData.length}
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
                    itemsPerPageOptions={[10, 25, 50, 100]}
                  />
                </div>
              )}

              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <MousePointer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No click data found</p>
                  <p className="text-sm text-gray-400">
                    Try adjusting your filters or date range
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}