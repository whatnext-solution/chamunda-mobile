import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { CheckCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface CompactWelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

const CompactWelcomeDialog: React.FC<CompactWelcomeDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }

    const timeouts = [
      setTimeout(() => setStep(1), 200),   // Welcome
      setTimeout(() => setStep(2), 800),   // User info
      setTimeout(() => setStep(3), 1400),  // Success
    ];

    // Auto close after 2.5 seconds
    const autoCloseTimeout = setTimeout(() => {
      onClose();
    }, 2800);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(autoCloseTimeout);
    };
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm border-0 bg-white shadow-xl rounded-xl p-6">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 rounded-full h-6 w-6 opacity-70 hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>

        <div className="text-center space-y-4">
          {/* Welcome Icon & Text */}
          <div className={`transition-all duration-500 ${
            step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <Sparkles className="h-12 w-12 text-yellow-500 mx-auto animate-pulse mb-2" />
            <h3 className="text-xl font-bold text-gray-800">Welcome!</h3>
          </div>

          {/* User Info */}
          <div className={`transition-all duration-500 delay-300 ${
            step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center justify-center space-x-3">
              {user?.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-gray-200"
                />
              )}
              <div className="text-left">
                <p className="font-medium text-gray-800 text-sm">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Success */}
          <div className={`transition-all duration-500 delay-600 ${
            step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}>
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto animate-pulse" />
            <p className="text-sm text-gray-600 mt-2">You're all set!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompactWelcomeDialog;