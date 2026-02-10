import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
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
  ResponsiveContainer
} from 'recharts';
import { 
  MousePointer, 
  ShoppingCart, 
  TrendingUp, 
  Eye, 
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Activity,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserClickData {
  id: string;
  product_id: string;
  clicked_at: string;
  device_type?: string;
  browser?: string;
  converted_to_order: boolean;
  order_id?: string;
  products?: {
    name: string;
    price: number;
    image_url?: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function UserClickAnalytics() {
  const { user } = useAuth();
  const [clickData, setClickData] = useState<UserClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (user) {
      fetchUserClickData();
    }
  }, [user, timeRange]);

  const fetchUserClickData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's session IDs from localStorage or create a user-specific tracking
      const userSessions = JSON.parse(localStorage.getItem('user_click_sessions') || '[]');
      
      let query = supabase
        .from('affiliate_clicks')
        .select(`
          id,
          product_id,
          clicked_at,
          device_type,
          browser,
          converted_to_order,
          order_id,
          products!inner (name, price, image_url)
        `)
        .order('clicked_at', { ascending: false });

      // Filter by time range
      if (timeRange !== 'all') {
        const days = parseInt(timeRange.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('clicked_at', startDate.toISOString());
      }

      // In a real implementation, you'd filter by user ID or session
      // For now, we'll simulate user-specific data
      const { data, error } = await query.limit(100);

      if (error) throw error;
      setClickData(data || []);
    } catch (error) {
      console.error('Error fetching user click data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalClicks = clickData.length;
    const convertedClicks = clickData.filter(click => click.converted_to_order).length;
    const conversionRate = totalClicks > 0 ? (convertedClicks / totalClicks) * 100 : 0;
    
    const uniqueProducts = new Set(clickData.map(click => click.product_id)).size;
    
    // Device breakdown
    const deviceBreakdown = clickData.reduce((acc, click) => {
      const device = click.device_type || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Browser breakdown
    const browserBreakdown = clickData.reduce((acc, click) => {
      const browser = click.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily clicks for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyClicks = last7Days.map(date => {
      const dayClicks = clickData.filter(click => 
        click.clicked_at.startsWith(date)
      );
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        clicks: dayClicks.length,
        conversions: dayClicks.filter(click => click.converted_to_order).length
      };
    });

    // Top clicked products
    const productClicks = clickData.reduce((acc, click) => {
      const productName = click.products?.name || 'Unknown Product';
      if (!acc[productName]) {
        acc[productName] = { 
          name: productName, 
          clicks: 0, 
          conversions: 0,
          price: click.products?.price || 0,
          image_url: click.products?.image_url
        };
      }
      acc[productName].clicks += 1;
      if (click.converted_to_order) {
        acc[productName].conversions += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      totalClicks,
      convertedClicks,
      conversionRate,
      uniqueProducts,
      deviceBreakdown,
      browserBreakdown,
      dailyClicks,
      topProducts: Object.values(productClicks).sort((a: any, b: any) => b.clicks - a.clicks).slice(0, 5)
    };
  }, [clickData]);

  const chartConfig: ChartConfig = {
    clicks: {
      label: "Clicks",
      color: "#0088FE",
    },
    conversions: {
      label: "Purchases",
      color: "#00C49F",
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Browsing Analytics</h2>
          <p className="text-gray-600">Track your product interactions and shopping behavior</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Viewed</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueProducts} unique products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases Made</CardTitle>
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
            <CardTitle className="text-sm font-medium">Most Used Device</CardTitle>
            <Smartphone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(analytics.deviceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Primary browsing device
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Views</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.dailyClicks.length > 0 
                ? Math.round(analytics.totalClicks / analytics.dailyClicks.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Products per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>
              Your product views and purchases over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={analytics.dailyClicks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="#0088FE" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Device Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
            <CardDescription>
              How you browse our products
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Your Most Viewed Products</CardTitle>
          <CardDescription>
            Products you've shown the most interest in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topProducts.map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Eye className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">₹{product.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium">{product.clicks} views</p>
                      {product.conversions > 0 && (
                        <p className="text-xs text-green-600">{product.conversions} purchased</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {analytics.topProducts.length === 0 && (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No product views yet</p>
                <p className="text-sm text-gray-400">Start browsing to see your analytics</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Browser Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Preferences</CardTitle>
          <CardDescription>
            Which browsers you use to shop with us
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(analytics.browserBreakdown).map(([browser, count]) => (
              <div key={browser} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">{browser}</span>
                </div>
                <Badge variant="outline">{count} views</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}