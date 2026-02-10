import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useWelcomeDialog = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
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
        
        // Show welcome dialog if user exists and we haven't shown it yet
        if (user && !hasShownWelcome) {
          setShowWelcome(true);
          setHasShownWelcome(true);
        }
      }
    };

    // Check immediately
    checkForNewLogin();

    // Also check when user state changes
    if (user && !hasShownWelcome) {
      const hasOAuthHash = window.location.hash.includes('access_token');
      const justLoggedIn = localStorage.getItem('just_logged_in');
      
      if (hasOAuthHash || justLoggedIn) {
        localStorage.removeItem('just_logged_in');
        setShowWelcome(true);
        setHasShownWelcome(true);
      }
    }
  }, [user, hasShownWelcome]);

  const hideWelcome = () => {
    setShowWelcome(false);
  };

  return {
    showWelcome,
    hideWelcome
  };
};