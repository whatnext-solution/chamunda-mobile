import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Info, Eye, EyeOff } from 'lucide-react';

const OfferPopupTester: React.FC = () => {
  const checkOfferStatus = () => {
    const hasShown = localStorage.getItem('offer_popup_shown');
    const timestamp = localStorage.getItem('offer_popup_shown_timestamp');
    
    console.log('Offer Popup Status:', {
      hasShown: !!hasShown,
      timestamp: timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Never shown',
      localStorage_keys: Object.keys(localStorage).filter(key => key.includes('offer'))
    });
  };

  const resetOfferPopup = () => {
    localStorage.removeItem('offer_popup_shown');
    localStorage.removeItem('offer_popup_shown_timestamp');
    console.log('✅ Offer popup reset - will show on next page load');
    
    // Reload page to trigger popup
    window.location.reload();
  };

  const forceShowOfferPopup = () => {
    // Temporarily remove the flag
    const wasShown = localStorage.getItem('offer_popup_shown');
    localStorage.removeItem('offer_popup_shown');
    
    // Reload page
    window.location.reload();
  };

  const permanentlyDisableOfferPopup = () => {
    localStorage.setItem('offer_popup_shown', 'true');
    localStorage.setItem('offer_popup_shown_timestamp', Date.now().toString());
    localStorage.setItem('offer_popup_disabled_by_admin', 'true');
    console.log('🚫 Offer popup permanently disabled');
  };

  const getOfferStatus = () => {
    const hasShown = localStorage.getItem('offer_popup_shown');
    const timestamp = localStorage.getItem('offer_popup_shown_timestamp');
    const disabledByAdmin = localStorage.getItem('offer_popup_disabled_by_admin');
    
    if (disabledByAdmin) return { status: 'Disabled by Admin', color: 'text-red-600' };
    if (hasShown) return { 
      status: `Shown on ${timestamp ? new Date(parseInt(timestamp)).toLocaleDateString() : 'Unknown date'}`, 
      color: 'text-orange-600' 
    };
    return { status: 'Ready to Show', color: 'text-green-600' };
  };

  const statusInfo = getOfferStatus();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Offer Popup Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Status:</strong> <span className={statusInfo.color}>{statusInfo.status}</span></p>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={checkOfferStatus}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Check Status (Console)
          </Button>
          
          <Button
            onClick={resetOfferPopup}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset & Show Again
          </Button>
          
          <Button
            onClick={forceShowOfferPopup}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Force Show Once
          </Button>
          
          <Button
            onClick={permanentlyDisableOfferPopup}
            variant="destructive"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <EyeOff className="h-4 w-4" />
            Disable Permanently
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Offer popup shows only once per visitor</p>
          <p>• Uses localStorage to track visitors</p>
          <p>• Reset to test functionality</p>
          <p>• Check browser console for logs</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferPopupTester;