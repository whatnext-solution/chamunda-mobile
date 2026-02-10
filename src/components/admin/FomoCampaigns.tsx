import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3,
  Timer,
  ShoppingCart,
  Users,
  DollarSign,
  Target,
  Calendar,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FomoCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  countdown_duration: number;
  fomo_label: string;
  urgency_message: string;
  enable_stock_warning: boolean;
  stock_warning_threshold: number;
  stock_warning_message: string;
  allow_loyalty_coins: boolean;
  allow_coupons: boolean;
  max_quantity_per_user: number;
  total_stock_limit: number;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  created_at: string;
}

interface CampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  product_name: string;
  discount_type: string;
  discount_value: number;
  original_price: number;
  campaign_price: number;
  campaign_stock_limit: number;
  campaign_stock_sold: number;
  is_featured: boolean;
}

interface CampaignAnalytics {
  total_campaigns: number;
  active_campaigns: number;
  total_revenue: number;
  total_conversions: number;
  avg_conversion_rate: number;
  top_performing_campaign: string;
}

export const FomoCampaigns = () => {
  const [campaigns, setCampaigns] = useState<FomoCampaign[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<FomoCampaign | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    campaign_name: '',
    campaign_type: 'flash_sale',
    description: '',
    start_date: '',
    end_date: '',
    countdown_duration: 1440, // 24 hours
    fomo_label: '⚡ Flash Sale',
    urgency_message: 'Hurry! Offer ends soon',
    enable_stock_warning: true,
    stock_warning_threshold: 5,
    stock_warning_message: 'Only {count} left in stock!',
    allow_loyalty_coins: false,
    allow_coupons: false,
    max_quantity_per_user: 5,
    total_stock_limit: 100
  });

  useEffect(() => {
    loadCampaigns();
    loadProducts();
    loadAnalytics();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('fomo_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get campaign analytics
      const { data: campaignData, error: campaignError } = await supabase
        .from('fomo_campaigns')
        .select('*');

      if (campaignError) throw campaignError;

      const totalCampaigns = campaignData?.length || 0;
      const activeCampaigns = campaignData?.filter(c => c.status === 'active').length || 0;
      const totalRevenue = campaignData?.reduce((sum, c) => sum + (c.total_revenue || 0), 0) || 0;
      const totalConversions = campaignData?.reduce((sum, c) => sum + (c.total_conversions || 0), 0) || 0;
      const totalViews = campaignData?.reduce((sum, c) => sum + (c.total_views || 0), 0) || 0;
      const avgConversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;
      
      const topCampaign = campaignData?.reduce((top, current) => 
        (current.total_revenue || 0) > (top?.total_revenue || 0) ? current : top
      );

      setAnalytics({
        total_campaigns: totalCampaigns,
        active_campaigns: activeCampaigns,
        total_revenue: totalRevenue,
        total_conversions: totalConversions,
        avg_conversion_rate: avgConversionRate,
        top_performing_campaign: topCampaign?.campaign_name || 'N/A'
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('fomo_campaigns')
        .insert([{
          ...formData,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Campaign created successfully!');
      setShowCreateForm(false);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    if (!editingCampaign) return;

    try {
      const { error } = await supabase
        .from('fomo_campaigns')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCampaign.id);

      if (error) throw error;

      toast.success('Campaign updated successfully!');
      setEditingCampaign(null);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('fomo_campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`);
      loadCampaigns();
    } catch (error) {
      console.error('Error toggling campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('fomo_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaign deleted successfully!');
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      campaign_type: 'flash_sale',
      description: '',
      start_date: '',
      end_date: '',
      countdown_duration: 1440,
      fomo_label: '⚡ Flash Sale',
      urgency_message: 'Hurry! Offer ends soon',
      enable_stock_warning: true,
      stock_warning_threshold: 5,
      stock_warning_message: 'Only {count} left in stock!',
      allow_loyalty_coins: false,
      allow_coupons: false,
      max_quantity_per_user: 5,
      total_stock_limit: 100
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'flash_sale': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'today_only': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'limited_stock': return <Package className="h-4 w-4 text-red-500" />;
      case 'countdown_deal': return <Timer className="h-4 w-4 text-purple-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FOMO Campaigns</h1>
          <p className="text-gray-600">Create urgency-driven flash sales and limited-time offers</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_campaigns}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.active_campaigns}</p>
                </div>
                <Zap className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-600">₹{analytics.total_revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.avg_conversion_rate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Create/Edit Campaign Form */}
          {(showCreateForm || editingCampaign) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign_name">Campaign Name</Label>
                    <Input
                      id="campaign_name"
                      value={formData.campaign_name}
                      onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                      placeholder="Flash Sale - Electronics"
                    />
                  </div>

                  <div>
                    <Label htmlFor="campaign_type">Campaign Type</Label>
                    <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flash_sale">⚡ Flash Sale</SelectItem>
                        <SelectItem value="today_only">🔥 Today Only</SelectItem>
                        <SelectItem value="limited_stock">📦 Limited Stock</SelectItem>
                        <SelectItem value="countdown_deal">⏰ Countdown Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="start_date">Start Date & Time</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date & Time</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fomo_label">FOMO Label</Label>
                    <Input
                      id="fomo_label"
                      value={formData.fomo_label}
                      onChange={(e) => setFormData({ ...formData, fomo_label: e.target.value })}
                      placeholder="⚡ Flash Sale"
                    />
                  </div>

                  <div>
                    <Label htmlFor="urgency_message">Urgency Message</Label>
                    <Input
                      id="urgency_message"
                      value={formData.urgency_message}
                      onChange={(e) => setFormData({ ...formData, urgency_message: e.target.value })}
                      placeholder="Hurry! Offer ends soon"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Campaign description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stock_warning_threshold">Stock Warning Threshold</Label>
                    <Input
                      id="stock_warning_threshold"
                      type="number"
                      value={formData.stock_warning_threshold}
                      onChange={(e) => setFormData({ ...formData, stock_warning_threshold: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_quantity_per_user">Max Quantity Per User</Label>
                    <Input
                      id="max_quantity_per_user"
                      type="number"
                      value={formData.max_quantity_per_user}
                      onChange={(e) => setFormData({ ...formData, max_quantity_per_user: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="total_stock_limit">Total Stock Limit</Label>
                    <Input
                      id="total_stock_limit"
                      type="number"
                      value={formData.total_stock_limit}
                      onChange={(e) => setFormData({ ...formData, total_stock_limit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enable_stock_warning"
                      checked={formData.enable_stock_warning}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_stock_warning: checked })}
                    />
                    <Label htmlFor="enable_stock_warning">Enable Stock Warning</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_loyalty_coins"
                      checked={formData.allow_loyalty_coins}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_loyalty_coins: checked })}
                    />
                    <Label htmlFor="allow_loyalty_coins">Allow Loyalty Coins</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_coupons"
                      checked={formData.allow_coupons}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_coupons: checked })}
                    />
                    <Label htmlFor="allow_coupons">Allow Coupons</Label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={editingCampaign ? handleUpdateCampaign : handleCreateCampaign}
                    className="flex items-center gap-2"
                  >
                    {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingCampaign(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaigns List */}
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getCampaignTypeIcon(campaign.campaign_type)}
                      <div>
                        <h3 className="font-semibold">{campaign.campaign_name}</h3>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(campaign.status)}
                          <span className="text-xs text-gray-500">
                            {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <p className="font-semibold">₹{campaign.total_revenue.toLocaleString()}</p>
                        <p className="text-gray-600">{campaign.total_conversions} conversions</p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleCampaignStatus(campaign.id, campaign.status)}
                      >
                        {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCampaign(campaign);
                          setFormData({
                            campaign_name: campaign.campaign_name,
                            campaign_type: campaign.campaign_type,
                            description: campaign.description,
                            start_date: campaign.start_date.slice(0, 16),
                            end_date: campaign.end_date.slice(0, 16),
                            countdown_duration: campaign.countdown_duration,
                            fomo_label: campaign.fomo_label,
                            urgency_message: campaign.urgency_message,
                            enable_stock_warning: campaign.enable_stock_warning,
                            stock_warning_threshold: campaign.stock_warning_threshold,
                            stock_warning_message: campaign.stock_warning_message,
                            allow_loyalty_coins: campaign.allow_loyalty_coins,
                            allow_coupons: campaign.allow_coupons,
                            max_quantity_per_user: campaign.max_quantity_per_user,
                            total_stock_limit: campaign.total_stock_limit
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600">Detailed analytics will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FOMO Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Settings</h3>
                <p className="text-gray-600">Campaign settings and configurations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};