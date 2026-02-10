import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartShimmer, TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Download,
  FileText,
  PieChart,
  Activity,
  Target,
  Printer,
  FileSpreadsheet,
  Coins,
  Share2,
  Instagram,
  Star,
  TrendingDown,
  Award,
  RefreshCw,
  Eye,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Heart,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

interface AnalyticsData {
  // Sales Reports
  salesReports: {
    daily: Array<{ date: string; orders: number; revenue: number; avgOrderValue: number; cancelled: number; refunded: number }>;
    weekly: Array<{ week: string; orders: number; revenue: number; avgOrderValue: number; cancelled: number; refunded: number }>;
    monthly: Array<{ month: string; orders: number; revenue: number; avgOrderValue: number; cancelled: number; refunded: number }>;
  };
  
  // Loyalty Analytics
  loyaltyAnalytics: {
    totalCoinsIssued: number;
    totalCoinsRedeemed: number;
    coinsExpired: number;
    netOutstandingCoins: number;
    issuedVsRedeemed: Array<{ date: string; issued: number; redeemed: number }>;
    dailyTrend: Array<{ date: string; coins: number; type: 'issued' | 'redeemed' }>;
    monthlyTrend: Array<{ month: string; issued: number; redeemed: number }>;
  };
  
  // Affiliate & Instagram Marketing ROI
  affiliateROI: {
    totalAffiliateOrders: number;
    totalCommissionPaid: number;
    revenueGenerated: number;
    roiPerAffiliate: Array<{ name: string; orders: number; commission: number; revenue: number; roi: number }>;
  };
  
  instagramROI: {
    storiesPosted: number;
    storiesApproved: number;
    coinsIssued: number;
    salesInfluenced: number;
    influencerPerformance: Array<{ username: string; stories: number; approved: number; coins: number; engagement: number }>;
  };
  
  // Product Performance
  productPerformance: {
    bestPerforming: Array<{ name: string; sales: number; revenue: number; orders: number }>;
    leastPerforming: Array<{ name: string; sales: number; revenue: number; orders: number }>;
    highMargin: Array<{ name: string; margin: number; revenue: number; profit: number }>;
    coinsRedeemed: Array<{ name: string; coinsUsed: number; orders: number; revenue: number }>;
  };
  
  // General metrics
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
}

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  products: any[];
  orders: any[];
  salesInvoices: any[];
  salesReturns: any[];
  purchaseInvoices: any[];
  purchaseReturns: any[];
  payments: any[];
  expenses: any[];
  leads: any[];
  topProducts: any[];
  topCustomers: any[];
  salesByDay: any[];
  paymentMethods: any[];
  orderStatus: any[];
  // New analytics data
  analyticsData?: AnalyticsData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function AdvancedReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [reportCategory, setReportCategory] = useState('analytics');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    generateReport();
  }, [reportType]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (reportType) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return null;
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      if (!dateRange) {
        toast.error('Please select valid date range for custom reports');
        return;
      }

      const { startDate, endDate } = dateRange;

      // Validate date range
      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }

      // Check if date range is too large (more than 1 year)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        toast.error('Date range cannot exceed 1 year');
        return;
      }

      await fetchReportData(startDate, endDate);

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateReportWithMessage = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      if (!dateRange) {
        toast.error('Please select valid date range for custom reports');
        return;
      }

      const { startDate, endDate } = dateRange;

      // Validate date range
      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }

      // Check if date range is too large (more than 1 year)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        toast.error('Date range cannot exceed 1 year');
        return;
      }

      toast.info(`Generating ${reportType} report for ${daysDiff} days...`);

      await fetchReportData(startDate, endDate);

      toast.success('Report generated successfully!');

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const fetchReportData = async (startDate: Date, endDate: Date) => {
    // Fetch basic data that exists in schema
    const [ordersResult, customersResult, productsResult] = await Promise.allSettled([
      supabase
        .from('orders')
        .select(`
          *,
          customers(name, phone),
          order_items(
            product_name,
            quantity,
            unit_price,
            line_total
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      supabase
        .from('customers')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      supabase
        .from('products')
        .select('*')
    ]);

    // Process results
    const orders = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
    const customers = customersResult.status === 'fulfilled' ? customersResult.value.data || [] : [];
    const products = productsResult.status === 'fulfilled' ? productsResult.value.data || [] : [];

    // Try to fetch additional analytics data (may not exist)
    let loyaltyCoins: any[] = [];
    let affiliateOrders: any[] = [];
    let instagramStories: any[] = [];
    let loyaltyProductSettings: any[] = [];

    try {
      // Try loyalty_coins_wallet first (actual table name), fallback to loyalty_coins
      const loyaltyResult = await (supabase as any).from('loyalty_coins_wallet').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      if (loyaltyResult.error) {
        // If loyalty_coins_wallet doesn't work, try loyalty_coins
        const fallbackResult = await (supabase as any).from('loyalty_coins').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        loyaltyCoins = fallbackResult.data || [];
      } else {
        loyaltyCoins = loyaltyResult.data || [];
      }
    } catch (error) {
      // Silently handle - table may not exist
    }

    try {
      const affiliateResult = await (supabase as any).from('affiliate_orders').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      if (affiliateResult.error && affiliateResult.error.code !== 'PGRST116') {
        console.warn('Affiliate orders data error:', affiliateResult.error);
      }
      affiliateOrders = affiliateResult.data || [];
    } catch (error) {
      // Silently handle - table may not exist
    }

    try {
      const instagramResult = await (supabase as any).from('instagram_stories').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      if (instagramResult.error && instagramResult.error.code !== 'PGRST116') {
        console.warn('Instagram stories data error:', instagramResult.error);
      }
      instagramStories = instagramResult.data || [];
    } catch (error) {
      // Silently handle - table may not exist
    }

    try {
      const loyaltySettingsResult = await (supabase as any).from('loyalty_product_settings').select('*');
      if (loyaltySettingsResult.error && loyaltySettingsResult.error.code !== 'PGRST116') {
        console.warn('Loyalty product settings data error:', loyaltySettingsResult.error);
      }
      loyaltyProductSettings = loyaltySettingsResult.data || [];
    } catch (error) {
      // Silently handle - table may not exist
    }

    // Process all data including analytics
    const processedData = processAllReportData(
      orders,
      customers,
      products,
      [], // salesReturns
      [], // purchaseInvoices
      [], // purchaseReturns
      [], // payments
      [], // expenses
      [], // leads
      loyaltyCoins,
      affiliateOrders,
      instagramStories,
      loyaltyProductSettings,
      startDate,
      endDate
    );

    setReportData(processedData);
  };
  const processAllReportData = (
    orders: any[],
    customers: any[],
    products: any[],
    salesReturns: any[],
    purchaseInvoices: any[],
    purchaseReturns: any[],
    payments: any[],
    expenses: any[],
    leads: any[],
    loyaltyCoins: any[],
    affiliateOrders: any[],
    instagramStories: any[],
    loyaltyProductSettings: any[],
    startDate: Date,
    endDate: Date
  ): ReportData => {
    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const totalProducts = products.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Process legacy data for backward compatibility
    const legacyData = processReportData(orders, customers, products);

    // Process comprehensive analytics data
    const analyticsData = processAnalyticsData(
      orders,
      loyaltyCoins,
      affiliateOrders,
      instagramStories,
      products,
      loyaltyProductSettings,
      startDate,
      endDate
    );

    return {
      totalSales,
      totalOrders,
      totalCustomers,
      totalProducts,
      averageOrderValue,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock_quantity: product.stock_quantity,
        category: product.category_id,
        is_visible: product.is_visible,
        created_at: product.created_at
      })),
      orders: orders.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number,
        customer_name: order.customers?.name || order.customer_name,
        total_amount: order.total_amount,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        created_at: order.created_at
      })),
      salesInvoices: [],
      salesReturns: [],
      purchaseInvoices: [],
      purchaseReturns: [],
      payments: [],
      expenses: [],
      leads: [],
      // Legacy data for backward compatibility
      topProducts: legacyData.topProducts,
      topCustomers: legacyData.topCustomers,
      salesByDay: legacyData.salesByDay,
      paymentMethods: legacyData.paymentMethods,
      orderStatus: legacyData.orderStatus,
      // New comprehensive analytics
      analyticsData
    };
  };
  const processAnalyticsData = (
    orders: any[],
    loyaltyCoins: any[],
    affiliateOrders: any[],
    instagramStories: any[],
    products: any[],
    loyaltyProductSettings: any[],
    startDate: Date,
    endDate: Date
  ): AnalyticsData => {
    // Sales Reports Processing
    const salesReports = {
      daily: processDailySalesData(orders),
      weekly: processWeeklySalesData(orders),
      monthly: processMonthlySalesData(orders)
    };

    // Loyalty Analytics Processing
    const totalCoinsIssued = loyaltyCoins
      .filter(coin => coin.transaction_type === 'earned')
      .reduce((sum, coin) => sum + (coin.coins_amount || 0), 0);
    
    const totalCoinsRedeemed = loyaltyCoins
      .filter(coin => coin.transaction_type === 'redeemed')
      .reduce((sum, coin) => sum + (coin.coins_amount || 0), 0);

    const coinsExpired = loyaltyCoins
      .filter(coin => coin.transaction_type === 'expired')
      .reduce((sum, coin) => sum + (coin.coins_amount || 0), 0);

    const netOutstandingCoins = totalCoinsIssued - totalCoinsRedeemed - coinsExpired;

    const loyaltyAnalytics = {
      totalCoinsIssued,
      totalCoinsRedeemed,
      coinsExpired,
      netOutstandingCoins,
      issuedVsRedeemed: processLoyaltyTrendData(loyaltyCoins),
      dailyTrend: processLoyaltyDailyTrend(loyaltyCoins),
      monthlyTrend: processLoyaltyMonthlyTrend(loyaltyCoins)
    };

    // Affiliate ROI Processing
    const totalAffiliateOrders = affiliateOrders.length;
    const totalCommissionPaid = affiliateOrders.reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    const revenueGenerated = affiliateOrders.reduce((sum, order) => sum + (order.order_amount || 0), 0);
    
    const affiliateROI = {
      totalAffiliateOrders,
      totalCommissionPaid,
      revenueGenerated,
      roiPerAffiliate: processAffiliateROIData(affiliateOrders)
    };

    // Instagram ROI Processing
    const storiesPosted = instagramStories.length;
    const storiesApproved = instagramStories.filter(story => story.status === 'approved').length;
    const coinsIssued = instagramStories
      .filter(story => story.coins_assigned && story.coins_assigned > 0)
      .reduce((sum, story) => sum + (story.coins_assigned || 0), 0);
    
    const instagramROI = {
      storiesPosted,
      storiesApproved,
      coinsIssued,
      salesInfluenced: 0, // Manual attribution - would need additional tracking
      influencerPerformance: processInfluencerPerformanceData(instagramStories)
    };

    // Product Performance Processing
    const productPerformance = {
      bestPerforming: processBestPerformingProducts(orders, products),
      leastPerforming: processLeastPerformingProducts(orders, products),
      highMargin: processHighMarginProducts(products),
      coinsRedeemed: processCoinsRedeemedProducts(loyaltyCoins, loyaltyProductSettings)
    };

    return {
      salesReports,
      loyaltyAnalytics,
      affiliateROI,
      instagramROI,
      productPerformance,
      totalSales: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      totalOrders: orders.length,
      totalCustomers: new Set(orders.map(order => order.customer_id || order.customer_name)).size,
      totalProducts: products.length,
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length : 0
    };
  };
  // Helper functions for analytics processing
  const processDailySalesData = (orders: any[]) => {
    const dailyData: { [key: string]: { orders: number; revenue: number; cancelled: number; refunded: number } } = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { orders: 0, revenue: 0, cancelled: 0, refunded: 0 };
      }
      
      dailyData[date].orders += 1;
      dailyData[date].revenue += order.total_amount || 0;
      
      if (order.status === 'cancelled') dailyData[date].cancelled += 1;
      if (order.status === 'refunded') dailyData[date].refunded += 1;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        ...data,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const processWeeklySalesData = (orders: any[]) => {
    const weeklyData: { [key: string]: { orders: number; revenue: number; cancelled: number; refunded: number } } = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { orders: 0, revenue: 0, cancelled: 0, refunded: 0 };
      }
      
      weeklyData[weekKey].orders += 1;
      weeklyData[weekKey].revenue += order.total_amount || 0;
      
      if (order.status === 'cancelled') weeklyData[weekKey].cancelled += 1;
      if (order.status === 'refunded') weeklyData[weekKey].refunded += 1;
    });

    return Object.entries(weeklyData)
      .map(([week, data]) => ({
        week,
        ...data,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  };

  const processMonthlySalesData = (orders: any[]) => {
    const monthlyData: { [key: string]: { orders: number; revenue: number; cancelled: number; refunded: number } } = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { orders: 0, revenue: 0, cancelled: 0, refunded: 0 };
      }
      
      monthlyData[monthKey].orders += 1;
      monthlyData[monthKey].revenue += order.total_amount || 0;
      
      if (order.status === 'cancelled') monthlyData[monthKey].cancelled += 1;
      if (order.status === 'refunded') monthlyData[monthKey].refunded += 1;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };
  const processLoyaltyTrendData = (loyaltyCoins: any[]) => {
    const trendData: { [key: string]: { issued: number; redeemed: number } } = {};
    
    loyaltyCoins.forEach(coin => {
      const date = new Date(coin.created_at).toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = { issued: 0, redeemed: 0 };
      }
      
      if (coin.transaction_type === 'earned') {
        trendData[date].issued += coin.coins_amount || 0;
      } else if (coin.transaction_type === 'redeemed') {
        trendData[date].redeemed += coin.coins_amount || 0;
      }
    });

    return Object.entries(trendData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const processLoyaltyDailyTrend = (loyaltyCoins: any[]) => {
    return loyaltyCoins.map(coin => ({
      date: new Date(coin.created_at).toISOString().split('T')[0],
      coins: coin.coins_amount || 0,
      type: coin.transaction_type === 'earned' ? 'issued' as const : 'redeemed' as const
    }));
  };

  const processLoyaltyMonthlyTrend = (loyaltyCoins: any[]) => {
    const monthlyData: { [key: string]: { issued: number; redeemed: number } } = {};
    
    loyaltyCoins.forEach(coin => {
      const date = new Date(coin.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { issued: 0, redeemed: 0 };
      }
      
      if (coin.transaction_type === 'earned') {
        monthlyData[monthKey].issued += coin.coins_amount || 0;
      } else if (coin.transaction_type === 'redeemed') {
        monthlyData[monthKey].redeemed += coin.coins_amount || 0;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const processAffiliateROIData = (affiliateOrders: any[]) => {
    const affiliateData: { [key: string]: { orders: number; commission: number; revenue: number } } = {};
    
    affiliateOrders.forEach(order => {
      const affiliateName = order.affiliate_users?.username || order.affiliate_users?.email || 'Unknown';
      if (!affiliateData[affiliateName]) {
        affiliateData[affiliateName] = { orders: 0, commission: 0, revenue: 0 };
      }
      
      affiliateData[affiliateName].orders += 1;
      affiliateData[affiliateName].commission += order.commission_amount || 0;
      affiliateData[affiliateName].revenue += order.order_amount || 0;
    });

    return Object.entries(affiliateData)
      .map(([name, data]) => ({
        name,
        ...data,
        roi: data.commission > 0 ? ((data.revenue - data.commission) / data.commission) * 100 : 0
      }))
      .sort((a, b) => b.roi - a.roi);
  };
  const processInfluencerPerformanceData = (instagramStories: any[]) => {
    const influencerData: { [key: string]: { stories: number; approved: number; coins: number } } = {};
    
    instagramStories.forEach(story => {
      const username = story.instagram_users?.username || 'Unknown';
      if (!influencerData[username]) {
        influencerData[username] = { stories: 0, approved: 0, coins: 0 };
      }
      
      influencerData[username].stories += 1;
      if (story.status === 'approved') {
        influencerData[username].approved += 1;
      }
      if (story.coins_assigned) {
        influencerData[username].coins += story.coins_assigned;
      }
    });

    return Object.entries(influencerData)
      .map(([username, data]) => ({
        username,
        ...data,
        engagement: data.stories > 0 ? (data.approved / data.stories) * 100 : 0
      }))
      .sort((a, b) => b.engagement - a.engagement);
  };

  const processBestPerformingProducts = (orders: any[], products: any[]) => {
    const productSales: { [key: string]: { sales: number; revenue: number; orders: number } } = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { sales: 0, revenue: 0, orders: 0 };
        }
        productSales[item.product_name].sales += item.quantity || 0;
        productSales[item.product_name].revenue += item.line_total || 0;
        productSales[item.product_name].orders += 1;
      });
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const processLeastPerformingProducts = (orders: any[], products: any[]) => {
    const productSales: { [key: string]: { sales: number; revenue: number; orders: number } } = {};
    
    // Initialize all products with zero sales
    products.forEach(product => {
      productSales[product.name] = { sales: 0, revenue: 0, orders: 0 };
    });
    
    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (productSales[item.product_name]) {
          productSales[item.product_name].sales += item.quantity || 0;
          productSales[item.product_name].revenue += item.line_total || 0;
          productSales[item.product_name].orders += 1;
        }
      });
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.revenue - b.revenue)
      .slice(0, 10);
  };

  const processHighMarginProducts = (products: any[]) => {
    return products
      .filter(product => product.price && product.cost_price)
      .map(product => {
        const margin = ((product.price - product.cost_price) / product.price) * 100;
        const profit = product.price - product.cost_price;
        return {
          name: product.name,
          margin,
          revenue: product.price,
          profit
        };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  };

  const processCoinsRedeemedProducts = (loyaltyCoins: any[], loyaltyProductSettings: any[]) => {
    const productCoins: { [key: string]: { coinsUsed: number; orders: number; revenue: number } } = {};
    
    loyaltyCoins
      .filter(coin => coin.transaction_type === 'redeemed' && coin.product_name)
      .forEach(coin => {
        if (!productCoins[coin.product_name]) {
          productCoins[coin.product_name] = { coinsUsed: 0, orders: 0, revenue: 0 };
        }
        productCoins[coin.product_name].coinsUsed += coin.coins_amount || 0;
        productCoins[coin.product_name].orders += 1;
        // Estimate revenue based on coin value (assuming 1 coin = ₹1)
        productCoins[coin.product_name].revenue += coin.coins_amount || 0;
      });

    return Object.entries(productCoins)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.coinsUsed - a.coinsUsed)
      .slice(0, 10);
  };
  const processReportData = (orders: any[], customers: any[], products: any[]) => {
    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Top products
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productSales[item.product_name].quantity += item.quantity;
        productSales[item.product_name].revenue += item.line_total;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top customers
    const customerSales: { [key: string]: { orders: number; totalSpent: number } } = {};
    orders.forEach(order => {
      const customerName = order.customers?.name || order.customer_name || 'Walk-in Customer';
      if (!customerSales[customerName]) {
        customerSales[customerName] = { orders: 0, totalSpent: 0 };
      }
      customerSales[customerName].orders += 1;
      customerSales[customerName].totalSpent += order.total_amount || 0;
    });

    const topCustomers = Object.entries(customerSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Sales by day
    const salesByDay: { [key: string]: { sales: number; orders: number } } = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!salesByDay[date]) {
        salesByDay[date] = { sales: 0, orders: 0 };
      }
      salesByDay[date].sales += order.total_amount || 0;
      salesByDay[date].orders += 1;
    });

    const salesByDayArray = Object.entries(salesByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Payment methods
    const paymentMethodStats: { [key: string]: { count: number; amount: number } } = {};
    orders.forEach(order => {
      const method = order.payment_method || 'cash';
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { count: 0, amount: 0 };
      }
      paymentMethodStats[method].count += 1;
      paymentMethodStats[method].amount += order.total_amount || 0;
    });

    const paymentMethods = Object.entries(paymentMethodStats)
      .map(([method, data]) => ({ method, ...data }));

    // Order status
    const orderStatusStats: { [key: string]: number } = {};
    orders.forEach(order => {
      const status = order.status || 'pending';
      orderStatusStats[status] = (orderStatusStats[status] || 0) + 1;
    });

    const orderStatus = Object.entries(orderStatusStats)
      .map(([status, count]) => ({ status, count }));

    return {
      topProducts,
      topCustomers,
      salesByDay: salesByDayArray,
      paymentMethods,
      orderStatus
    };
  };
  const exportToExcel = () => {
    if (!reportData) return;

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Executive Summary Sheet
      const summaryData = [{
        'Report Category': reportCategory.charAt(0).toUpperCase() + reportCategory.slice(1),
        'Report Period': reportType.charAt(0).toUpperCase() + reportType.slice(1),
        'Date Range': reportType === 'custom' ? `${customStartDate} to ${customEndDate}` : reportType,
        'Total Sales (₹)': reportData.totalSales,
        'Total Orders': reportData.totalOrders,
        'New Customers': reportData.totalCustomers,
        'Total Products': reportData.totalProducts,
        'Average Order Value (₹)': Math.round(reportData.averageOrderValue),
        'Generated At': new Date().toLocaleString()
      }];

      const summarySheet = XLSX.utils.json_to_sheet( summaryData);
      summarySheet['!cols'] = [{ width: 25 }, { width: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      // Analytics Data Sheet
      if (reportData.analyticsData) {
        const analyticsData = [{
          'Total Coins Issued': reportData.analyticsData.loyaltyAnalytics.totalCoinsIssued,
          'Total Coins Redeemed': reportData.analyticsData.loyaltyAnalytics.totalCoinsRedeemed,
          'Coins Expired': reportData.analyticsData.loyaltyAnalytics.coinsExpired,
          'Net Outstanding Coins': reportData.analyticsData.loyaltyAnalytics.netOutstandingCoins,
          'Affiliate Orders': reportData.analyticsData.affiliateROI.totalAffiliateOrders,
          'Affiliate Revenue': reportData.analyticsData.affiliateROI.revenueGenerated,
          'Commission Paid': reportData.analyticsData.affiliateROI.totalCommissionPaid,
          'Instagram Stories Posted': reportData.analyticsData.instagramROI.storiesPosted,
          'Instagram Stories Approved': reportData.analyticsData.instagramROI.storiesApproved,
          'Instagram Coins Issued': reportData.analyticsData.instagramROI.coinsIssued
        }];

        const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData);
        XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics Summary');
      }

      // Generate filename with timestamp
      const dateRange = reportType === 'custom' 
        ? `${customStartDate}_to_${customEndDate}` 
        : reportType;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `Analytics_Report_${dateRange}_${timestamp}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);

      toast.success(`Excel report downloaded successfully! File: ${filename}`);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file. Please try again.');
    }
  };

  const exportReport = () => {
    if (!reportData) {
      toast.error('No report data available to export');
      return;
    }

    exportToExcel();
  };
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-11 sm:h-10 md:h-11 flex-1 sm:flex-none sm:w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
          </div>
        </div>

        {/* Report Controls Shimmer */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
                  <div className="h-11 sm:h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards Shimmer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Charts Shimmer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <ChartShimmer />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <ChartShimmer />
            </CardContent>
          </Card>
        </div>

        {/* Tables Shimmer */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <TableShimmer rows={8} columns={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Advanced Analytics Dashboard
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={exportReport} 
            disabled={!reportData}
            className="flex-1 sm:flex-none h-11 sm:h-10 md:h-11 touch-manipulation"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
      {/* Report Controls */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <Label className="mb-1.5 block text-sm">Report Category</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytics">Analytics Dashboard</SelectItem>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-1.5 block text-sm">Report Period</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Last 7 Days</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'custom' && (
              <>
                <div>
                  <Label className="mb-1.5 block text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </>
            )}

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button 
                onClick={generateReportWithMessage} 
                className="w-full h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Generate</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {reportData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  ₹{reportData.totalSales.toLocaleString()}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue generated</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {reportData.totalOrders}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Orders processed</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">New Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {reportData.totalCustomers}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Customer acquisitions</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg Order Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  ₹{reportData.averageOrderValue.toFixed(0)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Per order average</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">
                  {reportData.totalProducts}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total products</p>
              </CardContent>
            </Card>
          </div>
          {/* Comprehensive Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1">
              <TabsTrigger 
                value="sales" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 h-16 sm:h-10 text-xs sm:text-sm touch-manipulation"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Sales Reports</span>
                <span className="sm:hidden">Sales</span>
              </TabsTrigger>
              <TabsTrigger 
                value="loyalty" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 h-16 sm:h-10 text-xs sm:text-sm touch-manipulation"
              >
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Loyalty Analytics</span>
                <span className="sm:hidden">Loyalty</span>
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 h-16 sm:h-10 text-xs sm:text-sm touch-manipulation"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Marketing ROI</span>
                <span className="sm:hidden">Marketing</span>
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 h-16 sm:h-10 text-xs sm:text-sm touch-manipulation"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Product Performance</span>
                <span className="sm:hidden">Products</span>
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 h-16 sm:h-10 text-xs sm:text-sm touch-manipulation"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Business Insights</span>
                <span className="sm:hidden">Insights</span>
              </TabsTrigger>
            </TabsList>

            {/* Sales Reports Tab */}
            <TabsContent value="sales" className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {/* Daily Sales Trend */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      Daily Sales Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    {reportData.analyticsData?.salesReports.daily.length ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <LineChart data={reportData.analyticsData.salesReports.daily}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₹)" />
                            <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : ( 
                      <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                        No sales data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Sales Summary */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                      Monthly Sales Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    {reportData.analyticsData?.salesReports.monthly.length ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <BarChart data={reportData.analyticsData.salesReports.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="revenue" fill="#8884d8" name="Revenue (₹)" />
                            <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                        No monthly data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sales Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled Orders</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                          {reportData.analyticsData?.salesReports.daily.reduce((sum, day) => sum + day.cancelled, 0) || 0}
                        </p>
                      </div>
                      <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Refunded Orders</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {reportData.analyticsData?.salesReports.daily.reduce((sum, day) => sum + day.refunded, 0) || 0}
                        </p>
                      </div>
                      <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {reportData.totalOrders > 0 
                            ? ((reportData.totalOrders - (reportData.analyticsData?.salesReports.daily.reduce((sum, day) => sum + day.cancelled + day.refunded, 0) || 0)) / reportData.totalOrders * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Avg Daily Revenue</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ₹{reportData.analyticsData?.salesReports.daily.length 
                            ? (reportData.analyticsData.salesReports.daily.reduce((sum, day) => sum + day.revenue, 0) / reportData.analyticsData.salesReports.daily.length).toFixed(0)
                            : 0}
                        </p>
                      </div>
                      <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* Loyalty Analytics Tab */}
            <TabsContent value="loyalty" className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Coins Issued</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {reportData.analyticsData?.loyaltyAnalytics.totalCoinsIssued.toLocaleString() || 0}
                        </p>
                      </div>
                      <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Coins Redeemed</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {reportData.analyticsData?.loyaltyAnalytics.totalCoinsRedeemed.toLocaleString() || 0}
                        </p>
                      </div>
                      <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Coins Expired</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                          {reportData.analyticsData?.loyaltyAnalytics.coinsExpired.toLocaleString() || 0}
                        </p>
                      </div>
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Net Outstanding</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {reportData.analyticsData?.loyaltyAnalytics.netOutstandingCoins.toLocaleString() || 0}
                        </p>
                      </div>
                      <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {/* Issued vs Redeemed Trend */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      Issued vs Redeemed Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    {reportData.analyticsData?.loyaltyAnalytics.issuedVsRedeemed.length ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <AreaChart data={reportData.analyticsData.loyaltyAnalytics.issuedVsRedeemed}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="issued" stackId="1" stroke="#8884d8" fill="#8884d8" name="Issued" />
                            <Area type="monotone" dataKey="redeemed" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Redeemed" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                        No loyalty data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Loyalty Trend */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                      Monthly Loyalty Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    {reportData.analyticsData?.loyaltyAnalytics.monthlyTrend.length ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <ComposedChart data={reportData.analyticsData.loyaltyAnalytics.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="issued" fill="#8884d8" name="Issued" />
                            <Line type="monotone" dataKey="redeemed" stroke="#ff7300" name="Redeemed" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                        No monthly loyalty data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* Marketing ROI Tab */}
            <TabsContent value="marketing" className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {/* Affiliate Marketing ROI */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      Affiliate Marketing ROI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {reportData.analyticsData?.affiliateROI.totalAffiliateOrders || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Revenue Generated</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                          ₹{reportData.analyticsData?.affiliateROI.revenueGenerated.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Commission Paid</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400 truncate">
                          ₹{reportData.analyticsData?.affiliateROI.totalCommissionPaid.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">
                          ₹{((reportData.analyticsData?.affiliateROI.revenueGenerated || 0) - (reportData.analyticsData?.affiliateROI.totalCommissionPaid || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Top Affiliates */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm sm:text-base">Top Performing Affiliates</h4>
                      {reportData.analyticsData?.affiliateROI.roiPerAffiliate.slice(0, 5).map((affiliate, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="font-medium text-sm truncate flex-1">{affiliate.name}</span>
                          <div className="text-right ml-2">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{affiliate.orders} orders</p>
                            <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">ROI: {affiliate.roi.toFixed(1)}%</p>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No affiliate data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Instagram Marketing ROI */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
                      Instagram Marketing ROI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-pink-50 dark:bg-pink-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Stories Posted</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-pink-600 dark:text-pink-400">
                          {reportData.analyticsData?.instagramROI.storiesPosted || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Stories Approved</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                          {reportData.analyticsData?.instagramROI.storiesApproved || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Coins Issued</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate">
                          {reportData.analyticsData?.instagramROI.coinsIssued.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approval Rate</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {reportData.analyticsData?.instagramROI.storiesPosted 
                            ? ((reportData.analyticsData.instagramROI.storiesApproved / reportData.analyticsData.instagramROI.storiesPosted) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Top Influencers */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm sm:text-base">Top Performing Influencers</h4>
                      {reportData.analyticsData?.instagramROI.influencerPerformance.slice(0, 5).map((influencer, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="font-medium text-sm truncate flex-1">@{influencer.username}</span>
                          <div className="text-right ml-2">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{influencer.stories} stories</p>
                            <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">{influencer.engagement.toFixed(1)}% approval</p>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No influencer data available</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* Product Performance Tab */}
            <TabsContent value="products" className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {/* Best Performing Products */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-800 dark:text-green-400">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      Best Performing Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {reportData.analyticsData?.productPerformance.bestPerforming.slice(0, 8).map((product, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{product.orders} orders • {product.sales} units sold</p>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base">₹{product.revenue.toLocaleString()}</p>
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No product performance data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Least Performing Products */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-red-800 dark:text-red-400">
                      <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      Least Performing Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {reportData.analyticsData?.productPerformance.leastPerforming.slice(0, 8).map((product, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{product.orders} orders • {product.sales} units sold</p>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="font-bold text-red-600 dark:text-red-400 text-sm sm:text-base">₹{product.revenue.toLocaleString()}</p>
                            <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
                              Needs Attention
                            </Badge>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No product performance data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* High Margin Products */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-yellow-800 dark:text-yellow-400">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                      High Margin Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {reportData.analyticsData?.productPerformance.highMargin.slice(0, 8).map((product, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Profit: ₹{product.profit.toLocaleString()}</p>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="font-bold text-yellow-600 dark:text-yellow-400 text-sm sm:text-base">{product.margin.toFixed(1)}%</p>
                            <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs">
                              High Margin
                            </Badge>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No margin data available (requires cost price)</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Products Redeemed via Coins */}
                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-purple-800 dark:text-purple-400">
                      <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                      Products Redeemed via Coins
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {reportData.analyticsData?.productPerformance.coinsRedeemed.slice(0, 8).map((product, index) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{product.orders} redemptions</p>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="font-bold text-purple-600 dark:text-purple-400 text-sm sm:text-base">{product.coinsUsed.toLocaleString()} coins</p>
                            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs">
                              Popular Reward
                            </Badge>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 dark:text-gray-400 text-sm">No coin redemption data available</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* Business Insights Tab */}
            <TabsContent value="insights" className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {/* What's Working */}
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="bg-green-50 dark:bg-green-950 p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200 text-base sm:text-lg">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      What's Working
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2">
                      {reportData.analyticsData?.productPerformance.bestPerforming.slice(0, 3).map((product, index) => (
                        <div key={index} className="p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="font-medium text-green-800 dark:text-green-200 text-sm truncate">{product.name}</p>
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">₹{product.revenue.toLocaleString()} revenue</p>
                        </div>
                      ))}
                    </div>
                    
                    {reportData.analyticsData?.affiliateROI.roiPerAffiliate.length > 0 && (
                      <div className="border-t pt-2 sm:pt-3">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-2 text-sm">Top Affiliate</p>
                        <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="font-medium text-sm truncate">{reportData.analyticsData.affiliateROI.roiPerAffiliate[0]?.name}</p>
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">ROI: {reportData.analyticsData.affiliateROI.roiPerAffiliate[0]?.roi.toFixed(1)}%</p>
                        </div>
                      </div>
                    )}

                    {reportData.analyticsData?.instagramROI.influencerPerformance.length > 0 && (
                      <div className="border-t pt-2 sm:pt-3">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-2 text-sm">Top Influencer</p>
                        <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="font-medium text-sm truncate">@{reportData.analyticsData.instagramROI.influencerPerformance[0]?.username}</p>
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">{reportData.analyticsData.instagramROI.influencerPerformance[0]?.engagement.toFixed(1)}% approval rate</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* What to Stop */}
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader className="bg-red-50 dark:bg-red-950 p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 text-base sm:text-lg">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      What to Stop
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2">
                      {reportData.analyticsData?.productPerformance.leastPerforming.slice(0, 3).map((product, index) => (
                        <div key={index} className="p-2 bg-red-50 dark:bg-red-950 rounded">
                          <p className="font-medium text-red-800 dark:text-red-200 text-sm truncate">{product.name}</p>
                          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">Only ₹{product.revenue.toLocaleString()} revenue</p>
                        </div>
                      ))}
                    </div>

                    {reportData.analyticsData?.affiliateROI.roiPerAffiliate.length > 0 && (
                      <div className="border-t pt-2 sm:pt-3">
                        <p className="font-medium text-red-800 dark:text-red-200 mb-2 text-sm">Low ROI Affiliates</p>
                        {reportData.analyticsData.affiliateROI.roiPerAffiliate
                          .filter(affiliate => affiliate.roi < 50)
                          .slice(0, 2)
                          .map((affiliate, index) => (
                            <div key={index} className="p-2 bg-red-50 dark:bg-red-950 rounded mb-1">
                              <p className="font-medium text-sm truncate">{affiliate.name}</p>
                              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">ROI: {affiliate.roi.toFixed(1)}%</p>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="border-t pt-2 sm:pt-3">
                      <p className="font-medium text-red-800 dark:text-red-200 mb-2 text-sm">High Cancellation Rate</p>
                      <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                          {reportData.analyticsData?.salesReports.daily.reduce((sum, day) => sum + day.cancelled, 0) || 0} cancelled orders
                        </p>
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                          Review order fulfillment process
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Where to Invest */}
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 md:p-5 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-base sm:text-lg">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                      Where to Invest
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                        <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Loyalty Program</p>
                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                          {reportData.analyticsData?.loyaltyAnalytics.netOutstandingCoins.toLocaleString() || 0} coins outstanding
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-500">High engagement potential</p>
                      </div>

                      {reportData.analyticsData?.productPerformance.highMargin.length > 0 && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                          <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">High Margin Products</p>
                          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 truncate">
                            {reportData.analyticsData.productPerformance.highMargin[0]?.name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-blue-500">
                            {reportData.analyticsData.productPerformance.highMargin[0]?.margin.toFixed(1)}% margin
                          </p>
                        </div>
                      )}

                      {reportData.analyticsData?.instagramROI.storiesApproved > 0 && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                          <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Instagram Marketing</p>
                          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                            {((reportData.analyticsData.instagramROI.storiesApproved / reportData.analyticsData.instagramROI.storiesPosted) * 100).toFixed(1)}% approval rate
                          </p>
                          <p className="text-[10px] sm:text-xs text-blue-500">Scale successful campaigns</p>
                        </div>
                      )}

                      <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                        <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Customer Retention</p>
                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                          ₹{reportData.averageOrderValue.toFixed(0)} avg order value
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-500">Focus on repeat customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Recommendations */}
              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Key Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base">Immediate Actions</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Review underperforming products</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Consider discontinuing or repricing</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Optimize high-margin products</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Increase marketing for profitable items</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Scale successful campaigns</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Invest more in top-performing affiliates</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base">Strategic Opportunities</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-950 rounded">
                          <Heart className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Enhance loyalty program</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">High coin balance indicates engagement</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-pink-50 dark:bg-pink-950 rounded">
                          <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Expand Instagram marketing</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Good approval rates show potential</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-indigo-50 dark:bg-indigo-950 rounded">
                          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">Focus on customer retention</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Increase repeat purchase rate</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Legacy Report Summary for backward compatibility */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="text-base sm:text-lg">Report Summary</CardTitle> 
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="font-medium">Products: {reportData.products.length}</p>
                </div>
                <div>
                  <p className="font-medium">Orders: {reportData.orders.length}</p>
                </div>
                <div>
                  <p className="font-medium truncate">Total Sales: ₹{reportData.totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium truncate">Avg Order: ₹{reportData.averageOrderValue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}