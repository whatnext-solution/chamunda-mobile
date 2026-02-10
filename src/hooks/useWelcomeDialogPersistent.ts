import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useWelcomeDialogPersistent = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if user just logged in
    const checkForNewLogin = () => {
      const isHomePage = window.location.pathname === '/';
      const hasOAuthHash = window.location.hash.includes('access_token');
      const justLoggedIn = localStorage.getItem('just_logged_in');
      
      if ((hasOAuthHash && isHomePage) || justLoggedIn) {
        // Clear the flag
        localStorage.removeItem('just_logged_in');
        
        // Check if we've already shown welcome for this user (persistent)
        const userId = user?.id;
        const welcomeShownKey = `welcome_shown_${userId}`;
        const hasShownWelcome = localStorage.getItem(welcomeShownKey);
        
        // Show welcome dialog only if user exists and we haven't shown it for this user
        if (user && !hasShownWelcome) {
          setShowWelcome(true);
          // Mark as shown permanently
          localStorage.setItem(welcomeShownKey, 'true');
          // Also store timestamp
          localStorage.setItem(`welcome_shown_${userId}_timestamp`, Date.now().toString());
        }
      }
    };

    // Check immediately
    checkForNewLogin();

    // Also check when user state changes
    if (user) {
      const hasOAuthHash = window.location.hash.includes('access_token');
      const justLoggedIn = localStorage.getItem('just_logged_in');
      
      if (hasOAuthHash || justLoggedIn) {
        localStorage.removeItem('just_logged_in');
        
        // Check if we've already shown welcome for this user
        const userId = user.id;
        const welcomeShownKey = `welcome_shown_${userId}`;
        const hasShownWelcome = localStorage.getItem(welcomeShownKey);
        
        if (!hasShownWelcome) {
          setShowWelcome(true);
          // Mark as shown permanently
          localStorage.setItem(welcomeShownKey, 'true');
          localStorage.setItem(`welcome_shown_${userId}_timestamp`, Date.now().toString());
        }
      }
    }
  }, [user]);

  const hideWelcome = () => {
    setShowWelcome(false);
  };

  // Function to reset welcome for testing (optional)
  const resetWelcome = () => {
    if (user?.id) {
      localStorage.removeItem(`welcome_shown_${user.id}`);
      localStorage.removeItem(`welcome_shown_${user.id}_timestamp`);
    }
  };

  return {
    showWelcome,
    hideWelcome,
    resetWelcome // For testing purposes
  };
};