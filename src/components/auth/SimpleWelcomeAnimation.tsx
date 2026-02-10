import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SimpleWelcomeAnimationProps {
  show: boolean;
  onComplete: () => void;
}

const SimpleWelcomeAnimation: React.FC<SimpleWelcomeAnimationProps> = ({ show, onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!show) return;

    const timeouts = [
      setTimeout(() => setStep(1), 200),   // Welcome text
      setTimeout(() => setStep(2), 800),   // User info
      setTimeout(() => setStep(3), 1400),  // Success icon
      setTimeout(() => setStep(4), 2000),  // Final message
      setTimeout(() => onComplete(), 3000) // Complete
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 animate-fade-in">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        
        {/* Welcome Text */}
        <div className={`space-y-2 transition-all duration-700 ${
          step >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4'
        }`}>
          <div className={step >= 1 ? 'animate-welcome-bounce' : ''}>
            <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 animate-welcome-fade-up">Welcome!</h1>
        </div>

        {/* User Info */}
        <div className={`space-y-3 transition-all duration-600 delay-200 ${
          step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
          {user?.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className={`w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg transition-all duration-500 ${
                step >= 2 ? 'animate-welcome-scale' : 'scale-0'
              }`}
            />
          )}
          <div className="animate-welcome-fade-up">
            <p className="text-xl font-semibold text-gray-700">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Success Icon */}
        <div className={`transition-all duration-600 delay-400 ${
          step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        }`}>
          <CheckCircle className={`h-12 w-12 text-green-500 mx-auto ${
            step >= 3 ? 'animate-welcome-scale' : ''
          }`} />
        </div>

        {/* Final Message */}
        <div className={`space-y-2 transition-all duration-600 delay-600 ${
          step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className="text-lg text-gray-600 animate-welcome-fade-up">You're all set!</p>
          <Heart className={`h-6 w-6 text-red-500 mx-auto ${
            step >= 4 ? 'animate-pulse' : ''
          }`} />
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-1 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleWelcomeAnimation;