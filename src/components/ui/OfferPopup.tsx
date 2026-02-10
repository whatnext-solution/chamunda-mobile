import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Button } from '@/components/ui/button';

export function OfferPopup() {
  const { settings, getOfferPopupLink } = useWebsiteSettings();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if popup is enabled
    if (!settings?.popup_enabled) {
      console.log('❌ Offer popup blocked: popup not enabled');
      return;
    }

    // Check if user has already seen the offer popup
    const hasSeenOffer = localStorage.getItem('offer_popup_shown');
    if (hasSeenOffer) {
      console.log('❌ Offer popup blocked: already shown to this visitor');
      return;
    }

    // Check if required settings are available
    if (!settings?.popup_image_url) {
      console.log('❌ Offer popup blocked: missing image');
      return;
    }

    console.log('✅ First-time visitor detected - showing offer popup after 3 seconds');
    
    // Show popup after 3 seconds for first-time visitors only
    const timer = setTimeout(() => {
      console.log('🚀 Showing offer popup to first-time visitor');
      setIsVisible(true);
      // Mark as shown so it won't appear again
      localStorage.setItem('offer_popup_shown', 'true');
      localStorage.setItem('offer_popup_shown_timestamp', Date.now().toString());
    }, 3000);

    return () => clearTimeout(timer);
  }, [settings?.popup_enabled, settings?.popup_image_url]);

  const handleClose = () => {
    console.log('🔒 Offer popup closed by user');
    setIsVisible(false);
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Popup - Bottom Center with Enhanced Animation */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="animate-slide-up bg-white rounded-2xl shadow-2xl w-80 max-w-[90vw] mx-4 overflow-hidden border border-gray-200">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all duration-200 hover:scale-110"
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Offer Image */}
          <div className="relative">
            <img
              src={settings.popup_image_url}
              alt="Special Offer"
              className="w-full h-48 object-cover"
              onError={(e) => {
                console.log('❌ Offer popup image failed to load');
                handleClose();
              }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                className="flex-1 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                View Offers
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="px-6 font-medium py-3 rounded-lg border-2 hover:bg-gray-50 transition-all duration-200"
              >
                Maybe Later
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              🎉 Limited time offer - Don't miss out!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}