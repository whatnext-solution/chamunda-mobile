import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormShimmer, CardShimmer } from '@/components/ui/Shimmer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings, 
  Store, 
  MapPin, 
  MessageSquare, 
  Palette, 
  Monitor,
  Phone,
  Mail,
  Globe,
  Image,
  Smartphone,
  AlertTriangle,
  MessageCircle,
  TestTube,
  Play
} from 'lucide-react';
import OfferPopupTester from './OfferPopupTester';
import HeroCarouselManagement from './HeroCarouselManagement';

interface WebsiteSettings {
  id?: string;
  business_id?: string;
  shop_name?: string;
  shop_logo_url?: string;
  shop_description?: string;
  shop_address?: string;
  shop_phone?: string;
  shop_email?: string;
  social_links_json?: Record<string, any> | null;
  latitude?: number;
  longitude?: number;
  google_map_iframe_url?: string;
  popup_enabled?: boolean;
  popup_image_url?: string;
  whatsapp_number?: string;
  product_inquiry_template?: string;
  floating_button_template?: string;
  offer_popup_template?: string;
  navbar_json?: any;
  hero_json?: any;
  footer_text?: string;
  primary_color?: string;
  secondary_color?: string;
  maintenance_mode?: boolean;
}

export default function WebsiteSettings() {
  const [settings, setSettings] = useState<WebsiteSettings>({
    shop_name: 'Electro Hub',
    shop_description: 'Your one-stop shop for the latest electronics and gadgets. Quality products, competitive prices, exceptional service.',
    shop_address: '',
    shop_phone: '',
    shop_email: '',
    social_links_json: {},
    latitude: 0,
    longitude: 0,
    google_map_iframe_url: '',
    popup_enabled: false,
    popup_image_url: '',
    whatsapp_number: '',
    product_inquiry_template: "Hi! I'm interested in this product: {{product_name}}. Can you provide more details?",
    floating_button_template: "Hi! I need help with your products and services.",
    offer_popup_template: "Hi! I saw your special offer and I'm interested. Can you tell me more?",
    navbar_json: [],
    hero_json: {},
    footer_text: '© 2024 Electro Hub. All rights reserved.',
    primary_color: '#000000',
    secondary_color: '#ffffff',
    maintenance_mode: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    linkedin: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.warn('Website settings loading timeout - using defaults');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const fetchSettings = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        setError(`Database error: ${error.message}. Please make sure the website_settings table exists and has the required columns.`);
        return;
      }

      if (data) {
        // Type cast the data to match our interface
        const settingsData: WebsiteSettings = {
          ...data,
          social_links_json: data.social_links_json as Record<string, any> | null
        };
        setSettings(settingsData);
        
        if (data.social_links_json && typeof data.social_links_json === 'object' && !Array.isArray(data.social_links_json)) {
          const socialData = data.social_links_json as Record<string, any>;
          setSocialLinks({
            facebook: socialData.facebook || '',
            instagram: socialData.instagram || '',
            twitter: socialData.twitter || '',
            youtube: socialData.youtube || '',
            linkedin: socialData.linkedin || ''
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching website settings:', error);
      setError(`Failed to load settings: ${error.message}. Please check your database connection.`);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settingsData = {
        ...settings,
        social_links_json: socialLinks,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('website_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('website_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      toast.success('Website settings saved successfully!');
      fetchSettings(); // Refresh data
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WebsiteSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <h3 className="font-medium text-sm sm:text-base">Error Loading Settings</h3>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-1 text-xs sm:text-sm">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              fetchSettings();
            }} 
            variant="outline" 
            size="sm" 
            className="mt-2 h-9 sm:h-8 touch-manipulation"
          >
            Try Again
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-6 sm:p-8">
          <div className="space-y-4 sm:space-y-6 w-full">
            {/* Header Shimmer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
              <div className="h-10 sm:h-11 w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
            </div>

            {/* Tabs Shimmer */}
            <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 sm:h-9 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
              ))}
            </div>

            {/* Form Cards Shimmer */}
            <div className="space-y-4 sm:space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <FormShimmer />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Website Settings
          </h2>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto gap-1">
          <TabsTrigger value="general" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            General
          </TabsTrigger>
          <TabsTrigger value="carousel" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            Carousel
          </TabsTrigger>
          <TabsTrigger value="location" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            Location
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="popup" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            Popup
          </TabsTrigger>
          <TabsTrigger value="design" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            Design
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="h-10 sm:h-9 text-xs sm:text-sm touch-manipulation">
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  Shop Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
                <div>
                  <Label htmlFor="shop_name" className="mb-1.5 block text-sm">Shop Name</Label>
                  <Input
                    id="shop_name"
                    value={settings.shop_name || ''}
                    onChange={(e) => handleInputChange('shop_name', e.target.value)}
                    placeholder="Enter shop name"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_logo_url" className="mb-1.5 block text-sm">Logo URL</Label>
                  <Input
                    id="shop_logo_url"
                    value={settings.shop_logo_url || ''}
                    onChange={(e) => handleInputChange('shop_logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Upload your logo to a service like Imgur or use a direct image URL
                  </p>
                </div>
                <div>
                  <Label htmlFor="shop_description" className="mb-1.5 block text-sm">Shop Description</Label>
                  <Textarea
                    id="shop_description"
                    value={settings.shop_description || ''}
                    onChange={(e) => handleInputChange('shop_description', e.target.value)}
                    placeholder="Brief description of your shop"
                    rows={2}
                    className="touch-manipulation"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This will be displayed in the footer and other places
                  </p>
                </div>
                <div>
                  <Label htmlFor="shop_address" className="mb-1.5 block text-sm">Address</Label>
                  <Textarea
                    id="shop_address"
                    value={settings.shop_address || ''}
                    onChange={(e) => handleInputChange('shop_address', e.target.value)}
                    placeholder="Enter shop address"
                    rows={3}
                    className="touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_phone" className="mb-1.5 block text-sm">Phone</Label>
                  <Input
                    id="shop_phone"
                    value={settings.shop_phone || ''}
                    onChange={(e) => handleInputChange('shop_phone', e.target.value)}
                    placeholder="+1234567890"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_email" className="mb-1.5 block text-sm">Email</Label>
                  <Input
                    id="shop_email"
                    type="email"
                    value={settings.shop_email || ''}
                    onChange={(e) => handleInputChange('shop_email', e.target.value)}
                    placeholder="info@shop.com"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  Social Media Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
                <div>
                  <Label htmlFor="facebook" className="mb-1.5 block text-sm">Facebook</Label>
                  <Input
                    id="facebook"
                    value={socialLinks.facebook}
                    onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="mb-1.5 block text-sm">Instagram</Label>
                  <Input
                    id="instagram"
                    value={socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/yourpage"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="mb-1.5 block text-sm">Twitter</Label>
                  <Input
                    id="twitter"
                    value={socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/yourpage"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube" className="mb-1.5 block text-sm">YouTube</Label>
                  <Input
                    id="youtube"
                    value={socialLinks.youtube}
                    onChange={(e) => handleSocialLinkChange('youtube', e.target.value)}
                    placeholder="https://youtube.com/yourchannel"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin" className="mb-1.5 block text-sm">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={socialLinks.linkedin}
                    onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourcompany"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="carousel">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                Hero Carousel Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
              <HeroCarouselManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                Location & Map Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="latitude" className="mb-1.5 block text-sm">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={settings.latitude || ''}
                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                    placeholder="0.000000"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="mb-1.5 block text-sm">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={settings.longitude || ''}
                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                    placeholder="0.000000"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="google_map_iframe_url" className="mb-1.5 block text-sm">Google Maps Embed URL</Label>
                <Textarea
                  id="google_map_iframe_url"
                  value={settings.google_map_iframe_url || ''}
                  onChange={(e) => handleInputChange('google_map_iframe_url', e.target.value)}
                  placeholder="Paste Google Maps embed iframe src URL here"
                  rows={3}
                  className="touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Get this from Google Maps → Share → Embed a map → Copy the src URL from the iframe
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                WhatsApp Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 text-sm sm:text-base">📱 WhatsApp Integration</h4>
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                  Configure your WhatsApp number and custom messages for different scenarios. 
                  Users will be able to contact you directly from the website and popup.
                </p>
              </div>

              <div>
                <Label htmlFor="whatsapp_number" className="mb-1.5 block text-sm">WhatsApp Number *</Label>
                <Input
                  id="whatsapp_number"
                  value={settings.whatsapp_number || ''}
                  onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                  placeholder="+1234567890"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Include country code (e.g., +91 for India, +1 for USA)
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="product_inquiry_template" className="mb-1.5 block text-sm">Product Inquiry Message</Label>
                  <Textarea
                    id="product_inquiry_template"
                    value={settings.product_inquiry_template || ''}
                    onChange={(e) => handleInputChange('product_inquiry_template', e.target.value)}
                    placeholder="Hi! I'm interested in this product: {{product_name}}. Can you provide more details?"
                    rows={3}
                    className="touch-manipulation"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Used when users click "WhatsApp" on product pages. Use {`{{product_name}}`} to include the product name automatically.
                  </p>
                </div>

                <div>
                  <Label htmlFor="floating_button_template" className="mb-1.5 block text-sm">Floating WhatsApp Button Message</Label>
                  <Textarea
                    id="floating_button_template"
                    value={settings.floating_button_template || ''}
                    onChange={(e) => handleInputChange('floating_button_template', e.target.value)}
                    placeholder="Hi! I need help with your products and services."
                    rows={2}
                    className="touch-manipulation"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Used when users click the floating WhatsApp button (bottom-right corner).
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
                  <Label htmlFor="offer_popup_template" className="text-yellow-900 dark:text-yellow-100 font-medium text-sm sm:text-base">
                    🎉 Popup WhatsApp Message (Special Offers)
                  </Label>
                  <Textarea
                    id="offer_popup_template"
                    value={settings.offer_popup_template || ''}
                    onChange={(e) => handleInputChange('offer_popup_template', e.target.value)}
                    placeholder="Hi! I saw your special offer and I'm interested. Can you tell me more?"
                    rows={3}
                    className="mt-2 touch-manipulation"
                  />
                  <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                    <strong>This message is used when users click WhatsApp button in the popup offer!</strong> 
                    Make it compelling to convert visitors into customers.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">💡 Message Tips:</h4>
                <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Keep messages friendly and professional</li>
                  <li>• Include your business name for brand recognition</li>
                  <li>• Make popup messages exciting to encourage contact</li>
                  <li>• Test messages by clicking WhatsApp buttons on your site</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popup">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                Popup Banner Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">📱 Popup Display:</h4>
                <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Shows at bottom center after 3 seconds</li>
                  <li>• Contains: Image + WhatsApp Button + Later Button</li>
                  <li>• Appears once per browser session</li>
                  <li>• Fully controlled from admin panel</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="popup_enabled"
                  checked={settings.popup_enabled || false}
                  onCheckedChange={(checked) => handleInputChange('popup_enabled', checked)}
                />
                <Label htmlFor="popup_enabled" className="text-sm">Enable Popup Banner</Label>
              </div>

              <div>
                <Label htmlFor="popup_image_url" className="mb-1.5 block text-sm">Popup Image URL *</Label>
                <Input
                  id="popup_image_url"
                  value={settings.popup_image_url || ''}
                  onChange={(e) => handleInputChange('popup_image_url', e.target.value)}
                  placeholder="https://example.com/popup-banner.jpg"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upload your offer image to a service like Imgur or use a direct image URL
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 text-sm sm:text-base">📱 WhatsApp Integration:</h4>
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 mb-2">
                  When users click WhatsApp button, they'll be redirected to WhatsApp with your custom message.
                </p>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  <strong>Current message:</strong> "{settings.offer_popup_template || 'Not set - configure in WhatsApp tab'}"
                </p>
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-2">
                  💡 Go to <strong>WhatsApp tab</strong> to customize this message!
                </p>
              </div>

              {settings.popup_image_url && (
                <div>
                  <Label className="mb-1.5 block text-sm">Image Preview:</Label>
                  <div className="mt-2 border dark:border-gray-700 rounded-lg overflow-hidden w-full sm:w-80 max-w-full">
                    <img
                      src={settings.popup_image_url}
                      alt="Popup Image Preview"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K';
                      }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This image will appear in the popup with WhatsApp and Later buttons below it
                  </p>
                </div>
              )}

              {/* Offer Popup Tester */}
              <div className="border-t dark:border-gray-700 pt-4 sm:pt-6">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Testing & Debug</h4>
                </div>
                <OfferPopupTester />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                Design & Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="primary_color" className="mb-1.5 block text-sm">Primary Color</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={settings.primary_color || '#000000'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_color" className="mb-1.5 block text-sm">Secondary Color</Label>
                  <Input
                    id="secondary_color"
                    type="color"
                    value={settings.secondary_color || '#ffffff'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="footer_text" className="mb-1.5 block text-sm">Footer Text</Label>
                <Input
                  id="footer_text"
                  value={settings.footer_text || ''}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="© 2024 Your Shop Name. All rights reserved."
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenance_mode"
                  checked={settings.maintenance_mode || false}
                  onCheckedChange={(checked) => handleInputChange('maintenance_mode', checked)}
                />
                <Label htmlFor="maintenance_mode" className="text-sm">Enable Maintenance Mode</Label>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                When enabled, visitors will see a maintenance page instead of your website.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}