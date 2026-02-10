import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { UPLOAD_SOURCES } from '@/services/storageTrackingService';
import { supabase } from '@/integrations/supabase/client';
import { localNotificationService } from '@/services/localNotificationService';
import { 
  Instagram, 
  Plus, 
  Users, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Coins,
  Bell,
  Play,
  Settings,
  UserPlus,
  Timer,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Image as ImageIcon,
  Video,
  Send,
  Link,
  FileImage
} from 'lucide-react';
import { toast } from 'sonner';

interface InstagramUser {
  id: string;
  full_name: string;
  instagram_username: string;
  followers_count?: number;
  mobile_number: string;
  email: string;
  status: string;
  total_coins_earned?: number;
  total_stories_approved?: number;
  total_stories_rejected?: number;
  created_at: string;
  last_login_at?: string;
}

interface Story {
  id: string;
  story_id: string;
  instagram_user_id: string;
  story_status: string;
  story_started_at?: string;
  story_expires_at?: string;
  coins_awarded?: number;
  admin_verification_notes?: string;
  rejection_reason?: string;
  instagram_users?: {
    full_name: string;
    instagram_username: string;
  };
}

interface Campaign {
  id: string;
  campaign_name: string;
  per_story_reward?: number;
  story_minimum_duration?: number;
  instructions: string;
  status: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
}

interface StoryMedia {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  instructions?: string;
  coins_reward: number;
  is_active: boolean;
  created_at: string;
}

interface StoryAssignment {
  id: string;
  story_media_id: string;
  instagram_user_id: string;
  assignment_status: string;
  downloaded_at?: string;
  posted_at?: string;
  verified_at?: string;
  expires_at: string;
  coins_assigned: boolean;
  coins_amount: number;
  admin_notes?: string;
  rejection_reason?: string;
  instagram_users?: {
    full_name: string;
    instagram_username: string;
  };
  instagram_story_media?: StoryMedia;
}

const STATUS_CONFIG = {
  'active': { label: 'Story Active', color: 'bg-green-100 text-green-800', icon: Play },
  'expired': { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
  'awaiting_review': { label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  'approved': { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  'coins_assigned': { label: 'Coins Assigned', color: 'bg-green-100 text-green-800', icon: Coins },
  'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function InstagramMarketing() {
  const [activeTab, setActiveTab] = useState('influencers');
  const [influencers, setInfluencers] = useState<InstagramUser[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [storyMedia, setStoryMedia] = useState<StoryMedia[]>([]);
  const [storyAssignments, setStoryAssignments] = useState<StoryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddInfluencer, setShowAddInfluencer] = useState(false);
  const [showStoryDetails, setShowStoryDetails] = useState(false);
  const [showAddStoryMedia, setShowAddStoryMedia] = useState(false);
  const [showAssignMedia, setShowAssignMedia] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<StoryMedia | null>(null);
  const [processingStory, setProcessingStory] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const [newInfluencer, setNewInfluencer] = useState({
    full_name: '',
    instagram_username: '',
    followers_count: 1000,
    mobile_number: '',
    email: '',
    password: 'instagram123' // Default password
  });

  const [newStoryMedia, setNewStoryMedia] = useState({
    media_url: '',
    media_type: 'image' as 'image' | 'video',
    caption: '',
    instructions: '',
    coins_reward: 100
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('upload');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch influencers
      const { data: influencersData, error: influencersError } = await (supabase as any)
        .from('instagram_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (influencersError) throw influencersError;
      setInfluencers(influencersData || []);

      // Fetch stories with user details
      const { data: storiesData, error: storiesError } = await (supabase as any)
        .from('instagram_stories')
        .select(`
          *,
          instagram_users!inner (
            full_name,
            instagram_username
          )
        `)
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('Stories fetch error:', storiesError);
        // Try to fetch stories without user details as fallback
        const { data: fallbackStoriesData, error: fallbackError } = await (supabase as any)
          .from('instagram_stories')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setStories(fallbackStoriesData || []);
      } else {
        setStories(storiesData || []);
      }

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await (supabase as any)
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch story media
      const { data: storyMediaData, error: storyMediaError } = await (supabase as any)
        .from('instagram_story_media')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (storyMediaError) throw storyMediaError;
      setStoryMedia(storyMediaData || []);

      // Fetch story assignments with user and media details
      const { data: assignmentsData, error: assignmentsError } = await (supabase as any)
        .from('instagram_story_assignments')
        .select(`
          *,
          instagram_users (
            full_name,
            instagram_username
          ),
          instagram_story_media (
            media_url,
            media_type,
            caption,
            coins_reward
          )
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setStoryAssignments(assignmentsData || []);

      // Check for notification triggers
      await checkNotificationTriggers(storiesData || [], assignmentsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInfluencer = async () => {
    if (!newInfluencer.full_name || !newInfluencer.instagram_username || !newInfluencer.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newInfluencer.followers_count < 1000) {
      toast.error('Minimum 1000 followers required');
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('instagram_users')
        .insert([{
          full_name: newInfluencer.full_name,
          instagram_username: newInfluencer.instagram_username,
          followers_count: newInfluencer.followers_count,
          mobile_number: newInfluencer.mobile_number,
          email: newInfluencer.email,
          password_hash: newInfluencer.password, // In production, hash this properly
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Instagram username or email already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Instagram influencer added successfully');
      setNewInfluencer({
        full_name: '',
        instagram_username: '',
        followers_count: 1000,
        mobile_number: '',
        email: '',
        password: 'instagram123'
      });
      setShowAddInfluencer(false);
      fetchData();

    } catch (error: any) {
      console.error('Error adding influencer:', error);
      toast.error('Failed to add influencer');
    }
  };

  const navigateToInstagramDashboard = (influencer: InstagramUser) => {
    // Store the influencer data temporarily for admin navigation
    const influencerData = {
      id: influencer.id,
      full_name: influencer.full_name,
      instagram_username: influencer.instagram_username,
      email: influencer.email,
      followers_count: influencer.followers_count,
      total_coins_earned: influencer.total_coins_earned
    };
    
    // Store in localStorage to simulate login
    localStorage.setItem('instagram_user', JSON.stringify(influencerData));
    
    // Open Instagram dashboard in new tab
    window.open('/instagram-dashboard', '_blank');
    
    toast.success(`Opening ${influencer.full_name}'s dashboard`);
  };

  const navigateToInstagramProfile = (username: string) => {
    // Open Instagram profile in new tab for story verification
    const instagramUrl = `https://www.instagram.com/${username}`;
    window.open(instagramUrl, '_blank');
    
    toast.success(`Opening @${username}'s Instagram profile for story verification`);
  };

  const handleStoryAction = async (storyId: string, action: 'approve' | 'reject', notes?: string) => {
    if (!selectedStory) return;

    setProcessingStory(true);

    try {
      // Update story status (NO COINS ASSIGNED YET)
      const { error: storyError } = await (supabase as any)
        .from('instagram_stories')
        .update({
          story_status: action === 'approve' ? 'approved' : 'rejected',
          admin_verification_notes: notes || null,
          rejection_reason: action === 'reject' ? notes : null,
          admin_verified_at: new Date().toISOString()
          // coins_awarded: 0 (will be set when admin manually assigns coins)
        })
        .eq('id', storyId);

      if (storyError) throw storyError;

      if (action === 'reject') {
        // Update rejected stories count
        await (supabase as any)
          .from('instagram_users')
          .update({
            total_stories_rejected: (supabase as any).rpc('increment_rejected_stories', { 
              user_id: selectedStory.instagram_user_id 
            })
          })
          .eq('id', selectedStory.instagram_user_id);
      }

      // Create notification for user
      await (supabase as any)
        .from('instagram_notifications')
        .insert([{
          notification_type: action === 'approve' ? 'story_approved' : 'story_rejected',
          recipient_type: 'instagram_user',
          recipient_id: selectedStory.instagram_user_id,
          title: action === 'approve' ? 'Story Approved!' : 'Story Rejected',
          message: action === 'approve' 
            ? `Your story ${selectedStory.story_id} has been approved. Admin will assign coins soon.`
            : `Your story ${selectedStory.story_id} has been rejected. ${notes || 'No reason provided.'}`,
          story_id: storyId
        }]);

      // Create local admin notification
      if (action === 'approve') {
        await localNotificationService.notifyInstagramStoryApproved(
          selectedStory.instagram_user_id,
          selectedStory.instagram_users?.full_name || 'Unknown User',
          storyId
        );
      } else {
        await localNotificationService.notifyInstagramStoryRejected(
          selectedStory.instagram_user_id,
          selectedStory.instagram_users?.full_name || 'Unknown User',
          storyId
        );
      }

      toast.success(`Story ${action}d successfully${action === 'approve' ? '. Now you can assign coins manually.' : ''}`);
      setShowStoryDetails(false);
      setSelectedStory(null);
      fetchData();

    } catch (error: any) {
      console.error(`Error ${action}ing story:`, error);
      toast.error(`Failed to ${action} story`);
    } finally {
      setProcessingStory(false);
    }
  };

  const handleAssignCoins = async (story: Story) => {
    try {
      const campaign = campaigns.find(c => c.status === 'active');
      const coinsToAward = campaign?.per_story_reward || 100;

      // Check if coins were already assigned to prevent double assignment
      if ((story.coins_awarded || 0) > 0) {
        toast.error('Coins already assigned to this story');
        return;
      }

      // Create coin transaction
      const transactionId = `ICT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      await (supabase as any)
        .from('instagram_coin_transactions')
        .insert([{
          transaction_id: transactionId,
          instagram_user_id: story.instagram_user_id,
          story_id: story.id,
          transaction_type: 'story_reward',
          coins_amount: coinsToAward,
          description: `Story reward for ${story.story_id}`,
          admin_notes: 'Manually assigned by admin'
        }]);

      // Update story with coins awarded
      await (supabase as any)
        .from('instagram_stories')
        .update({
          coins_awarded: coinsToAward,
          coins_assigned_at: new Date().toISOString()
        })
        .eq('id', story.id);

      // Update user's total coins
      await (supabase as any)
        .from('instagram_users')
        .update({
          total_coins_earned: (supabase as any).rpc('increment_coins', { 
            user_id: story.instagram_user_id, 
            amount: coinsToAward 
          }),
          total_stories_approved: (supabase as any).rpc('increment_approved_stories', { 
            user_id: story.instagram_user_id 
          })
        })
        .eq('id', story.instagram_user_id);

      // Send notification to user
      await (supabase as any)
        .from('instagram_notifications')
        .insert([{
          notification_type: 'coins_assigned',
          recipient_type: 'instagram_user',
          recipient_id: story.instagram_user_id,
          title: 'Coins Assigned!',
          message: `${coinsToAward} coins have been added to your wallet for story ${story.story_id}.`,
          story_id: story.id
        }]);

      toast.success(`${coinsToAward} coins assigned successfully!`);
      fetchData();

    } catch (error: any) {
      console.error('Error assigning coins:', error);
      toast.error('Failed to assign coins');
    }
  };

  const handleBulkAssignCoins = async () => {
    const approvedStoriesWithoutCoins = stories.filter(s => 
      s.story_status === 'approved' && (!s.coins_awarded || s.coins_awarded === 0)
    );

    if (approvedStoriesWithoutCoins.length === 0) {
      toast.error('No approved stories found without coins');
      return;
    }

    const confirmMessage = `Are you sure you want to assign coins to ${approvedStoriesWithoutCoins.length} approved stories?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const story of approvedStoriesWithoutCoins) {
        try {
          await handleAssignCoins(story);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to assign coins to story ${story.story_id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully assigned coins to ${successCount} stories!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to assign coins to ${errorCount} stories`);
      }

      fetchData();

    } catch (error: any) {
      console.error('Error in bulk coin assignment:', error);
      toast.error('Failed to assign coins in bulk');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStoryMedia = async () => {
    if (!newStoryMedia.media_url || !newStoryMedia.instructions) {
      toast.error('Please provide media (URL or upload) and instructions');
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('instagram_story_media')
        .insert([{
          media_url: newStoryMedia.media_url,
          media_type: newStoryMedia.media_type,
          caption: newStoryMedia.caption,
          instructions: newStoryMedia.instructions,
          coins_reward: newStoryMedia.coins_reward,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Story media added successfully');
      setNewStoryMedia({
        media_url: '',
        media_type: 'image',
        caption: '',
        instructions: '',
        coins_reward: 100
      });
      setUploadMethod('upload');
      setShowAddStoryMedia(false);
      fetchData();

    } catch (error: any) {
      console.error('Error adding story media:', error);
      toast.error('Failed to add story media');
    }
  };

  const handleAssignMediaToUser = async (mediaId: string, userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('instagram_story_assignments')
        .insert([{
          story_media_id: mediaId,
          instagram_user_id: userId,
          assignment_status: 'pending_download',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Media already assigned to this user');
        } else {
          throw error;
        }
        return;
      }

      // Create notification for user
      await (supabase as any)
        .from('instagram_notifications')
        .insert([{
          notification_type: 'media_assigned',
          recipient_type: 'instagram_user',
          recipient_id: userId,
          title: 'New Story Media Available',
          message: 'New story media has been assigned to you. Download and post it on your Instagram story.',
          assignment_id: data.id
        }]);

      // Create local admin notification
      const user = influencers.find(u => u.id === userId);
      if (user) {
        await localNotificationService.notifyInstagramStoryAssigned(
          userId,
          user.full_name,
          mediaId
        );
      }

      toast.success('Media assigned to user successfully');
      fetchData();

    } catch (error: any) {
      console.error('Error assigning media:', error);
      toast.error('Failed to assign media');
    }
  };

  const handleVerifyAssignment = async (assignmentId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      // Update assignment status
      const { error: assignmentError } = await (supabase as any)
        .from('instagram_story_assignments')
        .update({
          assignment_status: status === 'approved' ? 'verified' : 'rejected',
          verified_at: new Date().toISOString(),
          admin_notes: notes,
          rejection_reason: status === 'rejected' ? notes : null
        })
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;

      // Create verification record
      await (supabase as any)
        .from('instagram_story_verifications')
        .insert([{
          assignment_id: assignmentId,
          verification_status: status,
          verification_notes: notes
        }]);

      if (status === 'approved') {
        // Get assignment details for coin assignment
        const { data: assignment } = await (supabase as any)
          .from('instagram_story_assignments')
          .select(`
            *,
            instagram_story_media (coins_reward)
          `)
          .eq('id', assignmentId)
          .single();

        if (assignment) {
          const coinsToAward = assignment.instagram_story_media.coins_reward;

          // Create coin transaction
          const transactionId = `ISM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          
          await (supabase as any)
            .from('instagram_coin_transactions')
            .insert([{
              transaction_id: transactionId,
              instagram_user_id: assignment.instagram_user_id,
              assignment_id: assignmentId,
              transaction_type: 'story_media_reward',
              coins_amount: coinsToAward,
              description: `Story media reward`,
              admin_notes: notes || 'Story verified and approved'
            }]);

          // Update assignment with coins info
          await (supabase as any)
            .from('instagram_story_assignments')
            .update({
              coins_assigned: true,
              coins_amount: coinsToAward
            })
            .eq('id', assignmentId);

          // Update user's total coins
          await (supabase as any)
            .from('instagram_users')
            .update({
              total_coins_earned: (supabase as any).rpc('increment_coins', { 
                user_id: assignment.instagram_user_id, 
                amount: coinsToAward 
              })
            })
            .eq('id', assignment.instagram_user_id);

          // Send notification to user
          await (supabase as any)
            .from('instagram_notifications')
            .insert([{
              notification_type: 'story_verified',
              recipient_type: 'instagram_user',
              recipient_id: assignment.instagram_user_id,
              title: 'Story Verified!',
              message: `Your story has been verified and approved. ${coinsToAward} coins have been added to your wallet.`,
              assignment_id: assignmentId
            }]);
        }
      }

      toast.success(`Story ${status} successfully`);
      fetchData();

    } catch (error: any) {
      console.error(`Error ${status}ing story:`, error);
      toast.error(`Failed to ${status} story`);
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

  const pendingStories = stories.filter(s => s.story_status === 'awaiting_review');
  const activeStories = stories.filter(s => s.story_status === 'active');
  const expiringStories = activeStories.filter(s => {
    const timeLeft = new Date(s.story_expires_at).getTime() - new Date().getTime();
    return timeLeft <= 60 * 60 * 1000; // Less than 1 hour
  });

  // Pagination logic
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);

  const getCurrentData = () => {
    switch (activeTab) {
      case 'influencers':
        return getPaginatedData(influencers);
      case 'stories':
        return getPaginatedData(stories);
      case 'campaigns':
        return getPaginatedData(campaigns);
      default:
        return [];
    }
  };

  const getCurrentTotalPages = () => {
    switch (activeTab) {
      case 'influencers':
        return getTotalPages(influencers);
      case 'stories':
        return getTotalPages(stories);
      case 'campaigns':
        return getTotalPages(campaigns);
      default:
        return 1;
    }
  };

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Check for notification triggers
  const checkNotificationTriggers = async (storiesData: Story[], assignmentsData: any[]) => {
    try {
      // Check for stories expiring soon (within 1 hour)
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const expiringSoon = storiesData.filter(story => {
        if (!story.story_expires_at) return false;
        const expiryTime = new Date(story.story_expires_at);
        return expiryTime > now && expiryTime <= oneHourFromNow && story.story_status === 'posted';
      });

      for (const story of expiringSoon) {
        await localNotificationService.notifyInstagramStoryExpiringSoon(
          story.instagram_user_id,
          story.instagram_users?.full_name || 'Unknown User',
          story.id
        );
      }

      // Check for pending verifications
      const pendingVerifications = storiesData.filter(story => 
        story.story_status === 'awaiting_review'
      );

      if (pendingVerifications.length > 0) {
        await localNotificationService.notifyInstagramStoriesPendingVerification(
          pendingVerifications.length,
          pendingVerifications.map(s => s.id)
        );
      }

    } catch (error) {
      console.error('Error checking notification triggers:', error);
    }
  };

  // Shimmer component
  const ShimmerCard = () => (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Pagination component
  const PaginationControls = () => {
    const totalPages = getCurrentTotalPages();
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
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
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Instagram Marketing</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {expiringStories.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {expiringStories.length} expiring soon
            </Badge>
          )}
          {pendingStories.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <Eye className="h-3 w-3 mr-1" />
              {pendingStories.length} pending review
            </Badge>
          )}
          
          <Button
            variant="outline"
            onClick={() => window.open('/instagram-login', '_blank')}
            className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 border-purple-200 h-11 sm:h-10 md:h-11 touch-manipulation"
          >
            <Instagram className="h-4 w-4 mr-2" />
            Instagram Login
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Influencers</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{influencers.length}</div>
            <p className="text-xs text-muted-foreground">
              {influencers.filter(i => i.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Active Stories</CardTitle>
            <Play className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{activeStories.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Pending Review</CardTitle>
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{pendingStories.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Coins Awarded</CardTitle>
            <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">
              {influencers.reduce((sum, inf) => sum + (inf.total_coins_earned || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
          <TabsTrigger value="influencers" className="text-xs sm:text-sm h-10 sm:h-9">Influencers</TabsTrigger>
          <TabsTrigger value="story-media" className="text-xs sm:text-sm h-10 sm:h-9">Story Media</TabsTrigger>
          <TabsTrigger value="stories" className="text-xs sm:text-sm h-10 sm:h-9">Stories</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs sm:text-sm h-10 sm:h-9">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="influencers" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold">Instagram Influencers</h2>
            <Button onClick={() => setShowAddInfluencer(true)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Influencer
            </Button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              // Show shimmer effect while loading
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <ShimmerCard key={index} />
              ))
            ) : (
              getCurrentData().map((influencer: InstagramUser) => (
                <Card key={influencer.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Instagram className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{influencer.full_name}</h3>
                            <p className="text-sm text-gray-600">@{influencer.instagram_username}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>{(influencer.followers_count || 0).toLocaleString()} followers</span>
                          <span>{influencer.total_coins_earned || 0} coins earned</span>
                          <span>{influencer.total_stories_approved || 0} approved stories</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={influencer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {influencer.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <PaginationControls />
        </TabsContent>

        <TabsContent value="story-media" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold">Story Media Management</h2>
            <Button onClick={() => setShowAddStoryMedia(true)} className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation">
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <ShimmerCard key={index} />
              ))
            ) : (
              storyMedia.map((media) => (
                <Card key={media.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {media.media_type === 'image' ? (
                          <img 
                            src={media.media_url} 
                            alt="Story media"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <Video className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={media.media_type === 'image' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                            {media.media_type === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                            {media.media_type}
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Coins className="h-3 w-3 mr-1" />
                            {media.coins_reward} coins
                          </Badge>
                        </div>
                        
                        {media.caption && (
                          <p className="text-sm font-medium">{media.caption}</p>
                        )}
                        
                        <p className="text-sm text-gray-600">{media.instructions}</p>
                        
                        <div className="text-xs text-gray-500">
                          Created: {new Date(media.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedMedia(media);
                            setShowAssignMedia(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Story Assignments Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Story Assignments</h3>
            <div className="grid gap-4">
              {storyAssignments.map((assignment) => (
                <Card key={assignment.id} className={
                  assignment.assignment_status === 'pending_download' ? 'border-yellow-200 bg-yellow-50' :
                  assignment.assignment_status === 'posted' ? 'border-blue-200 bg-blue-50' :
                  assignment.assignment_status === 'verified' ? 'border-green-200 bg-green-50' :
                  assignment.assignment_status === 'rejected' ? 'border-red-200 bg-red-50' : ''
                }>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Instagram className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{assignment.instagram_users?.full_name}</h4>
                            <p className="text-sm text-gray-600">@{assignment.instagram_users?.instagram_username}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Expires: {new Date(assignment.expires_at).toLocaleString()}</span>
                          {assignment.coins_assigned && (
                            <span className="text-green-600 font-medium">
                              {assignment.coins_amount} coins assigned
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={
                          assignment.assignment_status === 'pending_download' ? 'bg-yellow-100 text-yellow-800' :
                          assignment.assignment_status === 'downloaded' ? 'bg-blue-100 text-blue-800' :
                          assignment.assignment_status === 'posted' ? 'bg-purple-100 text-purple-800' :
                          assignment.assignment_status === 'verified' ? 'bg-green-100 text-green-800' :
                          assignment.assignment_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {assignment.assignment_status.replace('_', ' ')}
                        </Badge>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.instagram.com/${assignment.instagram_users?.instagram_username}`, '_blank')}
                          className="bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-700 border-pink-200"
                        >
                          <Instagram className="h-4 w-4 mr-1" />
                          Check Story
                        </Button>
                        
                        {assignment.assignment_status === 'posted' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleVerifyAssignment(assignment.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAssignment(assignment.id, 'rejected', 'Story not found or does not meet requirements')}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold">Story Management</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Bulk assign coins button */}
              {stories.filter(s => s.story_status === 'approved' && (!s.coins_awarded || s.coins_awarded === 0)).length > 0 && (
                <Button
                  onClick={handleBulkAssignCoins}
                  className="bg-green-600 hover:bg-green-700 text-white h-11 sm:h-10 md:h-11 touch-manipulation"
                  title={`Assign coins to ${stories.filter(s => s.story_status === 'approved' && (!s.coins_awarded || s.coins_awarded === 0)).length} approved stories`}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Assign Coins to All ({stories.filter(s => s.story_status === 'approved' && (!s.coins_awarded || s.coins_awarded === 0)).length})
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => window.open('https://www.instagram.com', '_blank')}
                className="bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-700 border-pink-200 h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <Instagram className="h-4 w-4 mr-2" />
                Open Instagram
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              // Show shimmer effect while loading
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <ShimmerCard key={index} />
              ))
            ) : (
              getCurrentData().map((story: Story) => {
                const StatusIcon = STATUS_CONFIG[story.story_status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                const userName = story.instagram_users?.full_name || 'Unknown User';
                const username = story.instagram_users?.instagram_username || 'unknown';
                
                // Determine display status
                const displayStatus = story.story_status === 'approved' && (story.coins_awarded || 0) > 0 
                  ? 'coins_assigned' 
                  : story.story_status;
                
                const displayStatusConfig = STATUS_CONFIG[displayStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['approved'];
                const DisplayStatusIcon = displayStatusConfig.icon;
                
                return (
                  <Card key={story.id} className={story.story_status === 'awaiting_review' ? 'border-yellow-200 bg-yellow-50' : story.story_status === 'approved' && (!story.coins_awarded || story.coins_awarded === 0) ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <DisplayStatusIcon className="h-5 w-5 text-gray-600" />
                            <div>
                              <h3 className="font-semibold">{story.story_id}</h3>
                              <p className="text-sm text-gray-600">
                                {userName} (@{username})
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-4 text-sm text-gray-600">
                          <span>Started: {story.story_started_at ? new Date(story.story_started_at).toLocaleString() : 'Unknown'}</span>
                            {story.story_status === 'active' && story.story_expires_at && (
                              <span className="text-green-600 font-medium">
                                {getTimeRemaining(story.story_expires_at)}
                              </span>
                            )}
                            {(story.coins_awarded || 0) > 0 && (
                              <span className="text-yellow-600 font-medium">
                                {story.coins_awarded} coins awarded
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={displayStatusConfig.color}>
                            {displayStatusConfig.label}
                          </Badge>
                          
                          {/* Instagram Profile Button - Always visible for story verification */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToInstagramProfile(username)}
                            className="bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-700 border-pink-200"
                            title={`Check @${username}'s Instagram story`}
                          >
                            <Instagram className="h-4 w-4 mr-1" />
                            Check Story
                          </Button>
                          
                          {story.story_status === 'awaiting_review' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedStory(story);
                                setShowStoryDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                          
                          {/* Show Assign Coins button for ALL approved stories that haven't received coins */}
                          {story.story_status === 'approved' && (!story.coins_awarded || story.coins_awarded === 0) && (
                            <Button
                              size="sm"
                              onClick={() => handleAssignCoins(story)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              title={`Assign ${campaigns.find(c => c.status === 'active')?.per_story_reward || 100} coins to this story`}
                            >
                              <Coins className="h-4 w-4 mr-1" />
                              Assign Coins
                            </Button>
                          )}
                          
                          {/* Show Already Assigned status for stories that have coins */}
                          {story.story_status === 'approved' && (story.coins_awarded || 0) > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              <Coins className="h-3 w-3 mr-1" />
                              Coins Assigned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <PaginationControls />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <h2 className="text-lg font-semibold">Campaign Management</h2>
          
          <div className="grid gap-4">
            {loading ? (
              // Show shimmer effect while loading
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <ShimmerCard key={index} />
              ))
            ) : (
              getCurrentData().map((campaign: Campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{campaign.campaign_name}</h3>
                        <p className="text-sm text-gray-600">{campaign.instructions}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>{campaign.per_story_reward || 0} coins per story</span>
                          <span>{campaign.story_minimum_duration || 24}h duration</span>
                          <span>Until {campaign.campaign_end_date ? new Date(campaign.campaign_end_date).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                      <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <PaginationControls />
        </TabsContent>
      </Tabs>

      {/* Add Influencer Dialog */}
      <Dialog open={showAddInfluencer} onOpenChange={setShowAddInfluencer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Instagram Influencer</DialogTitle>
            <DialogDescription>
              Manually add a new Instagram influencer with minimum 1000 followers to the marketing program.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={newInfluencer.full_name}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <Label htmlFor="instagram_username">Instagram Username *</Label>
              <Input
                id="instagram_username"
                value={newInfluencer.instagram_username}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, instagram_username: e.target.value }))}
                placeholder="username (without @)"
              />
            </div>

            <div>
              <Label htmlFor="followers_count">Followers Count *</Label>
              <Input
                id="followers_count"
                type="number"
                min="1000"
                value={newInfluencer.followers_count}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, followers_count: parseInt(e.target.value) || 1000 }))}
              />
            </div>

            <div>
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input
                id="mobile_number"
                value={newInfluencer.mobile_number}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, mobile_number: e.target.value }))}
                placeholder="Enter mobile number"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newInfluencer.email}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={newInfluencer.password}
                onChange={(e) => setNewInfluencer(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Default: instagram123"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddInfluencer(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddInfluencer} className="flex-1">
                Add Influencer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Review Dialog */}
      <Dialog open={showStoryDetails} onOpenChange={setShowStoryDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Story</DialogTitle>
            <DialogDescription>
              Manually verify the Instagram story and approve or reject it to assign loyalty coins.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStory && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedStory.story_id}</h3>
                <p className="text-sm text-gray-600">
                  {selectedStory.instagram_users?.full_name || 'Unknown User'} (@{selectedStory.instagram_users?.instagram_username || 'unknown'})
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Started: {selectedStory.story_started_at ? new Date(selectedStory.story_started_at).toLocaleString() : 'Unknown'}</p>
                <p>Expires: {selectedStory.story_expires_at ? new Date(selectedStory.story_expires_at).toLocaleString() : 'Unknown'}</p>
              </div>

              <div>
                <Label htmlFor="verification_notes">Verification Notes (Optional)</Label>
                <Textarea
                  id="verification_notes"
                  placeholder="Add notes about the story verification..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const notes = (document.getElementById('verification_notes') as HTMLTextAreaElement)?.value;
                    handleStoryAction(selectedStory.id, 'reject', notes);
                  }}
                  disabled={processingStory}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    const notes = (document.getElementById('verification_notes') as HTMLTextAreaElement)?.value;
                    handleStoryAction(selectedStory.id, 'approve', notes);
                  }}
                  disabled={processingStory}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Story Media Dialog */}
      <Dialog open={showAddStoryMedia} onOpenChange={setShowAddStoryMedia}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Story Media</DialogTitle>
            <DialogDescription>
              Upload image or video content for Instagram stories with instructions and coin rewards.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Upload Method Selection */}
            <div>
              <Label className="text-base font-medium">Media Source</Label>
              <Tabs value={uploadMethod} onValueChange={(value: 'url' | 'upload') => setUploadMethod(value)} className="w-full mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Media URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium">Upload Media File</Label>
                    <div className="mt-2">
                      <ImageUpload
                        onImageUploaded={(url) => {
                          setNewStoryMedia(prev => ({ ...prev, media_url: url }));
                          // Auto-detect media type based on URL extension
                          const extension = url.split('.').pop()?.toLowerCase();
                          if (extension && ['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
                            setNewStoryMedia(prev => ({ ...prev, media_type: 'video' }));
                          } else {
                            setNewStoryMedia(prev => ({ ...prev, media_type: 'image' }));
                          }
                        }}
                        currentImage={newStoryMedia.media_url}
                        folder="instagram-story-media"
                        uploadSource={UPLOAD_SOURCES.INSTAGRAM_STORY_MEDIA}
                        metadata={{
                          module: 'instagram_marketing',
                          story_caption: newStoryMedia.caption,
                          story_instructions: newStoryMedia.instructions
                        }}
                        maxSize={50} // 50MB for videos
                        allowedTypes={[
                          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
                          'video/mp4', 'video/mov', 'video/avi', 'video/webm'
                        ]}
                        showPreview={true}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports images (JPG, PNG, WebP, GIF) and videos (MP4, MOV, AVI, WebM) up to 50MB
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="media_url">Media URL *</Label>
                    <Input
                      id="media_url"
                      value={newStoryMedia.media_url}
                      onChange={(e) => setNewStoryMedia(prev => ({ ...prev, media_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg or https://example.com/video.mp4"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a direct URL to an image or video file
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="media_type">Media Type *</Label>
                    <Select 
                      value={newStoryMedia.media_type} 
                      onValueChange={(value: 'image' | 'video') => setNewStoryMedia(prev => ({ ...prev, media_type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Image
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Media Preview (if URL is provided) */}
            {uploadMethod === 'url' && newStoryMedia.media_url && (
              <div>
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                  {newStoryMedia.media_type === 'image' ? (
                    <img 
                      src={newStoryMedia.media_url} 
                      alt="Media preview"
                      className="max-w-full h-32 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded">
                      <Video className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900">Video File</p>
                        <p className="text-sm text-purple-600">Click to preview: {newStoryMedia.media_url}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={newStoryMedia.caption}
                onChange={(e) => setNewStoryMedia(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Story caption (optional)"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions for Influencers *</Label>
              <Textarea
                id="instructions"
                value={newStoryMedia.instructions}
                onChange={(e) => setNewStoryMedia(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Detailed instructions for influencers on how to post this story..."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide clear instructions on how influencers should use this media in their Instagram stories
              </p>
            </div>

            <div>
              <Label htmlFor="coins_reward">Coins Reward</Label>
              <Input
                id="coins_reward"
                type="number"
                min="1"
                max="1000"
                value={newStoryMedia.coins_reward}
                onChange={(e) => setNewStoryMedia(prev => ({ ...prev, coins_reward: parseInt(e.target.value) || 100 }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of loyalty coins to reward when this story is successfully posted and verified
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddStoryMedia(false);
                  setNewStoryMedia({
                    media_url: '',
                    media_type: 'image',
                    caption: '',
                    instructions: '',
                    coins_reward: 100
                  });
                  setUploadMethod('upload');
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddStoryMedia}
                disabled={!newStoryMedia.media_url || !newStoryMedia.instructions}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Story Media
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Media Dialog */}
      <Dialog open={showAssignMedia} onOpenChange={setShowAssignMedia}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Media to Influencer</DialogTitle>
            <DialogDescription>
              Select an influencer to assign this story media to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMedia && (
              <div className="border rounded-lg p-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {selectedMedia.media_type === 'image' ? (
                      <img 
                        src={selectedMedia.media_url} 
                        alt="Media"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Video className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedMedia.caption || 'No caption'}</p>
                    <p className="text-xs text-gray-600">{selectedMedia.coins_reward} coins reward</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {influencers.filter(inf => inf.status === 'active').map((influencer) => (
                <div key={influencer.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Instagram className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{influencer.full_name}</p>
                      <p className="text-xs text-gray-600">@{influencer.instagram_username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedMedia) {
                        handleAssignMediaToUser(selectedMedia.id, influencer.id);
                        setShowAssignMedia(false);
                      }
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}