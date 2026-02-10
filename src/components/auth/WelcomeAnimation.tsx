import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WelcomeAnimationProps {
  show: boolean;
  onComplete: () => void;
}

const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ show, onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!show) return;

    const steps = [
      { delay: 0, duration: 800 },      // Welcome text
      { delay: 800, duration: 600 },    // User info
      { delay: 1400, duration: 600 },  // Success icon
      { delay: 2000, duration: 1000 }  // Final message
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, step.delay);
    });

    // Complete animation after 3 seconds
    setTimeout(() => {
      onComplete();
    }, 3000);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50"
      >
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          
          {/* Welcome Text */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: currentStep >= 1 ? 1 : 0, 
              opacity: currentStep >= 1 ? 1 : 0 
            }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="space-y-2"
          >
            <motion.div
              animate={{ rotate: currentStep >= 1 ? [0, 10, -10, 0] : 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Sparkles className="h-16 w-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-800">Welcome!</h1>
          </motion.div>

          {/* User Info */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ 
              y: currentStep >= 2 ? 0 : 30, 
              opacity: currentStep >= 2 ? 1 : 0 
            }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            {user?.user_metadata?.avatar_url && (
              <motion.img
                initial={{ scale: 0 }}
                animate={{ scale: currentStep >= 2 ? 1 : 0 }}
                transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg"
              />
            )}
            <div>
              <p className="text-xl font-semibold text-gray-700">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </motion.div>

          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: currentStep >= 3 ? 1 : 0, 
              opacity: currentStep >= 3 ? 1 : 0 
            }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.5 }}
          >
            <motion.div
              animate={{ 
                scale: currentStep >= 3 ? [1, 1.2, 1] : 1,
                rotate: currentStep >= 3 ? [0, 360] : 0
              }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            </motion.div>
          </motion.div>

          {/* Final Message */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ 
              y: currentStep >= 4 ? 0 : 20, 
              opacity: currentStep >= 4 ? 1 : 0 
            }}
            transition={{ duration: 0.6 }}
            className="space-y-2"
          >
            <p className="text-lg text-gray-600">You're all set!</p>
            <motion.div
              animate={{ scale: currentStep >= 4 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Heart className="h-6 w-6 text-red-500 mx-auto" />
            </motion.div>
          </motion.div>

          {/* Loading Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center space-x-1 mt-8"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeAnimation;