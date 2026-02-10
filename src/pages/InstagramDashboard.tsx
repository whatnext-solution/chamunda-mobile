import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { 
  Instagram, 
  Coins, 
  LogOut,
  Users,
  Calendar,
  Trophy,
  ShoppingBag,
  ExternalLink,
  Clock,
  User,
  Play,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface InstagramUser {
  id: string;
  full_name: string;
  instagram_username: string;
  email: string;
  followers_count: number;
  total_coins_earned: number;
}

interface CoinTransaction {
  id: string;
  transaction_id: string;
  coins_amount: number;
  description: string;
  admin_notes: string;
  created_at: string;
  transaction_type: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  loyalty_product_settings: {
    coins_required_to_buy: number;
    is_coin_purchase_enabled: boolean;
  };
}

interface Story {
  id: string;
  story_id: string;
  story_status: string;
  story_started_at: string;
  story_expires_at: string;
  coins_awarded: number;
  admin_verification_notes?: string;
  rejection_reason?: string;
}

interface Campaign {
  id: string;
  campaign_name: string;
  per_story_reward: number;
  story_minimum_duration: number;
  instructions: string;
  campaign_start_date: string;
  campaign_end_date: string;
}

const STATUS_CONFIG = {
  'active': { label: 'Story Active', color: 'bg-green-100 text-green-800', icon: Play },
  'expired': { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
  'awaiting_review': { label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  'approved': { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function InstagramDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<InstagramUser | null>(null);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingStory, setStartingStory] = useState(false);

  // Pagination states for transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('instagram_user');
    if (!storedUser) {
      navigate('/instagram-login');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    fetchUserData(userData.id);
    fetchCoinTransactions(userData.id);
    fetchSuggestedProducts(userData.total_coins_earned || 0);
    fetchCampaigns();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch updated user data
      const { data: userData, error: userError } = await (supabase as any)
        .from('instagram_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      setUser(userData);
      
      // Update localStorage
      localStorage.setItem('instagram_user', JSON.stringify(userData));

      // Fetch user's stories
      const { data: storiesData, error: storiesError } = await (supabase as any)
        .from('instagram_stories')
        .select('*')
        .eq('instagram_user_id', userId)
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;
      setStories(storiesData || []);

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('instagram_campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const startStory = async (campaignId: string) => {
    if (!user) return;

    // Check if user has an active story
    const activeStory = stories.find(s => s.story_status === 'active');
    if (activeStory) {
      toast.error('You already have an active story. Wait for it to complete.');
      return;
    }

    setStartingStory(true);

    try {
      const storyId = `IG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Create story record
      const { data: storyData, error: storyError } = await (supabase as any)
        .from('instagram_stories')
        .insert([{
          story_id: storyId,
          instagram_user_id: user.id,
          campaign_id: campaignId,
          story_expires_at: expiresAt.toISOString(),
          story_status: 'active'
        }])
        .select()
        .single();

      if (storyError) throw storyError;

      // Track Instagram story creation
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'instagram_stories',
        record_id: storyData.id,
        operation_source: DATA_OPERATION_SOURCES.USER_INSTAGRAM_STORY,
        operated_by: user.id,
        metadata: {
          story_id: storyId,
          instagram_username: user.instagram_username,
          full_name: user.full_name,
          campaign_id: campaignId,
          story_duration: '24_hours',
          user_type: 'instagram_user'
        }
      });

      // Create timer record
      const { data: timerData, error: timerError } = await (supabase as any)
        .from('instagram_story_timers')
        .insert([{
          story_id: storyData.id,
          instagram_user_id: user.id,
          timer_expires_at: expiresAt.toISOString(),
          timer_status: 'running'
        }])
        .select()
        .single();

      if (!timerError && timerData) {
        // Track timer creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'instagram_story_timers',
          record_id: timerData.id,
          operation_source: DATA_OPERATION_SOURCES.USER_INSTAGRAM_STORY,
          operated_by: user.id,
          metadata: {
            story_id: storyId,
            instagram_username: user.instagram_username,
            timer_duration: '24_hours',
            timer_status: 'running'
          }
        });
      }

      // Create notification for admin
      const { data: notificationData, error: notificationError } = await (supabase as any)
        .from('instagram_notifications')
        .insert([{
          notification_type: 'story_started',
          recipient_type: 'admin',
          title: 'New Instagram Story Started',
          message: `${user.full_name} (@${user.instagram_username}) has started a new story: ${storyId}`,
          story_id: storyData.id
        }])
        .select()
        .single();

      if (!notificationError && notificationData) {
        // Track notification creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'instagram_notifications',
          record_id: notificationData.id,
          operation_source: DATA_OPERATION_SOURCES.USER_INSTAGRAM_STORY,
          operated_by: user.id,
          metadata: {
            notification_type: 'story_started',
            story_id: storyId,
            instagram_username: user.instagram_username,
            recipient_type: 'admin'
          }
        });
      }

      toast.success('Story timer started! Keep your story active for 24 hours.');
      fetchUserData(user.id);

    } catch (error: any) {
      console.error('Error starting story:', error);
      toast.error('Failed to start story timer');
    } finally {
      setStartingStory(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  const fetchCoinTransactions = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('instagram_coin_transactions')
        .select('*')
        .eq('instagram_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoinTransactions(data || []);

    } catch (error: any) {
      console.error('Error fetching coin transactions:', error);
      toast.error('Failed to load coin history');
    }
  };

  const fetchSuggestedProducts = async (availableCoins: number) => {
    try {
      const { data, error } = await (supabase as any)
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          image_url,
          loyalty_product_settings!inner (
            coins_required_to_buy,
            is_coin_purchase_enabled
          )
        `)
        .eq('is_visible', true)
        .eq('loyalty_product_settings.is_coin_purchase_enabled', true)
        .lte('loyalty_product_settings.coins_required_to_buy', availableCoins)
        .limit(6);

      if (error) throw error;
      
      // Sort by coins_required_to_buy in JavaScript since Supabase has issues with nested ordering
      const sortedData = (data || []).sort((a: any, b: any) => 
        a.loyalty_product_settings.coins_required_to_buy - b.loyalty_product_settings.coins_required_to_buy
      );
      
      setSuggestedProducts(sortedData);

    } catch (error: any) {
      console.error('Error fetching suggested products:', error);
      // Don't show error toast for products as it's not critical
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('instagram_user');
    navigate('/instagram-login');
    toast.success('Logged out successfully');
  };

  const handleProductRedeem = (product: Product) => {
    // Redirect to main website product page
    const productUrl = `/product/${product.id}`;
    window.open(productUrl, '_blank');
    toast.success(`Redirecting to ${product.name} page`);
  };

  // Pagination logic for transactions
  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return coinTransactions.slice(startIndex, endIndex);
  };

  const getTotalPages = () => Math.ceil(coinTransactions.length / itemsPerPage);

  // Shimmer component for transactions
  const TransactionShimmer = () => (
    <div className="border rounded-lg p-4 space-y-2 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </div>
  );

  // Product shimmer component
  const ProductShimmer = () => (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Pagination component
  const PaginationControls = () => {
    const totalPages = getTotalPages();
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        {/* Header Shimmer */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-1">
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards Shimmer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coins History Shimmer */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <TransactionShimmer key={index} />
                ))}
              </CardContent>
            </Card>

            {/* Product Suggestions Shimmer */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <ProductShimmer key={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Instagram Dashboard</h1>
                <p className="text-sm text-gray-600">@{user.instagram_username}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Coins Earned</CardTitle>
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{user.total_coins_earned || 0}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Coins</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{user.total_coins_earned || 0}</div>
              <p className="text-xs text-muted-foreground">Ready to redeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{(user.followers_count || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Instagram followers</p>
            </CardContent>
          </Card>
        </div>

        {/* Vertical Layout - Stacked Sections */}
        <div className="space-y-8">
          {/* Campaign Instructions & Story Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-purple-600" />
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{campaign.campaign_name}</h3>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {campaign.per_story_reward} coins
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600">{campaign.instructions}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {campaign.story_minimum_duration}h duration
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Until {new Date(campaign.campaign_end_date).toLocaleDateString()}
                    </span>
                  </div>

                  <Button
                    onClick={() => startStory(campaign.id)}
                    disabled={startingStory || !!stories.find(s => s.story_status === 'active')}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {startingStory ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting Story...
                      </>
                    ) : stories.find(s => s.story_status === 'active') ? (
                      'Story Already Active'
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Story Timer
                      </>
                    )}
                  </Button>
                </div>
              ))}

              {/* Story History */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Recent Stories
                </h4>
                <div className="space-y-2">
                  {stories.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">No stories yet. Start your first story!</p>
                  ) : (
                    stories.slice(0, 5).map((story) => {
                      const StatusIcon = STATUS_CONFIG[story.story_status as keyof typeof STATUS_CONFIG]?.icon || AlertCircle;
                      return (
                        <div key={story.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-sm">{story.story_id}</span>
                            <Badge className={STATUS_CONFIG[story.story_status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {STATUS_CONFIG[story.story_status as keyof typeof STATUS_CONFIG]?.label || story.story_status}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Started: {story.story_started_at ? new Date(story.story_started_at).toLocaleString() : 'Unknown'}
                          </div>
                          
                          {story.story_status === 'active' && story.story_expires_at && (
                            <div className="text-xs text-green-600 font-medium">
                              {getTimeRemaining(story.story_expires_at)}
                            </div>
                          )}
                          
                          {story.story_status === 'approved' && (story.coins_awarded || 0) > 0 && (
                            <div className="text-xs text-green-600 font-medium">
                              Earned: {story.coins_awarded} coins
                            </div>
                          )}
                          
                          {story.story_status === 'rejected' && story.rejection_reason && (
                            <div className="text-xs text-red-600">
                              Reason: {story.rejection_reason}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coins Assignment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-600" />
                Coins Assignment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coinTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Coins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No coin assignments yet</p>
                    <p className="text-sm text-gray-400">Admin will assign coins for approved stories</p>
                  </div>
                ) : (
                  <>
                    {getPaginatedTransactions().map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800">
                                +{transaction.coins_amount} Coins
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">Instagram Story Reward</p>
                            <p className="text-xs text-gray-600">{transaction.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          <span>Assigned By: Admin</span>
                        </div>
                      </div>
                    ))}
                    
                    <PaginationControls />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                Products You Can Redeem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No products available</p>
                  <p className="text-sm text-gray-400">
                    {(user?.total_coins_earned || 0) === 0 
                      ? 'Earn coins to unlock products'
                      : 'Check back later for new products'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestedProducts.map((product) => (
                    <Card key={product.id} className="border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {product.image_url && (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <h3 className="font-medium">{product.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Coins className="h-3 w-3 mr-1" />
                                {product.loyalty_product_settings.coins_required_to_buy || 0} coins
                              </Badge>
                            </div>
                            <Button 
                              onClick={() => handleProductRedeem(product)}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              size="sm"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Redeem Now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}