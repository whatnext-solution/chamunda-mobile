import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { RotateCcw, Info } from 'lucide-react';

const WelcomeDialogTester: React.FC = () => {
  const { user } = useAuth();

  const resetWelcomeDialog = () => {
    if (user?.id) {
      // Remove from both session and local storage
      sessionStorage.removeItem(`welcome_shown_${user.id}`);
      localStorage.removeItem(`welcome_shown_${user.id}`);
      localStorage.removeItem(`welcome_shown_${user.id}_timestamp`);
      
      // Set flag to trigger welcome on next page load
      localStorage.setItem('just_logged_in', 'true');
      
      // Reload page to trigger welcome dialog
      window.location.reload();
    }
  };

  const checkWelcomeStatus = () => {
    if (user?.id) {
      const sessionShown = sessionStorage.getItem(`welcome_shown_${user.id}`);
      const localShown = localStorage.getItem(`welcome_shown_${user.id}`);
      const timestamp = localStorage.getItem(`welcome_shown_${user.id}_timestamp`);
      
      console.log('Welcome Dialog Status:', {
        userId: user.id,
        sessionShown: !!sessionShown,
        localShown: !!localShown,
        timestamp: timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Never'
      });
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Welcome Dialog Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Please login to test welcome dialog</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Welcome Dialog Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>User:</strong> {user.user_metadata?.full_name || user.email}</p>
          <p><strong>ID:</strong> {user.id.substring(0, 8)}...</p>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={checkWelcomeStatus}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Check Welcome Status
          </Button>
          
          <Button
            onClick={resetWelcomeDialog}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset & Show Welcome Again
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>• Welcome dialog shows only once per user</p>
          <p>• Use reset button to test again</p>
          <p>• Check console for status details</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeDialogTester;