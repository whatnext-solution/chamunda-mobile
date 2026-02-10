import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { CheckCircle, Sparkles, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [autoClose, setAutoClose] = useState(true);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setAutoClose(true);
      return;
    }

    // Log welcome dialog shown
    console.log('Welcome dialog shown for user:', user?.email);

    const timeouts = [
      setTimeout(() => setStep(1), 300),   // Welcome text
      setTimeout(() => setStep(2), 900),   // User info
      setTimeout(() => setStep(3), 1500),  // Success icon
      setTimeout(() => setStep(4), 2100),  // Final message
    ];

    // Auto close after 3.5 seconds if enabled
    const autoCloseTimeout = setTimeout(() => {
      if (autoClose) {
        console.log('Welcome dialog auto-closing');
        onClose();
      }
    }, 3500);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(autoCloseTimeout);
    };
  }, [open, onClose, autoClose, user?.email]);

  const handleManualClose = () => {
    console.log('Welcome dialog manually closed');
    setAutoClose(false);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-2xl rounded-2xl overflow-hidden">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-full h-8 w-8 opacity-70 hover:opacity-100 z-10"
          onClick={handleManualClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200 rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-200 rounded-full translate-x-12 translate-y-12"></div>
        </div>

        <div className="text-center space-y-4 pt-8 pb-8 px-6 relative z-10">
          {/* Welcome Icon */}
          <div className={`transition-all duration-700 ${
            step >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4'
          }`}>
            <div className={step >= 1 ? 'animate-welcome-bounce' : ''}>
              <div className="relative">
                <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
                <div className="absolute inset-0 h-16 w-16 mx-auto bg-yellow-200 rounded-full opacity-30 animate-ping"></div>
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <div className={`transition-all duration-600 delay-200 ${
            step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-welcome-fade-up">
              Welcome!
            </h2>
            <p className="text-sm text-gray-600 mt-2">You're now signed in</p>
          </div>

          {/* User Info */}
          <div className={`space-y-4 transition-all duration-600 delay-400 ${
            step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            <div className="flex flex-col items-center space-y-3">
              {user?.user_metadata?.avatar_url && (
                <div className="relative">
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className={`w-16 h-16 rounded-full border-4 border-white shadow-lg transition-all duration-500 ${
                      step >= 2 ? 'animate-welcome-scale' : 'scale-0'
                    }`}
                  />
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 animate-pulse"></div>
                </div>
              )}
              <div className="text-center animate-welcome-fade-up">
                <p className="text-lg font-semibold text-gray-800">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Success Icon */}
          <div className={`flex justify-center transition-all duration-600 delay-600 ${
            step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}>
            <div className="relative">
              <CheckCircle className={`h-10 w-10 text-green-500 ${
                step >= 3 ? 'animate-welcome-scale' : ''
              }`} />
              <div className="absolute inset-0 h-10 w-10 bg-green-200 rounded-full opacity-30 animate-ping"></div>
            </div>
          </div>

          {/* Final Message */}
          <div className={`text-center space-y-3 transition-all duration-600 delay-800 ${
            step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <p className="text-base text-gray-700 font-medium animate-welcome-fade-up">
              You're all set to explore!
            </p>
            <div className="flex justify-center">
              <Heart className={`h-5 w-5 text-red-500 ${
                step >= 4 ? 'animate-pulse' : ''
              }`} />
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 pt-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  step > i 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                    : 'bg-gray-300'
                } ${step === i + 1 ? 'animate-pulse scale-125' : ''}`}
              />
            ))}
          </div>

          {/* Manual Close Button */}
          <div className={`flex justify-center pt-2 transition-all duration-500 ${
            step >= 4 ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualClose}
              className="text-xs bg-white/50 hover:bg-white/80 border-gray-200"
            >
              Continue Shopping
            </Button>
          </div>

          {/* Debug Info (Remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mt-4">
              User ID: {user?.id?.substring(0, 8)}...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;