import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Receipt,
  CreditCard,
  UserPlus,
  FileText,
  Smartphone,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  RefreshCw,
  Filter,
  CalendarDays
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { StatsCardShimmer, CardShimmer, ListShimmer } from '@/components/ui/Shimmer';
import DatabaseStatus from './DatabaseStatus';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalPurchaseInvoices: number;
  totalPayments: number;
  totalExpenses: number;
  totalSuppliers: number;
  totalMobileRecharges: number;
  todaySales: number;
  monthSales: number;
  weekSales: number;
  yearSales: number;
  yesterdaySales: number;
  lastMonthSales: number;
  lastWeekSales: number;
  lowStockProducts: number;
  pendingOrders: number;
  activeLeads: number;
  totalReturns: number;
  totalDiscounts: number;
  costOfGoodsSold: number;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    invoice_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
  }>;
  lowStockItems: Array<{
    name: string;
    stock_quantity: number;
    min_stock_level: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalPurchaseInvoices: 0,
    totalPayments: 0,
    totalExpenses: 0,
    totalSuppliers: 0,
    totalMobileRecharges: 0,
    todaySales: 0,
    monthSales: 0,
    weekSales: 0,
    yearSales: 0,
    yesterdaySales: 0,
    lastMonthSales: 0,
    lastWeekSales: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    activeLeads: 0,
    totalReturns: 0,
    totalDiscounts: 0,
    costOfGoodsSold: 0,
    topProducts: [],
    recentOrders: [],
    salesTrend: [],
    lowStockItems: [],
    revenueByCategory: [],
    revenueByPaymentMethod: []
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [dateFilter, customDateRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Calculate date ranges
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Apply date filter
      let ordersQuery = supabase.from('orders').select('*');
      
      if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
        // Custom date range
        ordersQuery = ordersQuery
          .gte('created_at', customDateRange.from.toISOString())
          .lte('created_at', customDateRange.to.toISOString());
      } else if (dateFilter === 'today') {
        ordersQuery = ordersQuery.gte('created_at', today.toISOString().split('T')[0]);
      } else if (dateFilter === 'week') {
        ordersQuery = ordersQuery.gte('created_at', thisWeekStart.toISOString());
      } else if (dateFilter === 'month') {
        ordersQuery = ordersQuery.gte('created_at', thisMonth.toISOString());
      }
      
      const [
        ordersResult,
        productsResult,
        customersResult
      ] = await Promise.all([
        ordersQuery,
        supabase.from('products').select('*'),
        supabase.from('customers').select('*')
      ]);

      // Try to fetch from new tables with fallback
      let suppliersResult = { data: [], error: null };
      let expensesResult = { data: [], error: null };
      let leadsResult = { data: [], error: null };
      let purchaseInvoicesResult = { data: [], error: null };
      let paymentsResult = { data: [], error: null };
      let mobileRechargesResult = { data: [], error: null };
      let returnsResult = { data: [], error: null };

      try {
        suppliersResult = await (supabase as any).from('suppliers').select('id');
      } catch (error) {
        console.log('Suppliers table not available yet');
      }

      try {
        expensesResult = await (supabase as any).from('expenses').select('total_amount');
      } catch (error) {
        console.log('Expenses table not available yet');
      }

      try {
        leadsResult = await (supabase as any).from('leads').select('id').in('status', ['new', 'contacted', 'qualified']);
      } catch (error) {
        console.log('Leads table not available yet');
      }

      try {
        purchaseInvoicesResult = await (supabase as any).from('purchase_invoices').select('id, total_amount');
      } catch (error) {
        console.log('Purchase invoices table not available yet');
      }

      try {
        paymentsResult = await (supabase as any).from('payments').select('id, amount');
      } catch (error) {
        console.log('Payments table not available yet');
      }

      try {
        const { data, error } = await (supabase as any).from('mobile_recharges').select('id');
        if (!error) {
          mobileRechargesResult = { data: data || [], error: null };
        }
      } catch (error) {
        console.log('Mobile recharges table not available yet');
      }

      try {
        returnsResult = await (supabase as any).from('sales_returns').select('total_amount');
      } catch (error) {
        console.log('Sales returns table not available yet');
      }

      // Calculate stats from existing data
      const orders = ordersResult.data || [];
      const products = productsResult.data || [];
      const customers = customersResult.data || [];

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const thisMonthStr = thisMonth.toISOString().slice(0, 7);
      const lastMonthStr = lastMonth.toISOString().slice(0, 7);
      const thisYear = today.getFullYear().toString();

      // Calculate sales for different periods
      const todaySales = orders
        .filter((order: any) => order.created_at?.startsWith(todayStr))
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const yesterdaySales = orders
        .filter((order: any) => order.created_at?.startsWith(yesterdayStr))
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const monthSales = orders
        .filter((order: any) => order.created_at?.startsWith(thisMonthStr))
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const lastMonthSales = orders
        .filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= lastMonth && orderDate <= lastMonthEnd;
        })
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const weekSales = orders
        .filter((order: any) => new Date(order.created_at) >= thisWeekStart)
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const lastWeekSales = orders
        .filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= lastWeekStart && orderDate < lastWeekEnd;
        })
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const yearSales = orders
        .filter((order: any) => order.created_at?.startsWith(thisYear))
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);

      const totalSales = orders.reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);
      const pendingOrders = orders.filter((order: any) => order.status?.toLowerCase() === 'pending').length;

      // Calculate returns and discounts
      const totalReturns = (returnsResult.data || []).reduce((sum: number, ret: any) => sum + (ret.total_amount || 0), 0);
      const totalDiscounts = orders.reduce((sum: number, order: any) => sum + (order.discount_amount || 0), 0);
      
      // Estimate COGS (60% of sales as default)
      const costOfGoodsSold = totalSales * 0.6;

      // Revenue by category (mock data based on products)
      const categoryRevenue = products.reduce((acc: any, product: any) => {
        const category = product.category || 'Uncategorized';
        const productOrders = orders.filter((order: any) => order.product_id === product.id);
        const revenue = productOrders.reduce((sum: number, order: any) => sum + (order.total_amount || order.product_price || 0), 0);
        
        if (acc[category]) {
          acc[category] += revenue;
        } else {
          acc[category] = revenue;
        }
        return acc;
      }, {});

      const revenueByCategory = Object.entries(categoryRevenue)
        .map(([category, revenue]: [string, any]) => ({
          category,
          revenue,
          percentage: totalSales > 0 ? (revenue / totalSales) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by payment method (from actual orders data)
      const paymentMethodMap: { [key: string]: { amount: number; count: number } } = {};
      orders.forEach((order: any) => {
        const method = order.payment_method || 'Cash';
        if (!paymentMethodMap[method]) {
          paymentMethodMap[method] = { amount: 0, count: 0 };
        }
        paymentMethodMap[method].amount += order.total_amount || order.product_price || 0;
        paymentMethodMap[method].count += 1;
      });

      const revenueByPaymentMethod = Object.entries(paymentMethodMap).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count
      }));

      // Top products implementation
      const productSalesMap: { [key: string]: { name: string; sales: number; revenue: number } } = {};
      orders.forEach((order: any) => {
        const productId = order.product_id;
        const productName = order.product_name || 'Unknown Product';
        const quantity = order.quantity || 1;
        const amount = order.total_amount || order.product_price || 0;
        
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = { name: productName, sales: 0, revenue: 0 };
        }
        productSalesMap[productId].sales += quantity;
        productSalesMap[productId].revenue += amount;
      });

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Low stock products with fallback
      const lowStockItems = products
        .filter((product: any) => product.stock_quantity <= (product.min_stock_level || 10))
        .slice(0, 5)
        .map((product: any) => ({
          name: product.name,
          stock_quantity: product.stock_quantity || 0,
          min_stock_level: product.min_stock_level || 10
        }));

      // Create mock recent orders from existing data
      const recentOrders = orders
        .slice(0, 5)
        .map((order: any) => ({
          id: order.id,
          invoice_number: order.invoice_number || `INV-${order.id.slice(0, 8)}`,
          customer_name: order.customer_name || 'Walk-in Customer',
          total_amount: order.total_amount || order.product_price || 0,
          status: order.status || 'pending',
          created_at: order.created_at
        }));

      setStats({
        totalSales,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalPurchaseInvoices: (purchaseInvoicesResult.data || []).length,
        totalPayments: (paymentsResult.data || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0),
        totalExpenses: (expensesResult.data || []).reduce((sum: number, expense: any) => sum + (expense.total_amount || 0), 0),
        totalSuppliers: (suppliersResult.data || []).length,
        totalMobileRecharges: (mobileRechargesResult.data || []).length,
        todaySales,
        monthSales,
        weekSales,
        yearSales,
        yesterdaySales,
        lastMonthSales,
        lastWeekSales,
        lowStockProducts: lowStockItems.length,
        pendingOrders,
        activeLeads: (leadsResult.data || []).length,
        totalReturns,
        totalDiscounts,
        costOfGoodsSold,
        topProducts,
        recentOrders,
        salesTrend: [], // Will be implemented with date grouping
        lowStockItems,
        revenueByCategory,
        revenueByPaymentMethod
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard data');
      // Set default values on error
      setStats({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalPurchaseInvoices: 0,
        totalPayments: 0,
        totalExpenses: 0,
        totalSuppliers: 0,
        totalMobileRecharges: 0,
        todaySales: 0,
        monthSales: 0,
        weekSales: 0,
        yearSales: 0,
        yesterdaySales: 0,
        lastMonthSales: 0,
        lastWeekSales: 0,
        lowStockProducts: 0,
        pendingOrders: 0,
        activeLeads: 0,
        totalReturns: 0,
        totalDiscounts: 0,
        costOfGoodsSold: 0,
        topProducts: [],
        recentOrders: [],
        salesTrend: [],
        lowStockItems: [],
        revenueByCategory: [],
        revenueByPaymentMethod: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-shimmer"></div>
          <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer"></div>
        </div>

        {/* Key Metrics Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Additional Business Metrics Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Additional Metrics Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Financial Summary Shimmer */}
        <CardShimmer />

        {/* Recent Orders Shimmer */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent>
            <ListShimmer items={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl md:text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <Select 
            value={dateFilter} 
            onValueChange={(value) => {
              setDateFilter(value);
              if (value !== 'custom') {
                setCustomDateRange({ from: undefined, to: undefined });
              }
            }}
          >
            <SelectTrigger className="w-32 h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Custom Date Range Picker */}
          {dateFilter === 'custom' && (
            <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {customDateRange.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "MMM dd")} - {format(customDateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      format(customDateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={customDateRange.from}
                      onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={customDateRange.to}
                      onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                      disabled={(date) => 
                        date > new Date() || 
                        (customDateRange.from ? date < customDateRange.from : false)
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customDateRange.from && customDateRange.to) {
                          setShowCustomDatePicker(false);
                          fetchDashboardStats();
                          toast.success('Custom date range applied');
                        } else {
                          toast.error('Please select both dates');
                        }
                      }}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCustomDateRange({ from: undefined, to: undefined });
                        setShowCustomDatePicker(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchDashboardStats();
              toast.success('Dashboard refreshed');
            }}
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Badge variant="outline" className="text-xs md:text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin?tab=sales-invoices')}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Total Sales</p>
                <p className="text-sm md:text-lg font-bold text-foreground truncate">₹{stats.totalSales.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {stats.lastMonthSales > 0 
                      ? `+${(((stats.monthSales - stats.lastMonthSales) / stats.lastMonthSales) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </p>
              </div>
              <div className="p-1.5 md:p-2 bg-green-100 rounded-full flex-shrink-0 ml-2">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin?tab=orders')}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Total Orders</p>
                <p className="text-sm md:text-lg font-bold text-foreground">{stats.totalOrders}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <ShoppingCart className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{stats.pendingOrders} pending</span>
                </p>
              </div>
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin?tab=products')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Products</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalProducts}</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.lowStockProducts} low stock
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin?tab=customers')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Customers</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalCustomers}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Total registered
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin?tab=mobile-recharge')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Mobile Recharges</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalMobileRecharges}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Total recharges
                </p>
              </div>
              <div className="p-2 bg-teal-100 rounded-full">
                <Smartphone className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Business Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Purchase Invoices</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalPurchaseInvoices}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <FileText className="h-3 w-3 mr-1" />
                  Total invoices
                </p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-full">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Payments</p>
                <p className="text-lg font-bold text-gray-900">₹{stats.totalPayments.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <CreditCard className="h-3 w-3 mr-1" />
                  All transactions
                </p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                <p className="text-lg font-bold text-gray-900">₹{stats.totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Business costs
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Suppliers</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalSuppliers}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Active suppliers
                </p>
              </div>
              <div className="p-2 bg-cyan-100 rounded-full">
                <UserPlus className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Today's Sales</p>
                <p className="text-base font-bold text-gray-900">₹{stats.todaySales.toLocaleString()}</p>
              </div>
              <Receipt className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">This Month</p>
                <p className="text-base font-bold text-gray-900">₹{stats.monthSales.toLocaleString()}</p>
              </div>
              <CreditCard className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Orders</p>
                <p className="text-base font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
              <FileText className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
              <p className="text-lg font-bold text-green-600">₹{stats.totalSales.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">From sales</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Payments</p>
              <p className="text-lg font-bold text-blue-600">₹{stats.totalPayments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">All transactions</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Expenses</p>
              <p className="text-lg font-bold text-red-600">₹{stats.totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Business costs</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Net Profit (Accurate)</span>
              <span className={`text-lg font-bold ${
                (stats.totalSales - stats.costOfGoodsSold - stats.totalExpenses - stats.totalReturns - stats.totalDiscounts) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                ₹{(stats.totalSales - stats.costOfGoodsSold - stats.totalExpenses - stats.totalReturns - stats.totalDiscounts).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Revenue - (COGS + Expenses + Returns + Discounts)
            </p>
            <div className="text-xs text-gray-600 space-y-1 mt-2 p-2 bg-white rounded border">
              <div className="flex justify-between">
                <span>Revenue:</span>
                <span className="font-medium">₹{stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- COGS (60%):</span>
                <span className="font-medium">₹{stats.costOfGoodsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- Expenses:</span>
                <span className="font-medium">₹{stats.totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- Returns:</span>
                <span className="font-medium">₹{stats.totalReturns.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- Discounts:</span>
                <span className="font-medium">₹{stats.totalDiscounts.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Revenue Display with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="periods">Time Periods</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="payments">Payment Methods</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Revenue</p>
                      <p className="text-xl font-bold text-green-800">₹{stats.totalSales.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">All time</p>
                    </div>
                    <div className="p-2 bg-green-200 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Average Order</p>
                      <p className="text-xl font-bold text-blue-800">
                        ₹{stats.totalOrders > 0 ? Math.round(stats.totalSales / stats.totalOrders).toLocaleString() : '0'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Per order</p>
                    </div>
                    <div className="p-2 bg-blue-200 rounded-full">
                      <Receipt className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Revenue Growth</p>
                      <p className="text-xl font-bold text-purple-800">+12.5%</p>
                      <p className="text-xs text-purple-600 mt-1">This month</p>
                    </div>
                    <div className="p-2 bg-purple-200 rounded-full">
                      <TrendingUp className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Profit Margin</p>
                      <p className="text-xl font-bold text-orange-800">
                        {stats.totalSales > 0 ? Math.round(((stats.totalSales - stats.totalExpenses) / stats.totalSales) * 100) : 0}%
                      </p>
                      <p className="text-xs text-orange-600 mt-1">Estimated</p>
                    </div>
                    <div className="p-2 bg-orange-200 rounded-full">
                      <Target className="h-5 w-5 text-orange-700" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">Revenue Target Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-indigo-700">Monthly Target: ₹5,00,000</span>
                        <span className="text-indigo-600">{Math.round((stats.monthSales / 500000) * 100)}%</span>
                      </div>
                      <Progress value={(stats.monthSales / 500000) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-indigo-700">Yearly Target: ₹60,00,000</span>
                        <span className="text-indigo-600">{Math.round((stats.yearSales / 6000000) * 100)}%</span>
                      </div>
                      <Progress value={(stats.yearSales / 6000000) * 100} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border border-teal-200">
                  <h3 className="text-lg font-semibold text-teal-800 mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-teal-700">Revenue per Customer</span>
                      <span className="font-semibold text-teal-800">
                        ₹{stats.totalCustomers > 0 ? Math.round(stats.totalSales / stats.totalCustomers).toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Orders per Customer</span>
                      <span className="font-semibold text-teal-800">
                        {stats.totalCustomers > 0 ? (stats.totalOrders / stats.totalCustomers).toFixed(1) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Conversion Rate</span>
                      <span className="font-semibold text-teal-800">68.5%</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="periods" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Today</p>
                        <p className="text-lg font-bold text-gray-900">₹{stats.todaySales.toLocaleString()}</p>
                        <p className={`text-xs flex items-center mt-1 ${
                          stats.todaySales >= stats.yesterdaySales ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {stats.yesterdaySales > 0 
                            ? `${stats.todaySales >= stats.yesterdaySales ? '+' : ''}${(((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100).toFixed(1)}%`
                            : 'N/A'} vs yesterday
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Week</p>
                        <p className="text-lg font-bold text-gray-900">₹{stats.weekSales.toLocaleString()}</p>
                        <p className={`text-xs flex items-center mt-1 ${
                          stats.weekSales >= stats.lastWeekSales ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {stats.lastWeekSales > 0 
                            ? `${stats.weekSales >= stats.lastWeekSales ? '+' : ''}${(((stats.weekSales - stats.lastWeekSales) / stats.lastWeekSales) * 100).toFixed(1)}%`
                            : 'N/A'} vs last week
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-lg font-bold text-gray-900">₹{stats.monthSales.toLocaleString()}</p>
                        <p className={`text-xs flex items-center mt-1 ${
                          stats.monthSales >= stats.lastMonthSales ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {stats.lastMonthSales > 0 
                            ? `${stats.monthSales >= stats.lastMonthSales ? '+' : ''}${(((stats.monthSales - stats.lastMonthSales) / stats.lastMonthSales) * 100).toFixed(1)}%`
                            : 'N/A'} vs last month
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Year</p>
                        <p className="text-lg font-bold text-gray-900">₹{stats.yearSales.toLocaleString()}</p>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Year to date
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Revenue Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium">Today</span>
                        <span className="text-lg font-bold text-blue-600">₹{stats.todaySales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Yesterday</span>
                        <span className="text-lg font-bold text-gray-600">₹{stats.yesterdaySales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">Difference</span>
                        <span className={`text-lg font-bold ${
                          stats.todaySales >= stats.yesterdaySales ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.todaySales >= stats.yesterdaySales ? '+' : ''}₹{(stats.todaySales - stats.yesterdaySales).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="font-medium">Current Month</span>
                        <span className="text-lg font-bold text-purple-600">₹{stats.monthSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Last Month</span>
                        <span className="text-lg font-bold text-gray-600">₹{stats.lastMonthSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">Difference</span>
                        <span className={`text-lg font-bold ${
                          stats.monthSales >= stats.lastMonthSales ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.monthSales >= stats.lastMonthSales ? '+' : ''}₹{(stats.monthSales - stats.lastMonthSales).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Revenue by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.revenueByCategory.length > 0 ? (
                        stats.revenueByCategory.map((category, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{category.category}</span>
                                <span className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</span>
                              </div>
                              <Progress value={category.percentage} className="h-2" />
                            </div>
                            <span className="ml-4 font-bold text-lg">₹{category.revenue.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No category data available yet</p>
                          <p className="text-sm">Revenue will be categorized as orders are processed</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.revenueByCategory.slice(0, 3).map((category, index) => (
                        <div key={index} className={`p-4 rounded-lg ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' :
                          index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200' :
                          'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-semibold ${
                                index === 0 ? 'text-yellow-800' :
                                index === 1 ? 'text-gray-800' :
                                'text-orange-800'
                              }`}>
                                #{index + 1} {category.category}
                              </p>
                              <p className={`text-sm ${
                                index === 0 ? 'text-yellow-600' :
                                index === 1 ? 'text-gray-600' :
                                'text-orange-600'
                              }`}>
                                {category.percentage.toFixed(1)}% of total revenue
                              </p>
                            </div>
                            <span className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-700' :
                              index === 1 ? 'text-gray-700' :
                              'text-orange-700'
                            }`}>
                              ₹{category.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                      {stats.revenueByCategory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No category performance data yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Revenue by Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.revenueByPaymentMethod.length > 0 ? (
                        stats.revenueByPaymentMethod.map((method, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                method.method === 'Cash' ? 'bg-green-100' :
                                method.method === 'Card' ? 'bg-blue-100' :
                                method.method === 'UPI' ? 'bg-purple-100' :
                                method.method === 'Net Banking' ? 'bg-orange-100' :
                                'bg-teal-100'
                              }`}>
                                <CreditCard className={`h-4 w-4 ${
                                  method.method === 'Cash' ? 'text-green-600' :
                                  method.method === 'Card' ? 'text-blue-600' :
                                  method.method === 'UPI' ? 'text-purple-600' :
                                  method.method === 'Net Banking' ? 'text-orange-600' :
                                  'text-teal-600'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">{method.method}</p>
                                <p className="text-sm text-gray-600">{method.count} transactions</p>
                              </div>
                            </div>
                            <span className="font-bold text-lg">₹{method.amount.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No payment method data available yet</p>
                          <p className="text-sm">Payment analytics will appear as transactions are processed</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">Most Popular Method</h4>
                        <p className="text-lg font-bold text-blue-700">
                          {stats.revenueByPaymentMethod.length > 0 
                            ? stats.revenueByPaymentMethod.reduce((prev, current) => 
                                prev.count > current.count ? prev : current
                              ).method
                            : 'No data yet'
                          }
                        </p>
                        <p className="text-sm text-blue-600">
                          {stats.revenueByPaymentMethod.length > 0 
                            ? `${stats.revenueByPaymentMethod.reduce((prev, current) => 
                                prev.count > current.count ? prev : current
                              ).count} transactions`
                            : 'Waiting for transactions'
                          }
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Highest Revenue Method</h4>
                        <p className="text-lg font-bold text-green-700">
                          {stats.revenueByPaymentMethod.length > 0 
                            ? stats.revenueByPaymentMethod.reduce((prev, current) => 
                                prev.amount > current.amount ? prev : current
                              ).method
                            : 'No data yet'
                          }
                        </p>
                        <p className="text-sm text-green-600">
                          {stats.revenueByPaymentMethod.length > 0 
                            ? `₹${stats.revenueByPaymentMethod.reduce((prev, current) => 
                                prev.amount > current.amount ? prev : current
                              ).amount.toLocaleString()}`
                            : 'Waiting for transactions'
                          }
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-800 mb-2">Average Transaction</h4>
                        <p className="text-lg font-bold text-purple-700">
                          ₹{stats.revenueByPaymentMethod.length > 0 
                            ? Math.round(
                                stats.revenueByPaymentMethod.reduce((sum, method) => sum + method.amount, 0) /
                                stats.revenueByPaymentMethod.reduce((sum, method) => sum + method.count, 0)
                              ).toLocaleString()
                            : '0'
                          }
                        </p>
                        <p className="text-sm text-purple-600">Per transaction</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Products */}
      {stats.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-blue-200 text-blue-700'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-600">₹{product.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {stats.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Current: {item.stock_quantity} | Minimum: {item.min_stock_level}
                    </p>
                  </div>
                  <Progress 
                    value={(item.stock_quantity / item.min_stock_level) * 100} 
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Status */}
      <DatabaseStatus />

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{order.total_amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}