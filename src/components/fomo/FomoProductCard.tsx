import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from './CountdownTimer';
import { Zap, ShoppingCart, AlertTriangle, TrendingUp, Fire } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FomoProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    stock_quantity: number;
  };
  onAddToCart?: (productId: string, campaignPrice: number) => void;
  className?: string;
}

interface CampaignData {
  has_campaign: boolean;
  campaign_id: string;
  campaign_name: string;
  original_price: number;
  campaign_price: number;
  discount_amount: number;
  discount_percentage: number;
  time_remaining_minutes: number;
  stock_remaining: number;
  fomo_label: string;
  urgency_message: string;
}

export const FomoProductCard: React.FC<FomoProductCardProps> = ({
  product,
  onAddToCart,
  className = ''
}) => {
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    loadCampaignData();
  }, [product.id]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Call the function to get campaign product price
      const { data, error } = await supabase.rpc('get_campaign_product_price', {
        p_product_id: product.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const campaignInfo = data[0];
        if (campaignInfo.has_campaign) {
          setCampaignData(campaignInfo);
          
          // Track campaign view
          await supabase.rpc('track_campaign_event', {
            p_campaign_id: campaignInfo.campaign_id,
            p_product_id: product.id,
            p_event_type: 'view'
          });
        }
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!campaignData) return;

    try {
      // Track campaign click
      await supabase.rpc('track_campaign_event', {
        p_campaign_id: campaignData.campaign_id,
        p_product_id: product.id,
        p_event_type: 'add_to_cart'
      });

      onAddToCart?.(product.id, campaignData.campaign_price);
      toast.success('Added to cart with campaign price!');
    } catch (error) {
      console.error('Error tracking campaign event:', error);
      onAddToCart?.(product.id, campaignData.campaign_price);
    }
  };

  const handleCampaignExpire = () => {
    setIsExpired(true);
    setCampaignData(null);
    toast.info('Campaign has expired for this product');
  };

  const getStockWarningColor = (stockRemaining: number, threshold: number = 5) => {
    if (stockRemaining <= 1) return 'text-red-600 bg-red-50';
    if (stockRemaining <= threshold) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getUrgencyLevel = (timeRemaining: number, stockRemaining: number) => {
    if (timeRemaining <= 60 || stockRemaining <= 2) return 'high';
    if (timeRemaining <= 180 || stockRemaining <= 5) return 'medium';
    return 'low';
  };

  // If no campaign or expired, show regular product card
  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaignData || isExpired) {
    return (
      <Card className={`hover:shadow-lg transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="text-gray-400">No Image</div>
            )}
          </div>
          
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
          <p className="text-lg font-bold text-gray-900 mb-3">₹{product.price.toLocaleString()}</p>
          
          <Button 
            className="w-full" 
            onClick={() => onAddToCart?.(product.id, product.price)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </CardContent>
      </Card>
    );
  }

  const urgencyLevel = getUrgencyLevel(campaignData.time_remaining_minutes, campaignData.stock_remaining);
  const endDate = new Date(Date.now() + campaignData.time_remaining_minutes * 60 * 1000).toISOString();

  return (
    <Card className={`relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 ${
      urgencyLevel === 'high' ? 'border-red-300 shadow-red-100' :
      urgencyLevel === 'medium' ? 'border-orange-300 shadow-orange-100' :
      'border-yellow-300 shadow-yellow-100'
    } ${className}`}>
      
      {/* FOMO Badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge className={`${
          urgencyLevel === 'high' ? 'bg-red-600 text-white' :
          urgencyLevel === 'medium' ? 'bg-orange-600 text-white' :
          'bg-yellow-600 text-white'
        } flex items-center gap-1 animate-pulse`}>
          <Zap className="h-3 w-3" />
          {campaignData.fomo_label}
        </Badge>
      </div>

      {/* Discount Badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-green-600 text-white font-bold">
          {campaignData.discount_percentage}% OFF
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-gray-400">No Image</div>
          )}
          
          {/* Trending Indicator */}
          {urgencyLevel === 'high' && (
            <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Fire className="h-3 w-3" />
              Hot Deal
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
        
        {/* Pricing */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-green-600">
            ₹{campaignData.campaign_price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 line-through">
            ₹{campaignData.original_price.toLocaleString()}
          </span>
          <span className="text-xs text-green-600 font-medium">
            Save ₹{campaignData.discount_amount.toLocaleString()}
          </span>
        </div>

        {/* Countdown Timer */}
        <div className="mb-3">
          <CountdownTimer 
            endDate={endDate}
            onExpire={handleCampaignExpire}
            size="sm"
            className="w-full justify-center"
          />
        </div>

        {/* Stock Warning */}
        {campaignData.stock_remaining <= 10 && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg mb-3 ${getStockWarningColor(campaignData.stock_remaining)}`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {campaignData.stock_remaining <= 1 ? 
                'Last piece!' : 
                `Only ${campaignData.stock_remaining} left!`
              }
            </span>
          </div>
        )}

        {/* Urgency Message */}
        <p className={`text-xs font-medium mb-3 ${
          urgencyLevel === 'high' ? 'text-red-600' :
          urgencyLevel === 'medium' ? 'text-orange-600' :
          'text-yellow-600'
        }`}>
          {campaignData.urgency_message}
        </p>

        {/* Add to Cart Button */}
        <Button 
          className={`w-full ${
            urgencyLevel === 'high' ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
            urgencyLevel === 'medium' ? 'bg-orange-600 hover:bg-orange-700' :
            'bg-yellow-600 hover:bg-yellow-700'
          } text-white font-semibold`}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {urgencyLevel === 'high' ? 'Buy Now!' : 'Add to Cart'}
        </Button>

        {/* Social Proof */}
        {campaignData.stock_remaining <= 5 && (
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-600">
            <TrendingUp className="h-3 w-3" />
            <span>Selling fast - {Math.floor(Math.random() * 20) + 5} people viewing</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};