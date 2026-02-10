import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from './CountdownTimer';
import { Zap, ArrowRight, Fire, Clock, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface FomoBannerProps {
  className?: string;
  showOnHomepage?: boolean;
}

interface ActiveCampaign {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  time_remaining_minutes: number;
  total_products: number;
  total_stock_remaining: number;
}

export const FomoBanner: React.FC<FomoBannerProps> = ({
  className = '',
  showOnHomepage = true
}) => {
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [currentCampaignIndex, setCCurrentCampaignIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveCampaigns();
    
    // Auto-rotate campaigns every 10 seconds
    const interval = setInterval(() => {
      setCCurrentCampaignIndex(prev => 
        prev >= activeCampaigns.length - 1 ? 0 : prev + 1
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [activeCampaigns.length]);

  const loadActiveCampaigns = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_active_campaigns');
      
      if (error) throw error;
      
      setActiveCampaigns(data || []);
    } catch (error) {
      console.error('Error loading active campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case 'flash_sale': return <Zap className="h-6 w-6" />;
      case 'today_only': return <Clock className="h-6 w-6" />;
      case 'limited_stock': return <Package className="h-6 w-6" />;
      default: return <Fire className="h-6 w-6" />;
    }
  };

  const getCampaignGradient = (type: string) => {
    switch (type) {
      case 'flash_sale': return 'from-yellow-500 to-red-500';
      case 'today_only': return 'from-blue-500 to-purple-500';
      case 'limited_stock': return 'from-red-500 to-pink-500';
      default: return 'from-orange-500 to-red-500';
    }
  };

  const getCampaignMessage = (campaign: ActiveCampaign) => {
    switch (campaign.campaign_type) {
      case 'flash_sale':
        return `⚡ Flash Sale: ${campaign.total_products} products at amazing prices!`;
      case 'today_only':
        return `🔥 Today Only: Special deals ending at midnight!`;
      case 'limited_stock':
        return `📦 Limited Stock: Only ${campaign.total_stock_remaining} items left!`;
      default:
        return `🎯 Special Offer: Don't miss out on great deals!`;
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeCampaigns.length === 0) {
    return null;
  }

  const currentCampaign = activeCampaigns[currentCampaignIndex];
  const endDate = currentCampaign?.end_date;

  return (
    <Card className={`relative overflow-hidden border-0 shadow-lg ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${getCampaignGradient(currentCampaign?.campaign_type)} opacity-90`}></div>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'float 6s ease-in-out infinite'
        }}></div>
      </div>

      <CardContent className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Campaign Info */}
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              {getCampaignIcon(currentCampaign?.campaign_type)}
            </div>
            
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                {currentCampaign?.campaign_name}
              </h2>
              <p className="text-white/90 text-sm md:text-base">
                {getCampaignMessage(currentCampaign)}
              </p>
            </div>
          </div>

          {/* Timer and CTA */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            {endDate && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <CountdownTimer 
                  endTime={endDate}
                  size="md"
                  className="text-white border-white/30 bg-white/10"
                />
              </div>
            )}
            
            <Link to="/products">
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Shop Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Campaign Indicators */}
        {activeCampaigns.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {activeCampaigns.map((_, index) => (
              <button
                key={index}
                onClick={() => setCCurrentCampaignIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentCampaignIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* Urgency Indicators */}
        <div className="flex items-center justify-center gap-6 mt-4 text-white/80 text-xs">
          <div className="flex items-center gap-1">
            <Fire className="h-4 w-4" />
            <span>Limited Time</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{currentCampaign?.total_stock_remaining} Items Left</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>Fast Selling</span>
          </div>
        </div>
      </CardContent>

      {/* Floating Elements */}
      <div className="absolute top-4 right-4 animate-bounce">
        <div className="w-3 h-3 bg-white/30 rounded-full"></div>
      </div>
      <div className="absolute bottom-4 left-4 animate-bounce" style={{ animationDelay: '1s' }}>
        <div className="w-2 h-2 bg-white/20 rounded-full"></div>
      </div>
    </Card>
  );
};

// Add CSS animation for floating effect
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);