import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { storageTrackingService, DATA_OPERATION_SOURCES, UPLOAD_SOURCES } from '@/services/storageTrackingService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Shield,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
  Mail
} from 'lucide-react';

interface AffiliateProfile {
  id: string;
  user_id: string;
  full_name?: string;
  mobile_number?: string;
  date_of_birth?: string;
  profile_image_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_account_holder_name?: string;
  pan_number?: string;
  aadhar_number?: string;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export default function AffiliateProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');

  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    date_of_birth: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_account_holder_name: '',
    pan_number: '',
    aadhar_number: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First try direct table query (more reliable)
      const { data: directData, error: directError } = await supabase
        .from('affiliate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (directData) {
        setProfile(directData);
        populateForm(directData);
        return;
      }

      // If no profile found, try to create one
      if (directError && directError.code === 'PGRST116') {
        // Create a new profile
        const { data: newProfile, error: createError } = await supabase
          .from('affiliate_profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Affiliate',
            country: 'India'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          // Try the RPC function as fallback
          const { data: rpcData, error: rpcError } = await (supabase as any)
            .rpc('get_or_create_affiliate_profile', { input_user_id: user.id });

          if (rpcError) {
            throw rpcError;
          }

          if (rpcData && rpcData.length > 0) {
            const profileData = rpcData[0];
            setProfile(profileData);
            populateForm(profileData);
          }
          return;
        }

        // Track affiliate profile creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'affiliate_profiles',
          record_id: newProfile.id,
          operation_source: DATA_OPERATION_SOURCES.USER_PROFILE_UPDATE,
          operated_by: user.id,
          metadata: {
            full_name: newProfile.full_name,
            country: newProfile.country,
            user_email: user.email,
            profile_type: 'affiliate',
            creation_method: 'direct_insert'
          }
        });

        if (newProfile) {
          setProfile(newProfile);
          populateForm(newProfile);
        }
        return;
      }

      // If other error, throw it
      if (directError) {
        throw directError;
      }

    } catch (error) {
      console.error('Error fetching affiliate profile:', error);
      toast.error('Failed to load profile. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (profileData: AffiliateProfile) => {
    setFormData({
      full_name: profileData.full_name || '',
      mobile_number: profileData.mobile_number || '',
      date_of_birth: profileData.date_of_birth || '',
      bio: profileData.bio || '',
      address: profileData.address || '',
      city: profileData.city || '',
      state: profileData.state || '',
      postal_code: profileData.postal_code || '',
      country: profileData.country || 'India',
      bank_account_number: profileData.bank_account_number || '',
      bank_ifsc_code: profileData.bank_ifsc_code || '',
      bank_account_holder_name: profileData.bank_account_holder_name || '',
      pan_number: profileData.pan_number || '',
      aadhar_number: profileData.aadhar_number || ''
    });
    setProfileImage(profileData.profile_image_url || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      setSaving(true);

      const updateData = {
        ...formData,
        profile_image_url: profileImage,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('affiliate_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Track affiliate profile update
      await storageTrackingService.trackDataOperation({
        operation_type: 'update',
        table_name: 'affiliate_profiles',
        record_id: profile.id,
        operation_source: DATA_OPERATION_SOURCES.USER_PROFILE_UPDATE,
        operated_by: user.id,
        metadata: {
          full_name: formData.full_name,
          mobile_number: formData.mobile_number,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          has_profile_image: !!profileImage,
          user_email: user.email,
          profile_type: 'affiliate'
        }
      });

      toast.success('Profile updated successfully!');
      await fetchProfile(); // Refresh to get updated completion status
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    const requiredFields = [
      'full_name', 'mobile_number', 'date_of_birth', 
      'address', 'city', 'state'
    ];
    const filledFields = requiredFields.filter(field => 
      formData[field as keyof typeof formData]?.trim()
    );
    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Affiliate Profile</h1>
            <p className="text-gray-600 mt-1">Manage your affiliate account information</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={profile?.is_profile_complete ? "default" : "secondary"}>
              {profile?.is_profile_complete ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-1" />
              )}
              {completionPercentage}% Complete
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <Label>Profile Image</Label>
                  <ImageUpload
                    onImageUploaded={setProfileImage}
                    currentImage={profileImage}
                    folder="affiliate-profiles"
                    uploadSource={UPLOAD_SOURCES.USER_AFFILIATE_BANNERS}
                    metadata={{
                      module: 'affiliate_profile',
                      affiliate_id: user?.id,
                      profile_type: 'avatar'
                    }}
                    maxSize={2}
                    allowedTypes={['image/jpeg', 'image/jpg', 'image/png']}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Auto-fetched)</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile_number">Mobile Number *</Label>
                  <div className="relative">
                    <Input
                      id="mobile_number"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="+91 9876543210"
                      required
                    />
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <div className="relative">
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your complete address"
                  required
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="PIN Code"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banking & KYC Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Banking & KYC Information
              </CardTitle>
              <p className="text-sm text-gray-600">
                Required for commission payments and tax compliance
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_account_holder_name">Account Holder Name</Label>
                  <Input
                    id="bank_account_holder_name"
                    value={formData.bank_account_holder_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_holder_name: e.target.value })}
                    placeholder="As per bank records"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="Account number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                  <Input
                    id="bank_ifsc_code"
                    value={formData.bank_ifsc_code}
                    onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="IFSC Code"
                  />
                </div>
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <div className="relative">
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                    <Shield className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <div className="relative">
                  <Input
                    id="aadhar_number"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                    placeholder="1234 5678 9012"
                    maxLength={12}
                  />
                  <Shield className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}